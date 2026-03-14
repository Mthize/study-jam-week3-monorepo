import { PostgresInstance } from 'pg-embedded';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

type EnvOverrides = Record<string, string | undefined>;

interface RequestResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function waitForHealth(url: string, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return res.json();
      }
    } catch (error) {
      // ignore and retry
    }
    await sleep(1000);
  }

  throw new Error(`Health check did not succeed within ${timeoutMs}ms`);
}

async function requestJson<T = any>(
  url: string,
  body: unknown,
  method: 'POST' | 'GET' = 'POST',
): Promise<RequestResult<T>> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });

  let data: any;
  try {
    data = await response.json();
  } catch (error) {
    data = await response.text();
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function sanitizeAuthResponse(response: any) {
  if (!response || typeof response !== 'object') {
    return response;
  }

  if (!response.data || typeof response.data !== 'object') {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      token: response.data.token ? '[redacted]' : response.data.token,
    },
  };
}

function assertCondition(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function stopBackend(processHandle?: ChildProcess) {
  if (!processHandle || processHandle.exitCode !== null) {
    return;
  }

  return new Promise<void>((resolve) => {
    processHandle.once('exit', () => resolve());
    processHandle.kill('SIGINT');
  });
}

function cleanEnv(env: EnvOverrides): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function buildBaseEnv(overrides: EnvOverrides = {}) {
  return cleanEnv({ ...process.env, ...overrides });
}

function mergeEnv(base: NodeJS.ProcessEnv, overrides: EnvOverrides = {}) {
  return cleanEnv({ ...base, ...overrides });
}

async function expectBackendStartupFailure(
  description: string,
  env: NodeJS.ProcessEnv,
  backendEntry: string,
) {
  console.log(`Validating startup failure for ${description}...`);
  const backend = spawn('node', [backendEntry], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs: string[] = [];
  backend.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  backend.stderr.on('data', (chunk) => logs.push(chunk.toString()));

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      backend.kill('SIGKILL');
      reject(
        new Error(
          `Backend did not fail fast for ${description}. Logs:\n${logs.join('')}`,
        ),
      );
    }, 15000);

    backend.on('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        reject(
          new Error(
            `Backend exited successfully when failure was expected for ${description}. Logs:\n${logs.join('')}`,
          ),
        );
      } else {
        console.log(`Confirmed ${description} exits with code ${code}.`);
        resolve();
      }
    });

    backend.on('error', reject);
  });
}

async function main() {
  const postgres = new PostgresInstance({
    username: 'postgres',
    password: 'postgres',
    databaseName: 'postgres',
    persistent: false,
    port: 0,
  });

  await postgres.start();
  const connection = postgres.connectionInfo;
  const databaseName = 'study_jam_local';
  await postgres.createDatabase(databaseName);

  const databaseUrl = `postgresql://${connection.username}:${connection.password}` +
    `@${connection.host}:${connection.port}/${databaseName}`;

  const envBase = buildBaseEnv({
    DATABASE_URL: databaseUrl,
    PORT: process.env.PORT ?? '3000',
    JWT_SECRET: process.env.JWT_SECRET ?? 'local-secret-key',
  });

  console.log('Running migrations against embedded PostgreSQL...');
  await runCommand('npm', ['run', 'db:migrate'], envBase);

  const backendEntry = join(__dirname, '..', 'dist', 'src', 'main.js');

  console.log('Starting backend with embedded PostgreSQL...');
  const backend = spawn('node', [backendEntry], {
    env: envBase,
    stdio: 'inherit',
  });

  const baseUrl = `http://localhost:${envBase.PORT}`;
  const testEmail = `user_${Date.now()}@example.com`;
  const testPassword = 'Passw0rd!';

  try {
    const health = await waitForHealth(`${baseUrl}/health`);
    console.log('Health endpoint response:', health);

    const registerResult = await requestJson(`${baseUrl}/auth/register`, {
      name: 'Runtime',
      surname: 'Verifier',
      email: testEmail,
      password: testPassword,
    });

    assertCondition(registerResult.ok && registerResult.status === 201, 'Register should succeed');
    console.log('Register endpoint response:', sanitizeAuthResponse(registerResult.data));

    const duplicateResult = await requestJson(`${baseUrl}/auth/register`, {
      name: 'Runtime',
      surname: 'Verifier',
      email: testEmail,
      password: testPassword,
    });
    assertCondition(!duplicateResult.ok && duplicateResult.status === 400, 'Duplicate email must fail');
    console.log('Duplicate email check response:', duplicateResult.data);

    const loginResult = await requestJson(`${baseUrl}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    assertCondition(loginResult.ok && loginResult.status === 200, 'Login should succeed');
    console.log('Login endpoint response:', sanitizeAuthResponse(loginResult.data));

    const wrongPasswordResult = await requestJson(`${baseUrl}/auth/login`, {
      email: testEmail,
      password: 'WrongPassword!',
    });
    assertCondition(
      !wrongPasswordResult.ok && wrongPasswordResult.status === 401,
      'Wrong password must be rejected',
    );
    console.log('Wrong password response:', wrongPasswordResult.data);

    const invalidPayloadResult = await requestJson(`${baseUrl}/auth/register`, {
      name: '',
      surname: '',
      email: 'not-an-email',
      password: '123',
    });
    assertCondition(
      !invalidPayloadResult.ok && invalidPayloadResult.status === 400,
      'Invalid payload should fail validation',
    );
    console.log('Invalid payload response:', invalidPayloadResult.data);
  } finally {
    await stopBackend(backend);
  }

  await expectBackendStartupFailure(
    'missing JWT_SECRET',
    mergeEnv(envBase, { JWT_SECRET: undefined }),
    backendEntry,
  );

  await expectBackendStartupFailure(
    'invalid DATABASE_URL',
    mergeEnv(envBase, { DATABASE_URL: 'postgresql://invalid-host:5432/invalid' }),
    backendEntry,
  );

  await postgres.stop();
  await postgres.cleanup();

  console.log('Runtime verification completed successfully.');
}

main().catch((error) => {
  console.error('Runtime verification failed:', error);
  process.exitCode = 1;
});

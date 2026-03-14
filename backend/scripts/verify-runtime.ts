import { PostgresInstance } from 'pg-embedded';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

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

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response
    .json()
    .catch(() => ({ error: 'Failed to parse JSON response' }));

  if (!response.ok) {
    throw new Error(`Request to ${url} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function stopBackend(processHandle?: ChildProcess) {
  if (!processHandle) {
    return;
  }

  return new Promise<void>((resolve) => {
    processHandle.once('exit', () => resolve());
    processHandle.kill('SIGINT');
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

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORT: process.env.PORT ?? '3000',
    JWT_SECRET: process.env.JWT_SECRET ?? 'local-secret-key',
  };

  console.log('Running migrations against embedded PostgreSQL...');
  await runCommand('npm', ['run', 'db:migrate'], env);

  const backendEntry = join(__dirname, '..', 'dist', 'src', 'main.js');

  console.log('Starting backend with embedded PostgreSQL...');
  const backend = spawn('node', [backendEntry], {
    env,
    stdio: 'inherit',
  });

  try {
    const baseUrl = `http://localhost:${env.PORT}`;
    const health = await waitForHealth(`${baseUrl}/health`);
    console.log('Health endpoint response:', health);

    const testEmail = `user_${Date.now()}@example.com`;
    const testPassword = 'Passw0rd!';

    const registerResponse = await postJson(`${baseUrl}/auth/register`, {
      name: 'Runtime',
      surname: 'Verifier',
      email: testEmail,
      password: testPassword,
    });
    console.log('Register endpoint response:', registerResponse);

    const loginResponse = await postJson(`${baseUrl}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    console.log('Login endpoint response:', loginResponse);
  } finally {
    await stopBackend(backend);
    await postgres.stop();
    await postgres.cleanup();
  }
}

main().catch((error) => {
  console.error('Runtime verification failed:', error);
  process.exitCode = 1;
});

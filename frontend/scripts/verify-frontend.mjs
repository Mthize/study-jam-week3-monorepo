import { chromium } from 'playwright'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:4173'

const timestamp = Date.now()
const email = `frontend.${timestamp}@example.com`
const password = 'Passw0rd!'

async function fillRegister(page) {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Register' }).click()
  await page.getByLabel('First name').fill('Frontend')
  await page.getByLabel('Surname').fill('Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Register account' }).click()
  await page.getByText('Registration successful.').waitFor({ timeout: 20000 })
}

async function fillLogin(page) {
  await page.getByRole('tab', { name: 'Login' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Login successful.').waitFor({ timeout: 20000 })
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.on('console', (msg) => console.log('[browser]', msg.text()))
  try {
    await fillRegister(page)
    await fillLogin(page)
    console.log('Frontend flows verified with test account', email)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

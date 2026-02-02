import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ??
  path.join(__dirname, '..', '.auth', 'user.json')

setup('authenticate and save storage state', async ({ page }) => {
  if (
    fs.existsSync(storageStatePath) &&
    process.env.PLAYWRIGHT_AUTH_RENEW !== '1'
  ) {
    setup.skip(true, 'Storage state already exists')
    return
  }

  if (!process.env.PWDEBUG && process.env.PLAYWRIGHT_AUTH_INTERACTIVE !== '1') {
    throw new Error(
      'Set PLAYWRIGHT_AUTH_INTERACTIVE=1 and run with --debug to complete OAuth login'
    )
  }

  const authDir = path.dirname(storageStatePath)
  fs.mkdirSync(authDir, { recursive: true })

  await page.goto('/')

  // Use --debug to pause and complete real OAuth login manually.
  // After login, close the inspector to persist storage state.
  await page.pause()

  await page.context().storageState({ path: storageStatePath })
})

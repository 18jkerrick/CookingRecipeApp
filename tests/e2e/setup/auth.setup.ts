import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ??
  path.join(__dirname, '..', '.auth', 'user.json')

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  loadEnv({ path: envPath })
}

setup('authenticate and save storage state', async ({ page }) => {
  if (
    fs.existsSync(storageStatePath) &&
    process.env.PLAYWRIGHT_AUTH_RENEW !== '1'
  ) {
    setup.skip(true, 'Storage state already exists')
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const email = process.env.SUPABASE_SERVICE_ROLE_EMAIL
  const password = process.env.SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD

  if (!supabaseUrl || !supabaseKey || !email || !password) {
    throw new Error(
      'Missing auth env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_KEY, ' +
        'SUPABASE_SERVICE_ROLE_EMAIL, SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD'
    )
  }

  let storedKey: string | null = null
  let storedValue: string | null = null
  const storage = {
    getItem(key: string) {
      return key === storedKey ? storedValue : null
    },
    setItem(key: string, value: string) {
      storedKey = key
      storedValue = value
    },
    removeItem(key: string) {
      if (key === storedKey) {
        storedKey = null
        storedValue = null
      }
    },
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    throw new Error(`Supabase sign-in failed: ${error?.message || 'no session'}`)
  }

  if (!storedKey || !storedValue) {
    throw new Error('Supabase auth storage not initialized after sign-in')
  }

  const authDir = path.dirname(storageStatePath)
  fs.mkdirSync(authDir, { recursive: true })

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: storedKey, value: storedValue }
  )

  await page.goto('/cookbooks')
  await page.context().storageState({ path: storageStatePath })
})

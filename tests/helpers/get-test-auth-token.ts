import path from 'path'
import fs from 'fs'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local from repo root
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  loadEnv({ path: envPath })
}

/**
 * Get a real Supabase auth token for the test user.
 * Uses credentials from .env.local:
 * - SUPABASE_SERVICE_ROLE_EMAIL
 * - SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD
 * 
 * @returns Promise<string> - The access token
 * @throws Error if credentials are missing or auth fails
 */
export async function getTestAuthToken(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const email = process.env.SUPABASE_SERVICE_ROLE_EMAIL
  const password = process.env.SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_KEY'
    )
  }

  if (!email || !password) {
    throw new Error(
      'Missing test user credentials: SUPABASE_SERVICE_ROLE_EMAIL, SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
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

  return data.session.access_token
}

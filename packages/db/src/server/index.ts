import { createClient } from '@supabase/supabase-js'
import { getOptionalEnv, requireEnv } from '../shared/env'

/**
 * Server-only Supabase client.
 *
 * NOTE: This is intentionally NOT auto-detected by imports.
 * You must import from `@acme/db/server`.
 */
export function createSupabaseServerClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')

  // Keep NEXT_PRIVATE_SUPABASE_KEY as primary to avoid behavior changes.
  const serverKey =
    getOptionalEnv('NEXT_PRIVATE_SUPABASE_KEY') ??
    getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!serverKey) {
    throw new Error(
      'Missing Supabase server key. Set NEXT_PRIVATE_SUPABASE_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, serverKey)
}

export const supabase = createSupabaseServerClient()

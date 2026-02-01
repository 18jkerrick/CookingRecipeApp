/**
 * Browser-safe Supabase client
 * 
 * Use this in:
 * - Client Components (React hooks, event handlers)
 * - Browser-side code
 * 
 * Features:
 * - Session persistence in localStorage
 * - Auto token refresh
 * - RLS enforced (uses anon key)
 * 
 * @example
 * import { createBrowserClient } from '@acme/db/client'
 * 
 * const supabase = createBrowserClient()
 * const { data } = await supabase.from('recipes').select('*')
 */

import { createClient } from '@supabase/supabase-js'

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Default singleton for convenience (backwards compatible)
export const supabase = createBrowserClient()

/**
 * Server-only Supabase client
 * 
 * Use this in:
 * - API Routes (app/api/**/route.ts)
 * - Server Components
 * - Server Actions
 * 
 * ⚠️ SECURITY WARNING:
 * This uses the service_role key which BYPASSES RLS.
 * Only use when you have explicit user context and validate permissions.
 * 
 * For user-scoped operations, prefer createServerClient() with user session.
 * 
 * @example
 * // API Route with user context
 * import { createServerClient } from '@acme/db/server'
 * 
 * export async function GET(request: Request) {
 *   const supabase = createServerClient(request)
 *   const { data } = await supabase.from('recipes').select('*')
 *   return Response.json(data)
 * }
 * 
 * @example
 * // Admin operation (bypasses RLS)
 * import { createAdminClient } from '@acme/db/server'
 * 
 * const admin = createAdminClient()
 * await admin.from('users').update({ role: 'admin' }).eq('id', userId)
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Create a server-side Supabase client with user session context
 * This respects RLS policies based on the authenticated user
 */
export function createServerClient(request?: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY are required'
    )
  }

  // TODO: Extract session from request headers/cookies when implementing auth
  // For now, use anon key (RLS enforced)
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Create an admin Supabase client that BYPASSES RLS
 * ⚠️ Use with extreme caution - only for admin operations with explicit permission checks
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

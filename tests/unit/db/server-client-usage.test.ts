describe('db usage guardrails', () => {
  it('API routes should not import browser supabase client', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const route = fs.readFileSync('app/api/grocery-lists/route.ts', 'utf8')
    expect(route.includes("from '@/supabase/client'")).toBe(false)
  })
})

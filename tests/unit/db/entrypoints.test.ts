describe('@acme/db entrypoints', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_KEY = 'test-anon-key'
    process.env.NEXT_PRIVATE_SUPABASE_KEY = 'test-server-key'
  })

  it('supports explicit client import', async () => {
    await expect(import('@acme/db/client')).resolves.toBeDefined()
  })

  it('supports explicit server import', async () => {
    await expect(import('@acme/db/server')).resolves.toBeDefined()
  })

  it('does NOT support catch-all @acme/db import', async () => {
    await expect(import('@acme/db' as any)).rejects.toBeDefined()
  })
})

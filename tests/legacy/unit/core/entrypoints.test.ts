describe('@acme/core entrypoints', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_KEY = 'test-anon-key'
    process.env.NEXT_PRIVATE_SUPABASE_KEY = 'test-server-key'
  })

  it('supports importing parsers index', async () => {
    await expect(import('@acme/core/parsers')).resolves.toBeDefined()
  })

  it('supports importing ai index', async () => {
    await expect(import('@acme/core/ai')).resolves.toBeDefined()
  })

  it('supports importing utils index', async () => {
    await expect(import('@acme/core/utils')).resolves.toBeDefined()
  })
})

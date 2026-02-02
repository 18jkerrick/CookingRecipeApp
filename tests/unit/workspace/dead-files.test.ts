describe('dead files removed', () => {
  it('does not keep legacy dead files around', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    expect(fs.existsSync('apps/web/app/api/parse-url/old_route.ts')).toBe(false)
    expect(fs.existsSync('lib/db/grocery-storage.ts')).toBe(false)
    expect(fs.existsSync('lib/db/supabase.ts')).toBe(false)
    expect(fs.existsSync('supabase/client.ts')).toBe(false)
  })
})

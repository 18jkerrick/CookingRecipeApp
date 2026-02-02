describe('db client env access', () => {
  it('uses explicit NEXT_PUBLIC env access for client bundle', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const clientFile = fs.readFileSync('packages/db/src/client/index.ts', 'utf8')

    expect(clientFile.includes('process.env.NEXT_PUBLIC_SUPABASE_URL')).toBe(true)
    expect(clientFile.includes('process.env.NEXT_PUBLIC_SUPABASE_KEY')).toBe(true)
  })
})

describe('packages/db structure', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs')

  it('packages/db/package.json exists', () => {
    expect(fs.existsSync('packages/db/package.json')).toBe(true)
  })

  it('packages/db/src/client.ts exists', () => {
    expect(fs.existsSync('packages/db/src/client.ts')).toBe(true)
  })

  it('packages/db/src/server.ts exists', () => {
    expect(fs.existsSync('packages/db/src/server.ts')).toBe(true)
  })

  it('packages/db/tsconfig.json exists', () => {
    expect(fs.existsSync('packages/db/tsconfig.json')).toBe(true)
  })
})

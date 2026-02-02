describe('tsconfig base', () => {
  it('root tsconfig.base.json exists (post-migration)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('tsconfig.base.json')).toBe(true)
  })
})

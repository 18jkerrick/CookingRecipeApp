describe('apps/web layout', () => {
  it('Next app exists at apps/web/app (post-move)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('apps/web/app')).toBe(true)
  })
})

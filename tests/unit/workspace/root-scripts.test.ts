describe('root scripts', () => {
  it('root dev script runs apps/web dev (post-migration)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../../package.json')
    expect(pkg.scripts.dev).toContain('pnpm -C apps/web dev')
  })
})

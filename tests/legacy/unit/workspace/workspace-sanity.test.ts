describe('workspace sanity', () => {
  it('pnpm workspace file exists (post-migration)', async () => {
    // This intentionally fails until Task 1 scaffolding is added.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('pnpm-workspace.yaml')).toBe(true)
  })
})

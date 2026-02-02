describe('@acme/core utils barrel exports', () => {
  it('does not export unitConversion while keeping unit-conversion', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const index = fs.readFileSync('packages/core/src/utils/index.ts', 'utf8')

    expect(index.includes("export * from './unitConversion';")).toBe(false)
    expect(index.includes("export * from './unit-conversion';")).toBe(true)
  })
})

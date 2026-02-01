describe('.gitignore nested artifacts', () => {
  it('ignores nested .next and node_modules directories', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const gitignore = fs.readFileSync('.gitignore', 'utf8')

    expect(gitignore.includes('**/.next/')).toBe(true)
    expect(gitignore.includes('**/node_modules/')).toBe(true)
  })
})

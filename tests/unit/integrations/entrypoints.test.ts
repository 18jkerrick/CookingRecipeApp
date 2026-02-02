describe('@acme/integrations entrypoints', () => {
  it('supports importing grocery-delivery integration module', async () => {
    await expect(
      import('@acme/integrations/grocery-delivery/integration')
    ).resolves.toBeDefined()
  })
})

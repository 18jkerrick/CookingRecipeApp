import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost/api/test', () => {
    return HttpResponse.json({ ok: true })
  }),
  http.get('https://connect.dev.instacart.tools/idp/v1/retailers', ({ request }) => {
    const url = new URL(request.url)
    const postalCode = url.searchParams.get('postal_code') || '94105'
    return HttpResponse.json({
      retailers: [
        {
          id: 'retailer-1',
          name: 'Test Grocery',
          retailer_key: 'test-grocery',
          postal_code: postalCode,
        },
      ],
    })
  }),
  http.post('https://connect.dev.instacart.tools/idp/v1/products/products_link', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      products_link_url: 'https://customers.dev.instacart.tools/store/recipes/7289260?retailer_key=test-grocery',
      request: body,
    })
  }),
  http.post('https://connect.dev.instacart.tools/idp/v1/products/recipe', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      products_link_url: 'https://customers.dev.instacart.tools/store/recipes/7289260?retailer_key=test-grocery',
      request: body,
    })
  }),
  http.get('https://customers.dev.instacart.tools/store/recipes/:recipeId', ({ request }) => {
    const url = new URL(request.url)
    const retailerKey = url.searchParams.get('retailer_key') || 'test-grocery'
    return HttpResponse.text(
      `<!DOCTYPE html><html><head><title>Instacart</title></head><body>
      <div>recipes/7289260</div>
      <div>retailer_key=${retailerKey}</div>
      </body></html>`
    )
  }),
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ingredients: ['1 cup flour', '2 eggs'],
              instructions: ['Mix ingredients', 'Bake for 30 minutes'],
            }),
          },
        },
      ],
    })
  }),
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'Mocked transcription text',
    })
  }),
  http.all('https://:project.supabase.co/rest/v1/:path*', ({ request }) => {
    const url = new URL(request.url)

    if (url.pathname.includes('/rpc/')) {
      return HttpResponse.json({ data: [], error: null })
    }

    if (request.method === 'GET') {
      return HttpResponse.json([])
    }

    return HttpResponse.json([])
  }),
  http.all('https://:project.supabase.co/auth/v1/:path*', () => {
    return HttpResponse.json({})
  }),
  http.all('https://:project.supabase.co/storage/v1/:path*', () => {
    return HttpResponse.json({})
  }),
]

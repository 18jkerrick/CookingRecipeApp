import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost/api/test', () => {
    return HttpResponse.json({ ok: true })
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

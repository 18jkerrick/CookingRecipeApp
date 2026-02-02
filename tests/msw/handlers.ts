import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost/api/test', () => {
    return HttpResponse.json({ ok: true })
  }),
]

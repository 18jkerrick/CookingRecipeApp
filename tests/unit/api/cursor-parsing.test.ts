import { describe, it, expect } from 'vitest'

// Copy of parseCursor from route.ts for testing
// In a real app, this would be exported from a shared module
function parseCursor(cursor: string | null): { timestamp: string; id: string } | null {
  if (!cursor) return null
  
  // Matches: ISO timestamp (with Z or +00:00 timezone, 3-6 digit fractional seconds) + underscore + UUID
  const match = cursor.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?(?:Z|[+-]\d{2}:\d{2}))_([a-f0-9-]+)$/i)
  
  if (!match) {
    return null
  }
  
  return { timestamp: match[1], id: match[2] }
}

describe('Cursor Parsing', () => {
  it('parses cursor with Z timezone', () => {
    const cursor = '2026-02-04T10:30:00.000Z_abc123-def456'
    const result = parseCursor(cursor)
    
    expect(result).toEqual({
      timestamp: '2026-02-04T10:30:00.000Z',
      id: 'abc123-def456',
    })
  })

  it('parses cursor with +00:00 timezone (Supabase format)', () => {
    const cursor = '2025-06-23T04:31:18.442456+00:00_681bbe33-e0ee-4b41-acf9-c14c78ecf126'
    const result = parseCursor(cursor)
    
    expect(result).toEqual({
      timestamp: '2025-06-23T04:31:18.442456+00:00',
      id: '681bbe33-e0ee-4b41-acf9-c14c78ecf126',
    })
  })

  it('parses cursor with microseconds (6 digits)', () => {
    const cursor = '2025-06-23T04:31:18.442456Z_abc123'
    const result = parseCursor(cursor)
    
    expect(result).toEqual({
      timestamp: '2025-06-23T04:31:18.442456Z',
      id: 'abc123',
    })
  })

  it('parses cursor with milliseconds (3 digits)', () => {
    const cursor = '2025-06-23T04:31:18.442Z_abc123'
    const result = parseCursor(cursor)
    
    expect(result).toEqual({
      timestamp: '2025-06-23T04:31:18.442Z',
      id: 'abc123',
    })
  })

  it('parses cursor without fractional seconds', () => {
    const cursor = '2025-06-23T04:31:18Z_abc123'
    const result = parseCursor(cursor)
    
    expect(result).toEqual({
      timestamp: '2025-06-23T04:31:18Z',
      id: 'abc123',
    })
  })

  it('returns null for null cursor', () => {
    expect(parseCursor(null)).toBeNull()
  })

  it('returns null for invalid cursor format', () => {
    expect(parseCursor('invalid')).toBeNull()
    expect(parseCursor('2025-06-23_abc123')).toBeNull() // Missing time
    expect(parseCursor('abc123')).toBeNull() // Just ID
  })

  it('returns null for SQL injection attempts', () => {
    expect(parseCursor("2025-06-23T04:31:18Z_abc123'; DROP TABLE recipes;--")).toBeNull()
  })
})

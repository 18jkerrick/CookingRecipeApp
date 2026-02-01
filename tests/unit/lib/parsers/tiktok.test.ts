/**
 * @jest-environment node
 */

import { getTiktokCaptions } from '@acme/core/parsers/tiktok';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('getTiktokCaptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it.skip('should extract captions from TikTok video URL', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "__DEFAULT_SCOPE__": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {
                  "desc": "Amazing chocolate chip cookie recipe! #baking #cookies #recipe"
                }
              }
            }
          }
        }
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Amazing chocolate chip cookie recipe! #baking #cookies #recipe');
    expect(mockFetch).toHaveBeenCalledWith(url, {
      headers: {
        'User-Agent': expect.stringContaining('Mozilla')
      }
    });
  });

  it.skip('should extract captions from TikTok photo URL', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "__DEFAULT_SCOPE__": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {
                  "desc": "Step by step pasta recipe photos #pasta #cooking"
                }
              }
            }
          }
        }
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/photo/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Step by step pasta recipe photos #pasta #cooking');
  });

  it.skip('should handle missing description gracefully', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "__DEFAULT_SCOPE__": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {}
              }
            }
          }
        }
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it.skip('should handle malformed JSON gracefully', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        Invalid JSON content here
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it.skip('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    
    await expect(getTiktokCaptions(url)).rejects.toThrow('Failed to extract content from TikTok video: Network error');
  });

  it.skip('should handle HTTP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    
    await expect(getTiktokCaptions(url)).rejects.toThrow('Failed to extract content from TikTok video: Could not fetch TikTok page');
  });

  it.skip('should handle missing script tag', async () => {
    const mockHtml = `
      <html>
        <head><title>TikTok</title></head>
        <body>No script tag here</body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it.skip('should handle empty description', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "__DEFAULT_SCOPE__": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {
                  "desc": ""
                }
              }
            }
          }
        }
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it.skip('should handle complex nested structure', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "__DEFAULT_SCOPE__": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {
                  "desc": "Multi-line recipe\\nwith ingredients\\n#cooking #recipe",
                  "author": {
                    "nickname": "ChefUser"
                  }
                }
              }
            }
          }
        }
      </script>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Multi-line recipe\nwith ingredients\n#cooking #recipe');
  });
}); 
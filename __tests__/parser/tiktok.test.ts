import { getTiktokCaptions } from '../../lib/parser/tiktok';

// Mock fetch globally
global.fetch = jest.fn();

describe('getTiktokCaptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract captions from TikTok video URL', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Amazing chocolate chip cookie recipe! #baking #cookies #recipe');
    expect(global.fetch).toHaveBeenCalledWith(url, {
      headers: {
        'User-Agent': expect.stringContaining('Mozilla')
      }
    });
  });

  it('should extract captions from TikTok photo URL', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/photo/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Step by step pasta recipe photos #pasta #cooking');
  });

  it('should handle missing description gracefully', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {
          "default": {
            "webapp.video-detail": {
              "itemInfo": {
                "itemStruct": {}
              }
            }
          }
        }
      </script>
    `;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it('should handle malformed JSON gracefully', async () => {
    const mockHtml = `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        Invalid JSON content here
      </script>
    `;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    
    await expect(getTiktokCaptions(url)).rejects.toThrow('Network error');
  });

  it('should handle HTTP error responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    
    await expect(getTiktokCaptions(url)).rejects.toThrow('Could not fetch TikTok page');
  });

  it('should handle missing script tag', async () => {
    const mockHtml = `
      <html>
        <head><title>TikTok</title></head>
        <body>No script tag here</body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it('should handle empty description', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('');
  });

  it('should handle complex nested structure', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const url = 'https://www.tiktok.com/@chef/video/1234567890';
    const result = await getTiktokCaptions(url);

    expect(result).toBe('Multi-line recipe\nwith ingredients\n#cooking #recipe');
  });
}); 
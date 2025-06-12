/**
 * @jest-environment node
 */

import { getFacebookCaptions, getFacebookTitle } from '../../lib/parser/facebook';
import { spawn } from 'child_process';

// Mock child_process spawn
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      setUserAgent: jest.fn(),
      goto: jest.fn(),
      evaluate: jest.fn().mockResolvedValue([]),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

describe('Facebook Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('getFacebookTitle', () => {
    it('should extract title from pipe-separated Facebook title', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Double Chocolate Chip Cookie | Thick and No-Chill Cookie Recipe'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test123/');
      
      expect(result).toBe('Double Chocolate Chip Cookie');
      expect(mockSpawn).toHaveBeenCalledWith('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-playlist',
        'https://fb.watch/test123/'
      ]);
    });

    it('should extract title from simple Facebook title', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Banana Oats Muffin Recipe'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://www.facebook.com/watch/?v=1866860136895596');
      
      expect(result).toBe('Banana Oats Muffin');
    });

    it('should handle yt-dlp errors gracefully', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Video not found');
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/invalid/');
      
      expect(result).toBeNull();
    });

    it('should handle malformed JSON from yt-dlp', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('Invalid JSON content');
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test123/');
      
      expect(result).toBeNull();
    });

    it('should handle missing title in metadata', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                description: 'Some description without title'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test123/');
      
      expect(result).toBeNull();
    });
  });

  describe('getFacebookCaptions', () => {
    it('should extract captions using yt-dlp metadata', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Cookie Recipe',
                description: 'Double Chocolate Chip Cookie\nIngredients\n1/2 cup butter\n1/2 cup sugar\nInstructions\n1. Mix ingredients\n2. Bake at 350F'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookCaptions('https://fb.watch/test123/');
      
      expect(result).toContain('Double Chocolate Chip Cookie');
      expect(result).toContain('Ingredients');
      expect(result).toContain('1/2 cup butter');
    });

    it('should extract comments when description mentions recipe in comments', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Muffin Recipe',
                description: 'Nutritious, wholesome & delicious. Recipe in the Comment Section below.'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Mock HTML response with recipe in JSON format
      const mockHtml = `
        <html>
          <body>
            <script>
              {"body":{"text":"Cooking Time: 15-20 Mins.\\nBaking Time : 20 Mins\\nCalories: Approx. 220/Muffin.\\n\\nIngredients:\\n1/2 Cup Oats\\n1/2 Cup Wheat Flour\\n1/4th TSP Baking Powder\\n1/2 Cup Oil\\n1 Egg\\n1/2 Cup Brown Sugar\\n1/4th TSP Vanilla Essence\\n1 Banana"}}
            </script>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      const result = await getFacebookCaptions('https://fb.watch/test123/');
      
      expect(result).toContain('Cooking Time: 15-20 Mins');
      expect(result).toContain('1/2 Cup Oats');
      expect(result).toContain('1/2 Cup Wheat Flour');
    });

    it('should handle yt-dlp failure gracefully', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Failed to extract');
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      await expect(getFacebookCaptions('https://fb.watch/invalid/')).rejects.toThrow();
    });

    it('should prefer description over title when description is significantly longer', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Short title',
                description: 'This is a much longer description that contains the actual recipe content with ingredients and instructions that should be preferred over the short title because it has more useful information for recipe extraction.'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookCaptions('https://fb.watch/test123/');
      
      expect(result).toContain('much longer description');
      expect(result).not.toBe('Short title');
    });
  });

  describe('URL Format Support', () => {
    it('should handle facebook.com URLs', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Facebook Video Title'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://www.facebook.com/watch/?v=123456789');
      
      expect(result).toBe('Facebook Video Title');
    });

    it('should handle fb.watch URLs', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'FB Watch Title'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/Aa20FUB-bx/');
      
      expect(result).toBe('FB Watch Title');
    });

    it('should handle facebook.com/reel URLs', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Facebook Reel Title'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://www.facebook.com/reel/1058715379424641');
      
      expect(result).toBe('Facebook Reel Title');
    });
  });

  describe('Title Extraction Patterns', () => {
    it('should skip Pattern 1 for pipe-separated titles', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'First Part Cookie | Second Part Recipe'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test/');
      
      // Should return first part, not second part
      expect(result).toBe('First Part Cookie');
    });

    it('should use Pattern 1 for non-pipe-separated titles', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Amazing Chocolate Chip Cookie Recipe Makes 12 cookies'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test/');
      
      // Should extract just the recipe name part
      expect(result).toBe('Amazing Chocolate Chip Cookie Recipe');
    });

    it('should handle titles with view counts and reactions', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: '2M views · 27K reactions | Chocolate Chip Cookie Recipe'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await getFacebookTitle('https://fb.watch/test/');
      
      // Should skip the stats part and return the recipe part
      expect(result).toBe('Chocolate Chip Cookie Recipe');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in comment extraction', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({
                title: 'Recipe Title',
                description: 'Recipe in the Comment Section below.'
              }));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getFacebookCaptions('https://fb.watch/test/');
      
      // Should fall back to original description
      expect(result).toContain('Recipe in the Comment Section below');
    });

    it('should handle empty responses gracefully', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(JSON.stringify({}));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Mock all fetch calls to avoid the login error
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body>No content</body></html>')
      });

      // Should throw error when no content is found to trigger fallback methods
      await expect(getFacebookCaptions('https://fb.watch/test/')).rejects.toThrow('Facebook requires login');
    });
  });
}); 
/**
 * @jest-environment node
 */

import { extractVideoTitle } from '@/lib/utils/titleExtractor';
import { getYoutubeTitle } from '@/lib/parsers/youtube';
import { getFacebookTitle } from '@/lib/parsers/facebook';

// Mock the parser functions
jest.mock('@/lib/parsers/youtube');
jest.mock('@/lib/parsers/facebook');

const mockGetYoutubeTitle = getYoutubeTitle as jest.MockedFunction<typeof getYoutubeTitle>;
const mockGetFacebookTitle = getFacebookTitle as jest.MockedFunction<typeof getFacebookTitle>;

describe('extractVideoTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('YouTube title extraction', () => {
    it('should extract YouTube title from metadata', async () => {
      mockGetYoutubeTitle.mockResolvedValue('Amazing Chocolate Chip Cookies');

      const result = await extractVideoTitle(
        'Some captions about cookies',
        'YouTube',
        'https://www.youtube.com/watch?v=123'
      );

      expect(result).toBe('Amazing Chocolate Chip Cookies');
      expect(mockGetYoutubeTitle).toHaveBeenCalledWith('https://www.youtube.com/watch?v=123');
    });

    it('should fall back to caption extraction when YouTube metadata fails', async () => {
      mockGetYoutubeTitle.mockRejectedValue(new Error('YouTube API error'));

      const result = await extractVideoTitle(
        'Amazing Chocolate Chip Cookie Recipe - Easy and delicious cookies',
        'YouTube',
        'https://www.youtube.com/watch?v=123'
      );

      expect(result).toBe('Amazing Chocolate Chip Cookie Recipe - Easy And Delicious Cookies');
    });
  });

  describe('Facebook title extraction', () => {
    it('should extract Facebook title from metadata', async () => {
      mockGetFacebookTitle.mockResolvedValue('Double Chocolate Chip Cookie');

      const result = await extractVideoTitle(
        'Some captions about cookies',
        'Facebook',
        'https://fb.watch/test123/'
      );

      expect(result).toBe('Double Chocolate Chip Cookie');
      expect(mockGetFacebookTitle).toHaveBeenCalledWith('https://fb.watch/test123/');
    });

    it('should fall back to caption extraction when Facebook metadata fails', async () => {
      mockGetFacebookTitle.mockRejectedValue(new Error('Facebook extraction error'));

      const result = await extractVideoTitle(
        'Banana Bread Recipe - Healthy and nutritious bread',
        'Facebook',
        'https://fb.watch/test123/'
      );

      expect(result).toBe('Banana Bread Recipe - Healthy And Nutritious Bread');
    });

    it('should handle null return from Facebook title extraction', async () => {
      mockGetFacebookTitle.mockResolvedValue(null);

      const result = await extractVideoTitle(
        'Chocolate Chip Cookies Recipe - The best cookies ever',
        'Facebook',
        'https://fb.watch/test123/'
      );

      expect(result).toBe('Chocolate Chip Cookies Recipe - The Best Cookies Ever');
    });
  });

  describe('Caption-based title extraction', () => {
    it('should extract title from captions for other platforms', async () => {
      const result = await extractVideoTitle(
        'Amazing Pasta Recipe - Learn how to make delicious pasta',
        'TikTok',
        'https://www.tiktok.com/@chef/video/123'
      );

      expect(result).toBe('Amazing Pasta Recipe - Learn How To Make Delicious Pasta');
    });

    it('should handle captions with multiple recipe patterns', async () => {
      const result = await extractVideoTitle(
        'Ultimate Chocolate Chip Cookie Recipe | Best Cookies Ever',
        'Instagram',
        'https://www.instagram.com/p/123'
      );

      expect(result).toBe('Ultimate Chocolate Chip Cookie Recipe | Best Cookies Ever');
    });

    it('should extract title with cooking-related keywords', async () => {
      const result = await extractVideoTitle(
        'How to Make Perfect Banana Bread - Easy Baking Tutorial',
        'TikTok',
        'https://www.tiktok.com/@baker/video/456'
      );

      expect(result).toBe('How To Make Perfect Banana Bread - Easy Baking Tutorial');
    });

    it('should handle captions with recipe at the end', async () => {
      const result = await extractVideoTitle(
        'Check out this amazing Chocolate Cake recipe',
        'Instagram',
        'https://www.instagram.com/p/789'
      );

      expect(result).toBe('Check Out This Amazing Chocolate Cake Recipe');
    });

    it('should return null for captions without clear recipe titles', async () => {
      const result = await extractVideoTitle(
        'Just some random text without any cooking content here',
        'TikTok',
        'https://www.tiktok.com/@user/video/999'
      );

      expect(result).toBeNull();
    });

    it('should handle empty captions', async () => {
      const result = await extractVideoTitle(
        '',
        'Instagram',
        'https://www.instagram.com/p/empty'
      );

      expect(result).toBeNull();
    });

    it('should handle captions with special characters', async () => {
      const result = await extractVideoTitle(
        '🍪 Amazing Chocolate Chip Cookies Recipe 🍪 - So delicious!',
        'TikTok',
        'https://www.tiktok.com/@chef/video/emoji'
      );

      expect(result).toBe('Amazing Chocolate Chip Cookies Recipe - So Delicious!');
    });

    it('should extract title from captions with cooking verbs', async () => {
      const result = await extractVideoTitle(
        'Learn to Bake Perfect Sourdough Bread at home',
        'Instagram',
        'https://www.instagram.com/p/bread'
      );

      expect(result).toBe('Learn To Bake Perfect Sourdough Bread At Home');
    });

    it('should handle captions with multiple sentences', async () => {
      const result = await extractVideoTitle(
        'Today I am sharing my favorite Chicken Curry Recipe. This is so easy to make and tastes amazing.',
        'TikTok',
        'https://www.tiktok.com/@chef/video/curry'
      );

      expect(result).toBe('Today I Am Sharing My Favorite Chicken Curry Recipe');
    });
  });

  describe('Error handling', () => {
    it('should handle YouTube title extraction errors gracefully', async () => {
      mockGetYoutubeTitle.mockRejectedValue(new Error('Network error'));

      const result = await extractVideoTitle(
        'Simple Pasta Recipe - Easy dinner idea',
        'YouTube',
        'https://www.youtube.com/watch?v=error'
      );

      expect(result).toBe('Simple Pasta Recipe - Easy Dinner Idea');
    });

    it('should handle Facebook title extraction errors gracefully', async () => {
      mockGetFacebookTitle.mockRejectedValue(new Error('Facebook blocked'));

      const result = await extractVideoTitle(
        'Homemade Pizza Recipe - Best pizza ever',
        'Facebook',
        'https://fb.watch/error/'
      );

      expect(result).toBe('Homemade Pizza Recipe - Best Pizza Ever');
    });

    it('should return null when both metadata and caption extraction fail', async () => {
      mockGetYoutubeTitle.mockRejectedValue(new Error('YouTube error'));

      const result = await extractVideoTitle(
        'Random text without recipe content',
        'YouTube',
        'https://www.youtube.com/watch?v=fail'
      );

      expect(result).toBeNull();
    });
  });

  describe('Platform-specific behavior', () => {
    it('should only call YouTube title extraction for YouTube platform', async () => {
      mockGetFacebookTitle.mockResolvedValue('Facebook Title');

      await extractVideoTitle(
        'Some captions',
        'Facebook',
        'https://fb.watch/test/'
      );

      expect(mockGetYoutubeTitle).not.toHaveBeenCalled();
      expect(mockGetFacebookTitle).toHaveBeenCalled();
    });

    it('should only call Facebook title extraction for Facebook platform', async () => {
      mockGetYoutubeTitle.mockResolvedValue('YouTube Title');

      await extractVideoTitle(
        'Some captions',
        'YouTube',
        'https://www.youtube.com/watch?v=test'
      );

      expect(mockGetFacebookTitle).not.toHaveBeenCalled();
      expect(mockGetYoutubeTitle).toHaveBeenCalled();
    });

    it('should not call any metadata extraction for other platforms', async () => {
      const result = await extractVideoTitle(
        'Amazing Cookies Recipe - So good',
        'TikTok',
        'https://www.tiktok.com/@chef/video/123'
      );

      expect(mockGetYoutubeTitle).not.toHaveBeenCalled();
      expect(mockGetFacebookTitle).not.toHaveBeenCalled();
      expect(result).toBe('Amazing Cookies Recipe - So Good');
    });
  });
}); 
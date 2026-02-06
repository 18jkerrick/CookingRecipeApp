# Recipe Extraction Redesign Implementation Plan

**Goal:** Replace fragile custom scrapers with Supadata API, migrate to GPT-4o-mini with structured outputs, add confidence-based fallback logic, and improve visual extraction with parallel frame analysis.

**Architecture:** New layered architecture with `content/` (acquisition), `extraction/` (AI processing), and `visual/` (frame analysis) modules. ContentProvider interface abstracts Supadata/Apify/legacy scrapers. Zod schemas enforce structured outputs. Confidence scoring determines fallback needs.

**Tech Stack:** Supadata API, Apify (fallback), OpenAI GPT-4o-mini, Zod, OpenAI Embeddings (testing), Vitest

---

## Phase 1: Content Acquisition Layer (Supadata Integration)

### Task 1.1: Create ContentProvider Interface and Types

**Files:**
- Create: `packages/core/src/content/types.ts`
- Create: `packages/core/src/content/index.ts`
- Test: `tests/unit/content/types.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/content/types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  AcquiredContentSchema, 
  PlatformSchema,
  ContentAcquisitionError 
} from '../../../packages/core/src/content/types';

describe('Content Types', () => {
  describe('PlatformSchema', () => {
    it('accepts valid platforms', () => {
      expect(PlatformSchema.parse('tiktok')).toBe('tiktok');
      expect(PlatformSchema.parse('instagram')).toBe('instagram');
      expect(PlatformSchema.parse('youtube')).toBe('youtube');
      expect(PlatformSchema.parse('facebook')).toBe('facebook');
    });
    
    it('rejects invalid platforms', () => {
      expect(() => PlatformSchema.parse('invalid')).toThrow();
    });
  });
  
  describe('AcquiredContentSchema', () => {
    it('validates complete content object', () => {
      const content = {
        url: 'https://www.tiktok.com/@user/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
        caption: 'Recipe for soup',
        transcript: 'First add the ingredients...',
      };
      
      const result = AcquiredContentSchema.parse(content);
      expect(result.url).toBe(content.url);
      expect(result.platform).toBe('tiktok');
    });
    
    it('allows optional fields', () => {
      const content = {
        url: 'https://www.tiktok.com/@user/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
      };
      
      const result = AcquiredContentSchema.parse(content);
      expect(result.caption).toBeUndefined();
    });
  });
  
  describe('ContentAcquisitionError', () => {
    it('captures provider and url context', () => {
      const error = new ContentAcquisitionError(
        'Rate limit exceeded',
        'supadata',
        'https://example.com',
        undefined,
        true
      );
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.provider).toBe('supadata');
      expect(error.url).toBe('https://example.com');
      expect(error.isRetryable).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/content/types.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/content/types.ts
import { z } from 'zod';

/**
 * Supported social media platforms
 */
export const PlatformSchema = z.enum([
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'pinterest',
  'cooking_website',
  'unknown'
]);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Content types from social platforms
 */
export const ContentTypeSchema = z.enum(['video', 'photo', 'slideshow', 'reel', 'short']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

/**
 * Provider that successfully acquired the content
 */
export const ProviderSchema = z.enum(['supadata', 'apify', 'legacy']);
export type Provider = z.infer<typeof ProviderSchema>;

/**
 * Raw content acquired from a platform
 */
export const AcquiredContentSchema = z.object({
  // Source metadata
  url: z.string().url(),
  platform: PlatformSchema,
  contentType: ContentTypeSchema,
  provider: ProviderSchema,
  
  // Text content (all optional)
  caption: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  transcript: z.string().optional(),
  
  // Media URLs
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  audioUrl: z.string().url().optional(),
  
  // Engagement metadata
  metadata: z.object({
    views: z.number().optional(),
    likes: z.number().optional(),
    duration: z.number().optional(),
    creator: z.string().optional(),
  }).optional(),
});

export type AcquiredContent = z.infer<typeof AcquiredContentSchema>;

/**
 * Content provider interface
 */
export interface ContentProvider {
  name: Provider;
  supportedPlatforms: Platform[];
  
  acquire(url: string): Promise<AcquiredContent>;
  supports(url: string): boolean;
  getTranscript?(url: string): Promise<string | null>;
}

/**
 * Error class for content acquisition failures
 */
export class ContentAcquisitionError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly url: string,
    public readonly cause?: Error,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ContentAcquisitionError';
  }
}
```

```typescript
// packages/core/src/content/index.ts
export * from './types';
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/content/types.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/content/ tests/unit/content/
git commit -m "feat(content): add content acquisition types and interfaces"
```

---

### Task 1.2: Implement Supadata Provider

**Files:**
- Create: `packages/core/src/content/providers/supadata.ts`
- Test: `tests/unit/content/providers/supadata.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/content/providers/supadata.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupadataProvider } from '../../../../packages/core/src/content/providers/supadata';
import { ContentAcquisitionError } from '../../../../packages/core/src/content/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SupadataProvider', () => {
  let provider: SupadataProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SupadataProvider('test-api-key');
  });
  
  describe('supports', () => {
    it('returns true for TikTok URLs', () => {
      expect(provider.supports('https://www.tiktok.com/@user/video/123')).toBe(true);
    });
    
    it('returns true for Instagram URLs', () => {
      expect(provider.supports('https://www.instagram.com/reel/ABC123/')).toBe(true);
    });
    
    it('returns true for YouTube URLs', () => {
      expect(provider.supports('https://www.youtube.com/watch?v=abc')).toBe(true);
    });
    
    it('returns true for Facebook URLs', () => {
      expect(provider.supports('https://www.facebook.com/reel/123')).toBe(true);
    });
    
    it('returns false for unsupported URLs', () => {
      expect(provider.supports('https://www.pinterest.com/pin/123')).toBe(false);
    });
  });
  
  describe('acquire', () => {
    it('fetches transcript from Supadata API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [
            { text: 'First add the flour', offset: 0 },
            { text: 'Then mix in the eggs', offset: 1000 },
          ],
          lang: 'en',
        }),
      });
      
      const result = await provider.acquire('https://www.tiktok.com/@user/video/123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/transcript'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
      
      expect(result.platform).toBe('tiktok');
      expect(result.provider).toBe('supadata');
      expect(result.transcript).toContain('First add the flour');
    });
    
    it('throws ContentAcquisitionError on rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });
      
      await expect(
        provider.acquire('https://www.tiktok.com/@user/video/123')
      ).rejects.toThrow(ContentAcquisitionError);
      
      try {
        await provider.acquire('https://www.tiktok.com/@user/video/123');
      } catch (error) {
        expect((error as ContentAcquisitionError).isRetryable).toBe(true);
      }
    });
    
    it('throws ContentAcquisitionError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      
      try {
        await provider.acquire('https://www.tiktok.com/@user/video/123');
      } catch (error) {
        expect((error as ContentAcquisitionError).isRetryable).toBe(false);
      }
    });
  });
  
  describe('getTranscript', () => {
    it('returns transcript text joined by newlines', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [
            { text: 'Line one' },
            { text: 'Line two' },
          ],
        }),
      });
      
      const transcript = await provider.getTranscript('https://example.com');
      expect(transcript).toBe('Line one\nLine two');
    });
    
    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const transcript = await provider.getTranscript('https://example.com');
      expect(transcript).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/content/providers/supadata.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/content/providers/supadata.ts
import type { ContentProvider, AcquiredContent, Platform } from '../types';
import { ContentAcquisitionError } from '../types';

export class SupadataProvider implements ContentProvider {
  name = 'supadata' as const;
  supportedPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook'];
  
  private baseUrl = 'https://api.supadata.ai/v1';
  
  constructor(private apiKey: string) {}
  
  supports(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return this.supportedPlatforms.some(platform => 
      lowerUrl.includes(platform)
    );
  }
  
  async acquire(url: string): Promise<AcquiredContent> {
    const platform = this.detectPlatform(url);
    const transcript = await this.getTranscript(url);
    
    return {
      url,
      platform,
      contentType: 'video',
      provider: 'supadata',
      transcript: transcript ?? undefined,
    };
  }
  
  async getTranscript(url: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new ContentAcquisitionError(
          `Supadata API error: ${response.status}`,
          'supadata',
          url,
          undefined,
          response.status === 429 // Rate limit is retryable
        );
      }
      
      const data = await response.json();
      
      if (data.content && Array.isArray(data.content)) {
        return data.content.map((seg: { text: string }) => seg.text).join('\n');
      }
      
      return null;
    } catch (error) {
      if (error instanceof ContentAcquisitionError) {
        throw error;
      }
      return null;
    }
  }
  
  private detectPlatform(url: string): Platform {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('tiktok')) return 'tiktok';
    if (lowerUrl.includes('instagram')) return 'instagram';
    if (lowerUrl.includes('youtube')) return 'youtube';
    if (lowerUrl.includes('facebook')) return 'facebook';
    return 'unknown';
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/content/providers/supadata.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/content/providers/
git commit -m "feat(content): implement Supadata provider for content acquisition"
```

---

### Task 1.3: Implement Apify Fallback Provider

**Files:**
- Create: `packages/core/src/content/providers/apify.ts`
- Test: `tests/unit/content/providers/apify.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/content/providers/apify.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApifyProvider } from '../../../../packages/core/src/content/providers/apify';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApifyProvider', () => {
  let provider: ApifyProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ApifyProvider('test-api-key');
  });
  
  describe('supports', () => {
    it('returns true for TikTok URLs', () => {
      expect(provider.supports('https://www.tiktok.com/@user/video/123')).toBe(true);
    });
    
    it('returns true for Instagram URLs', () => {
      expect(provider.supports('https://www.instagram.com/reel/ABC/')).toBe(true);
    });
  });
  
  describe('acquire', () => {
    it('calls Apify actor API and returns content', async () => {
      // Mock actor run creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'run-123' }),
      });
      
      // Mock run status check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'SUCCEEDED' }),
      });
      
      // Mock dataset results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          text: 'Recipe caption here',
          transcript: 'Audio transcript here',
        }]),
      });
      
      const result = await provider.acquire('https://www.tiktok.com/@user/video/123');
      
      expect(result.provider).toBe('apify');
      expect(result.caption).toBe('Recipe caption here');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/content/providers/apify.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/content/providers/apify.ts
import type { ContentProvider, AcquiredContent, Platform } from '../types';
import { ContentAcquisitionError } from '../types';

export class ApifyProvider implements ContentProvider {
  name = 'apify' as const;
  supportedPlatforms: Platform[] = ['tiktok', 'instagram'];
  
  private baseUrl = 'https://api.apify.com/v2';
  
  // Apify actor IDs for each platform
  private actorIds: Record<string, string> = {
    tiktok: 'clockworks~tiktok-scraper',
    instagram: 'apify~instagram-reel-scraper',
  };
  
  constructor(private apiKey: string) {}
  
  supports(url: string): boolean {
    const platform = this.detectPlatform(url);
    return platform !== 'unknown' && platform in this.actorIds;
  }
  
  async acquire(url: string): Promise<AcquiredContent> {
    const platform = this.detectPlatform(url);
    const actorId = this.actorIds[platform];
    
    if (!actorId) {
      throw new ContentAcquisitionError(
        `No Apify actor for platform: ${platform}`,
        'apify',
        url,
        undefined,
        false
      );
    }
    
    // Start actor run
    const runResponse = await fetch(
      `${this.baseUrl}/acts/${actorId}/runs?token=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrls: [{ url }] }),
      }
    );
    
    if (!runResponse.ok) {
      throw new ContentAcquisitionError(
        `Apify run failed: ${runResponse.status}`,
        'apify',
        url,
        undefined,
        runResponse.status === 429
      );
    }
    
    const { id: runId } = await runResponse.json();
    
    // Wait for run to complete
    await this.waitForRun(runId);
    
    // Get results
    const resultsResponse = await fetch(
      `${this.baseUrl}/actor-runs/${runId}/dataset/items?token=${this.apiKey}`
    );
    
    const results = await resultsResponse.json();
    const item = results[0];
    
    return {
      url,
      platform,
      contentType: 'video',
      provider: 'apify',
      caption: item?.text || item?.caption,
      transcript: item?.transcript,
    };
  }
  
  private async waitForRun(runId: string, maxWaitMs = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(
        `${this.baseUrl}/actor-runs/${runId}?token=${this.apiKey}`
      );
      const { status } = await response.json();
      
      if (status === 'SUCCEEDED') return;
      if (status === 'FAILED' || status === 'ABORTED') {
        throw new ContentAcquisitionError(
          `Apify run ${status}`,
          'apify',
          '',
          undefined,
          false
        );
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    throw new ContentAcquisitionError('Apify run timeout', 'apify', '', undefined, true);
  }
  
  private detectPlatform(url: string): Platform {
    if (url.includes('tiktok')) return 'tiktok';
    if (url.includes('instagram')) return 'instagram';
    return 'unknown';
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/content/providers/apify.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/content/providers/apify.ts tests/unit/content/providers/apify.test.ts
git commit -m "feat(content): implement Apify fallback provider"
```

---

### Task 1.4: Implement ContentService with Fallback Chain

**Files:**
- Create: `packages/core/src/content/content-service.ts`
- Test: `tests/unit/content/content-service.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/content/content-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentService, ContentServiceConfig } from '../../../../packages/core/src/content/content-service';
import { ContentAcquisitionError } from '../../../../packages/core/src/content/types';

// Mock providers
vi.mock('../../../../packages/core/src/content/providers/supadata', () => ({
  SupadataProvider: vi.fn().mockImplementation(() => ({
    name: 'supadata',
    supports: vi.fn().mockReturnValue(true),
    acquire: vi.fn(),
  })),
}));

vi.mock('../../../../packages/core/src/content/providers/apify', () => ({
  ApifyProvider: vi.fn().mockImplementation(() => ({
    name: 'apify',
    supports: vi.fn().mockReturnValue(true),
    acquire: vi.fn(),
  })),
}));

describe('ContentService', () => {
  const config: ContentServiceConfig = {
    supadata: { apiKey: 'test-supadata', enabled: true },
    apify: { apiKey: 'test-apify', enabled: true },
    legacy: { enabled: false },
    maxRetries: 2,
    retryDelayMs: 100,
  };
  
  describe('acquire', () => {
    it('returns content from primary provider (Supadata)', async () => {
      const service = new ContentService(config);
      const mockContent = {
        url: 'https://tiktok.com/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
        transcript: 'Test transcript',
      };
      
      // Access internal providers to mock
      const providers = (service as any).providers;
      providers[0].acquire.mockResolvedValueOnce(mockContent);
      
      const result = await service.acquire('https://tiktok.com/video/123');
      
      expect(result.provider).toBe('supadata');
      expect(result.transcript).toBe('Test transcript');
    });
    
    it('falls back to Apify when Supadata fails', async () => {
      const service = new ContentService(config);
      const providers = (service as any).providers;
      
      // Supadata fails
      providers[0].acquire.mockRejectedValueOnce(
        new ContentAcquisitionError('Rate limit', 'supadata', '', undefined, false)
      );
      
      // Apify succeeds
      const apifyContent = {
        url: 'https://tiktok.com/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'apify',
        caption: 'Fallback caption',
      };
      providers[1].acquire.mockResolvedValueOnce(apifyContent);
      
      const result = await service.acquire('https://tiktok.com/video/123');
      
      expect(result.provider).toBe('apify');
    });
    
    it('retries on retryable errors', async () => {
      const service = new ContentService(config);
      const providers = (service as any).providers;
      
      // First attempt fails (retryable)
      providers[0].acquire.mockRejectedValueOnce(
        new ContentAcquisitionError('Rate limit', 'supadata', '', undefined, true)
      );
      
      // Retry succeeds
      const content = {
        url: 'https://tiktok.com/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
      };
      providers[0].acquire.mockResolvedValueOnce(content);
      
      const result = await service.acquire('https://tiktok.com/video/123');
      
      expect(providers[0].acquire).toHaveBeenCalledTimes(2);
      expect(result.provider).toBe('supadata');
    });
    
    it('throws AggregateError when all providers fail', async () => {
      const service = new ContentService(config);
      const providers = (service as any).providers;
      
      providers[0].acquire.mockRejectedValue(new Error('Supadata failed'));
      providers[1].acquire.mockRejectedValue(new Error('Apify failed'));
      
      await expect(
        service.acquire('https://tiktok.com/video/123')
      ).rejects.toThrow(AggregateError);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/content/content-service.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/content/content-service.ts
import type { ContentProvider, AcquiredContent } from './types';
import { ContentAcquisitionError } from './types';
import { SupadataProvider } from './providers/supadata';
import { ApifyProvider } from './providers/apify';

export interface ContentServiceConfig {
  supadata: { apiKey: string; enabled: boolean };
  apify: { apiKey: string; enabled: boolean };
  legacy: { enabled: boolean };
  maxRetries: number;
  retryDelayMs: number;
}

export class ContentService {
  private providers: ContentProvider[];
  
  constructor(private config: ContentServiceConfig) {
    this.providers = this.initializeProviders();
  }
  
  async acquire(url: string): Promise<AcquiredContent> {
    const errors: Error[] = [];
    
    for (const provider of this.providers) {
      if (!provider.supports(url)) continue;
      
      try {
        console.log(`📡 Trying ${provider.name} for ${url}`);
        const content = await this.withRetry(
          () => provider.acquire(url),
          provider.name
        );
        console.log(`✅ ${provider.name} succeeded`);
        return content;
      } catch (error) {
        console.warn(`⚠️ ${provider.name} failed:`, error);
        errors.push(error as Error);
      }
    }
    
    throw new AggregateError(
      errors,
      `All content providers failed for ${url}`
    );
  }
  
  private initializeProviders(): ContentProvider[] {
    const providers: ContentProvider[] = [];
    
    if (this.config.supadata.enabled) {
      providers.push(new SupadataProvider(this.config.supadata.apiKey));
    }
    if (this.config.apify.enabled) {
      providers.push(new ApifyProvider(this.config.apify.apiKey));
    }
    
    return providers;
  }
  
  private async withRetry<T>(
    fn: () => Promise<T>,
    providerName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof ContentAcquisitionError && !error.isRetryable) {
          throw error;
        }
        
        if (attempt < this.config.maxRetries) {
          console.log(`⏳ Retry ${attempt}/${this.config.maxRetries} for ${providerName}`);
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }
    
    throw lastError!;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/content/content-service.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/content/content-service.ts tests/unit/content/content-service.test.ts
git commit -m "feat(content): implement ContentService with provider fallback chain"
```

---

## Phase 2: Structured Output Schema & GPT-4o-mini Migration

### Task 2.1: Create Recipe Extraction Schema

**Files:**
- Create: `packages/core/src/extraction/schemas/recipe-schema.ts`
- Create: `packages/core/src/extraction/index.ts`
- Test: `tests/unit/extraction/schemas/recipe-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/extraction/schemas/recipe-schema.test.ts
import { describe, it, expect } from 'vitest';
import { 
  IngredientSchema,
  ConfidenceScoreSchema,
  ExtractedRecipeSchema,
} from '../../../../packages/core/src/extraction/schemas/recipe-schema';

describe('Recipe Schema', () => {
  describe('IngredientSchema', () => {
    it('parses complete ingredient', () => {
      const ingredient = {
        raw: '2 cups flour, sifted',
        quantity: 2,
        unit: 'cups',
        name: 'flour',
        preparation: 'sifted',
        notes: null,
      };
      
      const result = IngredientSchema.parse(ingredient);
      expect(result.name).toBe('flour');
      expect(result.quantity).toBe(2);
    });
    
    it('allows null quantity and unit', () => {
      const ingredient = {
        raw: 'salt to taste',
        quantity: null,
        unit: null,
        name: 'salt',
        preparation: null,
        notes: 'to taste',
      };
      
      const result = IngredientSchema.parse(ingredient);
      expect(result.quantity).toBeNull();
    });
  });
  
  describe('ConfidenceScoreSchema', () => {
    it('validates confidence between 0 and 1', () => {
      const confidence = {
        overall: 0.85,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.85,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'High quality extraction',
      };
      
      const result = ConfidenceScoreSchema.parse(confidence);
      expect(result.overall).toBe(0.85);
    });
    
    it('rejects confidence > 1', () => {
      const confidence = {
        overall: 1.5,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.85,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Invalid',
      };
      
      expect(() => ConfidenceScoreSchema.parse(confidence)).toThrow();
    });
  });
  
  describe('ExtractedRecipeSchema', () => {
    it('validates complete recipe', () => {
      const recipe = {
        title: 'Chocolate Chip Cookies',
        description: 'Classic cookies',
        ingredients: [
          { raw: '2 cups flour', quantity: 2, unit: 'cups', name: 'flour', preparation: null, notes: null },
        ],
        instructions: ['Mix ingredients', 'Bake at 350F'],
        servings: 24,
        prepTime: '15 min',
        cookTime: '12 min',
        totalTime: '27 min',
        confidence: {
          overall: 0.9,
          title: 0.95,
          ingredients: 0.85,
          instructions: 0.9,
          hasQuantities: true,
          hasSteps: true,
          isCompleteRecipe: true,
          reasoning: 'Complete recipe with all fields',
        },
        source: 'caption',
        extractionTimestamp: '2026-02-05T12:00:00.000Z',
      };
      
      const result = ExtractedRecipeSchema.parse(recipe);
      expect(result.title).toBe('Chocolate Chip Cookies');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/extraction/schemas/recipe-schema.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/extraction/schemas/recipe-schema.ts
import { z } from 'zod';

/**
 * Individual ingredient with parsed components
 */
export const IngredientSchema = z.object({
  raw: z.string().describe('Original ingredient text'),
  quantity: z.number().nullable().describe('Numeric quantity'),
  unit: z.string().nullable().describe('Unit of measurement'),
  name: z.string().describe('Ingredient name'),
  preparation: z.string().nullable().describe('Preparation method'),
  notes: z.string().nullable().describe('Additional notes'),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

/**
 * Confidence scoring for extraction quality
 */
export const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1).describe('Overall confidence 0-1'),
  title: z.number().min(0).max(1).describe('Title confidence'),
  ingredients: z.number().min(0).max(1).describe('Ingredients confidence'),
  instructions: z.number().min(0).max(1).describe('Instructions confidence'),
  hasQuantities: z.boolean().describe('Whether quantities were found'),
  hasSteps: z.boolean().describe('Whether clear steps were found'),
  isCompleteRecipe: z.boolean().describe('Whether this appears complete'),
  reasoning: z.string().describe('Explanation of confidence assessment'),
});

export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

/**
 * Source of the extraction
 */
export const ExtractionSourceSchema = z.enum(['caption', 'transcript', 'visual', 'combined']);
export type ExtractionSource = z.infer<typeof ExtractionSourceSchema>;

/**
 * Complete extracted recipe with confidence scoring
 */
export const ExtractedRecipeSchema = z.object({
  title: z.string().describe('Recipe title'),
  description: z.string().nullable().describe('Brief description'),
  ingredients: z.array(IngredientSchema).describe('List of ingredients'),
  instructions: z.array(z.string()).describe('Step-by-step instructions'),
  servings: z.number().nullable().describe('Number of servings'),
  prepTime: z.string().nullable().describe('Preparation time'),
  cookTime: z.string().nullable().describe('Cooking time'),
  totalTime: z.string().nullable().describe('Total time'),
  confidence: ConfidenceScoreSchema,
  source: ExtractionSourceSchema,
  extractionTimestamp: z.string().datetime(),
});

export type ExtractedRecipe = z.infer<typeof ExtractedRecipeSchema>;

/**
 * Schema for OpenAI structured output (simplified for API compatibility)
 */
export const AIExtractionResponseSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  ingredients: z.array(z.object({
    raw: z.string(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    name: z.string(),
    preparation: z.string().nullable(),
    notes: z.string().nullable(),
  })),
  instructions: z.array(z.string()),
  servings: z.number().nullable(),
  prepTime: z.string().nullable(),
  cookTime: z.string().nullable(),
  confidence: z.object({
    overall: z.number(),
    title: z.number(),
    ingredients: z.number(),
    instructions: z.number(),
    hasQuantities: z.boolean(),
    hasSteps: z.boolean(),
    isCompleteRecipe: z.boolean(),
    reasoning: z.string(),
  }),
});

export type AIExtractionResponse = z.infer<typeof AIExtractionResponseSchema>;
```

```typescript
// packages/core/src/extraction/index.ts
export * from './schemas/recipe-schema';
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/extraction/schemas/recipe-schema.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/extraction/ tests/unit/extraction/
git commit -m "feat(extraction): add Zod schemas for recipe extraction with confidence scoring"
```

---

### Task 2.2: Implement Caption Extractor with GPT-4o-mini

**Files:**
- Create: `packages/core/src/extraction/extractors/caption-extractor.ts`
- Test: `tests/unit/extraction/extractors/caption-extractor.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/extraction/extractors/caption-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaptionExtractor } from '../../../../packages/core/src/extraction/extractors/caption-extractor';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      beta: {
        chat: {
          completions: {
            parse: vi.fn(),
          },
        },
      },
    })),
  };
});

describe('CaptionExtractor', () => {
  let extractor: CaptionExtractor;
  let mockParse: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new CaptionExtractor('test-api-key');
    mockParse = (extractor as any).openai.beta.chat.completions.parse;
  });
  
  describe('extract', () => {
    it('returns structured recipe from caption', async () => {
      const mockResponse = {
        title: 'Chocolate Chip Cookies',
        description: 'Classic homemade cookies',
        ingredients: [
          { raw: '2 cups flour', quantity: 2, unit: 'cups', name: 'flour', preparation: null, notes: null },
          { raw: '1 cup sugar', quantity: 1, unit: 'cup', name: 'sugar', preparation: null, notes: null },
        ],
        instructions: ['Mix dry ingredients', 'Add wet ingredients', 'Bake at 350F'],
        servings: 24,
        prepTime: '15 min',
        cookTime: '12 min',
        confidence: {
          overall: 0.9,
          title: 0.95,
          ingredients: 0.85,
          instructions: 0.9,
          hasQuantities: true,
          hasSteps: true,
          isCompleteRecipe: true,
          reasoning: 'Complete recipe with clear ingredients and steps',
        },
      };
      
      mockParse.mockResolvedValueOnce({
        choices: [{ message: { parsed: mockResponse } }],
      });
      
      const result = await extractor.extract('Recipe for cookies: 2 cups flour, 1 cup sugar...');
      
      expect(result.title).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toHaveLength(2);
      expect(result.confidence.overall).toBe(0.9);
      expect(result.source).toBe('caption');
    });
    
    it('uses GPT-4o-mini model', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [{ message: { parsed: { title: 'Test', ingredients: [], instructions: [], confidence: { overall: 0.5 } } } }],
      });
      
      await extractor.extract('Test caption');
      
      expect(mockParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        })
      );
    });
    
    it('throws error when parsing fails', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [{ message: { parsed: null } }],
      });
      
      await expect(extractor.extract('Test')).rejects.toThrow('Failed to parse');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/extraction/extractors/caption-extractor.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// packages/core/src/extraction/extractors/caption-extractor.ts
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { 
  AIExtractionResponseSchema, 
  type ExtractedRecipe 
} from '../schemas/recipe-schema';

export class CaptionExtractor {
  private openai: OpenAI;
  private model = 'gpt-4o-mini';
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }
  
  async extract(caption: string): Promise<ExtractedRecipe> {
    const completion = await this.openai.beta.chat.completions.parse({
      model: this.model,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: `Extract the recipe from this video caption:\n\n${caption}` },
      ],
      response_format: zodResponseFormat(AIExtractionResponseSchema, 'recipe'),
      temperature: 0.1,
    });
    
    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error('Failed to parse extraction response');
    }
    
    return {
      ...parsed,
      totalTime: this.calculateTotalTime(parsed.prepTime, parsed.cookTime),
      source: 'caption',
      extractionTimestamp: new Date().toISOString(),
    };
  }
  
  private getSystemPrompt(): string {
    return `You are a recipe extraction expert. Extract structured recipe data from video captions.

EXTRACTION RULES:
1. Only extract if there are CLEAR recipe instructions with specific steps
2. Do NOT extract from mere food descriptions like "delicious pasta"
3. Parse ingredients into components (quantity, unit, name, preparation)
4. If "recipe in bio" or no actual recipe content, set isCompleteRecipe=false

CONFIDENCE SCORING (0.0-1.0):
- 0.9-1.0: Complete recipe with clear ingredients and steps
- 0.7-0.8: Mostly complete, minor details might be missing
- 0.5-0.6: Partial recipe, key ingredients or steps unclear
- Below 0.5: Insufficient information to cook the dish

Set isCompleteRecipe=false if:
- Missing most ingredients
- Missing cooking steps
- Caption just mentions food without instructions

INGREDIENT PARSING EXAMPLES:
- "2 cups flour, sifted" → quantity:2, unit:"cups", name:"flour", preparation:"sifted"
- "salt to taste" → quantity:null, unit:null, name:"salt", notes:"to taste"
- "1/2 lb ground pork" → quantity:0.5, unit:"lb", name:"ground pork"`;
  }
  
  private calculateTotalTime(prepTime: string | null, cookTime: string | null): string | null {
    // Simple implementation - could be enhanced
    if (!prepTime && !cookTime) return null;
    if (!prepTime) return cookTime;
    if (!cookTime) return prepTime;
    return `${prepTime} + ${cookTime}`;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/extraction/extractors/caption-extractor.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/extraction/extractors/ tests/unit/extraction/extractors/
git commit -m "feat(extraction): implement CaptionExtractor with GPT-4o-mini and structured outputs"
```

---

## Phase 3: Testing Infrastructure

### Task 3.1: Implement Semantic Similarity Test Utilities

**Files:**
- Create: `tests/utils/semantic-similarity.ts`
- Test: `tests/utils/semantic-similarity.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/utils/semantic-similarity.test.ts
import { describe, it, expect, vi } from 'vitest';
import { 
  getEmbedding, 
  cosineSimilarity, 
  assertRecipeSimilarity 
} from './semantic-similarity';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      }),
    },
  })),
}));

describe('Semantic Similarity', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });
    
    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
    });
    
    it('returns value between 0 and 1 for similar vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 4];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });
  });
  
  describe('assertRecipeSimilarity', () => {
    it('passes when similarity exceeds threshold', async () => {
      const actual = {
        title: 'Chocolate Chip Cookies',
        ingredients: [{ raw: '2 cups flour', name: 'flour', quantity: 2, unit: 'cups', preparation: null, notes: null }],
        instructions: ['Mix ingredients', 'Bake at 350F'],
      };
      
      const expected = {
        expectedTitle: 'Chocolate Chip Cookies',
        expectedIngredients: ['2 cups flour'],
        expectedInstructions: ['Mix ingredients', 'Bake at 350F'],
      };
      
      // With mocked embeddings returning same vector, similarity will be 1.0
      const result = await assertRecipeSimilarity(actual as any, expected, 0.85);
      
      expect(result.passed).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/utils/semantic-similarity.test.ts
```
Expected: FAIL - Module not found

**Step 3: Write minimal implementation**

```typescript
// tests/utils/semantic-similarity.ts
import OpenAI from 'openai';
import type { ExtractedRecipe } from '../../packages/core/src/extraction/schemas/recipe-schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export interface RecipeTestCase {
  url: string;
  platform?: string;
  expectedTitle: string;
  expectedIngredients: string[];
  expectedInstructions: string[];
}

export interface SimilarityResult {
  passed: boolean;
  scores: {
    titleSimilarity: number;
    ingredientsSimilarity: number;
    instructionsSimilarity: number;
  };
}

export async function assertRecipeSimilarity(
  actual: ExtractedRecipe,
  expected: RecipeTestCase,
  threshold: number = 0.85
): Promise<SimilarityResult> {
  // Get embeddings for title
  const [actualTitleEmb, expectedTitleEmb] = await Promise.all([
    getEmbedding(actual.title),
    getEmbedding(expected.expectedTitle),
  ]);
  const titleSimilarity = cosineSimilarity(actualTitleEmb, expectedTitleEmb);
  
  // Get embeddings for ingredients
  const actualIngredients = actual.ingredients.map(i => i.raw).join('\n');
  const expectedIngredients = expected.expectedIngredients.join('\n');
  const [actualIngEmb, expectedIngEmb] = await Promise.all([
    getEmbedding(actualIngredients),
    getEmbedding(expectedIngredients),
  ]);
  const ingredientsSimilarity = cosineSimilarity(actualIngEmb, expectedIngEmb);
  
  // Get embeddings for instructions
  const actualInstructions = actual.instructions.join('\n');
  const expectedInstructions = expected.expectedInstructions.join('\n');
  const [actualInstEmb, expectedInstEmb] = await Promise.all([
    getEmbedding(actualInstructions),
    getEmbedding(expectedInstructions),
  ]);
  const instructionsSimilarity = cosineSimilarity(actualInstEmb, expectedInstEmb);
  
  const passed = 
    titleSimilarity >= 0.80 &&  // Title threshold slightly lower
    ingredientsSimilarity >= threshold &&
    instructionsSimilarity >= 0.80;  // Instructions threshold slightly lower
  
  return {
    passed,
    scores: {
      titleSimilarity,
      ingredientsSimilarity,
      instructionsSimilarity,
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/utils/semantic-similarity.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/utils/semantic-similarity.ts tests/utils/semantic-similarity.test.ts
git commit -m "feat(testing): add semantic similarity utilities for recipe comparison"
```

---

## Phase 4-6: Remaining Tasks (Summary)

The remaining phases follow the same TDD pattern. Here's a summary:

### Phase 4: Confidence Scoring

- **Task 4.1:** Create `ConfidenceScorer` class with scoring logic
- **Task 4.2:** Implement threshold configuration and fallback decisions
- **Task 4.3:** Add confidence scoring to ExtractionService

### Phase 5: Visual Extraction Improvements

- **Task 5.1:** Split `video.ts` into `visual/frame-extractor.ts` (FFmpeg logic)
- **Task 5.2:** Create `visual/frame-analyzer.ts` with parallel analysis
- **Task 5.3:** Create `visual/frame-consolidator.ts` for merging results
- **Task 5.4:** Create `VisualExtractor` that orchestrates the pipeline

### Phase 6: Integration & Migration

- **Task 6.1:** Create `ExtractionService` that orchestrates the full pipeline
- **Task 6.2:** Update API route to use new extraction service
- **Task 6.3:** Add feature flags for gradual rollout
- **Task 6.4:** Migrate existing tests to new architecture
- **Task 6.5:** Deprecate old `parsers/` and `ai/` modules

---

## Success Metrics

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| Scraper success rate | ~70% | 95% | API response rate |
| Complete recipes | ~70% | 90% | Fields populated check |
| Caption extraction time | 15s | <10s | p95 latency |
| Visual extraction time | 60s | <40s | p95 latency |
| Test case pass rate | N/A | 100% | Semantic similarity tests |

---

## Rollout Plan

1. **Week 1-2:** Deploy Supadata integration behind feature flag
2. **Week 3:** Enable GPT-4o-mini with structured outputs (5% rollout)
3. **Week 4:** Gradual rollout (5% → 20% → 50% → 100%)
4. **Week 5:** Enable confidence-based fallback
5. **Week 6:** Deploy visual extraction improvements

---

**Plan saved. Ready to execute task-by-task. Say 'go' to start with Task 1.1, or 'next task' to step through one at a time.**

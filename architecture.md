# 🍳 Cooking Recipe App - Architecture Overview

## Core Philosophy
**Smart Content Extraction**: Triple-fallback system that intelligently extracts recipes from social media cooking videos using captions, audio transcription, and computer vision analysis.

## 🔄 Content Processing Pipeline

### Three-Tier Fallback System
1. **Caption Extraction** (Primary) - Fast, accurate text extraction
2. **Audio Transcription** (Secondary) - When captions unavailable/poor quality  
3. **Computer Vision Analysis** (Tertiary) - Visual analysis of cooking actions

### Processing Flow
```
URL Input → Platform Detection → Content Extraction → AI Processing → Recipe Output
```

## 📁 Current File Structure

```
cooking_recipe_app/
├── app/                          # Next.js app directory (app router)
│   ├── api/
│   │   ├── parse-url/           # Main recipe extraction endpoint
│   │   └── grocery-lists/       # Grocery list management
│   ├── dashboard/               # User interface pages
│   ├── groceries/
│   ├── layout.tsx
│   └── page.tsx                 # Main landing page
├── components/                   # React UI components
│   ├── UrlInput.tsx
│   ├── RecipeCard.tsx
│   └── GroceryList.tsx
├── lib/                         # Core business logic
│   ├── parser/                  # Platform-specific content extractors
│   │   ├── video.ts            # Computer vision analysis (818 lines)
│   │   ├── audio.ts            # Audio transcription pipeline
│   │   ├── youtube.ts          # YouTube caption extraction
│   │   ├── tiktok.ts           # TikTok caption extraction  
│   │   └── instagram.ts        # Instagram caption extraction
│   ├── ai/                     # AI processing utilities
│   │   ├── extractFromCaption.ts    # Recipe extraction from captions
│   │   ├── extractFromTranscript.ts # Recipe extraction from audio transcripts
│   │   ├── transcribeAudio.ts       # Audio → text conversion
│   │   ├── cleanCaption.ts          # Caption preprocessing
│   │   └── detectMusicContent.ts   # Music detection for content filtering
│   └── utils/                  # Utility functions
├── types/                      # TypeScript type definitions
└── public/                     # Static assets
```

## 🧠 Core Systems

### Platform Detection & Content Extraction

**Supported Platforms:**
- YouTube (captions, audio, video)
- TikTok (captions, audio, video + photo posts)
- Instagram (captions, audio, video)

**Content Extraction Methods:**

1. **Caption-Based** (`lib/parser/{platform}.ts`)
   - Uses platform APIs and yt-dlp for subtitle extraction
   - Fastest and most accurate when available
   - Processed by `extractFromCaption.ts`

2. **Audio Transcription** (`lib/parser/audio.ts`)
   - Downloads audio using yt-dlp
   - OpenAI Whisper API transcription
   - Music content detection and filtering
   - Processed by `extractFromTranscript.ts`

3. **Computer Vision Analysis** (`lib/parser/video.ts`)
   - Downloads video using yt-dlp (bypasses streaming 403 errors)
   - Strategic frame extraction using FFmpeg
   - OpenAI Vision API analysis of cooking actions
   - Identifies ingredients, cooking techniques, and recipe steps visually

### Video Analysis Deep Dive

**Frame Extraction Strategy:**
- Downloads full video locally to avoid streaming restrictions
- Extracts 3-5 strategic frames (beginning, middle, end of cooking)
- Uses adaptive timestamps based on video duration

**Computer Vision Analysis:**
- OpenAI Vision API with cooking-specific prompts
- Identifies ingredients being used and their preparation state
- Detects cooking actions (chopping, sautéing, seasoning, etc.)
- Extracts recipe steps from visual cooking demonstrations
- Combines analysis from multiple frames into coherent recipe

**Technical Implementation:**
```typescript
extractTextFromVideo(url) →
  extractCookingFrames(url) →
    downloadVideoForFrames(url) →
    extractFramesFromLocalFile(videoPath) →
  analyzeFramesWithVision(frames) →
    analyzeFrameWithOpenAI(frame) →
  combineVisionAnalysis(results)
```

### AI Processing

**OpenAI Integration:**
- GPT-4 for text-based recipe extraction
- Whisper for audio transcription
- Vision API for frame analysis

**Processing Strategies:**
- Content type detection (cooking vs non-cooking)
- Ingredient standardization and quantity extraction
- Step-by-step instruction generation
- Metadata extraction (cook time, servings, etc.)

## 🔧 Technical Architecture

### Backend Processing
- All AI API calls handled server-side to protect API keys
- Asynchronous processing with proper error handling
- Temporary file management with automatic cleanup
- Streaming protection bypass using download-first approach

### Content Processing Flow
```
1. URL validation and platform detection
2. Attempt caption extraction (fastest)
3. If captions unavailable/poor quality → audio transcription
4. If audio fails/inadequate → computer vision analysis
5. AI processing to extract structured recipe data
6. Return formatted recipe with ingredients and instructions
```

### Error Handling & Resilience
- Graceful fallback between extraction methods
- Platform-specific error handling (403 streaming, geo-blocking)
- Temporary file cleanup on success/failure
- Comprehensive logging and debugging

## 🚀 Current Capabilities

**Content Analysis:**
- ✅ YouTube caption extraction
- ✅ TikTok caption extraction  
- ✅ Instagram caption extraction
- ✅ Audio transcription (all platforms)
- ✅ Computer vision cooking analysis
- ✅ TikTok photo post analysis
- ✅ Music content detection and filtering

**Recipe Processing:**
- ✅ Ingredient extraction and standardization
- ✅ Step-by-step instruction generation
- ✅ Cooking technique identification
- ✅ Metadata extraction (servings, time, etc.)

**Technical Features:**
- ✅ Three-tier fallback system
- ✅ Anti-streaming protection bypass
- ✅ Strategic frame extraction
- ✅ Temporary file management
- ✅ Comprehensive error handling

## 🔮 Architecture Strengths

1. **Resilient Content Extraction**: Multiple fallback methods ensure high success rate
2. **Platform Agnostic**: Unified interface supports major social media platforms  
3. **Advanced Computer Vision**: Goes beyond OCR to actual cooking action recognition
4. **Performance Optimized**: Strategic frame sampling minimizes API costs
5. **Production Ready**: Proper error handling, cleanup, and logging

## 🛠 Development Considerations

**Current Focus**: Perfecting the computer vision pipeline for robust cooking content analysis

**Key Technical Challenges Solved:**
- Social media streaming restrictions (403 errors)
- Complex video frame extraction and timing
- Cooking-specific computer vision prompting
- Multi-modal content processing pipeline

**Next Enhancement Opportunities:**
- Real-time processing optimization
- Enhanced ingredient quantity detection
- Cooking technique classification refinement
- Multi-language recipe support
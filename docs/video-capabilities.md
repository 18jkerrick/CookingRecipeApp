# Video-to-Text Capability Research

**Task 3.1 Results: Research Video-to-Text Capability**

This document analyzes available video analysis services for extracting recipe content from cooking videos as part of MVP2 Phase 3 implementation.

## Executive Summary

**OpenAI does NOT currently support direct video analysis.** Video must be processed by extracting frames and analyzing them as individual images. Several alternative services provide comprehensive video analysis capabilities.

## OpenAI GPT-4 Vision Analysis

### Current Capabilities
- ✅ **Image Analysis**: GPT-4 Vision can analyze individual frames extracted from videos
- ❌ **Direct Video Input**: No native video file support in OpenAI API
- ⚠️ **Frame-Based Workaround**: Extract video frames using FFmpeg/OpenCV, then analyze frames

### Implementation Approach
```javascript
// Extract frames using FFmpeg/yt-dlp
const frames = await extractVideoFrames(videoUrl, intervalSeconds: 2);
// Analyze frames with OpenAI Vision
const analysis = await openai.chat.completions.create({
  model: "gpt-4-vision-preview", 
  messages: [{ 
    role: "user", 
    content: [
      { type: "text", text: "Extract recipe from these cooking video frames" },
      ...frames.map(frame => ({ 
        type: "image_url", 
        image_url: { url: `data:image/jpeg;base64,${frame}` }
      }))
    ]
  }]
});
```

### Limitations
- **Frame Limit**: ~20 images per request (context window constraints)
- **No Temporal Understanding**: Cannot understand motion or timing between frames
- **Cost**: High token usage for multiple frames
- **Processing Time**: Sequential frame analysis is slow

## Alternative Video Analysis Services

### 1. Google Cloud Video Intelligence API ⭐ **RECOMMENDED**
- ✅ **Native Video Support**: Direct video file processing
- ✅ **Text Detection/OCR**: Extract text overlays from cooking videos
- ✅ **Object Detection**: Identify ingredients, utensils, cooking actions
- ✅ **Speech Transcription**: Built-in audio transcription
- ✅ **Shot Detection**: Automatic scene segmentation
- ✅ **Label Detection**: Pre-trained recognition of 20,000+ objects

**Sample API Call**:
```javascript
const request = {
  inputUri: 'gs://bucket/cooking-video.mp4',
  features: [
    'LABEL_DETECTION',
    'TEXT_DETECTION', 
    'SPEECH_TRANSCRIPTION',
    'OBJECT_TRACKING'
  ]
};
```

**Cost**: $0.10 per minute of video analysis

### 2. Microsoft Azure Video Indexer
- ✅ **OCR & Text Recognition**: Extract recipe text from video overlays
- ✅ **People Detection**: Identify chefs/cooking personalities  
- ✅ **Transcript Generation**: Speech-to-text with timestamps
- ✅ **Scene Detection**: Automatic video segmentation

### 3. Amazon Rekognition Video
- ✅ **Object Detection**: Identify cooking ingredients and tools
- ✅ **Text Detection**: Extract recipe text from frames
- ✅ **Celebrity Recognition**: Identify famous chefs
- ❌ **No Built-in Transcription**: Requires separate AWS Transcribe service

### 4. AssemblyAI
- ✅ **Video Transcription**: Specialized in speech-to-text for video
- ✅ **Speaker Detection**: Identify different speakers in cooking shows
- ❌ **Limited Visual Analysis**: Primarily audio-focused

## Recommended Architecture for Cooking Recipe Extraction

### Option A: Google Cloud Video Intelligence (Primary)
```
Video URL → Video Intelligence API → {
  transcript: "Add 2 cups flour to mixing bowl...",
  labels: ["flour", "mixing bowl", "measuring cup"],
  text_annotations: ["2 CUPS FLOUR", "Recipe by Chef Smith"],
  timestamps: [0.5, 2.3, 4.1]
} → Recipe Extraction (GPT)
```

### Option B: OpenAI Frame Analysis (Fallback)
```
Video URL → Extract Frames (every 3s) → OpenAI Vision → {
  frame_analysis: ["Chef adds flour", "Measuring ingredients", "Mixing batter"],
  detected_text: ["2 cups", "Recipe ingredients"]
} → Recipe Extraction (GPT)
```

## Implementation Strategy

### Phase 3.1: Research ✅ **COMPLETE**
Document available video analysis services

### Phase 3.2: Google Cloud Integration  
Implement Google Video Intelligence API for comprehensive video analysis

### Phase 3.3: OpenAI Frame Fallback
Implement OpenAI Vision frame analysis as backup when Google Cloud fails

### Phase 3.4: Hybrid Approach
Combine visual analysis with existing audio transcription for maximum coverage

## Cost Analysis (per 10-minute cooking video)

| Service | Cost | Coverage |
|---------|------|----------|
| Google Video Intelligence | $1.00 | Video + Audio + Text |
| OpenAI Vision (120 frames) | $2.40 | Visual only |
| Current Audio Pipeline | $0.20 | Audio only |
| **Recommended Hybrid** | **$1.20** | **Complete coverage** |

## Next Steps

1. **Task 3.2**: Implement Google Cloud Video Intelligence API
2. **Task 3.3**: Create OpenAI Vision frame extraction fallback  
3. **Task 3.4**: Build hybrid pipeline orchestration
4. **Task 4.1**: Integrate video analysis into existing caption → audio → video pipeline

## References
- [Google Cloud Video Intelligence API](https://cloud.google.com/video-intelligence)
- [OpenAI Vision Cookbook](https://cookbook.openai.com/examples/gpt_with_vision_for_video_understanding)
- [Microsoft Azure Video Indexer](https://azure.microsoft.com/en-us/services/media-services/video-indexer/)
- [Amazon Rekognition Video](https://aws.amazon.com/rekognition/video-features/) 
🚀 MVP2 Build Plan

A granular, step-by-step checklist for adding intelligent recipe extraction (caption → audio → video). Each task is single-concern, testable, with a clear start and end.

1. Caption-Based Extraction

**Task 1.1: Fetch Raw Captions

Start: No caption-fetch function exists.

Action: In lib/parser/youtube.ts, implement async function fetchCaptions(url: string): Promise<string> using youtube-dl (or appropriate API) to return raw caption text.

End: Calling fetchCaptions(youtubeUrl) resolves with caption text (verified via unit test).

**Task 1.2: Normalize Captions

Start: Raw caption text returned.

Action: In lib/ai/cleanCaption.ts, write async function cleanCaption(raw: string): Promise<string> that calls OpenAI chat completion with prompt to tidy and unify format.

End: Given messy caption, cleanCaption returns cleaned-up text (assert expected formatted string).

**Task 1.3: Parse Recipe from Caption

Start: Cleaned caption string.

Action: In lib/ai/extractFromCaption.ts, write async function extractRecipeFromCaption(text: string): Promise<{ ingredients: string[]; instructions: string[] }> calling OpenAI with a schema prompt.

End: Returns structured recipe object; verified via mock prompt and unit test returning expected arrays.

**Task 1.4: Caption-Fallback Logic Flag

Start: No fallback condition.

Action: In /api/parse-url, after caption extraction, check if ingredients.length > 0; if true, return result; else set needAudio = true.

End: When caption yields no ingredients, API responds with { needAudio: true }; unit test covers both paths.

2. Audio-Based Extraction

**Task 2.1: Download Audio Stream

Start: No audio-extraction utility.

Action: In lib/parser/audio.ts, implement async function fetchAudio(url: string): Promise<Blob> using ffmpeg.wasm or server-side extractor to return audio blob.

End: Calling fetchAudio(videoUrl) returns a Blob; test by checking blob MIME type.

**Task 2.2: Transcribe Audio

Start: Raw audio blob available.

Action: In lib/ai/transcribeAudio.ts, write async function transcribeAudio(blob: Blob): Promise<string> that sends audio to OpenAI Whisper API and returns transcript text.

End: Given sample audio blob, transcribeAudio returns transcript string; verify via mock Whisper response.

**Task 2.3: Parse Recipe from Transcript

Start: Transcript text returned.

Action: In lib/ai/extractFromTranscript.ts, implement async function extractRecipeFromTranscript(text: string): Promise<{ ingredients: string[]; instructions: string[] }> via OpenAI schema prompt.

End: Returns structured recipe object; unit test for expected arrays.

**Task 2.4: Audio-Fallback Logic Flag

Start: Fallback flag not implemented.

Action: In /api/parse-url, if needAudio and ingredients.length > 0 after transcript extraction, return result; else set needVideo = true.

End: When transcript yields no ingredients, API responds with { needVideo: true }; tests cover both cases.

3. Video-Based Extraction

**Task 3.1: Research Video-to-Text Capability

Start: Unknown if OpenAI supports direct video analysis.

Action: Check OpenAI docs for video endpoints; if none, list alternative services (e.g., Google Video AI).

End: Document results in docs/video-capabilities.md with service names and sample API calls.

**Task 3.2: Extract Key Frames (if needed)

Start: Need to sample video.

Action: In lib/parser/video.ts, write async function extractFrames(url: string, intervalSec: number): Promise<Buffer[]> using ffmpeg server-side to return array of image buffers.

End: Calling with sample video URL returns at least one buffer; test by checking buffer length > 0.

**Task 3.3: OCR on Frames (if needed)

Start: Frames array available.

Action: In lib/ai/ocrFrames.ts, implement async function ocrFrames(frames: Buffer[]): Promise<string> using Tesseract.js or similar to return concatenated text.

End: Given test frame (with overlaid text), ocrFrames returns correct string; unit test validates.

**Task 3.4: Extract Recipe from Video Text

Start: Text from OCR/video API.

Action: In lib/ai/extractFromVideo.ts, write async function extractRecipeFromVideo(text: string): Promise<{ ingredients: string[]; instructions: string[] }> via OpenAI prompt.

End: Returns structured recipe object; test via mock data.

4. Orchestration & API Integration

**Task 4.1: Sequence Extraction Steps

Start: API route has isolated steps.

Action: In app/api/parse-url/route.ts, implement sequential logic:

Try caption extraction

If needAudio, try audio extraction

If needVideo, try video extraction

Return first successful { ingredients, instructions } or error if all fail.

End: Hitting the API returns recipe from correct source; test all three flows with mocks.

**Task 4.2: Error Handling & Timeouts

Start: No robust error handling.

Action: Wrap each extraction step in try/catch with per-step timeout (e.g., 15s); log errors and proceed to next step.

End: Timeout or error invokes next step; test by forcing timeout in each mock.

**Task 4.3: Unit & Integration Tests

Start: No tests for new features.

Action: Write Jest tests for each lib function and API route with mocked dependencies.

End: Achieve >90% coverage on new modules; all tests pass.

5. Frontend & UI Updates

**Task 5.1: Loading & Fallback Indicators ✅ COMPLETED

Start: RecipeCard handles only success.

Action: In RecipeCard, add UI states for "Parsing captions…", "Transcribing audio…", "Analyzing video…" and for errors.

End: Simulate each state via props; verify correct label appears.

**Task 5.2: Performance Metrics Logging ✅ COMPLETED

Start: No metrics collected.

Action: Instrument timing for each extraction step and send to console or analytics (e.g., timing.start()/end()).

End: Trigger URL parse; console logs durations for each step.

**Task 5.3: Cost-Optimization Flag ✅ COMPLETED

Start: No option to skip expensive steps.

Action: Add toggle in UI for "Fast mode (captions only)"; skip audio/video when enabled.

End: When toggled, the API call includes mode: 'fast'; backend respects and exits after caption.
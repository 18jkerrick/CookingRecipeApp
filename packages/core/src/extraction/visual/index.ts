// ============================================================================
// Visual Extraction Module
// ============================================================================

// Frame Extractor - Video download and frame extraction
export {
  FrameExtractor,
  createFrameExtractor,
  FrameExtractionError,
  type FrameExtractorConfig,
  type FrameExtractionResult,
} from './frame-extractor';

// Frame Analyzer - Parallel Vision API analysis
export {
  FrameAnalyzer,
  createFrameAnalyzer,
  type FrameAnalyzerConfig,
  type FrameAnalysis,
  type FrameAnalysisResult,
  type CookingStage,
} from './frame-analyzer';

// Frame Consolidator - Merge multiple analyses
export {
  FrameConsolidator,
  createFrameConsolidator,
  type FrameConsolidatorConfig,
  type ConsolidatedVisualExtraction,
} from './frame-consolidator';

// Visual Extractor - Main orchestrator
export {
  VisualExtractor,
  createVisualExtractor,
  type VisualExtractorConfig,
  type VisualExtractionResult,
} from './visual-extractor';

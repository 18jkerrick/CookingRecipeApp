import Lottie from 'lottie-react';
import loadingAnimation from '../../../public/loading-animation.json';

interface RecipeCardProps {
  title?: string;
  imageUrl?: string;
  processing?: boolean;
  ingredients?: string[];
  instructions?: string[];
  extractionPhase?: 'text' | 'audio' | 'video';
}

export default function RecipeCard({ 
  title = 'Extracted Recipe', 
  imageUrl, 
  processing = false, 
  ingredients = [], 
  instructions = [],
  extractionPhase = 'text'
}: RecipeCardProps) {
  const ingredientCount = ingredients.length;
  const stepCount = instructions.length;

  const formatMetadata = () => {
    const parts = [];
    if (ingredientCount > 0) {
      parts.push(`${ingredientCount} ingredient${ingredientCount !== 1 ? 's' : ''}`);
    }
    if (stepCount > 0) {
      parts.push(`${stepCount} step${stepCount !== 1 ? 's' : ''}`);
    }
    return parts.join(' • ');
  };

  if (processing) {
    const getPhaseMessage = () => {
      switch (extractionPhase) {
        case 'text':
          return 'Getting Recipe from Text';
        case 'audio':
          return 'Listening to the Audio';
        case 'video':
          return 'Analyzing Video & Images';
        default:
          return 'Extracting recipe...';
      }
    };

    return (
      <div className="bg-wk-bg-surface rounded-xl overflow-hidden shadow-wk">
        {/* Shimmer background with Lottie Loading Animation */}
        <div className="aspect-[4/3] relative overflow-hidden">
          {/* Shimmer background */}
          <div 
            className="absolute inset-0 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(90deg, var(--bg-surface-hover) 25%, var(--border) 50%, var(--bg-surface-hover) 75%)',
              backgroundSize: '200% 100%'
            }}
          ></div>
          
          {/* Lottie Animation Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40">
              <Lottie 
                animationData={loadingAnimation} 
                loop={true}
                autoplay={true}
              />
            </div>
          </div>
        </div>
        
        {/* Dynamic loading text */}
        <div className="p-4 h-20 flex flex-col justify-center">
          <p className="text-wk-text-primary text-center text-sm font-medium font-body">
            {getPhaseMessage()}
          </p>
          {extractionPhase === 'video' && (
            <p className="text-wk-text-muted text-center text-xs mt-1 font-body">
              This may take several minutes
            </p>
          )}
        </div>
      </div>
    );
  }

  const metadata = formatMetadata();

  return (
    <div className="bg-wk-bg-surface rounded-xl overflow-hidden shadow-wk card-hover cursor-pointer group">
      {/* Recipe image */}
      <div className="aspect-[4/3] bg-wk-bg-surface-hover flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Recipe'}
            className="w-full h-full object-cover border-0 card-image"
            style={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <div className="text-wk-text-muted text-4xl">🍽️</div>
        )}
      </div>
      
      {/* Recipe content */}
      <div className="p-4 flex flex-col justify-start">
        {/* Recipe title */}
        <h3 className="font-display font-semibold text-wk-text-primary leading-tight text-center line-clamp-2">
          {title}
        </h3>
        {/* Recipe metadata */}
        {metadata && (
          <p className="text-wk-text-secondary text-sm font-body text-center mt-1">
            {metadata}
          </p>
        )}
      </div>
    </div>
  );
}
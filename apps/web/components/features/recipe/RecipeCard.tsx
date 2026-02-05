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
      <div className="bg-[#1e1f26] rounded-xl overflow-hidden">
        {/* Shimmer background with Lottie Loading Animation */}
        <div className="aspect-square relative overflow-hidden">
          {/* Shimmer background - theme aware */}
          <div 
            className="absolute inset-0 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(90deg, var(--bg-surface-hover) 25%, var(--bg-surface) 50%, var(--bg-surface-hover) 75%)',
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
          <p className="text-white/90 text-center text-sm font-medium">
            {getPhaseMessage()}
          </p>
          {extractionPhase === 'video' && (
            <p className="text-white/50 text-center text-xs mt-1">
              This may take several minutes
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-wk-bg-surface rounded-xl overflow-hidden hover:ring-2 hover:ring-wk-accent/50 transition-all cursor-pointer group shadow-wk card-hover">
      {/* Recipe image */}
      <div className="aspect-square bg-wk-bg-surface-hover flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Recipe'}
            className="w-full h-full object-cover border-0 group-hover:scale-105 transition-transform duration-300 card-image"
            style={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <div className="text-gray-600 text-4xl">🍽️</div>
        )}
      </div>
      
      {/* Recipe content */}
      <div className="p-4 h-20 flex flex-col justify-start">
      <div className="p-4 h-20 flex flex-col justify-start">
        {/* Recipe title */}
        <h3 className="font-medium text-wk-text-primary leading-tight text-center line-clamp-2 font-body">
          {title}
        </h3>
      </div>
    </div>
  );
}
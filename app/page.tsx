"use client";

import Image from "next/image";
import { supabase } from '@/supabase/client';
import { useEffect, useState, useRef } from 'react';
import UrlInput from '@/components/UrlInput';
import RecipeCard from '@/components/RecipeCard';
import GroceryList from '@/components/GroceryList';
import SavedLists from '@/components/SavedLists';
import { parseIngredients } from '@/lib/utils/parseIngredients';
import MergeListManager from '@/components/MergeListManager';
import { mergeLists } from '@/lib/utils/mergeLists';
import { exportTxt } from '../lib/utils/exportTxt';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Types for loading states
type LoadingStep = 'captions' | 'audio' | 'video' | 'complete' | 'error';

interface LoadingState {
  step: LoadingStep;
  message: string;
  progress: number; // 0-100
  error?: string;
}

// Performance metrics tracking
interface PerformanceMetrics {
  totalTime: number;
  captionTime?: number;
  audioTime?: number;
  videoTime?: number;
  extractionMethod: 'captions' | 'audio' | 'video' | 'none';
  platform: string;
  url: string;
  success: boolean;
  errorMessage?: string;
}

class PerformanceTimer {
  private startTime: number;
  private stepTimes: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  markStep(stepName: string) {
    this.stepTimes.set(stepName, performance.now());
  }

  getStepDuration(stepName: string): number {
    const stepTime = this.stepTimes.get(stepName);
    if (!stepTime) return 0;
    
    const previousSteps = Array.from(this.stepTimes.keys());
    const currentIndex = previousSteps.indexOf(stepName);
    
    if (currentIndex === 0) {
      return stepTime - this.startTime;
    } else {
      const previousStepTime = this.stepTimes.get(previousSteps[currentIndex - 1]) || this.startTime;
      return stepTime - previousStepTime;
    }
  }

  getTotalDuration(): number {
    return performance.now() - this.startTime;
  }

  getMetrics(): { [key: string]: number } {
    const metrics: { [key: string]: number } = {
      totalTime: this.getTotalDuration()
    };

    for (const [stepName] of this.stepTimes) {
      metrics[`${stepName}Duration`] = this.getStepDuration(stepName);
    }

    return metrics;
  }
}

const logPerformanceMetrics = (metrics: PerformanceMetrics) => {
  console.group('🔥 Recipe Extraction Performance Metrics');
  console.log('⏱️  Total Time:', `${metrics.totalTime.toFixed(0)}ms`);
  console.log('🎯 Extraction Method:', metrics.extractionMethod);
  console.log('📱 Platform:', metrics.platform);
  console.log('✅ Success:', metrics.success);
  
  if (metrics.captionTime) {
    console.log('📝 Caption Time:', `${metrics.captionTime.toFixed(0)}ms`);
  }
  if (metrics.audioTime) {
    console.log('🎵 Audio Time:', `${metrics.audioTime.toFixed(0)}ms`);
  }
  if (metrics.videoTime) {
    console.log('🎬 Video Time:', `${metrics.videoTime.toFixed(0)}ms`);
  }
  
  if (metrics.errorMessage) {
    console.log('❌ Error:', metrics.errorMessage);
  }
  
  console.log('🔗 URL:', metrics.url);
  console.groupEnd();

  // Send to analytics (placeholder for future implementation)
  // In a real app, you'd send this to your analytics service
  if (window.gtag) {
    window.gtag('event', 'recipe_extraction', {
      event_category: 'performance',
      event_label: metrics.extractionMethod,
      value: Math.round(metrics.totalTime),
      custom_map: {
        platform: metrics.platform,
        success: metrics.success,
        total_time: metrics.totalTime,
        extraction_method: metrics.extractionMethod
      }
    });
  }
};

export default function Home() {
  const [recipe, setRecipe] = useState<{
    platform: string;
    ingredients: string[];
    instructions: string[];
    source: string;
  } | null>(null);
  const [showMergePopup, setShowMergePopup] = useState(false);
  const [currentGroceryItems, setCurrentGroceryItems] = useState<any[]>([]);
  const savedListsRef = useRef<{ refreshLists: () => void }>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    step: 'captions',
    message: '',
    progress: 0
  });
  const performanceTimer = useRef<PerformanceTimer | null>(null);

  // Test parseIngredients function
  useEffect(() => {
    console.log('Testing parseIngredients...');
    const testIngredients = ['2 eggs', '1 cup flour', '3 tablespoons butter', 'salt'];
    const parsed = parseIngredients(testIngredients);
    console.log('Parsed ingredients:', parsed);
  }, []);

  const updateLoadingState = (step: LoadingStep, message: string, progress: number, error?: string) => {
    setLoadingState({ step, message, progress, error });
    
    // Mark performance step
    if (performanceTimer.current) {
      performanceTimer.current.markStep(step);
    }
  };

  const handleParse = async (url: string, fastMode: boolean = false) => {
    setIsLoading(true);
    setRecipe(null);
    setCurrentGroceryItems([]);

    // Initialize performance timer
    performanceTimer.current = new PerformanceTimer();

    try {
      // Step 1: Initialize caption extraction
      updateLoadingState('captions', 'Parsing captions from video...', 10);

      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, mode: fastMode ? 'fast' : 'full' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Determine which method was successful based on the source
        const source = data.source;
        
        if (source === 'captions') {
          updateLoadingState('complete', 'Recipe extracted from captions!', 100);
        } else if (source === 'audio_transcript') {
          updateLoadingState('complete', 'Recipe extracted from audio transcription!', 100);
        } else if (source === 'video_analysis' || source === 'video_analysis_fallback') {
          updateLoadingState('complete', 'Recipe extracted from video analysis!', 100);
        }

        setRecipe({
          platform: data.platform,
          ingredients: data.ingredients,
          instructions: data.instructions,
          source: data.source
        });

        // Log successful performance metrics
        const timer = performanceTimer.current;
        if (timer) {
          const metrics: PerformanceMetrics = {
            totalTime: timer.getTotalDuration(),
            captionTime: source === 'captions' ? timer.getStepDuration('captions') : undefined,
            audioTime: source === 'audio_transcript' ? timer.getStepDuration('audio') : undefined,
            videoTime: source.includes('video') ? timer.getStepDuration('video') : undefined,
            extractionMethod: source === 'captions' ? 'captions' : 
                             source === 'audio_transcript' ? 'audio' : 'video',
            platform: data.platform,
            url: url,
            success: true
          };
          
          logPerformanceMetrics(metrics);
        }
              } else if (data.needsFullAnalysis) {
          // Fast mode failed, suggest full analysis
          updateLoadingState('error', data.error + ' Try again with full analysis enabled.', 0, data.error);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
    } catch (error: any) {
      console.error('Error parsing URL:', error);
      
      let errorMessage = 'Failed to extract recipe';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Video analysis may take longer than expected.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      updateLoadingState('error', errorMessage, 0, errorMessage);

      // Log failed performance metrics
      const timer = performanceTimer.current;
      if (timer) {
        const metrics: PerformanceMetrics = {
          totalTime: timer.getTotalDuration(),
          extractionMethod: 'none',
          platform: 'unknown',
          url: url,
          success: false,
          errorMessage: errorMessage
        };
        
        logPerformanceMetrics(metrics);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate progress updates for different steps
  useEffect(() => {
    if (!isLoading) return;

    const progressTimer = setInterval(() => {
      setLoadingState(current => {
        if (current.step === 'captions' && current.progress < 30) {
          return { ...current, progress: current.progress + 5 };
        } else if (current.step === 'captions' && current.progress >= 30) {
          return {
            step: 'audio',
            message: 'Captions didn\'t contain recipe. Downloading and transcribing audio...',
            progress: 35
          };
        } else if (current.step === 'audio' && current.progress < 70) {
          return { ...current, progress: current.progress + 5 };
        } else if (current.step === 'audio' && current.progress >= 70) {
          return {
            step: 'video',
            message: 'Audio transcription incomplete. Analyzing video frames...',
            progress: 75
          };
        } else if (current.step === 'video' && current.progress < 95) {
          return { ...current, progress: current.progress + 2 };
        }
        return current;
      });
    }, 1000);

    return () => clearInterval(progressTimer);
  }, [isLoading]);

  useEffect(() => {
    // Test Supabase connection
    console.log('Testing Supabase connection...');
    supabase.auth.getUser().then(result => {
      console.log('Supabase auth test:', result);
    });
  }, []);

  useEffect(() => {
    console.log('Recipe changed:', recipe);
    if (recipe && recipe.ingredients.length > 0) {
      console.log('Recipe ingredients:', recipe.ingredients);
      // Convert recipe ingredients to grocery items when recipe is set
      const groceryItems = parseIngredients(recipe.ingredients);
      console.log('Parsed grocery items:', groceryItems);
      setCurrentGroceryItems(groceryItems);
    }
  }, [recipe]);

  // Add debugging for currentGroceryItems changes
  useEffect(() => {
    console.log('currentGroceryItems state changed:', currentGroceryItems);
    console.log('Length:', currentGroceryItems.length);
  }, [currentGroceryItems]);

  // Add this test BEFORE the recipe useEffect
  useEffect(() => {
    console.log('Testing setCurrentGroceryItems works...');
    try {
      setCurrentGroceryItems([{name: 'test item', quantity: 1, unit: 'cup'}]);
      console.log('setCurrentGroceryItems call succeeded');
    } catch (error) {
      console.error('Error calling setCurrentGroceryItems:', error);
    }
  }, []);

  const handleAddToExisting = (currentItems: any[]) => {
    console.log('=== handleAddToExisting called ===');
    console.log('currentItems:', currentItems);
    console.log('currentItems type:', typeof currentItems);
    console.log('currentItems is array:', Array.isArray(currentItems));
    console.log('currentItems length:', currentItems?.length);
    console.log('currentGroceryItems state before:', currentGroceryItems);
    
    setCurrentGroceryItems(currentItems);
    console.log('About to set showMergePopup to true');
    setShowMergePopup(true);
    console.log('showMergePopup should now be true');
  };

  const handleCreateNew = async (name: string, items: any[]) => {
    try {
      const response = await fetch('/api/grocery-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            displayQuantity: item.displayQuantity
          }))
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Grocery list saved successfully!');
        // Refresh the SavedLists component to show the new list
        if (savedListsRef.current) {
          savedListsRef.current.refreshLists();
        }
      } else {
        alert('Failed to save grocery list: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving grocery list:', error);
      alert('Failed to save grocery list');
    }
  };

  const handleMergeWith = async (savedListId: string, items: any[]) => {
    console.log('Starting merge process...');
    console.log('Saved List ID:', savedListId);
    console.log('Current items to merge:', items);
    
    try {
      // First, fetch the saved list to get its items
      const response = await fetch('/api/grocery-lists');
      const data = await response.json();
      
      console.log('Fetched saved lists:', data);
      
      if (!response.ok) {
        alert('Failed to fetch saved lists: ' + data.error);
        return;
      }
      
      // Find the selected list
      const selectedList = data.lists.find((list: any) => list.id === savedListId);
      console.log('Selected list found:', selectedList);
      
      if (!selectedList) {
        alert('Selected list not found');
        return;
      }
      
      // Merge the current items with the saved list items
      console.log('Before merge - Current items:', items);
      console.log('Before merge - Saved list items:', selectedList.grocery_items);
      
      const mergedItems = mergeLists(items, selectedList.grocery_items);
      console.log('After merge - Merged items:', mergedItems);
      
      // Update the existing list with the merged items
      const updatePayload = {
        listId: savedListId,
        name: selectedList.name,
        items: mergedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          displayQuantity: item.displayQuantity
        }))
      };
      
      console.log('Update payload:', updatePayload);
      
      const updateResponse = await fetch('/api/grocery-lists', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      const updateData = await updateResponse.json();
      console.log('Update response:', updateResponse.status, updateData);
      
      if (updateResponse.ok) {
        alert(`Successfully merged items into "${selectedList.name}"! Updated list now has ${mergedItems.length} items.`);
        // Refresh the SavedLists component to show the updated data
        if (savedListsRef.current) {
          savedListsRef.current.refreshLists();
        }
      } else {
        alert('Failed to merge lists: ' + updateData.error);
      }
    } catch (error) {
      console.error('Error merging lists:', error);
      alert('Failed to merge lists');
    }
  };

  const testExport = () => {
    const testItems = [
      { name: 'eggs', quantity: 12, unit: '' },
      { name: 'flour', quantity: 2.5, unit: 'cups' },
      { name: 'butter', quantity: 0.5, unit: 'cup' },
      { name: 'sugar', quantity: 1, unit: 'cup' }
    ];
    exportTxt(testItems, 'Test Grocery List');
  };

  const getStepIcon = (step: LoadingStep) => {
    switch (step) {
      case 'captions':
        return '📝';
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStepColor = (step: LoadingStep) => {
    switch (step) {
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-2xl font-bold">Recipe Extractor</h1>
        <UrlInput onSubmit={handleParse} />
        
        {isLoading && (
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <span className="text-2xl mr-2">{getStepIcon(loadingState.step)}</span>
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
              
              <h3 className={`text-lg font-semibold mb-2 ${getStepColor(loadingState.step)}`}>
                {loadingState.step === 'captions' && 'Step 1: Parsing Captions'}
                {loadingState.step === 'audio' && 'Step 2: Transcribing Audio'}
                {loadingState.step === 'video' && 'Step 3: Analyzing Video'}
                {loadingState.step === 'complete' && 'Complete!'}
                {loadingState.step === 'error' && 'Error'}
              </h3>
              
              <p className="text-gray-600 mb-4">{loadingState.message}</p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    loadingState.step === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${loadingState.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{loadingState.progress}% complete</p>
              
              {/* Step indicators */}
              <div className="flex justify-center items-center mt-4 space-x-4">
                <div className={`flex items-center ${loadingState.step === 'captions' || loadingState.progress > 30 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className="text-sm mr-1">📝</span>
                  <span className="text-sm">Captions</span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className={`flex items-center ${loadingState.step === 'audio' || loadingState.progress > 70 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className="text-sm mr-1">🎵</span>
                  <span className="text-sm">Audio</span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className={`flex items-center ${loadingState.step === 'video' || loadingState.progress > 90 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className="text-sm mr-1">🎬</span>
                  <span className="text-sm">Video</span>
                </div>
              </div>
              
              {loadingState.step === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">{loadingState.error}</p>
                  <button 
                    onClick={() => setIsLoading(false)}
                    className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {recipe && !isLoading && (
          <div className="w-full">
            {/* Success indicator */}
            <div className="w-full max-w-2xl bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-2">✅</span>
                <div>
                  <p className="text-green-800 font-medium">Recipe extracted successfully!</p>
                  <p className="text-green-600 text-sm">
                    Source: {recipe.source === 'captions' ? 'Video captions' : 
                             recipe.source === 'audio_transcript' ? 'Audio transcription' : 
                             'Video analysis'} • Platform: {recipe.platform}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RecipeCard 
                ingredients={recipe.ingredients}
                instructions={recipe.instructions}
              />
              <GroceryList 
                items={currentGroceryItems} 
                onAddToExisting={handleAddToExisting}
                onCreateNew={handleCreateNew}
              />
            </div>
          </div>
        )}
        
        {/* Display saved lists */}
        <SavedLists ref={savedListsRef} />
        
        {/* Merge popup */}
        {(() => {
          console.log('Checking merge popup conditions:');
          console.log('showMergePopup:', showMergePopup);
          console.log('currentGroceryItems:', currentGroceryItems);
          console.log('Array.isArray(currentGroceryItems):', Array.isArray(currentGroceryItems));
          const shouldShow = showMergePopup && currentGroceryItems && Array.isArray(currentGroceryItems);
          console.log('Should show merge popup:', shouldShow);
          return shouldShow ? (
            <MergeListManager 
              items={currentGroceryItems}
              onMergeWith={handleMergeWith}
              onClose={() => setShowMergePopup(false)}
            />
          ) : null;
        })()}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}

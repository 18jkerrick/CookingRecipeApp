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

export default function Home() {
  const [recipe, setRecipe] = useState<{
    platform: string;
    ingredients: string[];
    instructions: string[];
  } | null>(null);
  const [showMergePopup, setShowMergePopup] = useState(false);
  const [currentGroceryItems, setCurrentGroceryItems] = useState<any[]>([]);
  const savedListsRef = useRef<{ refreshLists: () => void }>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Test parseIngredients function
  useEffect(() => {
    console.log('Testing parseIngredients...');
    const testIngredients = ['2 eggs', '1 cup flour', '3 tablespoons butter', 'salt'];
    const parsed = parseIngredients(testIngredients);
    console.log('Parsed ingredients:', parsed);
  }, []);

  const handleParse = async (url: string) => {
    setIsLoading(true);
    setLoadingMessage('Extracting recipe from URL...');
    setRecipe(null);
    setCurrentGroceryItems([]);

    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.needAudio) {
          // Handle audio extraction case
          setLoadingMessage('No recipe found in captions. Would you like to try audio transcription?');
          // TODO: Implement audio extraction flow
          console.log('Audio extraction needed for:', data.url);
        } else {
          // Success case
          setRecipe({
            platform: data.platform,
            ingredients: data.ingredients,
            instructions: data.instructions
          });
          setLoadingMessage('');
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      setLoadingMessage('Error parsing URL. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            unit: item.unit
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
          unit: item.unit
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

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-2xl font-bold">Recipe Extractor</h1>
        <UrlInput onSubmit={handleParse} />
        
        {isLoading && (
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        )}

        {recipe && !isLoading && (
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

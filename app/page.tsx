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
    ingredients: string[];
    instructions: string[];
  } | null>(null);
  const [showMergePopup, setShowMergePopup] = useState(false);
  const [currentGroceryItems, setCurrentGroceryItems] = useState<any[]>([]);
  const savedListsRef = useRef<{ refreshLists: () => void }>(null);

  // Test parseIngredients function
  useEffect(() => {
    console.log('Testing parseIngredients...');
    const testIngredients = ['2 eggs', '1 cup flour', '3 tablespoons butter', 'salt'];
    const parsed = parseIngredients(testIngredients);
    console.log('Parsed ingredients:', parsed);
  }, []);

  const handleParse = async (url: string) => {
    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      console.log('Received recipe data:', data);

      if (!response.ok) {
        // Handle API errors (like "Unsupported platform")
        alert(data.error || 'Failed to parse recipe');
        return; // Don't try to set recipe data
      }
      
      // Add validation
      if (!data.ingredients || !Array.isArray(data.ingredients)) {
        console.error('Invalid ingredients data:', data.ingredients);
        alert('Recipe ingredients could not be parsed');
        return; // Don't try to set recipe data
      }

      setRecipe(data);
    } catch (error) {
      console.error('Error parsing recipe:', error);
      alert('Failed to parse recipe. Please try a different URL.');
    }
  };

  useEffect(() => {
    // Test Supabase connection
    console.log('Testing Supabase connection...');
    supabase.auth.getUser().then(result => {
      console.log('Supabase auth test:', result);
    });
  }, []);

  const handleAddToExisting = (currentItems: any[]) => {
    console.log('handleAddToExisting called with:', currentItems);
    setCurrentGroceryItems(currentItems);
    setShowMergePopup(true);
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
        
        {/* Display recipe if available */}
        {recipe && (
          <>
            <RecipeCard 
              ingredients={recipe.ingredients}
              instructions={recipe.instructions}
            />
            
            {/* Display grocery list */}
            <GroceryList 
              items={parseIngredients(recipe.ingredients)}
              onAddToExisting={handleAddToExisting}
              onCreateNew={handleCreateNew}
            />
            
            {/* Merge List Manager Popup */}
            {showMergePopup && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <MergeListManager 
                    items={currentGroceryItems}
                    onMergeWith={handleMergeWith}
                    onClose={() => setShowMergePopup(false)}
                  />
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Display saved lists */}
        <SavedLists ref={savedListsRef} />
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

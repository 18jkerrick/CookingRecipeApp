import { useState, useEffect } from 'react';
import { exportTxt } from '../lib/utils/exportTxt';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    title: string;
    ingredients: string[];
    instructions: string[];
    platform: string;
    source: string;
    thumbnail?: string;
    saved_id?: string;
  } | null;
  isSaved?: boolean;
  onSave?: () => void;
  onDelete?: () => Promise<void>;
}

export default function RecipeDetailModal({ isOpen, onClose, recipe, isSaved = false, onSave, onDelete }: RecipeDetailModalProps) {
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<boolean[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mealPlans, setMealPlans] = useState<{[key: string]: {[key: string]: any}}>({});

  // Initialize selected ingredients when recipe changes
  useEffect(() => {
    if (recipe?.ingredients) {
      setSelectedIngredients(new Array(recipe.ingredients.length).fill(true));
    }
  }, [recipe?.ingredients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.share-dropdown')) {
        setShowShareDropdown(false);
      }
    };

    if (showShareDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareDropdown]);

  const toggleIngredient = (index: number) => {
    const newSelected = [...selectedIngredients];
    newSelected[index] = !newSelected[index];
    setSelectedIngredients(newSelected);
  };

  const toggleSelectAll = () => {
    const allSelected = selectedIngredients.every(selected => selected);
    setSelectedIngredients(new Array(selectedIngredients.length).fill(!allSelected));
  };

  const selectedCount = selectedIngredients.filter(selected => selected).length;
  const allSelected = selectedIngredients.length > 0 && selectedIngredients.every(selected => selected);

  // Helper functions for meal plan
  const getWeekDates = (startDate: Date) => {
    const dates = [];
    const currentDate = new Date(startDate);
    // Find Monday of the week
    const dayOfWeek = currentDate.getDay();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDateRange = (startDate: Date) => {
    const dates = getWeekDates(startDate);
    const start = dates[0];
    const end = dates[6];
    
    const startFormatted = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const endFormatted = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const formatDayName = (date: Date) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
      '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
      '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'];
    
    const dayName = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    return `${dayName} ${ordinals[dayNumber]}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const addMealToPlan = (dayIndex: number, mealType: string) => {
    const dates = getWeekDates(currentWeekStart);
    const dateKey = dates[dayIndex].toISOString().split('T')[0];
    
    setMealPlans(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [mealType]: recipe
      }
    }));
    
    setShowMealTypeModal(false);
    setSelectedDay(null);
    // Keep meal plan modal open so user can see the added meal
  };

  const removeMealFromPlan = (dayIndex: number, mealType: string) => {
    const dates = getWeekDates(currentWeekStart);
    const dateKey = dates[dayIndex].toISOString().split('T')[0];
    
    setMealPlans(prev => {
      const newPlans = { ...prev };
      if (newPlans[dateKey]) {
        delete newPlans[dateKey][mealType];
        // If no meals left for this day, remove the day entirely
        if (Object.keys(newPlans[dateKey]).length === 0) {
          delete newPlans[dateKey];
        }
      }
      return newPlans;
    });
  };

  // Export functions for recipes
  const handleExport = (format: string) => {
    if (!recipe) return;
    
    switch (format) {
      case 'txt':
        exportRecipeAsTxt();
        break;
      case 'pdf':
        exportRecipeAsPdf();
        break;
      case 'docx':
        exportRecipeAsDocx();
        break;
      case 'html':
        exportRecipeAsHtml();
        break;
      case 'excel':
        exportRecipeAsExcel();
        break;
      case 'url':
        shareRecipeUrl();
        break;
      case 'clipboard':
        copyRecipeToClipboard();
        break;
    }
    setShowShareDropdown(false);
  };

  const exportRecipeAsTxt = () => {
    if (!recipe) return;
    
    let content = `${recipe.title}\n`;
    content += '='.repeat(recipe.title.length) + '\n\n';
    
    content += 'INGREDIENTS:\n';
    content += '-'.repeat(12) + '\n';
    recipe.ingredients.forEach((ingredient, index) => {
      content += `${index + 1}. ${ingredient}\n`;
    });
    
    content += '\nINSTRUCTIONS:\n';
    content += '-'.repeat(13) + '\n';
    recipe.instructions.forEach((instruction, index) => {
      content += `${index + 1}. ${instruction}\n\n`;
    });
    
    content += `\nSource: ${recipe.platform}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportRecipeAsPdf = () => {
    if (!recipe) return;
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(recipe.title, 20, 30);
    
    // Underline
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Ingredients
    doc.setFontSize(16);
    doc.text('Ingredients', 20, 50);
    doc.setFontSize(12);
    let yPosition = 60;
    
    recipe.ingredients.forEach((ingredient, index) => {
      const text = `${index + 1}. ${ingredient}`;
      doc.text(text, 20, yPosition);
      yPosition += 8;
      
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });
    
    // Instructions
    yPosition += 10;
    doc.setFontSize(16);
    doc.text('Instructions', 20, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    
    recipe.instructions.forEach((instruction, index) => {
      const text = `${index + 1}. ${instruction}`;
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 8 + 5;
      
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });
    
    // Footer
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Source: ${recipe.platform}`, 20, yPosition);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition + 8);
    
    doc.save(`${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const exportRecipeAsDocx = async () => {
    if (!recipe) return;
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: recipe.title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Ingredients",
            heading: HeadingLevel.HEADING_2,
          }),
          ...recipe.ingredients.map((ingredient, index) => {
            return new Paragraph({
              children: [
                new TextRun(`${index + 1}. ${ingredient}`)
              ],
            });
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Instructions",
            heading: HeadingLevel.HEADING_2,
          }),
          ...recipe.instructions.map((instruction, index) => {
            return new Paragraph({
              children: [
                new TextRun(`${index + 1}. ${instruction}`)
              ],
            });
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun(`Source: ${recipe.platform}`)
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`Generated on: ${new Date().toLocaleDateString()}`)
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
  };

  const exportRecipeAsHtml = () => {
    if (!recipe) return;
    
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recipe.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; }
          h2 { color: #666; margin-top: 30px; }
          .ingredients, .instructions { margin: 10px 0; }
          .footer { margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>${recipe.title}</h1>
        <h2>Ingredients</h2>
        <div class="ingredients">
    `;
    
    recipe.ingredients.forEach((ingredient, index) => {
      content += `<div>${index + 1}. ${ingredient}</div>\n`;
    });
    
    content += `
        </div>
        <h2>Instructions</h2>
        <div class="instructions">
    `;
    
    recipe.instructions.forEach((instruction, index) => {
      content += `<div>${index + 1}. ${instruction}</div>\n`;
    });
    
    content += `
        </div>
        <div class="footer">
          <p>Source: ${recipe.platform}</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportRecipeAsExcel = () => {
    if (!recipe) return;
    
    let content = `Recipe Name,${recipe.title}\n\n`;
    content += `Ingredients:\n`;
    recipe.ingredients.forEach((ingredient, index) => {
      content += `"${index + 1}","${ingredient}"\n`;
    });
    
    content += `\nInstructions:\n`;
    recipe.instructions.forEach((instruction, index) => {
      content += `"${index + 1}","${instruction}"\n`;
    });
    
    content += `\nSource,${recipe.platform}\n`;
    content += `Generated,${new Date().toLocaleDateString()}\n`;
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareRecipeUrl = () => {
    if (!recipe) return;
    
    const recipeUrl = `${window.location.origin}/recipe/${encodeURIComponent(recipe.title)}`;
    
    navigator.clipboard.writeText(recipeUrl).then(() => {
      alert('Recipe URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      alert('Failed to copy URL to clipboard.');
    });
  };

  const copyRecipeToClipboard = () => {
    if (!recipe) return;
    
    let content = `${recipe.title}\n`;
    content += '='.repeat(recipe.title.length) + '\n\n';
    
    content += 'INGREDIENTS:\n';
    recipe.ingredients.forEach((ingredient, index) => {
      content += `• ${ingredient}\n`;
    });
    
    content += '\nINSTRUCTIONS:\n';
    recipe.instructions.forEach((instruction, index) => {
      content += `${index + 1}. ${instruction}\n\n`;
    });
    
    content += `Source: ${recipe.platform}\n`;
    
    navigator.clipboard.writeText(content).then(() => {
      alert('Recipe copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy recipe:', err);
      alert('Failed to copy recipe to clipboard.');
    });
  };

  // Function to get emoji for ingredient using node-emoji
  const getIngredientEmoji = (ingredient: string) => {
    const emoji = require('node-emoji');
    
    // Clean up the ingredient text for better matching
    const cleanIngredient = ingredient
      .toLowerCase()
      .replace(/[0-9]/g, '') // Remove numbers
      .replace(/\b(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kilogram|kg|liter|liters|l|milliliter|ml|inch|inches|small|medium|large|fresh|dried|chopped|minced|sliced|diced|whole|half|quarter)\b/g, '') // Remove measurements and descriptors
      .replace(/[,\-()]/g, ' ') // Replace punctuation with spaces
      .trim();

    // Manual cooking-specific mappings for common terms that node-emoji might miss
    const cookingMap: { [key: string]: string } = {
      // Proteins
      'chicken': '🍗',
      'beef': '🥩', 
      'pork': '🥓',
      'fish': '🐟',
      'tofu': '🟨',
      
      // Dairy & Fats
      'butter': '🧈',
      'unsalted butter': '🧈',
      'salted butter': '🧈',
      'olive oil': '🫒',
      'vegetable oil': '🫒',
      'coconut oil': '🫒',
      'oil': '🫒',
      
      // Vegetables
      'garlic': '🧄',
      'onion': '🧅',
      'yellow onion': '🧅',
      'white onion': '🧅',
      'red onion': '🧅',
      'green onion': '🧅',
      'pepper': '🌶️',
      'bell pepper': '🫑',
      'jalapeno': '🌶️',
      'jalapeño': '🌶️',
      'mushroom': '🍄',
      'tomato': '🍅',
      'carrot': '🥕',
      'celery': '🥬',
      
      // Grains & Starches
      'flour': '🌾',
      'all purpose flour': '🌾',
      'whole wheat flour': '🌾',
      'bread flour': '🌾',
      'rice': '🍚',
      'brown rice': '🟤',
      'white rice': '⚪',
      'pasta': '🍝',
      'noodles': '🍜',
      
      // Sugars & Sweeteners
      'sugar': '🧊',
      'white sugar': '⚪',
      'brown sugar': '🟤',
      'granulated sugar': '⚪',
      'cane sugar': '⚪',
      'powdered sugar': '⚪',
      'confectioners sugar': '⚪',
      'honey': '🍯',
      'maple syrup': '🍁',
      'syrup': '🍯',
      
      // Seasonings
      'salt': '🧂',
      'black pepper': '🌶️',
      'paprika': '🌶️',
      'cumin': '🌶️',
      'oregano': '🌿',
      'basil': '🌿',
      'thyme': '🌿',
      'rosemary': '🌿',
      'parsley': '🌿',
      'cilantro': '🌿',
      'herbs': '🌿',
      'spice': '🌶️',
      'vanilla': '🌿',
      'vanilla extract': '🌿',
      
      // Liquids & Sauces
      'sauce': '🍶',
      'soy sauce': '🍶',
      'hot sauce': '🌶️',
      'vinegar': '🍶',
      'wine vinegar': '🍶',
      'balsamic vinegar': '🍶',
      'broth': '🍲',
      'stock': '🍲',
      'chicken broth': '🍲',
      'vegetable broth': '🍲',
      
      // Baking
      'chocolate': '🍫',
      'cocoa powder': '🍫',
      'nuts': '🥜',
      'almond': '🥜',
      'walnut': '🥜',
      'pecan': '🥜',
      'baking': '🥄',
      'baking powder': '🥄',
      'baking soda': '🥄',
      'powder': '🥄',
      'soda': '🥄',
      'starch': '🥄',
      'cornstarch': '🌽'
    };

    // First try manual mapping for full cleaned ingredient (prioritize this!)
    if (cookingMap[cleanIngredient]) {
      return cookingMap[cleanIngredient];
    }

    // Then try node-emoji for full cleaned ingredient
    let found = emoji.get(cleanIngredient);
    if (found && found !== `:${cleanIngredient}:`) {
      return found;
    }
    
    found = emoji.find(cleanIngredient);
    if (found && found.emoji) {
      return found.emoji;
    }
    
    // Then try individual words as fallback
    const words = cleanIngredient.split(/\s+/).filter(word => word.length > 2);
    
    for (const word of words) {
      // Try manual mapping first for each word
      if (cookingMap[word]) {
        return cookingMap[word];
      }
      
      // Try direct lookup for each word
      found = emoji.get(word);
      if (found && found !== `:${word}:`) {
        return found;
      }
      
      // Try search function for each word
      found = emoji.find(word);
      if (found && found.emoji) {
        return found.emoji;
      }
    }
    
    // Default fallback
    return '❓';
  };

  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          {recipe.thumbnail && (
            <div className="mb-4">
              <img 
                src={recipe.thumbnail} 
                alt={recipe.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              From {recipe.platform} • Extracted via {recipe.source}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-8 mt-6">
            <button
              onClick={() => {
                if (isSaved && onDelete) {
                  setShowDeleteConfirm(true);
                } else if (!isSaved && onSave) {
                  onSave();
                }
              }}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isSaved ? 'bg-orange-500' : 'bg-gray-400'
              }`}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 2h12a2 2 0 0 1 2 2v16l-8-4-8 4V4a2 2 0 0 1 2-2z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Cookbooks</span>
            </button>
            
            <button
              onClick={() => setShowGroceryModal(true)}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Grocery</span>
            </button>
            
            <button
              onClick={() => setShowMealPlanModal(true)}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Meal Plan</span>
            </button>
            
            <div className="relative share-dropdown">
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">Share</span>
              </button>
              
              {showShareDropdown && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-2">
                    <button
                      onClick={() => handleExport('url')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Share URL</span>
                    </button>
                    <button
                      onClick={() => handleExport('clipboard')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy to Clipboard</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export as DOC</span>
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export as TXT</span>
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Export as Excel</span>
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>Export as HTML</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pb-12">
            {/* Ingredients Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Ingredients
              </h2>
              <div className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-gray-800 leading-relaxed">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Steps
              </h2>
              <p className="text-gray-600 text-sm mb-4">How to make it yourself:</p>
              <div className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 leading-relaxed flex-1 pt-1">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total ingredients: {recipe.ingredients.length} • Total steps: {recipe.instructions.length}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Grocery Modal */}
      {showGroceryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col">
            {/* Grocery Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-semibold text-gray-900">Add to Grocery List</h2>
              <button onClick={() => setShowGroceryModal(false)} className="p-2 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Ingredients List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Ingredients</h3>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowConvertModal(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                    </svg>
                    <span>Convert</span>
                  </button>
                  <button 
                    onClick={toggleSelectAll}
                    className="text-orange-500 text-sm font-medium"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {recipe.ingredients.map((ingredient, index) => (
                  <label key={index} className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-2xl mr-4">{getIngredientEmoji(ingredient)}</span>
                    <span className="flex-1 text-lg text-gray-900">{ingredient}</span>
                    <input 
                      type="checkbox" 
                      checked={selectedIngredients[index] || false}
                      onChange={() => toggleIngredient(index)}
                      className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500 ml-3" 
                    />
                  </label>
                ))}
              </div>
            </div>
            
            {/* Add Button */}
            <div className="p-6 border-t">
              <button 
                onClick={() => setShowGroceryModal(false)}
                disabled={selectedCount === 0}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  selectedCount > 0 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {selectedCount > 0 
                  ? `Add ${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`
                  : 'Select ingredients to add'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Plan Modal */}
      {showMealPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Meal Plan Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add to meal plan</h2>
              <button onClick={() => setShowMealPlanModal(false)} className="text-orange-500 font-medium text-lg">
                Done
              </button>
            </div>
            
            {/* Week Navigation */}
            <div className="flex items-center justify-between p-4 border-b">
              <button 
                onClick={() => navigateWeek('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium text-gray-900 text-center">{formatDateRange(currentWeekStart)}</span>
              <button 
                onClick={() => navigateWeek('next')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Days List */}
            <div className="flex-1 overflow-y-auto">
              {getWeekDates(currentWeekStart).map((date, index) => {
                const dateKey = date.toISOString().split('T')[0];
                const dayMeals = mealPlans[dateKey] || {};
                const hasRecipes = Object.keys(dayMeals).length > 0;
                                 const isCurrentDay = isToday(date); // Highlighting today based on user's local timezone
                
                return (
                  <div key={index} className="border-b">
                    <div className="flex items-center justify-between p-4">
                      <h3 className={`font-medium ${isCurrentDay ? 'text-orange-500' : 'text-gray-900'}`}>
                        {formatDayName(date)}
                      </h3>
                      <button 
                        onClick={() => {
                          setSelectedDay(index);
                          setShowMealTypeModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center hover:bg-orange-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    {hasRecipes ? (
                      <div className="px-4 pb-4 space-y-2">
                        {Object.entries(dayMeals).map(([mealType, meal]: [string, any]) => (
                          <div key={mealType} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <img src={meal.thumbnail} alt={meal.title} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">{meal.title}</p>
                              <p className="text-orange-500 text-sm capitalize">{mealType}</p>
                            </div>
                            <button
                              onClick={() => removeMealFromPlan(index, mealType)}
                              className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                              title="Remove meal"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 pb-4 text-gray-700 text-sm">
                        No recipes yet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}



       {/* Meal Type Selection Modal */}
       {showMealTypeModal && selectedDay !== null && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
           <div className="bg-white rounded-xl w-full max-w-sm mx-4">
             <div className="p-6 space-y-4">
               <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">Select Meal Type</h3>
               
                              <button 
                 onClick={() => addMealToPlan(selectedDay, 'breakfast')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
               >
                 <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                   <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 185.458 185.458">
                     {/* Sunrise icon from SVG with thicker strokes */}
                     <path d="M149.583,149.834c-1.849-27.829-25.016-49.921-53.306-49.921c-28.29,0-51.457,22.092-53.306,49.921H0v7.132h46.356h99.843h39.259v-7.132H149.583z M50.057,149.834c1.828-23.9,21.858-42.79,46.22-42.79s44.391,18.89,46.22,42.79H50.057z"/>
                     <path d="M96.277,96.347c1.971,0,3.566-1.597,3.566-3.566V32.058c0-1.969-1.595-3.566-3.566-3.566c-1.971,0-3.566,1.597-3.566,3.566v60.723C92.711,94.75,94.306,96.347,96.277,96.347z"/>
                     <path d="M142.026,114.12c0.913,0,1.825-0.348,2.521-1.045l36.55-36.551c1.393-1.393,1.393-3.649,0-5.042s-3.649-1.393-5.042,0l-36.55,36.551c-1.393,1.393-1.393,3.649,0,5.042C140.202,113.772,141.114,114.12,142.026,114.12z"/>
                     <path d="M47.846,113.075c0.696,0.696,1.609,1.045,2.521,1.045s1.825-0.348,2.521-1.045c1.393-1.393,1.393-3.649,0-5.042l-36.55-36.551c-1.393-1.393-3.649-1.393-5.042,0s-1.393,3.649,0,5.042L47.846,113.075z"/>
                   </svg>
                 </div>
                 <span className="text-lg font-medium text-gray-900">Breakfast</span>
               </button>
               
               <button 
                 onClick={() => addMealToPlan(selectedDay, 'lunch')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
               >
                 <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                   <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                   </svg>
                 </div>
                 <span className="text-lg font-medium text-gray-900">Lunch</span>
               </button>
               
               <button 
                 onClick={() => addMealToPlan(selectedDay, 'dinner')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
               >
                 <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                   <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                   </svg>
                 </div>
                 <span className="text-lg font-medium text-gray-900">Dinner</span>
               </button>
                
                <button 
                  onClick={() => addMealToPlan(selectedDay, 'dessert')}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 512 512">
                      {/* Dessert icon from updated SVG file */}
                      <path d="M428.277,185.322c-6.291-7.663-14.534-13.181-23.706-16.067c5.154-40.093-5.377-79.849-29.981-111.362C347.021,22.583,303.712,0,256,0c-46.637,0-89.847,21.087-118.552,57.854c-24.624,31.539-35.169,71.308-30.019,111.402c-9.17,2.886-17.415,8.404-23.706,16.067c-9.553,11.636-13.339,26.835-10.387,41.702c4.335,21.84,23.87,40.105,52.168,40.105l47.357,231.52c1.589,7.77,8.426,13.35,16.356,13.35h133.565c7.932,0,14.768-5.58,16.356-13.35l47.357-231.52c28.25,0,47.826-18.236,52.168-40.105C441.616,212.158,437.829,196.959,428.277,185.322z M309.157,478.609H202.843L159.587,267.13h29.63c9.206,0,16.696,7.49,16.696,16.696c0,27.69,22.563,50.079,50.134,50.079c28.886-0.004,50.04-23.977,50.04-51.543c0-8.399,6.833-15.232,15.232-15.232h31.095L309.157,478.609z M405.913,220.522c-1.496,7.535-9.154,13.217-17.811,13.217c-4.825,0-57.075,0-66.783,0c-26.811,0-48.623,21.812-48.623,48.623c0,8.657-5.681,16.315-13.216,17.81c-10.871,2.159-20.175-6.213-20.175-16.346c0-27.618-22.469-50.087-50.087-50.087c-14.074,0-63.42,0-65.319,0c-15.606,0-23.412-16.216-14.367-27.228c5.721-6.97,12.819-6.163,17.578-6.163h28.717c9.22,0,16.696-7.475,16.696-16.696c0-9.22-7.475-16.696-16.696-16.696H140.8c-4.763-32.183,3.194-63.229,22.968-88.555c22.333-28.604,55.951-45.01,92.232-45.01c35.752,0,70.246,16.841,92.271,45.052c19.752,25.298,27.697,56.331,22.93,88.514h-15.027c-9.22,0-16.696,7.475-16.696,16.696c0,9.22,7.475,16.696,16.696,16.696c12.776,0,21.796,0,33.391,0C399.696,200.348,408.072,209.65,405.913,220.522z"/>
                      <circle cx="222.609" cy="150.261" r="16.696"/>
                      <circle cx="289.391" cy="183.652" r="16.696"/>
                      <circle cx="322.783" cy="116.87" r="16.696"/>
                      <circle cx="256" cy="83.478" r="16.696"/>
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-gray-900">Dessert</span>
                </button>
                
                <button 
                  onClick={() => addMealToPlan(selectedDay, 'snacks')}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 311.265 311.265">
                      {/* Apple logo with bite from updated SVG file */}
                      <path d="M151.379,82.354c0.487,0.015,0.977,0.022,1.464,0.022c0.001,0,0.001,0,0.002,0c17.285,0,36.041-9.745,47.777-24.823C212.736,42.011,218.24,23.367,215.723,6.4c-0.575-3.875-4.047-6.662-7.943-6.381c-17.035,1.193-36.32,11.551-47.987,25.772c-12.694,15.459-18.51,34.307-15.557,50.418C144.873,79.684,147.848,82.243,151.379,82.354z M171.388,35.309c7.236-8.82,18.949-16.106,29.924-19.028c-0.522,14.924-8.626,27.056-12.523,32.056c-7.576,9.732-19.225,16.735-30.338,18.566C158.672,52.062,168.14,39.265,171.388,35.309z"/>
                      <path d="M282.608,226.332c-0.794-1.91-2.343-3.407-4.279-4.137c-30.887-11.646-40.56-45.12-31.807-69.461c4.327-12.073,12.84-21.885,24.618-28.375c1.938-1.068,3.306-2.938,3.737-5.109c0.431-2.171-0.12-4.422-1.503-6.149c-15.654-19.536-37.906-31.199-59.525-31.199c-15.136,0-25.382,3.886-34.422,7.314c-6.659,2.525-12.409,4.706-19.001,4.706c-7.292,0-13.942-2.382-21.644-5.141c-9.003-3.225-19.206-6.88-31.958-6.88c-24.577,0-49.485,14.863-65.013,38.803c-5.746,8.905-9.775,19.905-11.98,32.708c-6.203,36.422,4.307,79.822,28.118,116.101c13.503,20.53,30.519,41.546,54.327,41.749l0.486,0.002c9.917,0,16.589-2.98,23.041-5.862c6.818-3.045,13.258-5.922,24.923-5.98l0.384-0.001c11.445,0,17.681,2.861,24.283,5.89c6.325,2.902,12.866,5.903,22.757,5.903l0.453-0.003c23.332-0.198,41.002-22.305,55.225-43.925c8.742-13.391,12.071-20.235,18.699-35.003C283.373,230.396,283.402,228.242,282.608,226.332z M251.281,259.065c-11.329,17.222-26.433,37.008-42.814,37.148l-0.318,0.001c-6.615,0-10.979-2.003-16.503-4.537c-7.046-3.233-15.815-7.256-30.538-7.256l-0.463,0.001c-14.819,0.074-23.77,4.072-30.961,7.285c-5.701,2.547-10.204,4.558-16.923,4.558l-0.348-0.001c-16.862-0.145-31.267-18.777-41.929-34.987c-21.78-33.184-31.45-72.565-25.869-105.332c1.858-10.789,5.155-19.909,9.79-27.093c12.783-19.708,32.869-31.951,52.419-31.951c10.146,0,18.284,2.915,26.9,6.001c8.262,2.96,16.805,6.02,26.702,6.02c9.341,0,16.956-2.888,24.32-5.681c8.218-3.117,16.717-6.34,29.104-6.34c14.739,0,30.047,7.097,42.211,19.302c-11.002,8.02-19.102,18.756-23.655,31.461c-11.872,33.016,2.986,69.622,33.334,85.316C261.229,242.764,258.024,248.734,251.281,259.065z"/>
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-gray-900">Snacks</span>
                </button>
               
               <button 
                 onClick={() => {
                   setShowMealTypeModal(false);
                   setSelectedDay(null);
                 }}
                 className="w-full p-3 text-gray-600 hover:text-gray-900 transition-colors text-center"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Convert Units Modal */}
       {showConvertModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
           <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-6">Convert Units</h3>
             
             <div className="space-y-4">
               <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                 <span className="font-medium text-gray-900">Original</span>
                 <input type="radio" name="unitType" defaultChecked className="w-5 h-5 text-orange-500" />
               </label>
               
               <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                 <span className="font-medium text-gray-900">Metric (grams, liters)</span>
                 <input type="radio" name="unitType" className="w-5 h-5 text-orange-500" />
               </label>
               
               <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                 <span className="font-medium text-gray-900">Imperial (pounds, ounces)</span>
                 <input type="radio" name="unitType" className="w-5 h-5 text-orange-500" />
               </label>
             </div>
             
             <button
               onClick={() => setShowConvertModal(false)}
               className="w-full mt-6 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
             >
               Apply
             </button>
           </div>
         </div>
       )}

       {/* Delete Confirmation Modal */}
       {showDeleteConfirm && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
           <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-3">Delete Recipe</h3>
             <p className="text-gray-600 mb-6">
               Are you sure you want to delete this recipe? This action cannot be undone.
             </p>
             <div className="flex space-x-3">
               <button
                 onClick={() => setShowDeleteConfirm(false)}
                 className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={async () => {
                   setShowDeleteConfirm(false);
                   if (onDelete) {
                     await onDelete();
                   }
                 }}
                 className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
               >
                 Delete
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 } 
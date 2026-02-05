'use client';

import { useState, useEffect } from 'react';
import { useUnitPreference, formatMeasurement } from '../../../hooks/useUnitPreference';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { getMealPlans, saveMealPlans, addRecipeToMealPlan, getWeekDates, getStartOfWeek, formatDateRange, formatDayName, isToday, MEAL_TYPES } from '@/lib/meal-plan';
import { getGroceryLists, createGroceryList, addRecipeToGroceryList } from '@acme/db/client';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
  onUpdate?: (updatedRecipe: any) => void; // New callback for when recipe is updated
  showActionButtons?: boolean; // Control whether to show action buttons
}

interface EditableRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  thumbnail?: string;
}

// Sortable Item Component for ingredients
function SortableIngredientItem({ 
  ingredient, 
  index, 
  id, 
  onUpdate, 
  onDelete 
}: { 
  ingredient: string; 
  index: number; 
  id: string;
  onUpdate: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    zIndex: isDragging ? 99999 : 1,
    opacity: isDragging ? 0.9 : 1,
    scale: isDragging ? 1.05 : 1,
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-wk-bg-primary rounded-lg border-2 border-transparent hover:border-wk-accent/50 mb-2 transition-colors ${
        isDragging ? 'shadow-wk-lg' : ''
      }`}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="flex flex-col space-y-1 text-wk-text-muted hover:text-wk-text-secondary cursor-grab active:cursor-grabbing touch-none p-1"
      >
        <div className="w-4 h-1 bg-current rounded-full"></div>
        <div className="w-4 h-1 bg-current rounded-full"></div>
        <div className="w-4 h-1 bg-current rounded-full"></div>
      </div>
      
      {/* Input field */}
      <Input
        type="text"
        value={ingredient}
        onChange={(e) => onUpdate(index, e.target.value)}
        className="flex-1 text-sm sm:text-base"
        placeholder="Enter ingredient..."
      />
      
      {/* Delete button */}
      <button
        onClick={() => onDelete(index)}
        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-wk-error/20 text-wk-error flex items-center justify-center hover:bg-wk-error/40 transition-colors flex-shrink-0"
      >
        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Sortable Item Component for instructions
function SortableInstructionItem({ 
  instruction, 
  index, 
  id, 
  onUpdate, 
  onDelete,
  displayIndex
}: { 
  instruction: string; 
  index: number; 
  id: string;
  onUpdate: (index: number, value: string) => void;
  onDelete: (index: number) => void;
  displayIndex: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    zIndex: isDragging ? 99999 : 1,
    opacity: isDragging ? 0.9 : 1,
    scale: isDragging ? 1.05 : 1,
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-wk-bg-primary rounded-lg border-2 border-transparent hover:border-wk-accent/50 mb-3 transition-colors ${
        isDragging ? 'shadow-wk-lg' : ''
      }`}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="flex flex-col space-y-1 text-wk-text-muted hover:text-wk-text-secondary cursor-grab active:cursor-grabbing mt-2 touch-none p-1"
      >
        <div className="w-4 h-1 bg-current rounded-full"></div>
        <div className="w-4 h-1 bg-current rounded-full"></div>
        <div className="w-4 h-1 bg-current rounded-full"></div>
      </div>
      
      {/* Step number */}
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-wk-accent text-wk-text-primary rounded-lg flex items-center justify-center font-display font-semibold text-xs sm:text-sm flex-shrink-0">
        {displayIndex + 1}
      </div>
      
      {/* Instruction textarea */}
      <textarea
        value={instruction}
        onChange={(e) => onUpdate(index, e.target.value)}
        className="flex-1 border border-wk-border rounded-lg px-2 py-1 sm:px-3 sm:py-2 focus:border-wk-accent focus:ring-2 focus:ring-wk-accent focus:outline-none min-h-[60px] sm:min-h-[80px] resize-none text-wk-text-primary bg-wk-bg-surface placeholder:text-wk-text-muted text-sm sm:text-base font-body transition-all duration-200"
        placeholder="Enter instruction step..."
        rows={3}
      />
      
      {/* Delete button */}
      <button
        onClick={() => onDelete(index)}
        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-wk-error/20 text-wk-error flex items-center justify-center hover:bg-wk-error/40 transition-colors flex-shrink-0 mt-1"
      >
        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Helper function to parse ingredient
const parseIngredient = (ingredient: string): { name: string; quantity: string; unit?: string } => {
  const match = ingredient.match(/^([\d\s\/\-\.]+)\s*([a-zA-Z]*)\s+(.+)$/);
  
  if (match) {
    return {
      quantity: match[1].trim(),
      unit: match[2] || undefined,
      name: match[3].trim()
    };
  }
  
  return {
    name: ingredient.trim(),
    quantity: '1'
  };
};

// Helper function to categorize ingredient
const categorizeIngredient = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('onion') || lowerName.includes('garlic') || lowerName.includes('tomato') || 
      lowerName.includes('pepper') || lowerName.includes('lettuce') || lowerName.includes('carrot') ||
      lowerName.includes('celery') || lowerName.includes('potato')) {
    return 'produce';
  }
  
  if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('pork') ||
      lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('shrimp') ||
      lowerName.includes('ground') || lowerName.includes('steak') || lowerName.includes('lamb')) {
    return 'meat-seafood';
  }
  
  if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('butter') ||
      lowerName.includes('cream') || lowerName.includes('yogurt') || lowerName.includes('egg')) {
    return 'dairy-eggs';
  }
  
  if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('paprika') ||
      lowerName.includes('cumin') || lowerName.includes('oregano') || lowerName.includes('basil')) {
    return 'spices';
  }
  
  return 'pantry';
};

export default function RecipeDetailModal({ isOpen, onClose, recipe, isSaved = false, onSave, onDelete, onUpdate, showActionButtons = true }: RecipeDetailModalProps) {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableRecipe, setEditableRecipe] = useState<EditableRecipe | null>(null);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [instructionIds, setInstructionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Drag state for real-time updates
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedInstructionIndex, setDraggedInstructionIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  
  // Unit preference
  const unitPreference = useUnitPreference();
  
  // Helper function to format numbers nicely
  const formatNumber = (num?: number): string => {
    if (num === undefined) return '';
    
    // Round to 2 decimal places and remove trailing zeros
    const rounded = Math.round(num * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, '');
  };
  
  // Modal states
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showListSelectionModal, setShowListSelectionModal] = useState(false);
  const [groceryLists, setGroceryLists] = useState<any[]>([]);
  const [selectedGroceryList, setSelectedGroceryList] = useState<string>('');
  const [newGroceryListName, setNewGroceryListName] = useState<string>('');
  const [showCreateNewList, setShowCreateNewList] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<boolean[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mealPlans, setMealPlans] = useState<{[key: string]: {[key: string]: any}}>({});
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  // Load meal plans from localStorage on component mount
  useEffect(() => {
    const storedMealPlans = getMealPlans();
    setMealPlans(storedMealPlans);
  }, []);

  // Initialize selected ingredients when recipe changes
  useEffect(() => {
    if (recipe?.ingredients) {
      setSelectedIngredients(new Array(recipe.ingredients.length).fill(true));
    }
  }, [recipe?.ingredients]);

  // Load grocery lists when list selection modal opens
  useEffect(() => {
    if (showListSelectionModal) {
      const loadGroceryLists = async () => {
        const lists = await getGroceryLists();
        setGroceryLists(lists);
        if (lists.length > 0) {
          setSelectedGroceryList(lists[0].id);
        }
      };
      loadGroceryLists();
    }
  }, [showListSelectionModal]);

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
  
  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    // Track instruction dragging for real-time numbering
    const activeId = event.active.id as string;
    if (activeId.startsWith('instruction-')) {
      const index = instructionIds.indexOf(activeId);
      setDraggedInstructionIndex(index);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // Update instruction numbering in real-time
    if (active.id.toString().startsWith('instruction-') && over?.id.toString().startsWith('instruction-')) {
      const activeIndex = instructionIds.indexOf(active.id as string);
      const overIndex = instructionIds.indexOf(over.id as string);
      setDraggedOverIndex(overIndex);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeId = active.id as string;
      const overId = over?.id as string;

      if (activeId.startsWith('ingredient-') && overId?.startsWith('ingredient-')) {
        setEditableRecipe(prev => {
          if (!prev) return null;
          const oldIndex = ingredientIds.indexOf(activeId);
          const newIndex = ingredientIds.indexOf(overId);
          
          const newIngredients = arrayMove(prev.ingredients, oldIndex, newIndex);
          const newIds = arrayMove(ingredientIds, oldIndex, newIndex);
          setIngredientIds(newIds);
          
          return { ...prev, ingredients: newIngredients };
        });
      } else if (activeId.startsWith('instruction-') && overId?.startsWith('instruction-')) {
        setEditableRecipe(prev => {
          if (!prev) return null;
          const oldIndex = instructionIds.indexOf(activeId);
          const newIndex = instructionIds.indexOf(overId);
          
          const newInstructions = arrayMove(prev.instructions, oldIndex, newIndex);
          const newIds = arrayMove(instructionIds, oldIndex, newIndex);
          setInstructionIds(newIds);
          
          return { ...prev, instructions: newInstructions };
        });
      }
    }

    // Reset drag state
    setActiveId(null);
    setDraggedInstructionIndex(null);
    setDraggedOverIndex(null);
  };

  // Function to get the display index for instructions during drag
  const getInstructionDisplayIndex = (index: number, id: string) => {
    if (draggedInstructionIndex === null || draggedOverIndex === null) {
      return index;
    }
    
    const currentIndex = instructionIds.indexOf(id);
    const draggedId = instructionIds[draggedInstructionIndex];
    
    if (id === draggedId) {
      // This is the dragged item, show the position it would have
      return draggedOverIndex;
    }
    
    // Calculate what position this item would have if the drag completed
    if (draggedInstructionIndex < draggedOverIndex) {
      // Dragging down
      if (currentIndex > draggedInstructionIndex && currentIndex <= draggedOverIndex) {
        return currentIndex - 1;
      }
    } else if (draggedInstructionIndex > draggedOverIndex) {
      // Dragging up
      if (currentIndex >= draggedOverIndex && currentIndex < draggedInstructionIndex) {
        return currentIndex + 1;
      }
    }
    
    return currentIndex;
  };

  const enterEditMode = () => {
    setIsEditMode(true);
    if (recipe) {
      console.log('Entering edit mode with recipe:', recipe);
      console.log('Recipe thumbnail:', recipe.thumbnail);
      
      // Generate stable IDs for each item
      const newIngredientIds = recipe.ingredients.map((_, index) => 
        `ingredient-${Date.now()}-${index}`
      );
      const newInstructionIds = recipe.instructions.map((_, index) => 
        `instruction-${Date.now()}-${index}`
      );
      
      setIngredientIds(newIngredientIds);
      setInstructionIds(newInstructionIds);
      
      const newEditableRecipe = {
        title: recipe.title,
        ingredients: [...recipe.ingredients],
        instructions: [...recipe.instructions],
        thumbnail: recipe.thumbnail
      };
      
      console.log('Setting editableRecipe:', newEditableRecipe);
      setEditableRecipe(newEditableRecipe);
    }
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditableRecipe(null);
  };

  // Function to update recipe in database
  const updateRecipeInDatabase = async (updatedRecipe: EditableRecipe) => {
    if (!recipe?.saved_id) {
      console.error('No saved_id found, cannot update recipe in database');
      return false;
    }

    try {
      // Get auth token from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!
      );
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        console.error('No auth token available');
        return false;
      }

      const response = await fetch(`/api/recipes/${recipe.saved_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          title: updatedRecipe.title,
          ingredients: updatedRecipe.ingredients,
          instructions: updatedRecipe.instructions,
          thumbnail: updatedRecipe.thumbnail
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('Recipe updated successfully in database:', updatedData);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to update recipe:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('Error updating recipe in database:', error);
      return false;
    }
  };

  const saveEditedRecipe = async () => {
    if (editableRecipe && recipe) {
      console.log('Saving edited recipe:', editableRecipe);
      setIsSaving(true);
      
      try {
        // Try to update in database first
        const dbUpdateSuccess = await updateRecipeInDatabase(editableRecipe);
        
        if (dbUpdateSuccess || !recipe.saved_id) {
          // Update the original recipe data with the edited values
          const updatedRecipe = {
            ...recipe,
            title: editableRecipe.title,
            ingredients: [...editableRecipe.ingredients],
            instructions: [...editableRecipe.instructions],
            thumbnail: editableRecipe.thumbnail
          };
          
          // Update the recipe object in memory
          Object.assign(recipe, updatedRecipe);
          
          // Notify parent component of the update
          if (onUpdate) {
            onUpdate(updatedRecipe);
          }
          
          console.log('Recipe updated successfully');
        } else {
          alert('Failed to save changes to database. Please try again.');
          setIsSaving(false);
          return; // Don't exit edit mode if save failed
        }
        
        // Call the optional onSave callback if provided
        if (onSave) {
          onSave();
        }
      } finally {
        setIsSaving(false);
      }
    }
    
    setIsEditMode(false);
    setEditableRecipe(null);
  };

  const updateIngredient = (index: number, value: string) => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => i === index ? value : ingredient)
    } : null);
  };

  const deleteIngredient = (index: number) => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    } : null);
    setIngredientIds(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      instructions: prev.instructions.map((instruction, i) => i === index ? value : instruction)
    } : null);
  };

  const deleteInstruction = (index: number) => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    } : null);
    setInstructionIds(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      ingredients: [...prev.ingredients, '']
    } : null);
    setIngredientIds(prev => [...prev, `ingredient-${Date.now()}-${prev.length}`]);
  };

  const addInstruction = () => {
    setEditableRecipe(prev => prev ? {
      ...prev,
      instructions: [...prev.instructions, '']
    } : null);
    setInstructionIds(prev => [...prev, `instruction-${Date.now()}-${prev.length}`]);
  };

  // Helper functions for meal plan and grocery functionality
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const addMealToPlan = (dayIndex: number, mealType: string) => {
    const dates = getWeekDates(currentWeekStart);
    const dateKey = dates[dayIndex].toISOString().split('T')[0];
    
    if (recipe) {
      // Add to shared storage
      addRecipeToMealPlan(dateKey, mealType, { ...recipe, id: recipe.saved_id || Date.now().toString() });
      
      // Update local state
      setMealPlans(prev => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [mealType]: recipe
        }
      }));
    }
    
    setShowMealTypeModal(false);
    setSelectedDay(null);
  };

  const removeMealFromPlan = (dayIndex: number, mealType: string) => {
    const dates = getWeekDates(currentWeekStart);
    const dateKey = dates[dayIndex].toISOString().split('T')[0];
    
    // Remove from shared storage
    const currentPlans = getMealPlans();
    if (currentPlans[dateKey]) {
      const updatedPlans = { ...currentPlans };
      delete updatedPlans[dateKey][mealType];
      
      // Remove the day entry if no meals are left
      if (Object.keys(updatedPlans[dateKey]).length === 0) {
        delete updatedPlans[dateKey];
      }
      
      saveMealPlans(updatedPlans);
    }
    
    // Update local state
    setMealPlans(prev => {
      const newPlans = { ...prev };
      if (newPlans[dateKey]) {
        delete newPlans[dateKey][mealType];
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


  if (!isOpen || !recipe) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-wk-bg-surface rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-wk-border shadow-wk-xl">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-wk-border flex-shrink-0">
            {/* Thumbnail */}
            {isEditMode ? (
              <div className="mb-4">
                {/* Completely isolated image container */}
                {(editableRecipe?.thumbnail || recipe?.thumbnail) ? (
                  <div style={{ position: 'relative', marginBottom: '16px', zIndex: 1 }}>
                    <img 
                      src={editableRecipe?.thumbnail || recipe?.thumbnail} 
                      alt={editableRecipe?.title || recipe?.title || 'Recipe'}
                      style={{
                        width: '100%',
                        height: '192px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        display: 'block',
                        visibility: 'visible',
                        opacity: '1',
                        backgroundColor: '#f3f4f6',
                        position: 'relative',
                        zIndex: 2,
                        border: '2px solid #e5e7eb'
                      }}
                      onLoad={(e) => {
                        console.log('✅ Image loaded and displayed');
                        console.log('Image natural size:', e.currentTarget.naturalWidth + 'x' + e.currentTarget.naturalHeight);
                        // Force refresh the image element
                        e.currentTarget.style.display = 'block';
                      }}
                      onError={(e) => {
                        console.log('❌ Image failed to load');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    
                    {/* Upload overlay with proper z-index */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)';
                        const label = e.currentTarget.querySelector('label') as HTMLElement;
                        if (label) {
                          label.style.opacity = '1';
                          label.style.backgroundColor = 'rgba(255,255,255,0.9)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0)';
                        const label = e.currentTarget.querySelector('label') as HTMLElement;
                        if (label) {
                          label.style.opacity = '0';
                          label.style.backgroundColor = 'rgba(255,255,255,0)';
                        }
                      }}
                    >
                      <label 
                        style={{
                          cursor: 'pointer',
                          backgroundColor: 'rgba(255,255,255,0)',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#111827',
                          transition: 'all 0.2s',
                          opacity: 0
                        }}
                      >
                        📸 Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📁 File selected:', file.name, file.size, 'bytes');
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const result = e.target?.result as string;
                                console.log('📸 Setting new thumbnail, length:', result.length);
                                setEditableRecipe(prev => prev ? { ...prev, thumbnail: result } : null);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  /* No image - show placeholder */
                  <div className="relative group">
                    <div className="w-full h-32 sm:h-48 bg-wk-bg-primary rounded-lg flex items-center justify-center border border-wk-border">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-wk-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <p className="text-wk-text-muted text-sm font-body">No image</p>
                      </div>
                    </div>
                    
                    {/* Upload overlay */}
                    <div className="absolute inset-0 bg-transparent hover:bg-black/40 rounded-lg flex items-center justify-center transition-all">
                      <label className="cursor-pointer bg-wk-bg-surface/0 hover:bg-wk-bg-surface/90 rounded-lg px-4 py-2 text-sm font-medium text-wk-text-primary font-body transition-all opacity-0 hover:opacity-100">
                        Add Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📁 File selected:', file.name, file.size, 'bytes');
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const result = e.target?.result as string;
                                console.log('📸 Setting new thumbnail, length:', result.length);
                                setEditableRecipe(prev => prev ? { ...prev, thumbnail: result } : null);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              recipe?.thumbnail && (
                <div className="mb-4">
                  <img 
                    src={recipe.thumbnail} 
                    alt={recipe.title}
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  />
                </div>
              )
            )}

            {/* Title */}
            {isEditMode ? (
              <Input
                type="text"
                value={editableRecipe?.title || ''}
                onChange={(e) => setEditableRecipe(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="text-xl sm:text-2xl font-display font-bold w-full"
                placeholder="Recipe title..."
              />
            ) : (
              <h1 className="text-xl sm:text-2xl font-display font-bold text-wk-text-primary">{recipe.title}</h1>
            )}
            
            {/* Action Buttons - Only show when not in edit mode and showActionButtons is true */}
            {!isEditMode && showActionButtons && (
              <div className="flex justify-center space-x-4 sm:space-x-6 mt-6">
                <button
                  onClick={() => {
                    if (isSaved && onDelete) {
                      setShowDeleteConfirm(true);
                    } else if (!isSaved && onSave) {
                      onSave();
                    }
                  }}
                  className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-wk-bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                    isSaved ? 'bg-wk-accent' : 'bg-wk-text-muted'
                  }`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-wk-text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 2h12a2 2 0 0 1 2 2v16l-8-4-8 4V4a2 2 0 0 1 2-2z"/>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium font-body text-wk-text-primary">Cookbooks</span>
                </button>
                
                <button
                  onClick={() => setShowGroceryModal(true)}
                  className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-wk-bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-wk-text-muted rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-wk-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium font-body text-wk-text-primary">Grocery</span>
                </button>
                
                <button
                  onClick={() => setShowMealPlanModal(true)}
                  className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-wk-bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-wk-text-muted rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-wk-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium font-body text-wk-text-primary">Meal Plan</span>
                </button>
                
                <button
                  onClick={enterEditMode}
                  className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-wk-bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-wk-text-muted rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-wk-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium font-body text-wk-text-primary">Edit Recipe</span>
                </button>
                
                <div className="relative share-dropdown">
                  <button
                    onClick={() => setShowShareDropdown(!showShareDropdown)}
                    className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-wk-bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-wk-text-muted rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-wk-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-medium font-body text-wk-text-primary">Share</span>
                  </button>
                  
                  {showShareDropdown && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 bg-wk-bg-surface border border-wk-border rounded-xl shadow-wk-lg z-10">
                      <div className="py-2">
                        <button
                          onClick={() => handleExport('url')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Share URL</span>
                        </button>
                        <button
                          onClick={() => handleExport('clipboard')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy to Clipboard</span>
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Export as PDF</span>
                        </button>
                        <button
                          onClick={() => handleExport('docx')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Export as DOC</span>
                        </button>
                        <button
                          onClick={() => handleExport('txt')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Export as TXT</span>
                        </button>
                        <button
                          onClick={() => handleExport('excel')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Export as Excel</span>
                        </button>
                        <button
                          onClick={() => handleExport('html')}
                          className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2 transition-colors"
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
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Tabs */}
            {!isEditMode && (
              <div className="flex border-b border-wk-border">
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`flex-1 px-4 py-3 text-lg font-semibold font-display transition-colors ${
                    activeTab === 'ingredients' 
                      ? 'text-wk-accent border-b-2 border-wk-accent bg-wk-accent-muted' 
                      : 'text-wk-text-secondary hover:text-wk-text-primary hover:bg-wk-bg-surface-hover'
                  }`}
                >
                  Ingredients
                </button>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`flex-1 px-4 py-3 text-lg font-semibold font-display transition-colors ${
                    activeTab === 'instructions' 
                      ? 'text-wk-accent border-b-2 border-wk-accent bg-wk-accent-muted' 
                      : 'text-wk-text-secondary hover:text-wk-text-primary hover:bg-wk-bg-surface-hover'
                  }`}
                >
                  Instructions
                </button>
              </div>
            )}

            <div className="p-4 sm:p-6">
              {/* Edit Mode - Show both sections */}
              {isEditMode ? (
                <>
                  {/* Ingredients Section */}
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-lg sm:text-xl font-display font-semibold text-wk-text-primary uppercase tracking-wide mb-4">
                      Ingredients
                    </h2>
                    
                    <SortableContext items={ingredientIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {editableRecipe?.ingredients.map((ingredient, index) => (
                          <SortableIngredientItem
                            key={ingredientIds[index]}
                            id={ingredientIds[index]}
                            ingredient={ingredient}
                            index={index}
                            onUpdate={updateIngredient}
                            onDelete={deleteIngredient}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <button
                      onClick={addIngredient}
                      className="w-full mt-3 p-3 border-2 border-dashed border-wk-border rounded-lg hover:border-wk-accent hover:bg-wk-accent-muted transition-colors text-wk-text-secondary hover:text-wk-accent font-medium font-body"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Instructions Section */}
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-lg sm:text-xl font-display font-semibold text-wk-text-primary uppercase tracking-wide mb-4">
                      Instructions
                    </h2>
                    
                    <SortableContext items={instructionIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {editableRecipe?.instructions.map((instruction, index) => (
                          <SortableInstructionItem
                            key={instructionIds[index]}
                            id={instructionIds[index]}
                            instruction={instruction}
                            index={index}
                            displayIndex={getInstructionDisplayIndex(index, instructionIds[index])}
                            onUpdate={updateInstruction}
                            onDelete={deleteInstruction}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <button
                      onClick={addInstruction}
                      className="w-full mt-3 p-3 border-2 border-dashed border-wk-border rounded-lg hover:border-wk-accent hover:bg-wk-accent-muted transition-colors text-wk-text-secondary hover:text-wk-accent font-medium font-body"
                    >
                      + Add
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Ingredients Tab Content */}
                  {activeTab === 'ingredients' && (
                    <div className="space-y-3 sm:space-y-4">
                      {recipe.ingredients.map((ingredient, index) => {
                        // Try to use normalized ingredients if available for unit conversion
                        const normalized = (recipe as any).normalized_ingredients?.[index];
                        
                        if (normalized && unitPreference !== 'original') {
                          // Use normalized data for unit conversion
                          const isRange = !!(normalized as any).range;
                          const range = (normalized as any).range;
                          
                          const minQty = isRange ? range.min : normalized.quantity;
                          const maxQty = isRange ? range.max : normalized.quantity;
                          const unit = normalized.unit;
                          
                          // For recipes, we don't have pre-computed metric/imperial conversions
                          // So we'll need to compute them on the fly or fallback to original
                          const displayText = unit
                            ? `${formatNumber(minQty)}${minQty !== maxQty ? ` to ${formatNumber(maxQty)}` : ''} ${unit} ${normalized.ingredient}`
                            : ingredient;
                          
                          return (
                            <div key={index} className="flex items-start">
                              <div className="w-1 h-6 bg-wk-accent rounded-full mr-4 flex-shrink-0 mt-1"></div>
                              <span className="text-wk-text-primary font-body leading-relaxed">{displayText}</span>
                            </div>
                          );
                        }
                        
                        // Fallback to original formatting
                        return (
                          <div key={index} className="flex items-start">
                            <div className="w-1 h-6 bg-wk-accent rounded-full mr-4 flex-shrink-0 mt-1"></div>
                            <span className="text-wk-text-primary font-body leading-relaxed">{ingredient}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Instructions Tab Content */}
                  {activeTab === 'instructions' && (
                    <div className="space-y-3 sm:space-y-4">
                      {recipe.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-start">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-wk-accent text-wk-text-primary rounded-lg flex items-center justify-center font-display font-semibold text-xs sm:text-sm mr-3 sm:mr-4 flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-wk-text-primary font-body leading-relaxed flex-1 pt-1 text-sm sm:text-base">
                            {instruction}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-wk-border p-3 sm:p-4 bg-wk-bg-primary flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="text-xs sm:text-sm text-wk-text-secondary font-body">
                {(isEditMode ? editableRecipe?.ingredients.length : recipe.ingredients.length) || 0} ingredients • {(isEditMode ? editableRecipe?.instructions.length : recipe.instructions.length) || 0} steps
              </div>
              
              <div className="flex space-x-2">
                {isEditMode ? (
                  <>
                    <Button variant="ghost" onClick={exitEditMode} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button variant="default" onClick={saveEditedRecipe} disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-sm mx-4 p-6 shadow-wk-xl">
            <h3 className="text-lg font-display font-semibold text-wk-text-primary mb-3">Delete Recipe</h3>
            <p className="text-wk-text-secondary font-body mb-6">
              Are you sure you want to delete this recipe? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  if (onDelete) {
                    await onDelete();
                  }
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grocery Modal */}
      {showGroceryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-wk-xl">
            {/* Grocery Header */}
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-2xl font-display font-semibold text-wk-text-primary">Add to Grocery List</h2>
              <button onClick={() => setShowGroceryModal(false)} className="p-2 text-wk-text-secondary hover:text-wk-text-primary transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Ingredients List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-display font-semibold text-wk-text-primary">Ingredients</h3>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-wk-accent text-sm font-medium font-body hover:text-wk-accent-hover transition-colors"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {recipe.ingredients.map((ingredient, index) => {
                  // Try to use normalized ingredients if available for unit conversion
                  const normalized = (recipe as any).normalized_ingredients?.[index];
                  
                  let displayText = ingredient;
                  if (normalized && unitPreference !== 'original') {
                    // Use normalized data for unit conversion
                    const isRange = !!(normalized as any).range;
                    const range = (normalized as any).range;
                    
                    const minQty = isRange ? range.min : normalized.quantity;
                    const maxQty = isRange ? range.max : normalized.quantity;
                    const unit = normalized.unit;
                    
                    // For recipes, we don't have pre-computed metric/imperial conversions
                    // So we'll need to compute them on the fly or fallback to original
                    displayText = unit 
                      ? `${formatNumber(minQty)}${minQty !== maxQty ? ` to ${formatNumber(maxQty)}` : ''} ${unit} ${normalized.ingredient}`
                      : ingredient;
                  }
                  
                  return (
                    <label key={index} className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-wk-bg-surface-hover transition-colors">
                      <div className="w-1 h-6 bg-wk-accent rounded-full mr-4 flex-shrink-0"></div>
                      <span className="flex-1 text-lg text-wk-text-primary font-body">{displayText}</span>
                      <input 
                        type="checkbox" 
                        checked={selectedIngredients[index] || false}
                        onChange={() => toggleIngredient(index)}
                        className="w-5 h-5 text-wk-accent rounded border-wk-border focus:ring-wk-accent ml-3 bg-wk-bg-primary accent-wk-accent" 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            
            {/* Add Button */}
            <div className="p-6 border-t border-wk-border">
              <Button 
                onClick={() => {
                  if (selectedCount === 0) return;
                  setShowGroceryModal(false);
                  setShowListSelectionModal(true);
                }}
                disabled={selectedCount === 0}
                className="w-full"
                variant={selectedCount > 0 ? 'default' : 'ghost'}
              >
                {selectedCount > 0 
                  ? `Add ${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`
                  : 'Select ingredients to add'
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List Selection Modal */}
      {showListSelectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" style={{zIndex: 70}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-md shadow-wk-xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-xl font-display font-semibold text-wk-text-primary">Choose List</h2>
              <button 
                onClick={() => {
                  setShowListSelectionModal(false);
                  setShowCreateNewList(false);
                  setNewGroceryListName('');
                }}
                className="text-wk-accent font-medium font-body text-lg hover:text-wk-accent-hover transition-colors"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-6">
              {!showCreateNewList ? (
                <div className="space-y-3">
                  {/* Existing Lists */}
                  {groceryLists.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm text-wk-text-muted font-body block">Add to existing list:</label>
                      {groceryLists.map(list => (
                        <button
                          key={list.id}
                          onClick={async () => {
                            // Add to existing list using database function
                            const success = await addRecipeToGroceryList(list.id, {
                              id: recipe.saved_id || Date.now().toString(),
                              title: recipe.title,
                              ingredients: recipe.ingredients.filter((_, index) => selectedIngredients[index]),
                              instructions: recipe.instructions,
                              platform: recipe.platform || '',
                              source: recipe.source || '',
                              original_url: '',
                              created_at: new Date().toISOString()
                            });
                            
                            if (success) {
                              console.log('Recipe added to grocery list successfully');
                            } else {
                              console.error('Failed to add recipe to grocery list');
                            }
                            
                            setShowListSelectionModal(false);
                            setSelectedIngredients(new Array(recipe.ingredients.length).fill(true));
                          }}
                          className="w-full text-left p-3 bg-wk-bg-primary hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {/* Visual Element */}
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {list.visual?.type === 'gradient' && list.visual.gradient ? (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    background: `linear-gradient(135deg, ${list.visual.gradient.from}, ${list.visual.gradient.to})`
                                  }}
                                />
                              ) : list.visual?.type === 'emoji' && list.visual.emoji ? (
                                <span className="text-lg">{list.visual.emoji}</span>
                              ) : (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    background: `linear-gradient(135deg, #667eea, #764ba2)`
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="text-wk-text-primary font-medium font-body">{list.name}</div>
                              <div className="text-wk-text-muted text-sm font-body">{list.items.length} items</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Create New Button */}
                  <div className="pt-3 border-t border-wk-border">
                    <button
                      onClick={() => setShowCreateNewList(true)}
                      className="w-full p-3 border-2 border-dashed border-wk-border rounded-lg hover:border-wk-accent hover:bg-wk-accent-muted transition-colors text-wk-text-secondary hover:text-wk-accent font-medium font-body cursor-pointer"
                    >
                      + Create New List
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium font-body text-wk-text-primary mb-2">List Name</label>
                    <Input
                      type="text"
                      value={newGroceryListName}
                      onChange={(e) => setNewGroceryListName(e.target.value)}
                      placeholder="Enter list name..."
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateNewList(false);
                        setNewGroceryListName('');
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        if (!newGroceryListName) return;
                        
                        const selectedItems = recipe.ingredients.filter((_, index) => selectedIngredients[index]);
                        
                        // Create new list with selected ingredients
                        const newList = await createGroceryList(newGroceryListName, [{
                          title: recipe.title,
                          thumbnail: recipe.thumbnail || '',
                          ingredients: selectedItems,
                          instructions: recipe.instructions,
                          platform: recipe.platform || '',
                          source: recipe.source || '',
                          original_url: '',
                          created_at: new Date().toISOString(),
                          id: recipe.saved_id || Date.now().toString()
                        }]);
                        
                        if (newList) {
                          console.log('Grocery list created successfully:', newList);
                        } else {
                          console.error('Failed to create grocery list');
                        }
                        
                        setShowListSelectionModal(false);
                        setShowCreateNewList(false);
                        setNewGroceryListName('');
                        setSelectedIngredients(new Array(recipe.ingredients.length).fill(true));
                      }}
                      disabled={!newGroceryListName}
                      className="flex-1"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meal Plan Modal */}
      {showMealPlanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-wk-xl">
            {/* Meal Plan Header */}
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-xl font-display font-semibold text-wk-text-primary">Add to meal plan</h2>
              <button onClick={() => setShowMealPlanModal(false)} className="text-wk-accent font-medium font-body text-lg hover:text-wk-accent-hover transition-colors">
                Done
              </button>
            </div>
            
            {/* Week Navigation */}
            <div className="flex items-center justify-between p-4 border-b border-wk-border">
              <button 
                onClick={() => navigateWeek('prev')}
                className="p-2 text-wk-text-secondary hover:text-wk-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium font-body text-wk-text-primary text-center">{formatDateRange(currentWeekStart)}</span>
              <button 
                onClick={() => navigateWeek('next')}
                className="p-2 text-wk-text-secondary hover:text-wk-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Days List */}
            <div className="flex-1 overflow-y-auto">
              {getWeekDates(currentWeekStart).map((date: Date, index: number) => {
                const dateKey = date.toISOString().split('T')[0];
                const dayMeals = mealPlans[dateKey] || {};
                const hasRecipes = Object.keys(dayMeals).length > 0;
                const isCurrentDay = isToday(date);
                
                return (
                  <div key={index} className="border-b border-wk-border">
                    <div className="flex items-center justify-between p-4">
                      <h3 className={`font-medium font-display ${isCurrentDay ? 'text-wk-accent' : 'text-wk-text-primary'}`}>
                        {formatDayName(date)}
                      </h3>
                      <button 
                        onClick={() => {
                          setSelectedDay(index);
                          setShowMealTypeModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-wk-accent/20 text-wk-accent flex items-center justify-center hover:bg-wk-accent/40 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    
                    {hasRecipes ? (
                      <div className="px-4 pb-4 space-y-2">
                        {Object.entries(dayMeals).map(([mealType, meal]: [string, any]) => (
                          <div key={mealType} className="flex items-center space-x-3 p-3 bg-wk-bg-surface-hover rounded-lg">
                            <div className="w-12 h-12 bg-wk-bg-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {meal.thumbnail || meal.imageUrl ? (
                                <img 
                                  src={meal.thumbnail || meal.imageUrl} 
                                  alt={meal.title} 
                                  className="w-full h-full rounded-lg object-cover" 
                                />
                              ) : (
                                <svg className="w-6 h-6 text-wk-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium font-body text-sm text-wk-text-primary">{meal.title}</p>
                              <p className="text-sm font-body capitalize" style={{color: MEAL_TYPES.find((m: { type: string; color: string }) => m.type === mealType)?.color || 'var(--accent)'}}>{mealType}</p>
                            </div>
                            <button
                              onClick={() => removeMealFromPlan(index, mealType)}
                              className="w-6 h-6 rounded-full bg-wk-error/20 text-wk-error flex items-center justify-center hover:bg-wk-error/40 transition-colors flex-shrink-0 cursor-pointer"
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
                      <div className="px-4 pb-4 text-wk-text-muted font-body text-sm">
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
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" style={{zIndex: 70}}>
           <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-sm mx-4 shadow-wk-xl">
             <div className="p-6 space-y-4">
               <h3 className="text-lg font-display font-semibold text-wk-text-primary text-center mb-4">Select Meal Type</h3>
               
               <button 
                 onClick={() => addMealToPlan(selectedDay, 'breakfast')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
               >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                  <svg className="w-8 h-8 text-wk-accent" fill="currentColor" viewBox="0 0 185.458 185.458">
                     <path d="M149.583,149.834c-1.849-27.829-25.016-49.921-53.306-49.921c-28.29,0-51.457,22.092-53.306,49.921H0v7.132h46.356h99.843h39.259v-7.132H149.583z M50.057,149.834c1.828-23.9,21.858-42.79,46.22-42.79s44.391,18.89,46.22,42.79H50.057z"/>
                     <path d="M96.277,96.347c1.971,0,3.566-1.597,3.566-3.566V32.058c0-1.969-1.595-3.566-3.566-3.566c-1.971,0-3.566,1.597-3.566,3.566v60.723C92.711,94.75,94.306,96.347,96.277,96.347z"/>
                     <path d="M142.026,114.12c0.913,0,1.825-0.348,2.521-1.045l36.55-36.551c1.393-1.393,1.393-3.649,0-5.042s-3.649-1.393-5.042,0l-36.55,36.551c-1.393,1.393-1.393,3.649,0,5.042C140.202,113.772,141.114,114.12,142.026,114.12z"/>
                     <path d="M47.846,113.075c0.696,0.696,1.609,1.045,2.521,1.045s1.825-0.348,2.521-1.045c1.393-1.393,1.393-3.649,0-5.042l-36.55-36.551c-1.393-1.393-3.649-1.393-5.042,0s-1.393,3.649,0,5.042L47.846,113.075z"/>
                   </svg>
                 </div>
                 <span className="text-lg font-medium font-body text-wk-text-primary">Breakfast</span>
               </button>
               
               <button 
                 onClick={() => addMealToPlan(selectedDay, 'lunch')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
               >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                  <svg className="w-8 h-8 text-wk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                   </svg>
                 </div>
                 <span className="text-lg font-medium font-body text-wk-text-primary">Lunch</span>
               </button>
               
               <button 
                 onClick={() => addMealToPlan(selectedDay, 'dinner')}
                 className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
               >
                 <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                   <svg className="w-8 h-8 text-wk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                   </svg>
                 </div>
                 <span className="text-lg font-medium font-body text-wk-text-primary">Dinner</span>
               </button>
                
                <button 
                  onClick={() => addMealToPlan(selectedDay, 'dessert')}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                    <svg className="w-8 h-8 text-wk-accent" fill="currentColor" viewBox="0 0 512 512">
                      <path d="M428.277,185.322c-6.291-7.663-14.534-13.181-23.706-16.067c5.154-40.093-5.377-79.849-29.981-111.362C347.021,22.583,303.712,0,256,0c-46.637,0-89.847,21.087-118.552,57.854c-24.624,31.539-35.169,71.308-30.019,111.402c-9.17,2.886-17.415,8.404-23.706,16.067c-9.553,11.636-13.339,26.835-10.387,41.702c4.335,21.84,23.87,40.105,52.168,40.105l47.357,231.52c1.589,7.77,8.426,13.35,16.356,13.35h133.565c7.932,0,14.768-5.58,16.356-13.35l47.357-231.52c28.25,0,47.826-18.236,52.168-40.105C441.616,212.158,437.829,196.959,428.277,185.322z M309.157,478.609H202.843L159.587,267.13h29.63c9.206,0,16.696,7.49,16.696,16.696c0,27.69,22.563,50.079,50.134,50.079c28.886-0.004,50.04-23.977,50.04-51.543c0-8.399,6.833-15.232,15.232-15.232h31.095L309.157,478.609z M405.913,220.522c-1.496,7.535-9.154,13.217-17.811,13.217c-4.825,0-57.075,0-66.783,0c-26.811,0-48.623,21.812-48.623,48.623c0,8.657-5.681,16.315-13.216,17.81c-10.871,2.159-20.175-6.213-20.175-16.346c0-27.618-22.469-50.087-50.087-50.087c-14.074,0-63.42,0-65.319,0c-15.606,0-23.412-16.216-14.367-27.228c5.721-6.97,12.819-6.163,17.578-6.163h28.717c9.22,0,16.696-7.475,16.696-16.696c0-9.22-7.475-16.696-16.696-16.696H140.8c-4.763-32.183,3.194-63.229,22.968-88.555c22.333-28.604,55.951-45.01,92.232-45.01c35.752,0,70.246,16.841,92.271,45.052c19.752,25.298,27.697,56.331,22.93,88.514h-15.027c-9.22,0-16.696,7.475-16.696,16.696c0,9.22,7.475,16.696,16.696,16.696c12.776,0,21.796,0,33.391,0C399.696,200.348,408.072,209.65,405.913,220.522z"/>
                      <circle cx="222.609" cy="150.261" r="16.696"/>
                      <circle cx="289.391" cy="183.652" r="16.696"/>
                      <circle cx="322.783" cy="116.87" r="16.696"/>
                      <circle cx="256" cy="83.478" r="16.696"/>
                    </svg>
                  </div>
                  <span className="text-lg font-medium font-body text-wk-text-primary">Dessert</span>
                </button>
                
                <button 
                  onClick={() => addMealToPlan(selectedDay, 'morning-snack')}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                    <svg className="w-8 h-8 text-wk-accent" fill="currentColor" viewBox="0 0 311.265 311.265">
                      <path d="M151.379,82.354c0.487,0.015,0.977,0.022,1.464,0.022c0.001,0,0.001,0,0.002,0c17.285,0,36.041-9.745,47.777-24.823C212.736,42.011,218.24,23.367,215.723,6.4c-0.575-3.875-4.047-6.662-7.943-6.381c-17.035,1.193-36.32,11.551-47.987,25.772c-12.694,15.459-18.51,34.307-15.557,50.418C144.873,79.684,147.848,82.243,151.379,82.354z M171.388,35.309c7.236-8.82,18.949-16.106,29.924-19.028c-0.522,14.924-8.626,27.056-12.523,32.056c-7.576,9.732-19.225,16.735-30.338,18.566C158.672,52.062,168.14,39.265,171.388,35.309z"/>
                      <path d="M282.608,226.332c-0.794-1.91-2.343-3.407-4.279-4.137c-30.887-11.646-40.56-45.12-31.807-69.461c4.327-12.073,12.84-21.885,24.618-28.375c1.938-1.068,3.306-2.938,3.737-5.109c0.431-2.171-0.12-4.422-1.503-6.149c-15.654-19.536-37.906-31.199-59.525-31.199c-15.136,0-25.382,3.886-34.422,7.314c-6.659,2.525-12.409,4.706-19.001,4.706c-7.292,0-13.942-2.382-21.644-5.141c-9.003-3.225-19.206-6.88-31.958-6.88c-24.577,0-49.485,14.863-65.013,38.803c-5.746,8.905-9.775,19.905-11.98,32.708c-6.203,36.422,4.307,79.822,28.118,116.101c13.503,20.53,30.519,41.546,54.327,41.749l0.486,0.002c9.917,0,16.589-2.98,23.041-5.862c6.818-3.045,13.258-5.922,24.923-5.98l0.384-0.001c11.445,0,17.681,2.861,24.283,5.89c6.325,2.902,12.866,5.903,22.757,5.903l0.453-0.003c23.332-0.198,41.002-22.305,55.225-43.925c8.742-13.391,12.071-20.235,18.699-35.003C283.373,230.396,283.402,228.242,282.608,226.332z M251.281,259.065c-11.329,17.222-26.433,37.008-42.814,37.148l-0.318,0.001c-6.615,0-10.979-2.003-16.503-4.537c-7.046-3.233-15.815-7.256-30.538-7.256l-0.463,0.001c-14.819,0.074-23.77,4.072-30.961,7.285c-5.701,2.547-10.204,4.558-16.923,4.558l-0.348-0.001c-16.862-0.145-31.267-18.777-41.929-34.987c-21.78-33.184-31.45-72.565-25.869-105.332c1.858-10.789,5.155-19.909,9.79-27.093c12.783-19.708,32.869-31.951,52.419-31.951c10.146,0,18.284,2.915,26.9,6.001c8.262,2.96,16.805,6.02,26.702,6.02c9.341,0,16.956-2.888,24.32-5.681c8.218-3.117,16.717-6.34,29.104-6.34c14.739,0,30.047,7.097,42.211,19.302c-11.002,8.02-19.102,18.756-23.655,31.461c-11.872,33.016,2.986,69.622,33.334,85.316C261.229,242.764,258.024,248.734,251.281,259.065z"/>
                    </svg>
                  </div>
                  <span className="text-lg font-medium font-body text-wk-text-primary">Snack (AM)</span>
                </button>
                
                <button 
                  onClick={() => addMealToPlan(selectedDay, 'afternoon-snack')}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-wk-bg-surface-hover rounded-lg transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-wk-accent/20">
                    <svg className="w-8 h-8 text-wk-accent" fill="currentColor" viewBox="0 0 311.265 311.265">
                      <path d="M151.379,82.354c0.487,0.015,0.977,0.022,1.464,0.022c0.001,0,0.001,0,0.002,0c17.285,0,36.041-9.745,47.777-24.823C212.736,42.011,218.24,23.367,215.723,6.4c-0.575-3.875-4.047-6.662-7.943-6.381c-17.035,1.193-36.32,11.551-47.987,25.772c-12.694,15.459-18.51,34.307-15.557,50.418C144.873,79.684,147.848,82.243,151.379,82.354z M171.388,35.309c7.236-8.82,18.949-16.106,29.924-19.028c-0.522,14.924-8.626,27.056-12.523,32.056c-7.576,9.732-19.225,16.735-30.338,18.566C158.672,52.062,168.14,39.265,171.388,35.309z"/>
                      <path d="M282.608,226.332c-0.794-1.91-2.343-3.407-4.279-4.137c-30.887-11.646-40.56-45.12-31.807-69.461c4.327-12.073,12.84-21.885,24.618-28.375c1.938-1.068,3.306-2.938,3.737-5.109c0.431-2.171-0.12-4.422-1.503-6.149c-15.654-19.536-37.906-31.199-59.525-31.199c-15.136,0-25.382,3.886-34.422,7.314c-6.659,2.525-12.409,4.706-19.001,4.706c-7.292,0-13.942-2.382-21.644-5.141c-9.003-3.225-19.206-6.88-31.958-6.88c-24.577,0-49.485,14.863-65.013,38.803c-5.746,8.905-9.775,19.905-11.98,32.708c-6.203,36.422,4.307,79.822,28.118,116.101c13.503,20.53,30.519,41.546,54.327,41.749l0.486,0.002c9.917,0,16.589-2.98,23.041-5.862c6.818-3.045,13.258-5.922,24.923-5.98l0.384-0.001c11.445,0,17.681,2.861,24.283,5.89c6.325,2.902,12.866,5.903,22.757,5.903l0.453-0.003c23.332-0.198,41.002-22.305,55.225-43.925c8.742-13.391,12.071-20.235,18.699-35.003C283.373,230.396,283.402,228.242,282.608,226.332z M251.281,259.065c-11.329,17.222-26.433,37.008-42.814,37.148l-0.318,0.001c-6.615,0-10.979-2.003-16.503-4.537c-7.046-3.233-15.815-7.256-30.538-7.256l-0.463,0.001c-14.819,0.074-23.77,4.072-30.961,7.285c-5.701,2.547-10.204,4.558-16.923,4.558l-0.348-0.001c-16.862-0.145-31.267-18.777-41.929-34.987c-21.78-33.184-31.45-72.565-25.869-105.332c1.858-10.789,5.155-19.909,9.79-27.093c12.783-19.708,32.869-31.951,52.419-31.951c10.146,0,18.284,2.915,26.9,6.001c8.262,2.96,16.805,6.02,26.702,6.02c9.341,0,16.956-2.888,24.32-5.681c8.218-3.117,16.717-6.34,29.104-6.34c14.739,0,30.047,7.097,42.211,19.302c-11.002,8.02-19.102,18.756-23.655,31.461c-11.872,33.016,2.986,69.622,33.334,85.316C261.229,242.764,258.024,248.734,251.281,259.065z"/>
                    </svg>
                  </div>
                  <span className="text-lg font-medium font-body text-wk-text-primary">Snack (PM)</span>
                </button>
               
               <Button 
                 variant="ghost"
                 onClick={() => {
                   setShowMealTypeModal(false);
                   setSelectedDay(null);
                 }}
                 className="w-full"
               >
                 Cancel
               </Button>
             </div>
           </div>
         </div>
       )}

    </DndContext>
  );
} 
// Shared meal plan storage utilities

export interface MealPlan {
  [dateKey: string]: {
    [mealType: string]: any; // Recipe object
  };
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnail?: string;
  ingredients: string[];
  instructions: string[];
  created_at?: string;
  saved_id?: string;
}

// Get meal plans from localStorage
export const getMealPlans = (): MealPlan => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem('mealPlans');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading meal plans:', error);
    return {};
  }
};

// Save meal plans to localStorage
export const saveMealPlans = (mealPlans: MealPlan): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('mealPlans', JSON.stringify(mealPlans));
  } catch (error) {
    console.error('Error saving meal plans:', error);
  }
};

// Add a recipe to a specific day and meal type
export const addRecipeToMealPlan = (dateKey: string, mealType: string, recipe: Recipe): void => {
  const currentPlans = getMealPlans();
  
  const updatedPlans = {
    ...currentPlans,
    [dateKey]: {
      ...currentPlans[dateKey],
      [mealType]: recipe
    }
  };
  
  saveMealPlans(updatedPlans);
};

// Remove a recipe from a specific day and meal type
export const removeRecipeFromMealPlan = (dateKey: string, mealType: string): void => {
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
};

// Get formatted date key (YYYY-MM-DD)
export const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get week dates starting from Monday (for modal compatibility)
export const getWeekDates = (startDate: Date): Date[] => {
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

// Get start of week (Monday for modal compatibility)
export const getStartOfWeek = (date: Date): Date => {
  const currentDate = new Date(date);
  const dayOfWeek = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday;
};

// Helper functions for formatting
export const formatDateRange = (startDate: Date): string => {
  const dates = getWeekDates(startDate);
  const start = dates[0];
  const end = dates[6];
  
  const startFormatted = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const endFormatted = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  return `${startFormatted} - ${endFormatted}`;
};

export const formatDayName = (date: Date): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
    '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
    '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'];
  
  const dayName = dayNames[date.getDay()];
  const dayNumber = date.getDate();
  return `${dayName} ${ordinals[dayNumber]}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Types for grocery-list page compatibility
export interface MealSlot {
  type: 'breakfast' | 'morning-snack' | 'lunch' | 'afternoon-snack' | 'dinner' | 'dessert';
  recipe?: Recipe;
}

export interface DayPlan {
  date: string;
  meals: MealSlot[];
}

// Meal types configuration (matching grocery-list page)
export const MEAL_TYPES = [
  { type: 'breakfast', label: 'Breakfast', size: 'large', color: '#008FF4' },
  { type: 'morning-snack', label: 'Morning Snack', size: 'small', color: '#a5a6ff' },
  { type: 'lunch', label: 'Lunch', size: 'large', color: '#2B966F' },
  { type: 'afternoon-snack', label: 'Afternoon Snack', size: 'small', color: '#a5a6ff' },
  { type: 'dinner', label: 'Dinner', size: 'large', color: '#FF3A25' },
  { type: 'dessert', label: 'Dessert', size: 'medium', color: '#F739F6' },
] as const;

// Convert shared meal plans to grocery-list page format
export const convertMealPlansToWeekPlan = (currentWeek: Date): DayPlan[] => {
  const mealPlans = getMealPlans();
  const startOfWeek = getStartOfWeek(currentWeek);
  const week: DayPlan[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateKey = getDateKey(date);
    
    // Create meal slots for this day
    const meals: MealSlot[] = MEAL_TYPES.map(mealType => ({
      type: mealType.type,
      recipe: mealPlans[dateKey]?.[mealType.type] || undefined
    }));
    
    week.push({
      date: dateKey,
      meals: meals
    });
  }
  
  return week;
};

// Convert grocery-list page format back to shared meal plans
export const convertWeekPlanToMealPlans = (weekPlan: DayPlan[]): void => {
  const mealPlans: MealPlan = {};
  
  weekPlan.forEach(day => {
    day.meals.forEach(meal => {
      if (meal.recipe) {
        if (!mealPlans[day.date]) {
          mealPlans[day.date] = {};
        }
        mealPlans[day.date][meal.type] = meal.recipe;
      }
    });
  });
  
  saveMealPlans(mealPlans);
};
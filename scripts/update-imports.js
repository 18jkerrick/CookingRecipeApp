#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Import mappings
const importMappings = [
  // Database files
  { from: /from\s+['"](.*)\/lib\/supabaseClient['"]/g, to: 'from \'$1/lib/db/supabase\'' },
  { from: /from\s+['"](.*)\/lib\/groceryStorageDB['"]/g, to: 'from \'$1/lib/db/grocery\'' },
  { from: /from\s+['"](.*)\/lib\/groceryStorage['"]/g, to: 'from \'$1/lib/db/grocery-storage\'' },
  { from: /from\s+['"](.*)\/lib\/mealPlanStorage['"]/g, to: 'from \'$1/lib/db/meal-plan\'' },
  
  // Parser files
  { from: /from\s+['"](.*)\/lib\/parser\//g, to: 'from \'$1/lib/parsers/' },
  
  // AI files
  { from: /from\s+['"](.*)\/lib\/aiIngredientNormalizer['"]/g, to: 'from \'$1/lib/ai/ingredient-normalizer\'' },
  
  // Utils
  { from: /from\s+['"](.*)\/lib\/unitConversion['"]/g, to: 'from \'$1/lib/utils/unit-conversion\'' },
  { from: /from\s+['"](.*)\/lib\/ingredientParser['"]/g, to: 'from \'$1/lib/parsers/ingredient-parser\'' },
];

// Find all TypeScript/JavaScript files
const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'scripts/update-imports.js']
});

console.log(`Found ${files.length} files to check`);

let updatedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  importMappings.forEach(mapping => {
    if (mapping.from.test(content)) {
      content = content.replace(mapping.from, mapping.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated imports in: ${file}`);
    updatedCount++;
  }
});

console.log(`\n✨ Updated ${updatedCount} files`);
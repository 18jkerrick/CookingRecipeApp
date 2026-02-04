#!/usr/bin/env node

/**
 * Smoke tests to ensure critical functionality works before/after refactoring
 * Run with: node scripts/smoke-tests.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PRIVATE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test utilities
const log = (message) => console.log(`  ${message}`);
const success = (message) => console.log(`  ✅ ${message}`);
const error = (message) => console.error(`  ❌ ${message}`);

// Test suites
const tests = {
  async testSupabaseConnection() {
    console.log('\n🔍 Testing Supabase Connection...');
    try {
      const { data, error } = await supabase.from('recipes').select('count').limit(1);
      if (error) throw error;
      success('Supabase connection successful');
      return true;
    } catch (err) {
      error(`Supabase connection failed: ${err.message}`);
      return false;
    }
  },

  async testRecipeOperations() {
    console.log('\n🔍 Testing Recipe Operations...');
    try {
      // Test read
      const { data: recipes, error: readError } = await supabase
        .from('recipes')
        .select('*')
        .limit(1);
      
      if (readError) throw readError;
      success(`Read recipes: Found ${recipes?.length || 0} recipes`);
      
      return true;
    } catch (err) {
      error(`Recipe operations failed: ${err.message}`);
      return false;
    }
  },

  async testGroceryListOperations() {
    console.log('\n🔍 Testing Grocery List Operations...');
    try {
      // Test read
      const { data: lists, error: readError } = await supabase
        .from('grocery_lists')
        .select('*')
        .limit(1);
      
      if (readError) throw readError;
      success(`Read grocery lists: Found ${lists?.length || 0} lists`);
      
      return true;
    } catch (err) {
      error(`Grocery list operations failed: ${err.message}`);
      return false;
    }
  },

  async testImportPaths() {
    console.log('\n🔍 Testing Import Paths...');
    const criticalImports = [
      '../lib/supabaseClient',
      '../lib/groceryStorageDB',
      '../lib/utils',
      '../lib/aiIngredientNormalizer',
      '../lib/parser/cooking-website',
      '../lib/parser/tiktok',
      '../context/AuthContext'
    ];

    let allPass = true;
    for (const importPath of criticalImports) {
      try {
        require(importPath);
        success(`Import successful: ${importPath}`);
      } catch (err) {
        error(`Import failed: ${importPath} - ${err.message}`);
        allPass = false;
      }
    }
    
    return allPass;
  },

  async testAPIRoutes() {
    console.log('\n🔍 Testing API Routes (paths only)...');
    const fs = require('fs');
    const apiRoutes = [
      'apps/web/app/api/parse-url/route.ts',
      'apps/web/app/api/recipes/route.ts',
      'apps/web/app/api/grocery-lists/route.ts'
    ];

    let allExist = true;
    for (const route of apiRoutes) {
      const fullPath = path.join(__dirname, '..', route);
      if (fs.existsSync(fullPath)) {
        success(`API route exists: ${route}`);
      } else {
        error(`API route missing: ${route}`);
        allExist = false;
      }
    }
    
    return allExist;
  }
};

// Run all tests
async function runSmokeTests() {
  console.log('🚀 Running Smoke Tests...');
  console.log('========================');
  
  const results = [];
  
  for (const [testName, testFn] of Object.entries(tests)) {
    const result = await testFn();
    results.push({ testName, passed: result });
  }
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(({ testName, passed }) => {
    console.log(`  ${passed ? '✅' : '❌'} ${testName}`);
  });
  
  console.log(`\n  Total: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✨ All smoke tests passed! Safe to proceed with refactoring.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before refactoring.\n');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runSmokeTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runSmokeTests };
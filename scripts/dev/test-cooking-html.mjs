import puppeteer from 'puppeteer';

async function inspectWebsiteStructure() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.indianhealthyrecipes.com/butter-chicken/', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    // Get the raw HTML content
    const content = await page.content();
    
    // Look for structured recipe data first
    console.log('=== CHECKING FOR STRUCTURED RECIPE DATA ===');
    const structuredData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Recipe' || 
              (Array.isArray(data) && data.some((item) => item['@type'] === 'Recipe')) ||
              (data['@graph'] && data['@graph'].some((item) => item['@type'] === 'Recipe'))) {
            return script.textContent;
          }
        } catch (e) {
          // Continue to next script
        }
      }
      return null;
    });
    
    if (structuredData) {
      console.log('Found structured recipe data');
      const data = JSON.parse(structuredData);
      let recipe = data;
      if (Array.isArray(data)) {
        recipe = data.find(item => item['@type'] === 'Recipe');
      } else if (data['@graph']) {
        recipe = data['@graph'].find((item) => item['@type'] === 'Recipe');
      }
      
      if (recipe && recipe.recipeIngredient) {
        console.log('\n=== STRUCTURED INGREDIENTS ===');
        console.log(`Total ingredients: ${recipe.recipeIngredient.length}`);
        recipe.recipeIngredient.slice(0, 10).forEach((ingredient, i) => {
          console.log(`${i + 1}: "${ingredient}"`);
        });
      }
      
      if (recipe && recipe.recipeInstruction) {
        console.log('\n=== STRUCTURED INSTRUCTIONS ===');
        console.log(`Total instructions: ${recipe.recipeInstruction.length}`);
        recipe.recipeInstruction.slice(0, 10).forEach((instruction, i) => {
          const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
          console.log(`${i + 1}: "${instructionText}"`);
        });
      } else {
        console.log('\n=== NO STRUCTURED INSTRUCTIONS FOUND ===');
        console.log('Recipe keys:', Object.keys(recipe));
        if (recipe.recipeInstructions) {
          console.log(`\n=== FOUND recipeInstructions (different key) ===`);
          console.log(`Total instructions: ${recipe.recipeInstructions.length}`);
          recipe.recipeInstructions.slice(0, 5).forEach((instruction, i) => {
            const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
            console.log(`${i + 1}: "${instructionText}"`);
          });
        }
      }
    }
    
    // Look for HTML list elements
    console.log('\n=== CHECKING FOR HTML INGREDIENT LISTS ===');
    const htmlIngredients = await page.evaluate(() => {
      // Common selectors for ingredients
      const selectors = [
        '.wprm-recipe-ingredients-container li',
        '.recipe-ingredients li',
        '.ingredients li',
        '[class*="ingredient"] li',
        'ul li',
        '.entry-content ul li'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 3) {
          console.log(`Found ${elements.length} ingredients with selector: ${selector}`);
          return Array.from(elements).slice(0, 10).map(el => el.textContent?.trim());
        }
      }
      return null;
    });
    
    if (htmlIngredients) {
      console.log('HTML List ingredients:');
      htmlIngredients.forEach((ingredient, i) => {
        console.log(`${i + 1}: "${ingredient}"`);
      });
    } else {
      console.log('No HTML ingredient lists found');
    }
    
  } finally {
    await browser.close();
  }
}

inspectWebsiteStructure(); 
import { getCookingWebsiteContent } from '../../lib/parser/cooking-website';

// Mock fetch globally
global.fetch = jest.fn();

describe('getCookingWebsiteContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully extract content from a valid cooking website', async () => {
    const mockHtml = `
      <html>
        <head><title>Nutella Cookies Recipe</title></head>
        <body>
          <h1>Delicious Nutella Cookies</h1>
          <div class="ingredients">
            <h2>Ingredients</h2>
            <ul>
              <li>2 cups flour</li>
              <li>1/2 cup butter</li>
              <li>1/2 cup Nutella</li>
              <li>1 egg</li>
              <li>1 tsp vanilla extract</li>
            </ul>
          </div>
          <div class="instructions">
            <h2>Instructions</h2>
            <ol>
              <li>Preheat oven to 350°F</li>
              <li>Mix butter and Nutella</li>
              <li>Add egg and vanilla</li>
              <li>Gradually add flour</li>
              <li>Bake for 12 minutes</li>
            </ol>
          </div>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await getCookingWebsiteContent('https://example.com/recipe');
    
    expect(result).toContain('flour');
    expect(result).toContain('butter');
    expect(result).toContain('Nutella');
    expect(result).toContain('oven');
    expect(result.toLowerCase()).toContain('bake');
    expect(fetch).toHaveBeenCalledWith('https://example.com/recipe', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  });

  it('should extract structured JSON-LD recipe data when available', async () => {
    const mockHtml = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Homemade Bolognese Sauce",
            "recipeIngredient": [
              "1 pound ground beef",
              "1 onion, diced",
              "2 cloves garlic, minced",
              "1 can crushed tomatoes",
              "2 tablespoons olive oil"
            ],
            "recipeInstructions": [
              {
                "@type": "HowToStep",
                "text": "Heat olive oil in a large pan"
              },
              {
                "@type": "HowToStep", 
                "text": "Add onion and garlic, cook until softened"
              },
              {
                "@type": "HowToStep",
                "text": "Add ground beef and cook until browned"
              }
            ]
          }
          </script>
        </head>
        <body>
          <p>Some other content with cooking terms like ingredients and recipe</p>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await getCookingWebsiteContent('https://example.com/bolognese');
    
    expect(result).toContain('Recipe: Homemade Bolognese Sauce');
    expect(result).toContain('Ingredients:');
    expect(result).toContain('1 pound ground beef');
    expect(result).toContain('Instructions:');
    expect(result).toContain('Heat olive oil in a large pan');
  });

  it('should reject non-cooking websites', async () => {
    const mockHtml = `
      <html>
        <head><title>About Our Company</title></head>
        <body>
          <h1>Welcome to Our Business</h1>
          <p>We are a technology company focused on innovation and growth.</p>
          <p>Our services include software development and consulting.</p>
          <p>Contact us for more information about our business offerings.</p>
          <p>Learn about our corporate history and mission statement.</p>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    await expect(getCookingWebsiteContent('https://example.com/about')).rejects.toThrow('Not a valid cooking website URL');
  });

  it('should accept websites with minimal cooking terms', async () => {
    const mockHtml = `
      <html>
        <head><title>Quick Pasta Recipe</title></head>
        <body>
          <h1>Simple Pasta Recipe</h1>
          <div class="ingredients">
            <h2>Ingredients</h2>
            <p>1 pound pasta</p>
          </div>
          <div class="instructions">
            <h2>Instructions</h2>
            <p>Cook the pasta according to package instructions.</p>
          </div>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await getCookingWebsiteContent('https://example.com/pasta');
    expect(result.toLowerCase()).toContain('pasta');
    expect(result.toLowerCase()).toContain('ingredients');
  });

  it('should handle websites with rich cooking vocabulary', async () => {
    const mockHtml = `
      <html>
        <body>
          <h1>Roasted Chicken Recipe</h1>
          <h2>Ingredients</h2>
          <p>1 whole chicken, salt, pepper, garlic powder, herbs</p>
          <h2>Instructions</h2>
          <p>Bake the chicken at 375 degrees for 45 minutes until golden brown.</p>
          <p>Season with salt, pepper, garlic powder, and herbs.</p>
          <p>Serve with roasted vegetables and a side salad.</p>
          <p>Prep time: 15 minutes. Cook time: 45 minutes. Serves 4.</p>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await getCookingWebsiteContent('https://example.com/chicken');
    expect(result.toLowerCase()).toContain('chicken');
    expect(result.toLowerCase()).toContain('bake');
  });

  it('should handle fetch errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(getCookingWebsiteContent('https://example.com/recipe')).rejects.toThrow('Failed to extract content from cooking website');
  });

  it('should handle HTTP error responses', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(getCookingWebsiteContent('https://example.com/recipe')).rejects.toThrow('Failed to extract content from cooking website');
  });

  it('should extract recipe content from HTML text sections', async () => {
    const mockHtml = `
      <html>
        <body>
          <div>
            <h2>Ingredients</h2>
            <p>2 cups flour</p>
            <p>1 cup sugar</p>
            <p>3 eggs</p>
          </div>
          <div>
            <h2>Instructions</h2>
            <p>1. Mix dry ingredients</p>
            <p>2. Beat eggs and add to mixture</p>
            <p>3. Bake at 350F for 30 minutes</p>
          </div>
        </body>
      </html>
    `;

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await getCookingWebsiteContent('https://example.com/cake');
    expect(result).toContain('2 cups flour');
    expect(result).toContain('Mix dry ingredients');
  });

  // Integration tests with real URLs (these will be skipped in CI but useful for manual testing)
  describe('Real website integration tests', () => {
    // Restore the real fetch for these tests
    beforeEach(() => {
      (global.fetch as any) = originalFetch;
    });

    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = jest.fn();
    });

    it.skip('should extract content from Sugar Spun Run Nutella cookies recipe', async () => {
      const result = await getCookingWebsiteContent('https://sugarspunrun.com/nutella-cookies/');
      
      expect(result).toContain('nutella');
      expect(result).toContain('flour');
      expect(result).toContain('butter');
      expect(result.toLowerCase()).toMatch(/ingredients|recipe/);
    }, 10000); // 10 second timeout for real HTTP requests

    it.skip('should extract content from Spend With Pennies Bolognese recipe', async () => {
      const result = await getCookingWebsiteContent('https://www.spendwithpennies.com/homemade-bolognese-sauce/');
      
      expect(result).toContain('sauce');
      expect(result.toLowerCase()).toMatch(/tomato|beef|onion/);
      expect(result.toLowerCase()).toMatch(/ingredients|recipe/);
    }, 10000);

    it.skip('should extract content from Indian Healthy Recipes Butter Chicken', async () => {
      const result = await getCookingWebsiteContent('https://www.indianhealthyrecipes.com/butter-chicken/');
      
      expect(result).toContain('chicken');
      expect(result.toLowerCase()).toMatch(/butter|cream|tomato/);
      expect(result.toLowerCase()).toMatch(/ingredients|recipe/);
    }, 10000);
  });
}); 
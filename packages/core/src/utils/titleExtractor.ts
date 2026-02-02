import { getYoutubeTitle } from '../parsers/youtube';
import { getFacebookTitle } from '../parsers/facebook';

/**
 * Extract video title from platform data or captions
 */
export async function extractVideoTitle(captions: string, platform: string, url: string): Promise<string | null> {
  try {
    // For YouTube, try to get the actual video title from metadata first
    if (platform === 'YouTube') {
      try {
        const youtubeTitle = await getYoutubeTitle(url);
        if (youtubeTitle) {
          console.log(`📺 Using YouTube metadata title: "${youtubeTitle}"`);
          return youtubeTitle;
        }
      } catch (error) {
        console.log(`⚠️ Failed to get YouTube title from metadata, falling back to captions: ${error}`);
      }
    }

    // For Facebook, try to get the actual post/video title from metadata first
    if (platform === 'Facebook') {
      try {
        const facebookTitle = await getFacebookTitle(url);
        if (facebookTitle) {
          console.log(`📘 Using Facebook metadata title: "${facebookTitle}"`);
          return facebookTitle;
        }
      } catch (error) {
        console.log(`⚠️ Failed to get Facebook title from metadata, falling back to captions: ${error}`);
      }
    }

    // Clean the captions for title extraction (fallback for YouTube/Facebook, primary for others)
    const cleanedCaptions = captions
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove all emojis
      .replace(/\s+for\s+(a\s+)?(top\s+tier|great|perfect|amazing|delicious).*$/i, '') // Remove promotional endings
      .replace(/\s+on\s+(a\s+)?(sunny|rainy|cold|hot|warm|beautiful).*$/i, '') // Remove weather/time references
      .replace(/\s+(makes?\s+)?\d+\s+servings.*$/i, '') // Remove serving info
      .replace(/\s+ready\s+in.*$/i, '') // Remove time info
      .replace(/\s+prep\s+time.*$/i, '') // Remove prep time
      .replace(/full recipe on.*$/i, '') // Remove "full recipe on..." trailing text
      .replace(/recipe in bio.*$/i, '') // Remove "recipe in bio" trailing text
      .replace(/link in bio.*$/i, '') // Remove "link in bio" trailing text
      .replace(/follow for more.*$/i, '') // Remove "follow for more" trailing text
      .replace(/#\w+/g, '') // Remove hashtags
      .trim();

    // Extract title patterns based on platform
    if (platform === 'TikTok' || platform === 'Instagram' || platform === 'YouTube' || platform === 'Facebook') {
      const captionTitle = extractFromCaptions(cleanedCaptions);
      if (captionTitle) {
        console.log(`📝 Using caption-extracted title: "${captionTitle}"`);
        return captionTitle;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video title:', error);
    return null;
  }
}

/**
 * Extract title from caption text using common patterns
 */
function extractFromCaptions(text: string): string | null {
  if (!text || text.length < 10) return null;
  
  // Pattern 0: Use the first sentence if it looks like a valid title
  const firstSentenceMatch = text.match(/^([^.!?]+[.!?]?)/);
  if (firstSentenceMatch) {
    let candidate = firstSentenceMatch[1].trim();
    candidate = candidate.replace(/[.?]$/, '');
    
    if (candidate.length >= 5 && candidate.length <= 100) {
      // Skip introductory sentences, instruction sentences, or metadata-heavy lines
      if (!/^(Basics Done Right|Because|Follow|Subscribe|Like|Comment|Share|In a|In the|Add|Mix|Whisk|Combine|Stir|Beat|Fold|Pour|Bake|Cook|Heat|Preheat)/i.test(candidate) &&
          !/(ingredients|instructions|method|makes\s+\d+)/i.test(candidate) &&
          isValidFoodTitle(candidate)) {
        return cleanTitle(candidate);
      }
    }
  }
  
  // Pattern 1: Look for clear recipe titles at the very beginning (before cleaning removes serving info)
  const beginningTitlePatterns = [
    /^([^(]+(?:Recipe|Cookie|Cake|Bread|Muffin|Pasta|Soup|Salad|Dish|Chocolate|Chip)s?)\s*(?:\([^)]*\))?\s*(?:Ingredients|Method|Instructions|Makes|\d+)/i,
    /^([^(]+(?:Recipe|Cookie|Cake|Bread|Muffin|Pasta|Soup|Salad|Dish))\s*(?:\([^)]*\))?/i,
    /^([A-Z][^(]*(?:Chocolate|Chip|Cookie|Cake|Bread|Muffin)s?)\s*(?:\([^)]*\))?/i,
  ];
  
  for (const pattern of beginningTitlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 5 && title.length < 100 && isValidFoodTitle(title)) {
        return cleanTitle(title);
      }
    }
  }
  
  // Pattern 2: Look for recipe titles after common Facebook/social media phrases
  const recipeIntroPatterns = [
    /(?:Starting strong with my|Here's my|Check out my|Try my|Making my|Presenting my)\s+([^,!.]+(?:Recipe|Cookie|Cake|Bread|Muffin|Pasta|Soup|Salad|Dish|Chocolate|Chip))/i,
    /(?:Ultimate|Perfect|Best|Easy|Simple|Homemade|Brown Butter)\s+([^,!.]+(?:Recipe|Cookie|Cake|Bread|Muffin|Pasta|Soup|Salad|Dish|Chocolate|Chip))/i,
    /([A-Z][^,!.]*(?:Recipe|Cookie|Cake|Bread|Muffin|Pasta|Soup|Salad|Dish|Chocolate|Chip))\s*[,!.]?\s*(?:guaranteed|makes|ingredients|recipe)/i,
  ];
  
  for (const pattern of recipeIntroPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 5 && title.length < 100 && isValidFoodTitle(title)) {
        return cleanTitle(title);
      }
    }
  }
  
  return null;
}

/**
 * Check if text looks like a valid food title
 */
function isValidFoodTitle(text: string): boolean {
  if (text.length < 5 || text.length > 100) return false;
  
  // Must contain food-related words (expanded list)
  const foodWords = /chicken|beef|pork|fish|salmon|pasta|rice|noodles|soup|curry|stir.fry|salad|sandwich|burger|pizza|tacos|bread|cake|cookies?|pie|vegetables|beans|tofu|quinoa|avocado|mushrooms|chocolate|chip|butter|muffin|brownie|cookie|pancake|waffle|smoothie|juice|tea|coffee|latte|cappuccino|mocha|frappuccino|milkshake|ice.cream|gelato|sorbet|pudding|custard|flan|cheesecake|tiramisu|mousse|tart|croissant|bagel|donut|pretzel|crackers|chips|popcorn|nuts|almonds|walnuts|pecans|cashews|peanuts|pistachios|raisins|dates|figs|apricots|prunes|cranberries|blueberries|strawberries|raspberries|blackberries|cherries|grapes|oranges|lemons|limes|grapefruit|apples|pears|bananas|pineapple|mango|papaya|kiwi|watermelon|cantaloupe|honeydew|peaches|plums|nectarines|tomatoes|cucumbers|carrots|celery|onions|garlic|ginger|herbs|spices|seasoning|marinade|sauce|dressing|vinaigrette|mayo|mustard|ketchup|relish|pickles|olives|capers|anchovies|tuna|sardines|mackerel|cod|halibut|mahi.mahi|snapper|grouper|bass|trout|catfish|shrimp|crab|lobster|scallops|mussels|clams|oysters|squid|octopus|turkey|duck|lamb|veal|ham|bacon|sausage|pepperoni|salami|prosciutto|chorizo|bratwurst|hot.dog|corn.dog|meatball|meatloaf|steak|roast|ribs|chops|tenderloin|brisket|pulled.pork|carnitas|barbacoa|fajitas|enchiladas|quesadillas|burritos|nachos|guacamole|salsa|hummus|tzatziki|pesto|alfredo|marinara|bolognese|carbonara|puttanesca|arrabbiata|aglio.olio|cacio.pepe|risotto|paella|jambalaya|gumbo|chili|stew|casserole|lasagna|ravioli|gnocchi|fettuccine|linguine|penne|rigatoni|fusilli|farfalle|orzo|couscous|bulgur|barley|oats|granola|cereal|yogurt|milk|cheese|cheddar|mozzarella|parmesan|gouda|brie|camembert|feta|ricotta|cottage.cheese|cream.cheese|sour.cream|heavy.cream|half.and.half|buttermilk|eggs|omelet|frittata|quiche|souffle|meringue|whipped.cream|frosting|icing|glaze|syrup|honey|maple|agave|molasses|brown.sugar|white.sugar|powdered.sugar|vanilla|cinnamon|nutmeg|cardamom|cloves|allspice|ginger|turmeric|cumin|coriander|paprika|chili.powder|cayenne|black.pepper|white.pepper|salt|garlic.powder|onion.powder|oregano|basil|thyme|rosemary|sage|parsley|cilantro|dill|mint|bay.leaves|fennel|anise|star.anise|saffron|sumac|za.atar|harissa|garam.masala|curry.powder|five.spice|sesame|tahini|miso|soy.sauce|fish.sauce|oyster.sauce|hoisin|teriyaki|sriracha|hot.sauce|tabasco|worcestershire|balsamic|apple.cider.vinegar|white.wine.vinegar|red.wine.vinegar|rice.vinegar|coconut|coconut.milk|coconut.oil|olive.oil|vegetable.oil|canola.oil|sunflower.oil|sesame.oil|avocado.oil|butter|margarine|shortening|lard|ghee|flour|all.purpose|bread|cake|pastry|almond|coconut.flour|cornstarch|baking.powder|baking.soda|yeast|gelatin|agar|pectin|cornmeal|semolina|polenta|grits|hominy|quinoa|amaranth|buckwheat|millet|teff|sorghum|wild.rice|brown.rice|white.rice|jasmine|basmati|arborio|bomba|black.rice|red.rice|forbidden.rice|sticky.rice|sushi.rice|instant.rice|rice.noodles|ramen|udon|soba|lo.mein|pad.thai|pho|ramen.noodles|instant.noodles|egg.noodles|lasagna.noodles|macaroni|shells|rotini|bow.ties|angel.hair|capellini|vermicelli|spaghetti|bucatini|perciatelli|ziti|mostaccioli|cavatappi|gemelli|radiatori|wagon.wheels|ditalini|tubetti|conchiglie|orecchiette|cavatelli|strozzapreti|pappardelle|tagliatelle|fettuccine.alfredo|carbonara.pasta|mac.and.cheese|spaghetti.and.meatballs|chicken.parmesan|eggplant.parmesan|veal.parmesan|chicken.marsala|chicken.piccata|chicken.francese|chicken.scarpariello|chicken.cacciatore|chicken.parmigiana|chicken.rollatini|chicken.saltimbocca|chicken.cordon.bleu|chicken.kiev|chicken.wellington|beef.wellington|beef.stroganoff|beef.bourguignon|beef.stew|pot.roast|short.ribs|prime.rib|ribeye|filet.mignon|new.york.strip|porterhouse|t.bone|sirloin|flank.steak|skirt.steak|hanger.steak|flat.iron|chuck.roast|brisket.burnt.ends|pulled.pork.sandwich|pork.chops|pork.tenderloin|pork.shoulder|pork.belly|baby.back.ribs|spare.ribs|country.style.ribs|lamb.chops|leg.of.lamb|rack.of.lamb|lamb.shanks|osso.buco|veal.chops|veal.scallopini|veal.marsala|veal.piccata|veal.francese|duck.confit|duck.breast|duck.legs|turkey.breast|turkey.legs|turkey.thighs|cornish.hen|quail|pheasant|venison|elk|bison|rabbit|wild.boar|alligator|frog.legs|escargot|foie.gras|caviar|smoked.salmon|gravlax|lox|bagels.and.lox|eggs.benedict|hollandaise|bearnaise|aioli|chimichurri|romesco|tapenade|baba.ganoush|muhammara|labneh|burrata|caprese|bruschetta|crostini|antipasto|charcuterie|cheese.board|wine.pairing|cocktail|mocktail|sangria|margarita|mojito|caipirinha|pisco.sour|negroni|old.fashioned|manhattan|martini|cosmopolitan|daiquiri|pina.colada|mai.tai|zombie|hurricane|sazerac|mint.julep|whiskey.sour|amaretto.sour|tom.collins|gin.and.tonic|vodka.tonic|rum.and.coke|jack.and.coke|long.island.iced.tea|adios.mother.fucker|sex.on.the.beach|blue.hawaii|mudslide|white.russian|black.russian|espresso.martini|irish.coffee|hot.toddy|mulled.wine|eggnog|punch|lemonade|iced.tea|sweet.tea|arnold.palmer|shirley.temple|roy.rogers|virgin.mary|bloody.mary|mimosa|bellini|kir.royale|champagne.cocktail|french.75|aviation|bee.s.knees|sidecar|brandy.alexander|grasshopper|pink.lady|clover.club|ramos.gin.fizz|corpse.reviver|last.word|paper.plane|penicillin|gold.rush|brown.derby|boulevardier|vieux.carre|sazerac.cocktail|improved.whiskey.cocktail|fancy.free|conference|division.bell|naked.and.famous|final.ward|coal.miner.s.daughter|oaxaca.old.fashioned|mezcal.negroni|tommy.s.margarita|el.diablo|paloma|ranch.water|michelada|chelada|beer.cocktail|shandy|radler|black.and.tan|boilermaker|pickleback|sake.bomb|soju.cocktail|shochu.highball|chu.hi|umeshu|plum.wine|rice.wine|mirin|cooking.wine|sherry|port|madeira|marsala|vermouth|aperitif|digestif|amaro|bitters|simple.syrup|grenadine|orgeat|falernum|velvet.falernum|allspice.dram|maraschino|luxardo|cointreau|grand.marnier|triple.sec|blue.curacao|peach.schnapps|banana.liqueur|coconut.rum|spiced.rum|dark.rum|light.rum|white.rum|aged.rum|rhum.agricole|cachaca|pisco|mezcal|tequila.blanco|tequila.reposado|tequila.anejo|tequila.extra.anejo|bourbon|rye.whiskey|scotch.whisky|irish.whiskey|canadian.whisky|japanese.whisky|single.malt|blended.whisky|grain.whisky|corn.whiskey|moonshine|vodka|gin|london.dry.gin|plymouth.gin|old.tom.gin|genever|aquavit|brandy|cognac|armagnac|calvados|grappa|ouzo|raki|arak|absinthe|pastis|sambuca|limoncello|frangelico|amaretto|kahlua|baileys|drambuie|chartreuse|benedictine|dom.benedictine|galliano|strega|cynar|campari|aperol|lillet|dubonnet|cocchi.americano|dolin.rouge|dolin.dry|carpano.antica|punt.e.mes|byrrh|cap.corse|quinquina|kina.lillet|suze|salers|gentiane|aveze|zirbenz|yellow.chartreuse|green.chartreuse|elderflower.liqueur|st.germain|creme.de.violette|creme.de.cassis|creme.de.mure|creme.de.peche|creme.de.framboise|creme.de.menthe|creme.de.cacao|creme.de.banane|creme.de.noyaux|cherry.heering|marasca|kirsch|slivovitz|palinka|tuica|rakia|mastika|metaxa|ouzo.12|sambuca.nigra|sambuca.bianca|anisette|pastis.51|ricard|pernod|absinthe.verte|absinthe.blanche|la.fee|st.george|obsello|mansinthe|jade.nouvelle.orleans|vieux.pontarlier|leopold.bros|st.antoine|duplais.verte|duplais.blanche|jade.edouard|jade.esprit.edouard|jade.terminus.oxygenee|jade.c.f.berger|jade.liqueurs.de.france|jade.verte.suisse|jade.blanche.traditionnelle|jade.nouvelle.orleans.absinthe.superieure|jade.pf.1901|jade.esprit.edouard.38|jade.terminus.oxygenee.45|jade.c.f.berger.68|jade.liqueurs.de.france.68|jade.verte.suisse.65|jade.blanche.traditionnelle.68|jade.nouvelle.orleans.absinthe.superieure.68|jade.pf.1901.68|ultimate|brown.butter|chip|cookie/i;
  
  // Should not contain these non-title phrases
  const excludeWords = /follow|subscribe|like|comment|share|bio|link|website|recipe on|don't forget|make sure|if you|let me know|basics done right|because mastering|kitchen legend/i;
  
  return foodWords.test(text) && !excludeWords.test(text);
}

/**
 * Clean and format the extracted title
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^(a|an|the)\s+/i, '') // Remove articles at start
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case
    .join(' ');
}

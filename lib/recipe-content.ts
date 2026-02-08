// ============================================================
// RICH RECIPE CONTENT - Static data for visual recipe display
// Keyed by menu item name to merge with DB records
// ============================================================

export interface PrepStep {
  label: string
  detail?: string
}

export interface PrepFlow {
  /** Short label for each step in the flow diagram arrow chain */
  steps: string[]
  /** What the flow applies to, e.g. "Chickpeas", "Paneer" */
  subject: string
}

export interface DressingOption {
  name: string
  recipe?: string
  isOptional?: boolean
}

export interface RecipeContent {
  /** Main ingredients displayed as visual list */
  mainIngredients: string[]
  /** Dressing options with sub-recipes */
  dressings: DressingOption[]
  /** Preparation flow diagrams (arrow chains) */
  prepFlows: PrepFlow[]
  /** Step-by-step instructions */
  steps: PrepStep[]
  /** Category label */
  category: "Salads" | "Soups" | "Juices" | "Sides" | "Oats"
}

export const RECIPE_CONTENT: Record<string, RecipeContent> = {
  // ===================== SALADS =====================
  "Aloo Masti": {
    category: "Salads",
    mainIngredients: [
      "Steamed Aloo",
      "Finely chopped Onion",
      "Small Cucumber Cubes",
      "Chilly & Coriander (finely chopped)",
      "White Sesame Seeds",
    ],
    dressings: [
      {
        name: "Curd Dressing",
        recipe: "Curd, Olive Oil (1/2 tsp), Pepper, Salt",
      },
      { name: "Chilly Flakes", isOptional: true },
      { name: "Tomato Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Potato", steps: ["Peel", "Steam", "Cube"] },
    ],
    steps: [
      { label: "Steam and cube potato" },
      { label: "Finely chop onion and dice cucumber" },
      { label: "Mix chilly flakes & fresh coriander" },
      { label: "Toss with sesame seeds" },
      { label: "Top with curd dressing" },
    ],
  },

  "Mexican Loaded": {
    category: "Salads",
    mainIngredients: [
      "Boiled Kidney Beans",
      "Boiled Corn",
      "Green, Yellow/Red Bell Pepper",
      "Lettuce",
      "White Sesame Seeds",
    ],
    dressings: [
      { name: "Chipotle Sauce", isOptional: true },
      {
        name: "Chilly Lime Dressing",
        recipe:
          "Garlic (3-4 cloves), Curd (2-3 tsp), Lemon juice (1/2 tsp), Salt (1/2 tsp), Chilly powder (1/2 tsp), Finely chopped Coriander",
      },
    ],
    prepFlows: [
      { subject: "Kidney Beans", steps: ["Soak", "Boil"] },
      { subject: "Corn", steps: ["Boil"] },
    ],
    steps: [
      { label: "Boil kidney beans until soft" },
      { label: "Boil corn kernels" },
      { label: "Dice bell peppers" },
      { label: "Tear lettuce" },
      { label: "Mix all with sesame seeds" },
      { label: "Dress with chipotle or chilly lime" },
    ],
  },

  "Desi Chatpata": {
    category: "Salads",
    mainIngredients: [
      "Boiled Chickpeas (marinated & air-fried)",
      "Finely Chopped Tomato",
      "Finely Chopped Cucumber",
      "Finely Chopped Onion",
      "Lettuce (optional)",
      "White Sesame Seeds",
    ],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
    ],
    prepFlows: [
      {
        subject: "Chickpeas",
        steps: ["Soak", "Boil", "Marinate", "Air Fry"],
      },
    ],
    steps: [
      { label: "Soak and boil chickpeas" },
      {
        label: "Marinate chickpeas",
        detail: "Chat Masala, Chilly Powder, Lemon, Salt",
      },
      { label: "Air-fry until crispy" },
      { label: "Dice tomato, cucumber, onion" },
      { label: "Tear lettuce" },
      { label: "Toss with sesame seeds" },
      { label: "Drizzle mint coriander dressing" },
    ],
  },

  "Paneer Tikka Salad": {
    category: "Salads",
    mainIngredients: [
      "Paneer Tikka (air-fried)",
      "Bell Pepper (finely chopped)",
      "Onion (finely chopped)",
      "Lettuce",
      "White Sesame Seeds",
    ],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
    ],
    prepFlows: [
      {
        subject: "Paneer",
        steps: ["Cube", "Marinate", "Air Fry"],
      },
    ],
    steps: [
      {
        label: "Marinate paneer",
        detail: "Curd, Chilly Powder, Garam Masala, Coriander Powder, Salt",
      },
      { label: "Air-fry paneer tikka" },
      { label: "Finely chop bell peppers and onion" },
      { label: "Tear lettuce" },
      { label: "Assemble with sesame seeds" },
      { label: "Top with mint coriander dressing" },
    ],
  },

  "Egg Salad": {
    category: "Salads",
    mainIngredients: [
      "Bell Pepper (finely chopped)",
      "Onion (finely chopped)",
      "Lettuce",
      "1 Boiled Egg",
      "White Sesame Seeds",
    ],
    dressings: [
      {
        name: "Chilly Lime Dressing",
        recipe:
          "Garlic (3-4 cloves), Curd (2-3 tsp), Lemon juice (1/2 tsp), Salt (1/2 tsp), Chilly powder (1/2 tsp), Finely chopped Coriander",
      },
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
      { name: "Chipotle Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Egg", steps: ["Boil", "Peel", "Slice"] },
    ],
    steps: [
      { label: "Boil eggs, peel and slice" },
      { label: "Finely chop bell peppers and onion" },
      { label: "Tear lettuce" },
      { label: "Assemble with sesame seeds" },
      { label: "Serve with choice of dressing" },
    ],
  },

  "Protein Salad (Veg)": {
    category: "Salads",
    mainIngredients: [
      "Paneer Tikka",
      "Boiled Rajma",
      "Broccoli",
      "Boiled Corn",
      "Finely cut Capsicum",
      "Finely Chopped Onion",
      "Lettuce",
    ],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
      { name: "Chipotle Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Paneer", steps: ["Marinate", "Air Fry"] },
      { subject: "Rajma", steps: ["Soak", "Boil"] },
      { subject: "Broccoli & Corn", steps: ["Steam"] },
    ],
    steps: [
      { label: "Marinate and air-fry paneer tikka" },
      { label: "Boil rajma" },
      { label: "Steam broccoli and corn" },
      { label: "Slice capsicum and onion" },
      { label: "Tear lettuce" },
      { label: "Assemble all" },
      { label: "Dress with mint coriander or chipotle" },
    ],
  },

  "Protein Salad (Veg + Egg)": {
    category: "Salads",
    mainIngredients: [
      "Boiled Egg",
      "Boiled Rajma",
      "Broccoli",
      "Boiled Corn",
      "Finely cut Capsicum",
      "Finely Chopped Onion",
      "Lettuce",
    ],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
      { name: "Chipotle Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Egg", steps: ["Boil", "Peel", "Slice"] },
      { subject: "Rajma", steps: ["Soak", "Boil"] },
      { subject: "Broccoli & Corn", steps: ["Steam"] },
    ],
    steps: [
      { label: "Boil eggs and slice" },
      { label: "Boil rajma" },
      { label: "Steam broccoli and corn" },
      { label: "Slice capsicum and onion" },
      { label: "Tear lettuce" },
      { label: "Assemble all" },
      { label: "Dress with mint coriander or chipotle" },
    ],
  },

  // ===================== SOUPS =====================
  "Millet & Dry Fruits Soup": {
    category: "Soups",
    mainIngredients: [
      "Millet & Dry Fruits Powder",
      "Pepper",
      "Salt",
      "Oregano",
    ],
    dressings: [],
    prepFlows: [
      { subject: "Powder", steps: ["Mix with hot water", "Cook", "Season"] },
    ],
    steps: [
      { label: "Mix millet & dry fruits powder with hot water" },
      { label: "Cook until thick consistency" },
      { label: "Season with pepper, salt, oregano" },
      { label: "Serve hot" },
    ],
  },

  "Tomato Soup": {
    category: "Soups",
    mainIngredients: ["Tomato", "Garlic", "Pepper", "Salt", "Oregano"],
    dressings: [],
    prepFlows: [
      { subject: "Tomato", steps: ["Blanch", "Puree", "Cook", "Season"] },
    ],
    steps: [
      { label: "Blanch and puree tomatoes" },
      { label: "Cook with garlic" },
      { label: "Season with pepper, salt, oregano" },
      { label: "Serve hot" },
    ],
  },

  "Carrot Soup": {
    category: "Soups",
    mainIngredients: ["Carrot", "Garlic", "Pepper", "Salt", "Oregano"],
    dressings: [],
    prepFlows: [
      { subject: "Carrot", steps: ["Peel", "Chop", "Cook", "Blend", "Season"] },
    ],
    steps: [
      { label: "Peel and chop carrots" },
      { label: "Cook until soft" },
      { label: "Blend to smooth puree" },
      { label: "Season with pepper, salt, oregano" },
      { label: "Serve hot" },
    ],
  },

  "Pumpkin Soup": {
    category: "Soups",
    mainIngredients: ["Pumpkin", "Garlic", "Pepper", "Salt", "Oregano"],
    dressings: [],
    prepFlows: [
      { subject: "Pumpkin", steps: ["Roast", "Blend", "Season"] },
    ],
    steps: [
      { label: "Roast pumpkin chunks" },
      { label: "Blend with garlic until smooth" },
      { label: "Season with pepper, salt, oregano" },
      { label: "Serve hot" },
    ],
  },

  // ===================== JUICES =====================
  "Whey Protein + Water": {
    category: "Juices",
    mainIngredients: ["Good Quality Whey Protein", "300ml Water"],
    dressings: [],
    prepFlows: [
      { subject: "Protein", steps: ["Scoop", "Add Water", "Shake"] },
    ],
    steps: [
      { label: "Add one scoop whey protein to shaker" },
      { label: "Add 300ml water" },
      { label: "Shake well until mixed" },
      { label: "Serve immediately" },
    ],
  },

  "Whey Protein + Milk": {
    category: "Juices",
    mainIngredients: ["Whey Protein", "200ml Milk"],
    dressings: [],
    prepFlows: [
      { subject: "Protein", steps: ["Scoop", "Add Milk", "Blend"] },
    ],
    steps: [
      { label: "Add one scoop whey protein" },
      { label: "Add 200ml milk" },
      { label: "Blend or shake well" },
      { label: "Serve immediately" },
    ],
  },

  "ABC Juice": {
    category: "Juices",
    mainIngredients: ["Apple", "Beetroot", "Carrot"],
    dressings: [],
    prepFlows: [
      { subject: "Fruits & Veggies", steps: ["Peel", "Chop", "Juice"] },
    ],
    steps: [
      { label: "Peel and chop apple, beet, and carrot" },
      { label: "Juice all together" },
      { label: "Strain if needed" },
      { label: "Serve fresh" },
    ],
  },

  "Millet & Dry Fruits Juice": {
    category: "Juices",
    mainIngredients: [
      "Aakarsh Protein Powder (Millets & Dry Fruits)",
    ],
    dressings: [],
    prepFlows: [
      { subject: "Powder", steps: ["Add to glass", "Mix", "Blend"] },
    ],
    steps: [
      { label: "Add millet & dry fruits powder to glass" },
      { label: "Mix with water or milk" },
      { label: "Blend until smooth" },
      { label: "Serve immediately" },
    ],
  },

  // ===================== SIDES =====================
  "Paneer Tikka": {
    category: "Sides",
    mainIngredients: ["Paneer"],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
      { name: "Chipotle Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Paneer", steps: ["Cube", "Marinate", "Air Fry"] },
    ],
    steps: [
      { label: "Cube paneer" },
      {
        label: "Marinate",
        detail: "Curd, Chilly Powder, Garam Masala, Coriander Powder, Salt",
      },
      { label: "Air-fry until golden" },
      { label: "Serve with dressing" },
    ],
  },

  "Paneer 65": {
    category: "Sides",
    mainIngredients: ["Paneer"],
    dressings: [
      {
        name: "Mint Coriander Dressing",
        recipe:
          "Garlic (4-5 cloves), Chopped Coriander, Pudina, Salt, Black Pepper, Water",
      },
      { name: "Chipotle Sauce", isOptional: true },
    ],
    prepFlows: [
      { subject: "Paneer", steps: ["Cube", "Marinate", "Air Fry"] },
    ],
    steps: [
      { label: "Cube paneer" },
      {
        label: "Marinate",
        detail: "Oil, Chilly Powder, Garam Masala, Coriander Powder, Salt",
      },
      { label: "Air-fry until crispy" },
      { label: "Serve with dressing" },
    ],
  },

  // ===================== OATS =====================
  "Masala Oats": {
    category: "Oats",
    mainIngredients: ["Safola Masala Oats"],
    dressings: [],
    prepFlows: [
      { subject: "Oats", steps: ["Boil Water", "Add Oats", "Cook 3 min"] },
    ],
    steps: [
      { label: "Boil water" },
      { label: "Add Safola Masala Oats" },
      { label: "Stir and cook for 3 minutes" },
      { label: "Serve hot" },
    ],
  },

  "Masala Paneer Oats": {
    category: "Oats",
    mainIngredients: ["Safola Masala Oats", "Paneer"],
    dressings: [],
    prepFlows: [
      { subject: "Oats", steps: ["Boil Water", "Add Oats + Paneer", "Cook 4 min"] },
    ],
    steps: [
      { label: "Boil water" },
      { label: "Add Safola Masala Oats" },
      { label: "Cube paneer and add" },
      { label: "Stir and cook for 3-4 minutes" },
      { label: "Serve hot" },
    ],
  },

  "Masala Egg Oats": {
    category: "Oats",
    mainIngredients: ["Safola Masala Oats", "Egg"],
    dressings: [],
    prepFlows: [
      { subject: "Oats", steps: ["Boil Water", "Add Oats", "Scramble Egg", "Cook 4 min"] },
    ],
    steps: [
      { label: "Boil water" },
      { label: "Add Safola Masala Oats" },
      { label: "Scramble egg and fold in" },
      { label: "Cook for 3-4 minutes" },
      { label: "Serve hot" },
    ],
  },

  "Masala Paneer and Egg Oats": {
    category: "Oats",
    mainIngredients: ["Safola Masala Oats", "Paneer", "Egg"],
    dressings: [],
    prepFlows: [
      {
        subject: "Oats",
        steps: ["Boil Water", "Add Oats + Paneer", "Scramble Egg", "Cook 4 min"],
      },
    ],
    steps: [
      { label: "Boil water" },
      { label: "Add Safola Masala Oats" },
      { label: "Cube paneer and add" },
      { label: "Scramble egg and fold in" },
      { label: "Cook for 4 minutes" },
      { label: "Serve hot" },
    ],
  },

  "Fruits and Nuts Milk Oats Bowl": {
    category: "Oats",
    mainIngredients: [
      "Quaker Multigrain Plain Oats",
      "Banana",
      "Apple",
      "Dry Fruits (Almond, Cashew, Raisins)",
      "7 Elements Mix Seeds",
      "Hot Milk",
    ],
    dressings: [],
    prepFlows: [
      { subject: "Oats", steps: ["Heat Milk", "Cook Oats", "Top with Fruits & Nuts"] },
    ],
    steps: [
      { label: "Heat milk" },
      { label: "Cook Quaker multigrain oats in hot milk" },
      { label: "Slice banana and apple" },
      { label: "Top with almonds, cashews, raisins" },
      { label: "Add 7-element mix seeds" },
      { label: "Serve warm" },
    ],
  },
}

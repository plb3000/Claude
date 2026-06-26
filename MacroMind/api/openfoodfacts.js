const BASE_URL = 'https://world.openfoodfacts.org';

function extractNutrients(nutriments, amount_g = 100) {
  const factor = amount_g / 100;
  const n = nutriments || {};

  return {
    kcal: n['energy-kcal_100g'] != null ? n['energy-kcal_100g'] * factor : null,
    protein: n['proteins_100g'] != null ? n['proteins_100g'] * factor : null,
    fat: n['fat_100g'] != null ? n['fat_100g'] * factor : null,
    carbs: n['carbohydrates_100g'] != null ? n['carbohydrates_100g'] * factor : null,
    sugar: n['sugars_100g'] != null ? n['sugars_100g'] * factor : null,
    fiber: n['fiber_100g'] != null ? n['fiber_100g'] * factor : null,
    salt: n['salt_100g'] != null ? n['salt_100g'] * factor : null,
    sodium: n['sodium_100g'] != null ? n['sodium_100g'] * factor : null,
    saturated_fat: n['saturated-fat_100g'] != null ? n['saturated-fat_100g'] * factor : null,
    vitamin_a: n['vitamin-a_100g'] != null ? n['vitamin-a_100g'] * factor : null,
    vitamin_c: n['vitamin-c_100g'] != null ? n['vitamin-c_100g'] * factor : null,
    vitamin_d: n['vitamin-d_100g'] != null ? n['vitamin-d_100g'] * factor : null,
    calcium: n['calcium_100g'] != null ? n['calcium_100g'] * factor : null,
    iron: n['iron_100g'] != null ? n['iron_100g'] * factor : null,
    potassium: n['potassium_100g'] != null ? n['potassium_100g'] * factor : null,
  };
}

export async function fetchProductByBarcode(barcode) {
  const response = await fetch(`${BASE_URL}/api/v2/product/${barcode}.json`);
  if (!response.ok) throw new Error('Netzwerkfehler');

  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  return {
    product_name: p.product_name || '',
    brand: p.brands || '',
    nutriments: p.nutriments || {},
    getNutrientsForAmount: (amount_g) => extractNutrients(p.nutriments, amount_g),
  };
}

export async function searchProducts(query) {
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=20&fields=product_name,brands,nutriments,code`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Netzwerkfehler');

  const data = await response.json();
  return (data.products || []).map((p) => ({
    code: p.code,
    product_name: p.product_name || '',
    brand: p.brands || '',
    nutriments: p.nutriments || {},
    getNutrientsForAmount: (amount_g) => extractNutrients(p.nutriments, amount_g),
  }));
}

const BASE_URL = 'https://world.openfoodfacts.org';

// Timeout per Promise.race – AbortController verhält sich auf manchen
// React-Native-Versionen unzuverlässig, schlichtes fetch ist am robustesten.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

// fetch mit Timeout + automatischem Retry, um Kaltstart-Fehlschläge abzufangen.
async function fetchJson(url, { retries = 2, timeout = 10000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await withTimeout(fetch(url), timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      lastErr = e;
      // kurze Pause vor dem nächsten Versuch
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastErr || new Error('Netzwerkfehler');
}

export function extractNutrients(nutriments, amount_g = 100) {
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
  const data = await fetchJson(`${BASE_URL}/api/v2/product/${barcode}.json`);
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  return {
    product_name: p.product_name || '',
    brand: p.brands || '',
    nutriments: p.nutriments || {},
    getNutrientsForAmount: (amount_g) => extractNutrients(p.nutriments, amount_g),
  };
}

// Neuer "search-a-licious"-Dienst. Der alte /cgi/search.pl liefert oft 503.
const SEARCH_URL = 'https://search.openfoodfacts.org';

function normalizeBrand(brands) {
  if (Array.isArray(brands)) return brands.join(', ');
  return brands || '';
}

// search-a-licious liefert Namen sprachspezifisch (product_name_de, _en, …).
// Deutsch bevorzugen, dann Englisch, dann irgendeine vorhandene Sprache.
function pickName(hit) {
  if (typeof hit.product_name === 'string' && hit.product_name) return hit.product_name;
  if (hit.product_name_de) return hit.product_name_de;
  if (hit.product_name_en) return hit.product_name_en;
  const key = Object.keys(hit).find(
    (k) => k.startsWith('product_name_') && hit[k]
  );
  return key ? hit[key] : '';
}

export async function searchProducts(query) {
  const fields = 'product_name,product_name_de,product_name_en,brands,nutriments,code';
  const url = `${SEARCH_URL}/search?q=${encodeURIComponent(query)}&page_size=20&fields=${fields}`;
  const data = await fetchJson(url, { timeout: 12000 });
  return (data.hits || [])
    .map((p) => ({
      code: p.code,
      product_name: pickName(p),
      brand: normalizeBrand(p.brands),
      nutriments: p.nutriments || {},
      getNutrientsForAmount: (amount_g) => extractNutrients(p.nutriments, amount_g),
    }))
    .filter((p) => p.product_name); // Treffer ohne Namen ausblenden
}

import * as SQLite from 'expo-sqlite';
import { DEFAULT_GOALS } from '../constants/units';

let dbPromise;

export async function getDb() {
  // Initialisierung als einmaliges Promise cachen, damit parallele Aufrufe
  // (mehrere Screens beim Start) die DB nicht doppelt öffnen/initialisieren.
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('tracc.db');
      await initDatabase(database);
      return database;
    })();
  }
  return dbPromise;
}

async function initDatabase(database) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      product_name TEXT,
      brand TEXT,
      amount_g INTEGER,
      kcal REAL,
      protein REAL,
      fat REAL,
      carbs REAL,
      sugar REAL,
      fiber REAL,
      salt REAL,
      sodium REAL,
      saturated_fat REAL,
      vitamin_a REAL,
      vitamin_c REAL,
      vitamin_d REAL,
      calcium REAL,
      iron REAL,
      potassium REAL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      kcal INTEGER DEFAULT 2000,
      protein_g INTEGER DEFAULT 150,
      fat_g INTEGER DEFAULT 70,
      carbs_g INTEGER DEFAULT 250
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL,
      product_name TEXT,
      brand TEXT,
      amount_g REAL,
      kcal REAL,
      protein REAL,
      fat REAL,
      carbs REAL,
      sugar REAL,
      fiber REAL,
      salt REAL,
      sodium REAL,
      saturated_fat REAL,
      vitamin_a REAL,
      vitamin_c REAL,
      vitamin_d REAL,
      calcium REAL,
      iron REAL,
      potassium REAL
    );
  `);

  await database.runAsync(
    'INSERT OR IGNORE INTO user_goals (id, kcal, protein_g, fat_g, carbs_g) VALUES (1, ?, ?, ?, ?)',
    [DEFAULT_GOALS.kcal, DEFAULT_GOALS.protein_g, DEFAULT_GOALS.fat_g, DEFAULT_GOALS.carbs_g]
  );
}

export function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// food_log queries

export async function getFoodLogByDate(date) {
  const database = await getDb();
  return await database.getAllAsync(
    'SELECT * FROM food_log WHERE date = ? ORDER BY created_at ASC',
    [date]
  );
}

// Liefert pro Tag eines Monats die Gesamt-Kalorien.
// yearMonth: 'YYYY-MM'. Rückgabe: { 'YYYY-MM-DD': totalKcal, ... }
export async function getDailyKcalForMonth(yearMonth) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT date, SUM(kcal) AS total FROM food_log WHERE date LIKE ? GROUP BY date',
    [`${yearMonth}-%`]
  );
  const map = {};
  for (const r of rows) map[r.date] = r.total ?? 0;
  return map;
}

export async function addFoodEntry(entry) {
  const database = await getDb();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `INSERT INTO food_log
      (date, meal, product_name, brand, amount_g, kcal, protein, fat, carbs,
       sugar, fiber, salt, sodium, saturated_fat, vitamin_a, vitamin_c, vitamin_d,
       calcium, iron, potassium, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      entry.date,
      entry.meal,
      entry.product_name ?? null,
      entry.brand ?? null,
      entry.amount_g ?? null,
      entry.kcal ?? null,
      entry.protein ?? null,
      entry.fat ?? null,
      entry.carbs ?? null,
      entry.sugar ?? null,
      entry.fiber ?? null,
      entry.salt ?? null,
      entry.sodium ?? null,
      entry.saturated_fat ?? null,
      entry.vitamin_a ?? null,
      entry.vitamin_c ?? null,
      entry.vitamin_d ?? null,
      entry.calcium ?? null,
      entry.iron ?? null,
      entry.potassium ?? null,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteFoodEntry(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM food_log WHERE id = ?', [id]);
}

const NUTRIENT_FIELDS = [
  'kcal', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'salt', 'sodium',
  'saturated_fat', 'vitamin_a', 'vitamin_c', 'vitamin_d', 'calcium', 'iron', 'potassium',
];

// Rescales all stored nutrient values proportionally to a new amount in grams.
export async function updateFoodEntryAmount(id, newAmount) {
  const database = await getDb();
  const row = await database.getFirstAsync('SELECT * FROM food_log WHERE id = ?', [id]);
  if (!row || !row.amount_g || row.amount_g <= 0 || newAmount <= 0) return;

  const factor = newAmount / row.amount_g;
  const scaled = NUTRIENT_FIELDS.map((f) => (row[f] != null ? row[f] * factor : null));
  const setClause = NUTRIENT_FIELDS.map((f) => `${f} = ?`).join(', ');

  await database.runAsync(
    `UPDATE food_log SET amount_g = ?, ${setClause} WHERE id = ?`,
    [newAmount, ...scaled, id]
  );
}

// weight_log queries

export async function getWeightLast30Days() {
  const database = await getDb();
  return await database.getAllAsync(
    "SELECT * FROM weight_log WHERE date >= date('now', '-30 days') ORDER BY date ASC"
  );
}

export async function upsertWeight(date, weight_kg) {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO weight_log (date, weight_kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg',
    [date, weight_kg]
  );
}

// user_goals queries

export async function getGoals() {
  const database = await getDb();
  return await database.getFirstAsync('SELECT * FROM user_goals WHERE id = 1');
}

export async function updateGoals(goals) {
  const database = await getDb();
  await database.runAsync(
    'UPDATE user_goals SET kcal = ?, protein_g = ?, fat_g = ?, carbs_g = ? WHERE id = 1',
    [goals.kcal, goals.protein_g, goals.fat_g, goals.carbs_g]
  );
}

// ── Mahlzeiten (gespeicherte Rezepte aus mehreren Zutaten) ──────────────

// Speichert eine Mahlzeit mit ihren Zutaten. ingredients: Array von
// Objekten mit product_name, brand, amount_g und Nährwertfeldern.
export async function saveMeal(name, ingredients) {
  const database = await getDb();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    'INSERT INTO meals (name, created_at) VALUES (?, ?)',
    [name, now]
  );
  const mealId = result.lastInsertRowId;
  for (const ing of ingredients) {
    await database.runAsync(
      `INSERT INTO meal_ingredients
        (meal_id, product_name, brand, amount_g, kcal, protein, fat, carbs,
         sugar, fiber, salt, sodium, saturated_fat, vitamin_a, vitamin_c, vitamin_d,
         calcium, iron, potassium)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        mealId,
        ing.product_name ?? null,
        ing.brand ?? null,
        ing.amount_g ?? null,
        ...NUTRIENT_FIELDS.map((f) => ing[f] ?? null),
      ]
    );
  }
  return mealId;
}

// Liefert alle Mahlzeiten inkl. summierter Nährwerte + Zutatenanzahl.
export async function getMeals() {
  const database = await getDb();
  const meals = await database.getAllAsync('SELECT * FROM meals ORDER BY created_at DESC');
  const out = [];
  for (const m of meals) {
    const ings = await database.getAllAsync(
      'SELECT * FROM meal_ingredients WHERE meal_id = ?',
      [m.id]
    );
    const totals = sumNutrients(ings);
    out.push({
      ...m,
      ingredientCount: ings.length,
      totalGrams: ings.reduce((acc, i) => acc + (i.amount_g || 0), 0),
      ...totals,
    });
  }
  return out;
}

export async function getMealWithIngredients(mealId) {
  const database = await getDb();
  const meal = await database.getFirstAsync('SELECT * FROM meals WHERE id = ?', [mealId]);
  if (!meal) return null;
  const ingredients = await database.getAllAsync(
    'SELECT * FROM meal_ingredients WHERE meal_id = ?',
    [mealId]
  );
  return { ...meal, ingredients };
}

export async function deleteMeal(mealId) {
  const database = await getDb();
  await database.runAsync('DELETE FROM meal_ingredients WHERE meal_id = ?', [mealId]);
  await database.runAsync('DELETE FROM meals WHERE id = ?', [mealId]);
}

// Fügt eine (skalierte) Portion einer Mahlzeit als EINEN Tagebuch-Eintrag hinzu.
// factor z.B. 0.2 für Meal-Prep-Portionen.
export async function addMealToLog({ mealId, mealName, factor = 1, meal, date }) {
  const database = await getDb();
  const ings = await database.getAllAsync(
    'SELECT * FROM meal_ingredients WHERE meal_id = ?',
    [mealId]
  );
  const totals = sumNutrients(ings);
  const totalGrams = ings.reduce((acc, i) => acc + (i.amount_g || 0), 0);
  const entry = {
    date,
    meal,
    product_name: mealName,
    brand: 'Mahlzeit',
    amount_g: Math.round(totalGrams * factor),
  };
  for (const f of NUTRIENT_FIELDS) {
    entry[f] = totals[f] != null ? totals[f] * factor : null;
  }
  return addFoodEntry(entry);
}

function sumNutrients(rows) {
  const totals = {};
  for (const f of NUTRIENT_FIELDS) {
    let sum = 0;
    let any = false;
    for (const r of rows) {
      if (r[f] != null) { sum += r[f]; any = true; }
    }
    totals[f] = any ? sum : null;
  }
  return totals;
}

// ── Zuletzt verwendet (letzte 100 unterschiedliche Produkte) ────────────

// Letzte 100 unterschiedliche Lebensmittel (jeweils der jüngste Eintrag),
// um sie schnell erneut hinzuzufügen. Kommt aus SQLite -> dauerhaft offline.
export async function getRecentEntries(limit = 100) {
  const database = await getDb();
  return await database.getAllAsync(
    `SELECT * FROM food_log
     WHERE id IN (SELECT MAX(id) FROM food_log GROUP BY product_name, brand)
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
}

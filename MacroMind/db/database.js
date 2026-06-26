import * as SQLite from 'expo-sqlite';
import { DEFAULT_GOALS } from '../constants/units';

let db;

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('macromind.db');
    await initDatabase(db);
  }
  return db;
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
  `);

  const goals = await database.getFirstAsync('SELECT * FROM user_goals WHERE id = 1');
  if (!goals) {
    await database.runAsync(
      'INSERT INTO user_goals (id, kcal, protein_g, fat_g, carbs_g) VALUES (1, ?, ?, ?, ?)',
      [DEFAULT_GOALS.kcal, DEFAULT_GOALS.protein_g, DEFAULT_GOALS.fat_g, DEFAULT_GOALS.carbs_g]
    );
  }
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

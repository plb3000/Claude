import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { searchProducts, extractNutrients } from '../api/openfoodfacts';
import { saveMeal } from '../db/database';

// Baut aus per-100g-Nährwerten + Menge eine fertige Zutat (skalierte Werte).
function buildIngredient({ product_name, brand, nutriments, amount_g }) {
  return {
    product_name,
    brand: brand || '',
    amount_g,
    nutriments, // per-100g, für spätere Mengen-Anpassung
    ...extractNutrients(nutriments, amount_g),
  };
}

// Wandelt manuelle Eingaben (für die eingegebene Menge) in per-100g um.
function manualToNutriments(amount_g, fields) {
  const f = amount_g / 100;
  const n = {};
  const map = {
    kcal: 'energy-kcal_100g', protein: 'proteins_100g',
    fat: 'fat_100g', carbs: 'carbohydrates_100g',
  };
  for (const [k, key] of Object.entries(map)) {
    const v = parseFloat(String(fields[k]).replace(',', '.'));
    n[key] = !isNaN(v) ? v / f : null;
  }
  return n;
}

export default function MealBuilder({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [adderMode, setAdderMode] = useState(null); // null | 'search' | 'manual'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState({ product_name: '', amount_g: '100', kcal: '', protein: '', fat: '', carbs: '' });
  const [saving, setSaving] = useState(false);

  const totals = ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + (i.kcal || 0),
      protein: acc.protein + (i.protein || 0),
      fat: acc.fat + (i.fat || 0),
      carbs: acc.carbs + (i.carbs || 0),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await searchProducts(query);
      setResults(res);
    } catch {
      Alert.alert('Fehler', 'Suche fehlgeschlagen.');
    } finally {
      setSearching(false);
    }
  }

  function addFromResult(item) {
    Haptics.selectionAsync();
    setIngredients((prev) => [
      ...prev,
      buildIngredient({
        product_name: item.product_name || 'Unbekannt',
        brand: item.brand,
        nutriments: item.nutriments || {},
        amount_g: 100,
      }),
    ]);
    setAdderMode(null);
    setQuery('');
    setResults([]);
  }

  function addManual() {
    const amount = parseFloat(String(manual.amount_g).replace(',', '.')) || 100;
    if (!manual.product_name.trim()) {
      Alert.alert('Name fehlt', 'Bitte einen Namen für die Zutat eingeben.');
      return;
    }
    const nutriments = manualToNutriments(amount, manual);
    setIngredients((prev) => [
      ...prev,
      buildIngredient({ product_name: manual.product_name, brand: '', nutriments, amount_g: amount }),
    ]);
    setManual({ product_name: '', amount_g: '100', kcal: '', protein: '', fat: '', carbs: '' });
    setAdderMode(null);
  }

  function updateAmount(idx, value) {
    const amount = parseFloat(String(value).replace(',', '.'));
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === idx && !isNaN(amount) && amount > 0
          ? buildIngredient({ ...ing, amount_g: Math.round(amount) })
          : ing
      )
    );
  }

  function removeIngredient(idx) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name fehlt', 'Bitte einen Namen für die Mahlzeit eingeben.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Keine Zutaten', 'Füge mindestens eine Zutat hinzu.');
      return;
    }
    setSaving(true);
    try {
      await saveMeal(name.trim(), ingredients);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } catch {
      Alert.alert('Fehler', 'Mahlzeit konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Neue Mahlzeit</Text>

      <TextInput
        style={styles.nameInput}
        placeholder="Name der Mahlzeit (z. B. Bowl, Porridge)"
        placeholderTextColor={Colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      {/* Zutatenliste */}
      {ingredients.map((ing, idx) => (
        <View key={idx} style={styles.ingCard}>
          <View style={styles.ingInfo}>
            <Text style={styles.ingName} numberOfLines={1}>{ing.product_name}</Text>
            <Text style={styles.ingMacros}>
              {Math.round(ing.kcal || 0)} kcal · E {(ing.protein || 0).toFixed(0)} F {(ing.fat || 0).toFixed(0)} K {(ing.carbs || 0).toFixed(0)}
            </Text>
          </View>
          <View style={styles.ingAmountWrap}>
            <TextInput
              style={styles.ingAmount}
              keyboardType="numeric"
              defaultValue={String(ing.amount_g)}
              onEndEditing={(e) => updateAmount(idx, e.nativeEvent.text)}
              selectTextOnFocus
            />
            <Text style={styles.ingUnit}>g</Text>
          </View>
          <TouchableOpacity onPress={() => removeIngredient(idx)} style={styles.removeBtn}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Zutat-Adder */}
      {adderMode === null && (
        <View style={styles.adderBtns}>
          <TouchableOpacity style={styles.adderBtn} onPress={() => setAdderMode('search')}>
            <Text style={styles.adderBtnText}>＋ Zutat suchen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adderBtn} onPress={() => setAdderMode('manual')}>
            <Text style={styles.adderBtnText}>＋ Manuell</Text>
          </TouchableOpacity>
        </View>
      )}

      {adderMode === 'search' && (
        <View style={styles.adderBox}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Zutat suchen…"
              placeholderTextColor={Colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity style={styles.searchBtn} onPress={runSearch}>
              <Text style={styles.searchBtnText}>Suchen</Text>
            </TouchableOpacity>
          </View>
          {searching && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />}
          {results.map((item, i) => (
            <TouchableOpacity key={item.code || i} style={styles.resultCard} onPress={() => addFromResult(item)}>
              <Text style={styles.resultName} numberOfLines={1}>{item.product_name}</Text>
              {item.nutriments?.['energy-kcal_100g'] != null && (
                <Text style={styles.resultKcal}>{item.nutriments['energy-kcal_100g'].toFixed(0)} kcal / 100g</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => { setAdderMode(null); setResults([]); setQuery(''); }}>
            <Text style={styles.cancelLink}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      )}

      {adderMode === 'manual' && (
        <View style={styles.adderBox}>
          <TextInput style={styles.input} placeholder="Zutatname" placeholderTextColor={Colors.textSecondary}
            value={manual.product_name} onChangeText={(v) => setManual((p) => ({ ...p, product_name: v }))} autoFocus />
          <TextInput style={styles.input} placeholder="Menge (g)" placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric" value={manual.amount_g} onChangeText={(v) => setManual((p) => ({ ...p, amount_g: v }))} />
          <View style={styles.manualRow}>
            {[['kcal', 'kcal'], ['protein', 'Eiweiß g'], ['fat', 'Fett g'], ['carbs', 'KH g']].map(([k, label]) => (
              <TextInput key={k} style={styles.manualInput} placeholder={label} placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric" value={manual[k]} onChangeText={(v) => setManual((p) => ({ ...p, [k]: v }))} />
            ))}
          </View>
          <View style={styles.manualBtns}>
            <TouchableOpacity style={styles.manualAdd} onPress={addManual}>
              <Text style={styles.manualAddText}>Hinzufügen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAdderMode(null)}>
              <Text style={styles.cancelLink}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summen */}
      {ingredients.length > 0 && (
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Gesamt</Text>
          <Text style={styles.totalsKcal}>{Math.round(totals.kcal)} kcal</Text>
          <Text style={styles.totalsMacros}>
            Eiweiß {totals.protein.toFixed(1)}g · Fett {totals.fat.toFixed(1)}g · KH {totals.carbs.toFixed(1)}g
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.saveBtnText}>Mahlzeit speichern</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>Abbrechen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  nameInput: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, fontSize: 16, marginBottom: 16,
  },
  ingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  ingInfo: { flex: 1, marginRight: 8 },
  ingName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  ingMacros: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  ingAmountWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  ingAmount: {
    backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, fontSize: 14, width: 56, textAlign: 'right',
  },
  ingUnit: { color: Colors.textSecondary, fontSize: 13, marginLeft: 4 },
  removeBtn: { padding: 4 },
  removeText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  adderBtns: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  adderBtn: {
    flex: 1, borderRadius: 8, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  adderBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  adderBox: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, fontSize: 14,
  },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: Colors.background, fontWeight: '600' },
  resultCard: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultName: { color: Colors.textPrimary, fontSize: 14 },
  resultKcal: { color: Colors.primary, fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: Colors.background, borderRadius: 8, padding: 12, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14, marginBottom: 8,
  },
  manualRow: { flexDirection: 'row', gap: 6 },
  manualInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 8, padding: 10, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, fontSize: 13,
  },
  manualBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  manualAdd: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  manualAddText: { color: Colors.background, fontWeight: '700' },
  cancelLink: { color: Colors.textSecondary, fontSize: 14, padding: 8 },
  totalsCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 16, marginVertical: 12,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  totalsTitle: { color: Colors.textSecondary, fontSize: 13 },
  totalsKcal: { color: Colors.primary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  totalsMacros: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  cancelBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginTop: 8, marginBottom: 24 },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 15 },
});

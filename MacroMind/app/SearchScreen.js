import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MEAL_LABELS, MEALS } from '../constants/units';
import { fetchProductByBarcode, searchProducts } from '../api/openfoodfacts';
import { addFoodEntry, getLocalDateString } from '../db/database';

const REQUIRED_FIELDS = ['kcal', 'protein', 'fat', 'carbs'];

function scaleNutrients(nutriments, amount_g) {
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

function ProductAddForm({ product, initialMeal, targetDate, onAdded, onCancel }) {
  const [amount, setAmount] = useState('100');
  const [meal, setMeal] = useState(initialMeal || 'breakfast');
  const [manualFields, setManualFields] = useState({});
  const [adding, setAdding] = useState(false);

  const amountNum = parseFloat(amount) || 100;
  const scaled = product ? scaleNutrients(product.nutriments, amountNum) : {};

  const missingFields = product
    ? REQUIRED_FIELDS.filter((f) => {
        const key = f === 'kcal' ? 'energy-kcal_100g' : f === 'protein' ? 'proteins_100g' : f === 'fat' ? 'fat_100g' : 'carbohydrates_100g';
        return product.nutriments[key] == null;
      })
    : [];

  async function handleAdd() {
    setAdding(true);
    try {
      const entry = {
        date: targetDate || getLocalDateString(),
        meal,
        product_name: product?.product_name || manualFields.product_name || 'Unbekannt',
        brand: product?.brand || '',
        amount_g: amountNum,
        ...scaled,
        ...Object.fromEntries(
          Object.entries(manualFields)
            .filter(([k]) => k !== 'product_name')
            .map(([k, v]) => [k, parseFloat(v) || null])
        ),
      };
      await addFoodEntry(entry);
      onAdded();
    } catch (e) {
      Alert.alert('Fehler', 'Eintrag konnte nicht gespeichert werden.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
      {product && (
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{product.product_name}</Text>
          {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
        </View>
      )}

      {!product && (
        <TextInput
          style={styles.input}
          placeholder="Produktname"
          placeholderTextColor={Colors.textSecondary}
          value={manualFields.product_name || ''}
          onChangeText={(v) => setManualFields((p) => ({ ...p, product_name: v }))}
        />
      )}

      <Text style={styles.fieldLabel}>Menge (g)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="100"
        placeholderTextColor={Colors.textSecondary}
      />

      {product && (
        <View style={styles.nutriRow}>
          {[
            { label: 'Kalorien', val: scaled.kcal, unit: 'kcal' },
            { label: 'Eiweiß', val: scaled.protein, unit: 'g' },
            { label: 'Fett', val: scaled.fat, unit: 'g' },
            { label: 'Kohlenhydrate', val: scaled.carbs, unit: 'g' },
          ].map(({ label, val, unit }) => (
            <View key={label} style={styles.nutriItem}>
              <Text style={styles.nutriVal}>{val != null ? val.toFixed(1) : '–'} {unit}</Text>
              <Text style={styles.nutriLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {missingFields.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Fehlende Nährwerte: {missingFields.join(', ')}. Bitte manuell eingeben.
          </Text>
          {missingFields.map((f) => (
            <TextInput
              key={f}
              style={styles.input}
              placeholder={`${f} (pro eingegebene Menge)`}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              value={manualFields[f] || ''}
              onChangeText={(v) => setManualFields((p) => ({ ...p, [f]: v }))}
            />
          ))}
        </View>
      )}

      {!product && (
        <View>
          {REQUIRED_FIELDS.map((f) => (
            <TextInput
              key={f}
              style={styles.input}
              placeholder={`${f} (g / kcal)`}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              value={manualFields[f] || ''}
              onChangeText={(v) => setManualFields((p) => ({ ...p, [f]: v }))}
            />
          ))}
        </View>
      )}

      <Text style={styles.fieldLabel}>Mahlzeit</Text>
      <View style={styles.mealRow}>
        {MEALS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.mealChip, meal === m && styles.mealChipActive]}
            onPress={() => setMeal(m)}
          >
            <Text style={[styles.mealChipText, meal === m && styles.mealChipTextActive]}>
              {MEAL_LABELS[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={adding}>
        {adding ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.addButtonText}>Zum Tagebuch hinzufügen</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Abbrechen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function SearchScreen({ navigation, route }) {
  const initialMeal = route.params?.meal || 'breakfast';
  const targetDate = route.params?.date || getLocalDateString();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('scanner'); // 'scanner' | 'search' | 'manual'
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  async function handleBarcode({ data }) {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await fetchProductByBarcode(data);
      if (!result) {
        setNotFound(true);
      } else {
        setProduct(result);
        setMode('form');
      }
    } catch {
      Alert.alert('Netzwerkfehler', 'Produkt konnte nicht abgerufen werden.');
      setScanning(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await searchProducts(searchQuery);
      setSearchResults(results);
    } catch {
      Alert.alert('Fehler', 'Suche fehlgeschlagen.');
    } finally {
      setSearching(false);
    }
  }

  function handleAdded() {
    setProduct(null);
    setNotFound(false);
    setMode('scanner');
    setScanning(true);
    navigation.navigate('Today');
  }

  function handleCancel() {
    setProduct(null);
    setNotFound(false);
    setMode('scanner');
    setScanning(true);
  }

  if (mode === 'form' || mode === 'manual') {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProductAddForm
          product={mode === 'manual' ? null : product}
          initialMeal={initialMeal}
          targetDate={targetDate}
          onAdded={handleAdded}
          onCancel={handleCancel}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'scanner' && styles.toggleActive]}
          onPress={() => { setMode('scanner'); setScanning(true); setNotFound(false); }}
        >
          <Text style={[styles.toggleText, mode === 'scanner' && styles.toggleTextActive]}>Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'search' && styles.toggleActive]}
          onPress={() => setMode('search')}
        >
          <Text style={[styles.toggleText, mode === 'search' && styles.toggleTextActive]}>Suche</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'manual' && styles.toggleActive]}
          onPress={() => setMode('manual')}
        >
          <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>Manuell</Text>
        </TouchableOpacity>
      </View>

      {mode === 'scanner' && (
        <View style={styles.scannerContainer}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={scanning ? handleBarcode : undefined}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              />
              {loading && (
                <View style={styles.scanOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.scanText}>Produkt wird geladen…</Text>
                </View>
              )}
              {notFound && (
                <View style={styles.scanOverlay}>
                  <Text style={styles.notFoundText}>Produkt nicht gefunden</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => setMode('manual')}>
                    <Text style={styles.addButtonText}>Manuell eingeben</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setNotFound(false); setScanning(true); }}>
                    <Text style={styles.cancelButtonText}>Erneut scannen</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!loading && !notFound && (
                <View style={styles.scanHint}>
                  <Text style={styles.scanHintText}>Barcode in den Rahmen halten</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.permissionView}>
              <Text style={styles.permissionText}>Kamerazugriff benötigt</Text>
              <TouchableOpacity style={styles.addButton} onPress={requestPermission}>
                <Text style={styles.addButtonText}>Erlauben</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {mode === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Produkt suchen…"
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Suchen</Text>
            </TouchableOpacity>
          </View>
          {searching && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchResults.map((item, idx) => (
              <TouchableOpacity
                key={item.code || idx}
                style={styles.resultCard}
                onPress={() => { setProduct(item); setMode('form'); }}
              >
                <Text style={styles.resultName}>{item.product_name || '(kein Name)'}</Text>
                {item.brand ? <Text style={styles.resultBrand}>{item.brand}</Text> : null}
                {item.nutriments?.['energy-kcal_100g'] != null && (
                  <Text style={styles.resultKcal}>{item.nutriments['energy-kcal_100g'].toFixed(0)} kcal / 100g</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: Colors.background,
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  scanText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: 12,
  },
  scanHint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  notFoundText: {
    color: Colors.danger,
    fontSize: 18,
    fontWeight: '600',
  },
  permissionView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  permissionText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: Colors.background,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultBrand: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultKcal: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  productHeader: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  productBrand: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    marginBottom: 8,
  },
  nutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  nutriItem: {
    alignItems: 'center',
  },
  nutriVal: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  nutriLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: '#2A1A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 13,
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mealChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  mealChipTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});

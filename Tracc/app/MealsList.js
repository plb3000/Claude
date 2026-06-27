import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MEALS, MEAL_LABELS } from '../constants/units';
import { getMeals, deleteMeal, addMealToLog } from '../db/database';

const FACTOR_PRESETS = [
  { label: '1×', value: 1 },
  { label: '½', value: 0.5 },
  { label: '⅓', value: 1 / 3 },
  { label: '¼', value: 0.25 },
  { label: '0,2×', value: 0.2 },
];

export default function MealsList({ onCreate, targetMeal, targetDate, onAdded }) {
  const [meals, setMeals] = useState([]);
  const [selected, setSelected] = useState(null); // meal für das Faktor-Modal
  const [factor, setFactor] = useState(1);
  const [customFactor, setCustomFactor] = useState('');
  const [mealSlot, setMealSlot] = useState(targetMeal || 'lunch');

  const reload = useCallback(() => {
    getMeals().then(setMeals);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function openAdd(meal) {
    Haptics.selectionAsync();
    setSelected(meal);
    setFactor(1);
    setCustomFactor('');
    setMealSlot(targetMeal || 'lunch');
  }

  const effectiveFactor = (() => {
    const c = parseFloat(String(customFactor).replace(',', '.'));
    return !isNaN(c) && c > 0 ? c : factor;
  })();

  async function confirmAdd() {
    if (!selected) return;
    await addMealToLog({
      mealId: selected.id,
      mealName: selected.name,
      factor: effectiveFactor,
      meal: mealSlot,
      date: targetDate,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelected(null);
    onAdded();
  }

  function confirmDelete(meal) {
    Alert.alert('Mahlzeit löschen', `"${meal.name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteMeal(meal.id); reload(); } },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        <TouchableOpacity style={styles.createBtn} onPress={onCreate} activeOpacity={0.8}>
          <Text style={styles.createBtnText}>＋ Neue Mahlzeit erstellen</Text>
        </TouchableOpacity>

        {meals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Noch keine Mahlzeiten gespeichert.</Text>
            <Text style={styles.emptyHint}>Kombiniere mehrere Zutaten zu einer Mahlzeit und füge sie mit einem Tap (auch portionsweise) hinzu.</Text>
          </View>
        ) : (
          meals.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => openAdd(m)}
              onLongPress={() => confirmDelete(m)}
            >
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.sub}>
                  {m.ingredientCount} Zutaten · {Math.round(m.totalGrams)}g
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.kcal}>{Math.round(m.kcal ?? 0)} kcal</Text>
                <Text style={styles.add}>＋</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {meals.length > 0 && (
          <Text style={styles.hint}>Tipp: lange drücken zum Löschen.</Text>
        )}
      </ScrollView>

      {/* Portionsfaktor-Modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={1}>{selected?.name}</Text>
            <Text style={styles.modalSub}>Gesamt {Math.round(selected?.kcal ?? 0)} kcal</Text>

            <Text style={styles.modalLabel}>Portion</Text>
            <View style={styles.factorRow}>
              {FACTOR_PRESETS.map((p) => {
                const isActive = !customFactor && Math.abs(factor - p.value) < 0.001;
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.factorChip, isActive && styles.factorChipActive]}
                    onPress={() => { setFactor(p.value); setCustomFactor(''); }}
                  >
                    <Text style={[styles.factorChipText, isActive && styles.factorChipTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.customInput}
              placeholder="oder eigener Faktor (z. B. 0,7)"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              value={customFactor}
              onChangeText={setCustomFactor}
            />

            <Text style={styles.modalLabel}>Mahlzeit</Text>
            <View style={styles.slotRow}>
              {MEALS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.slotChip, mealSlot === s && styles.slotChipActive]}
                  onPress={() => setMealSlot(s)}
                >
                  <Text style={[styles.slotChipText, mealSlot === s && styles.slotChipTextActive]}>{MEAL_LABELS[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                Wird hinzugefügt: {Math.round((selected?.kcal ?? 0) * effectiveFactor)} kcal
                {'  '}({(effectiveFactor).toLocaleString('de-DE', { maximumFractionDigits: 2 })}× Portion)
              </Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSelected(null)}>
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={confirmAdd}>
                <Text style={styles.modalAddText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flex: 1 },
  list: { padding: 16, paddingTop: 8 },
  createBtn: {
    borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  createBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 8, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  info: { flex: 1, marginRight: 8 },
  name: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  sub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kcal: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  add: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  hint: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  modalSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 8 },
  modalLabel: { color: Colors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 8 },
  factorRow: { flexDirection: 'row', gap: 6 },
  factorChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  factorChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  factorChipText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  factorChipTextActive: { color: Colors.background },
  customInput: {
    backgroundColor: Colors.background, borderRadius: 8, padding: 12, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14, marginTop: 8,
  },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  slotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotChipText: { color: Colors.textSecondary, fontSize: 13 },
  slotChipTextActive: { color: Colors.background, fontWeight: '600' },
  previewBox: {
    backgroundColor: Colors.background, borderRadius: 8, padding: 12, marginTop: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewText: { color: Colors.textPrimary, fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalCancel: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.textSecondary, fontSize: 15 },
  modalAdd: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', backgroundColor: Colors.primary },
  modalAddText: { color: Colors.background, fontSize: 15, fontWeight: '700' },
});

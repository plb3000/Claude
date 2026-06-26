import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { MEAL_LABELS, MEALS } from '../constants/units';
import {
  getFoodLogByDate, deleteFoodEntry, updateFoodEntryAmount,
  getGoals, getLocalDateString,
} from '../db/database';
import KcalRing from '../components/KcalRing';
import MacroBar from '../components/MacroBar';
import FoodCard from '../components/FoodCard';

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function sumMacro(items, key) {
  return items.reduce((acc, item) => acc + (item[key] ?? 0), 0);
}

export default function TodayScreen({ navigation }) {
  const today = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [goals, setGoals] = useState({ kcal: 2000, protein_g: 150, fat_g: 70, carbs_g: 250 });
  const [refreshing, setRefreshing] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const load = useCallback(async (date) => {
    const [data, g] = await Promise.all([getFoodLogByDate(date), getGoals()]);
    setEntries(data);
    setGoals(g);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedDate);
    }, [selectedDate, load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load(selectedDate);
    setRefreshing(false);
  }

  function handleEditOpen(item) {
    setEditItem(item);
    setEditAmount(String(item.amount_g ?? ''));
  }

  async function handleEditSave() {
    const val = parseFloat(String(editAmount).replace(',', '.'));
    if (editItem && !isNaN(val) && val > 0) {
      await updateFoodEntryAmount(editItem.id, Math.round(val));
      await load(selectedDate);
    }
    setEditItem(null);
  }

  async function handleDelete(id) {
    await deleteFoodEntry(id);
    await load(selectedDate);
  }

  const isToday = selectedDate === today;
  const isFuture = selectedDate >= today;

  const totalKcal = sumMacro(entries, 'kcal');
  const totalProtein = sumMacro(entries, 'protein');
  const totalFat = sumMacro(entries, 'fat');
  const totalCarbs = sumMacro(entries, 'carbs');
  const remaining = goals.kcal - totalKcal;

  const hasMicros = entries.some(
    (e) => e.vitamin_a != null || e.vitamin_c != null || e.vitamin_d != null
  );

  function microSummary() {
    const sumVitA = sumMacro(entries, 'vitamin_a') * 1000;
    const sumVitC = sumMacro(entries, 'vitamin_c') * 1000;
    const sumVitD = sumMacro(entries, 'vitamin_d') * 1000;
    const parts = [];
    if (sumVitA > 0) parts.push(`Vit. A ${sumVitA.toFixed(0)}µg`);
    if (sumVitC > 0) parts.push(`Vit. C ${sumVitC.toFixed(0)}µg`);
    if (sumVitD > 0) parts.push(`Vit. D ${sumVitD.toFixed(0)}µg`);
    return parts.join('  ·  ');
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.dateNav}>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setSelectedDate(today)}
            disabled={isToday}
          >
            <Text style={styles.dateText}>{isToday ? 'Heute' : formatDate(selectedDate)}</Text>
            {!isToday && <Text style={styles.dateReset}>Zu heute springen</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateArrow, isFuture && styles.dateArrowDisabled]}
            onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
            disabled={isFuture}
          >
            <Text style={[styles.dateArrowText, isFuture && styles.dateArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ringRow}>
          <KcalRing consumed={totalKcal} goal={goals.kcal} />
          <Text style={styles.remainingText}>
            {remaining >= 0
              ? `Noch ${Math.round(remaining)} kcal übrig`
              : `${Math.round(-remaining)} kcal über dem Ziel`}
          </Text>
        </View>

        <View style={styles.card}>
          <MacroBar label="Eiweiß" consumed={totalProtein} goal={goals.protein_g} />
          <MacroBar label="Fett" consumed={totalFat} goal={goals.fat_g} />
          <MacroBar label="Kohlenhydrate" consumed={totalCarbs} goal={goals.carbs_g} />
        </View>

        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal);
          const mealKcal = sumMacro(mealEntries, 'kcal');
          return (
            <View key={meal} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                  {mealKcal > 0 && (
                    <Text style={styles.mealKcal}>{Math.round(mealKcal)} kcal</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('Search', { meal, date: selectedDate })}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {mealEntries.length === 0 ? (
                <Text style={styles.emptyMeal}>Noch nichts eingetragen</Text>
              ) : (
                mealEntries.map((item) => (
                  <FoodCard key={item.id} item={item} onDelete={handleDelete} onEdit={handleEditOpen} />
                ))
              )}
            </View>
          );
        })}

        {hasMicros && (
          <View style={styles.microRow}>
            <Text style={styles.microLabel}>Mikronährstoffe: </Text>
            <Text style={styles.microValue}>{microSummary()}</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!editItem}
        transparent
        animationType="fade"
        onRequestClose={() => setEditItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={1}>{editItem?.product_name}</Text>
            <Text style={styles.modalHint}>Menge anpassen — Nährwerte werden neu berechnet.</Text>
            <Text style={styles.modalLabel}>Menge (g)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              autoFocus
              selectTextOnFocus
              placeholderTextColor={Colors.textSecondary}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditItem(null)}>
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleEditSave}>
                <Text style={styles.modalSaveText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    color: Colors.textPrimary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
  },
  dateArrowTextDisabled: {
    color: Colors.textSecondary,
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateReset: {
    color: Colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  ringRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  remainingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  mealTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  mealKcal: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.background,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  emptyMeal: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  microRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  microLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  microValue: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 12,
  },
  modalLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  modalSave: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});

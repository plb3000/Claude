import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { MEAL_LABELS, MEALS } from '../constants/units';
import { getFoodLogByDate, deleteFoodEntry, getGoals, getLocalDateString } from '../db/database';
import KcalRing from '../components/KcalRing';
import MacroBar from '../components/MacroBar';
import FoodCard from '../components/FoodCard';

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function sumMacro(items, key) {
  return items.reduce((acc, item) => acc + (item[key] ?? 0), 0);
}

export default function TodayScreen({ navigation }) {
  const today = getLocalDateString();
  const [entries, setEntries] = useState([]);
  const [goals, setGoals] = useState({ kcal: 2000, protein_g: 150, fat_g: 70, carbs_g: 250 });
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [data, g] = await Promise.all([getFoodLogByDate(today), getGoals()]);
    setEntries(data);
    setGoals(g);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleDelete(id) {
    await deleteFoodEntry(id);
    await load();
  }

  const totalKcal = sumMacro(entries, 'kcal');
  const totalProtein = sumMacro(entries, 'protein');
  const totalFat = sumMacro(entries, 'fat');
  const totalCarbs = sumMacro(entries, 'carbs');

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
        <Text style={styles.dateText}>{formatDate(today)}</Text>

        <View style={styles.ringRow}>
          <KcalRing consumed={totalKcal} goal={goals.kcal} />
        </View>

        <View style={styles.card}>
          <MacroBar label="Eiweiß" consumed={totalProtein} goal={goals.protein_g} />
          <MacroBar label="Fett" consumed={totalFat} goal={goals.fat_g} />
          <MacroBar label="Kohlenhydrate" consumed={totalCarbs} goal={goals.carbs_g} />
        </View>

        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal);
          return (
            <View key={meal} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('Search', { meal })}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {mealEntries.length === 0 ? (
                <Text style={styles.emptyMeal}>Noch nichts eingetragen</Text>
              ) : (
                mealEntries.map((item) => (
                  <FoodCard key={item.id} item={item} onDelete={handleDelete} />
                ))
              )}
            </View>
          );
        })}

        {hasMicros && (
          <View style={styles.microRow}>
            <Text style={styles.microLabel}>Mikronährstoffe heute: </Text>
            <Text style={styles.microValue}>{microSummary()}</Text>
          </View>
        )}
      </ScrollView>
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
  dateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  ringRow: {
    alignItems: 'center',
    marginBottom: 20,
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
  mealTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
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
});

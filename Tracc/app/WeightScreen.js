import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Colors } from '../constants/colors';
import { getWeightLast30Days, upsertWeight, getLocalDateString } from '../db/database';

const SCREEN_WIDTH = Dimensions.get('window').width;

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export default function WeightScreen() {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const today = getLocalDateString();

  async function load() {
    const data = await getWeightLast30Days();
    setEntries(data);
    const todayEntry = data.find((e) => e.date === today);
    if (todayEntry) setInput(String(todayEntry.weight_kg));
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function handleSave() {
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val) || val < 20 || val > 500) {
      Alert.alert('Ungültige Eingabe', 'Bitte ein gültiges Gewicht eingeben (20–500 kg).');
      return;
    }
    await upsertWeight(today, val);
    await load();
  }

  const hasData = entries.length > 0;
  const weights = entries.map((e) => e.weight_kg);
  const minW = hasData ? Math.min(...weights) : 0;
  const maxW = hasData ? Math.max(...weights) : 0;
  const currentW = hasData ? weights[weights.length - 1] : null;

  // 7-day trend: compare current weight to the earliest entry within the last 7 days.
  const weekAgo = shiftDate(today, -7);
  const recentEntries = entries.filter((e) => e.date >= weekAgo);
  const trendBase = recentEntries.length > 1 ? recentEntries[0].weight_kg : null;
  const trend = trendBase != null && currentW != null ? currentW - trendBase : null;

  const chartData = {
    labels: entries.map((e) => {
      const parts = e.date.split('-');
      return `${parts[2]}.${parts[1]}`;
    }),
    datasets: [{ data: weights.length > 0 ? weights : [0] }],
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Gewicht eintragen</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Heutiges Gewicht (kg)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
              placeholder="z.B. 80.5"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Noch kein Gewicht eingetragen.</Text>
            <Text style={styles.emptyHint}>Trage dein erstes Gewicht ein, um den Verlauf zu sehen.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Minimum</Text>
                <Text style={styles.statValue}>{minW.toFixed(1)} kg</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Aktuell</Text>
                <Text style={[styles.statValue, { color: Colors.primary }]}>{currentW?.toFixed(1)} kg</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Maximum</Text>
                <Text style={styles.statValue}>{maxW.toFixed(1)} kg</Text>
              </View>
            </View>

            {trend != null && (
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>7-Tage-Trend</Text>
                <Text style={styles.trendValue}>
                  {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)} kg
                </Text>
              </View>
            )}

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Letzte 30 Tage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={chartData}
                  width={Math.max(SCREEN_WIDTH - 32, entries.length * 40)}
                  height={200}
                  chartConfig={{
                    backgroundColor: Colors.surface,
                    backgroundGradientFrom: Colors.surface,
                    backgroundGradientTo: Colors.surface,
                    decimalPlaces: 1,
                    color: () => Colors.primary,
                    labelColor: () => Colors.textSecondary,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: Colors.primary,
                    },
                    propsForBackgroundLines: {
                      stroke: Colors.border,
                    },
                  }}
                  bezier
                  style={{ borderRadius: 12 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  fromZero={false}
                />
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trendLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  trendValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});

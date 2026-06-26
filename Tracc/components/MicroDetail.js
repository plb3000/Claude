import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { MACRO_LABELS } from '../constants/units';

const MICROS = ['sugar', 'fiber', 'salt', 'sodium', 'saturated_fat', 'vitamin_a', 'vitamin_c', 'vitamin_d', 'calcium', 'iron', 'potassium'];

function formatValue(key, val) {
  if (val == null) return '–';
  if (['vitamin_a', 'vitamin_c', 'vitamin_d', 'calcium', 'iron', 'potassium'].includes(key)) {
    return `${(val * 1000).toFixed(0)} µg`;
  }
  return `${val.toFixed(2)} g`;
}

export default function MicroDetail({ item }) {
  return (
    <View style={styles.container}>
      {MICROS.map((key) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{MACRO_LABELS[key]}</Text>
          <Text style={styles.value}>{formatValue(key, item[key])}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
});

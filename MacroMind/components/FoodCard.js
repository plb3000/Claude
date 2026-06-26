import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import MicroDetail from './MicroDetail';

export default function FoodCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  function confirmDelete() {
    Alert.alert('Eintrag löschen', `"${item.product_name}" entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} onLongPress={confirmDelete} activeOpacity={0.7}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.product_name}</Text>
            {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
            <Text style={styles.amount}>{item.amount_g}g</Text>
          </View>
          <View style={styles.macros}>
            <Text style={styles.kcal}>{Math.round(item.kcal ?? 0)} kcal</Text>
            <Text style={styles.macroText}>E {(item.protein ?? 0).toFixed(1)}g</Text>
            <Text style={styles.macroText}>F {(item.fat ?? 0).toFixed(1)}g</Text>
            <Text style={styles.macroText}>K {(item.carbs ?? 0).toFixed(1)}g</Text>
          </View>
        </View>
      </TouchableOpacity>
      {expanded && <MicroDetail item={item} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  brand: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  amount: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  macros: {
    alignItems: 'flex-end',
  },
  kcal: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  macroText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getRecentEntries } from '../db/database';

export default function RecentList({ onPick }) {
  const [items, setItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRecentEntries(100).then((rows) => { if (active) setItems(rows); });
      return () => { active = false; };
    }, [])
  );

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Noch keine Einträge.</Text>
        <Text style={styles.emptyHint}>Was du hinzufügst, erscheint hier zum schnellen erneuten Eintragen.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Zuletzt verwendet · offline gespeichert</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.7} onPress={() => onPick(item)}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.product_name}</Text>
            <Text style={styles.sub}>
              {item.brand ? `${item.brand} · ` : ''}{item.amount_g}g
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.kcal}>{Math.round(item.kcal ?? 0)} kcal</Text>
            <Text style={styles.add}>＋</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  list: { padding: 16, paddingTop: 8 },
  header: { color: Colors.textSecondary, fontSize: 12, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  info: { flex: 1, marginRight: 8 },
  name: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kcal: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  add: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 },
});

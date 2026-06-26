import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../constants/colors';
import MicroDetail from './MicroDetail';

export default function FoodCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const swipeRef = useRef(null);

  function confirmDelete() {
    Alert.alert('Eintrag löschen', `"${item.product_name}" entfernen?`, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => swipeRef.current?.close() },
      { text: 'Löschen', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  function renderRightActions(progress, dragX) {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={confirmDelete} activeOpacity={0.8}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>Löschen</Animated.Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
    >
      <View style={styles.card}>
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
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
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: 8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    marginLeft: 6,
  },
  deleteText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
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

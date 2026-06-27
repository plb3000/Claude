import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';

export default function MacroBar({ label, consumed, goal, unit = 'g' }) {
  const ratio = goal > 0 ? consumed / goal : 0;
  const progress = Math.min(ratio, 1);
  const color =
    ratio > 1 ? Colors.danger : ratio > 0.85 ? Colors.warning : Colors.primary;

  const anim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {consumed.toFixed(1)}{unit} / {goal}{unit}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

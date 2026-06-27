import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function KcalRing({ consumed, goal }) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? consumed / goal : 0;
  const progress = Math.min(ratio, 1);

  const color =
    ratio > 1 ? Colors.danger : ratio > 0.85 ? Colors.warning : Colors.primary;

  const anim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.consumed, { color }]}>{Math.round(consumed)}</Text>
        <Text style={styles.unit}>kcal</Text>
        <Text style={styles.goal}>/ {goal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
  },
  consumed: {
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  goal: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

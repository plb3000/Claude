import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getGoals, updateGoals } from '../db/database';

const APP_VERSION = '1.1.0';

export default function SettingsScreen() {
  const [goals, setGoals] = useState({ kcal: '2000', protein_g: '150', fat_g: '70', carbs_g: '250' });
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const g = await getGoals();
        if (g) {
          setGoals({
            kcal: String(g.kcal),
            protein_g: String(g.protein_g),
            fat_g: String(g.fat_g),
            carbs_g: String(g.carbs_g),
          });
        }
      })();
    }, [])
  );

  async function handleSave() {
    const parsed = {
      kcal: parseInt(goals.kcal) || 2000,
      protein_g: parseInt(goals.protein_g) || 150,
      fat_g: parseInt(goals.fat_g) || 70,
      carbs_g: parseInt(goals.carbs_g) || 250,
    };
    if (parsed.kcal < 500 || parsed.kcal > 10000) {
      Alert.alert('Ungültig', 'Kalorien müssen zwischen 500 und 10.000 liegen.');
      return;
    }
    await updateGoals(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Tagesziele</Text>
        <View style={styles.card}>
          {[
            { key: 'kcal', label: 'Kalorien (kcal)', placeholder: '2000' },
            { key: 'protein_g', label: 'Eiweiß (g)', placeholder: '150' },
            { key: 'fat_g', label: 'Fett (g)', placeholder: '70' },
            { key: 'carbs_g', label: 'Kohlenhydrate (g)', placeholder: '250' },
          ].map(({ key, label, placeholder }) => (
            <View key={key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={goals[key]}
                onChangeText={(v) => setGoals((prev) => ({ ...prev, [key]: v }))}
                placeholder={placeholder}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{saved ? 'Gespeichert ✓' : 'Ziele speichern'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>App-Info</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.attribution}>
            Nährwertdaten werden von{' '}
            <Text style={styles.attributionLink}>Open Food Facts</Text>
            {' '}bereitgestellt (openfoodfacts.org).{'\n'}
            Open Food Facts ist eine freie, gemeinschaftliche Datenbank.
          </Text>
        </View>
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
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  attribution: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  attributionLink: {
    color: Colors.primary,
  },
});

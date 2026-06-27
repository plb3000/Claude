import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getDailyKcalForMonth, getGoals, getLocalDateString } from '../db/database';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function MonthScreen({ navigation }) {
  const today = getLocalDateString();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-basiert
  const [kcalByDay, setKcalByDay] = useState({});
  const [goalKcal, setGoalKcal] = useState(2000);

  const load = useCallback(async (y, m) => {
    const yearMonth = `${y}-${pad(m + 1)}`;
    const [map, goals] = await Promise.all([
      getDailyKcalForMonth(yearMonth),
      getGoals(),
    ]);
    setKcalByDay(map);
    setGoalKcal(goals.kcal);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(year, month);
    }, [year, month, load])
  );

  function shiftMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  // Tagesstatus -> Farbe
  function dayColor(dateStr) {
    const total = kcalByDay[dateStr];
    if (total == null || total === 0) return Colors.surface; // grau: nichts getrackt
    if (total > goalKcal) return Colors.warning;             // gelb: überschritten
    return Colors.primary;                                    // grün: Ziel eingehalten
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mo=0

  // Zellen: führende Lücken + Tage
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // zähle getrackte / Ziel eingehalten / überschritten
  let trackedDays = 0;
  let goalDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
    const total = kcalByDay[ds];
    if (total != null && total > 0) {
      trackedDays += 1;
      if (total <= goalKcal) goalDays += 1;
    }
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.arrow} onPress={() => shiftMonth(-1)}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.monthText}>{MONTH_NAMES[month]} {year}</Text>
            {!isCurrentMonth && (
              <TouchableOpacity
                onPress={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
              >
                <Text style={styles.todayLink}>Zu diesem Monat</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.arrow} onPress={() => shiftMonth(1)}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <View key={w} style={styles.weekCell}>
              <Text style={styles.weekText}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((d, idx) => {
            if (d == null) return <View key={`e${idx}`} style={styles.cell} />;
            const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isToday = ds === today;
            const total = kcalByDay[ds];
            return (
              <TouchableOpacity
                key={ds}
                style={styles.cell}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Today', { date: ds })}
              >
                <View
                  style={[
                    styles.dayBox,
                    { backgroundColor: dayColor(ds) },
                    isToday && styles.dayBoxToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      total != null && total > 0 && styles.dayNumTracked,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>Ziel eingehalten</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Überschritten</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]} />
            <Text style={styles.legendText}>Nichts getrackt</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{trackedDays}</Text>
            <Text style={styles.statLabel}>Tage getrackt</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{goalDays}</Text>
            <Text style={styles.statLabel}>Ziel erreicht</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{trackedDays - goalDays}</Text>
            <Text style={styles.statLabel}>Überschritten</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const GAP = 6;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: Colors.textPrimary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  todayLink: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: GAP / 2,
  },
  dayBox: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxToday: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  dayNum: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dayNumTracked: {
    color: Colors.background,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FilterPeriod } from '../utils/types';
import { COLORS, BORDER_RADIUS } from '../utils/theme';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type Props = {
  period: FilterPeriod;
  onPeriodChange: (p: FilterPeriod) => void;
  selectedMonth: number;
  onMonthChange: (m: number) => void;
  selectedYear: number;
  onYearChange: (y: number) => void;
};

export default function PeriodFilter({
  period, onPeriodChange, selectedMonth, onMonthChange, selectedYear, onYearChange,
}: Props) {
  return (
    <View>
      <View style={styles.filterRow}>
        {(['harian', 'bulanan', 'tahunan'] as FilterPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => onPeriodChange(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {period === 'bulanan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => onMonthChange(selectedMonth === 0 ? 11 : selectedMonth - 1)}>
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={() => onMonthChange(selectedMonth === 11 ? 0 : selectedMonth + 1)}>
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
      {period === 'tahunan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => onYearChange(selectedYear - 1)}>
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => onYearChange(selectedYear + 1)}>
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.white,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.deepPurple, borderColor: COLORS.deepPurple },
  filterText: { fontSize: 14, fontWeight: '600', color: COLORS.textGray },
  filterTextActive: { color: COLORS.white },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 },
  pickerArrow: { fontSize: 20, color: COLORS.deepPurple, padding: 8 },
  pickerLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, minWidth: 150, textAlign: 'center' },
});

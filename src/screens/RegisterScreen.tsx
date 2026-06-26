import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../components/Input';
import { addUser, generateId } from '../utils/storage';
import type { User } from '../utils/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password tidak cocok');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      const newUser: User = {
        id: generateId(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: 'karyawan',
        createdAt: new Date().toISOString(),
      };
      await addUser(newUser);
      Alert.alert('Berhasil', 'Akun berhasil dibuat, silakan login', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Gagal membuat akun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepPurpleDark} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroSection}>
            <View style={styles.brandRow}>
              <Text style={styles.brandKantor}>Kantor</Text>
              <Text style={styles.brandKu}>Ku</Text>
              <Text style={styles.brandHRIS}> HRIS</Text>
            </View>
            <Text style={styles.tagline}>
              Daftar Akun Karyawan
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Registrasi</Text>
            <Text style={styles.cardSubtitle}>
              Buat akun untuk mulai menggunakan KantorKu HRIS
            </Text>

            <Input
              label="Nama Lengkap"
              placeholder="Masukkan nama"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Email"
              placeholder="Masukkan email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Konfirmasi Password"
              placeholder="Ulangi password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.deepPurpleDark} />
              ) : (
                <Text style={styles.ctaBtnText}>Daftar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginLinkText}>
                Sudah punya akun? <Text style={styles.loginLinkBold}>Masuk</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepPurpleDark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  brandKantor: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  brandKu: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.brightYellow,
  },
  brandHRIS: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.whiteAlpha70,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.brightYellowLight,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    shadowColor: COLORS.deepPurple,
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textGray,
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },
  ctaBtn: {
    backgroundColor: COLORS.brightYellow,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    shadowColor: COLORS.brightYellow,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    color: COLORS.deepPurpleDark,
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  loginLinkText: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  loginLinkBold: {
    color: COLORS.deepPurple,
    fontWeight: '700',
  },
});

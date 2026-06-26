import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '../utils/storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password.trim());
      if (user) {
        if (user.role === 'admin') {
          navigation.replace('AdminDashboard');
        } else {
          navigation.replace('UserDashboard');
        }
      } else {
        Alert.alert('Login Gagal', 'Email atau password salah');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      {/* Geometric pattern overlay */}
      <View style={styles.patternOverlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Identity */}
          <View style={styles.brandSection}>
            <View style={styles.brandRow}>
              <Text style={styles.brandKantor}>Kantor</Text>
              <Text style={styles.brandKu}>Ku</Text>
              <Text style={styles.brandHRIS}>HRIS</Text>
            </View>
            <View style={styles.brandUnderline} />
            <Text style={styles.brandSub}>Manajemen Kehadiran</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Masuk</Text>
              <Text style={styles.cardSubtitle}>Akses dashboard personalia Anda</Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@perusahaan.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Kata sandi</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Lupa kata sandi?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.submitWrap}>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.submitInner}>
                    <Text style={styles.submitText}>Masuk Sekarang</Text>
                    <Text style={styles.submitArrow}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Belum punya akun? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Daftar sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Footer */}
          <View style={styles.statusFooter}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Sistem Online & Stabil</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    backgroundColor: '#1e1b4b',
    zIndex: 0,
  },
  flex: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 48,
  },

  // Brand
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandKantor: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandKu: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FACC15',
    letterSpacing: -0.5,
  },
  brandHRIS: {
    fontSize: 30,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: -0.5,
  },
  brandUnderline: {
    width: 48,
    height: 4,
    backgroundColor: '#FACC15',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 25 },
    elevation: 20,
    padding: 32,
  },
  cardHeader: {
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A73E8',
  },
  input: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 13,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Submit
  submitWrap: {
    paddingTop: 8,
  },
  submitBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A73E8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.8,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Register
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  registerText: {
    fontSize: 14,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A73E8',
    textDecorationLine: 'underline',
    textDecorationColor: '#1A73E8',
    textDecorationStyle: 'solid',
  },

  // Status
  statusFooter: {
    marginTop: 32,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

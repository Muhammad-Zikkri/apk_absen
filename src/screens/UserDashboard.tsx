import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AttendanceRecord, LeaveRequest, FilterPeriod } from '../utils/types';
import {
  getCurrentUser,
  saveAttendanceRecord,
  getAttendanceByUser,
  getLeaveRequestsByUser,
  addLeaveRequest,
  updateUser,
  logoutUser,
  getSettings,
  generateId,
  formatDate,
  formatDateTime,
  getTodayDate,
  calculateDistance,
} from '../utils/storage';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type MenuItem = {
  key: string;
  title: string;
  icon: string;
  color: string;
};

const MENUS: MenuItem[] = [
  { key: 'attendance', title: 'Absensi', icon: '📸', color: '#3B82F6' },
  { key: 'history', title: 'Riwayat Absensi', icon: '📋', color: '#10B981' },
  { key: 'leave', title: 'Ajukan Izin/Sakit', icon: '📝', color: '#F59E0B' },
  { key: 'settings', title: 'Pengaturan', icon: '⚙️', color: '#6366F1' },
];

export default function UserDashboard({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) setUserName(u.name);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin logout?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const renderMenuGrid = () => (
    <View style={styles.menuGrid}>
      {MENUS.map(menu => (
        <TouchableOpacity
          key={menu.key}
          style={[styles.menuItem, { backgroundColor: menu.color + '15' }]}
          onPress={() => setActiveMenu(menu.key)}
        >
          <Text style={styles.menuIcon}>{menu.icon}</Text>
          <Text style={[styles.menuTitle, { color: menu.color }]}>
            {menu.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Dashboard Karyawan</Text>
          <Text style={styles.userName}>Halo, {userName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeMenu === null ? (
          renderMenuGrid()
        ) : activeMenu === 'attendance' ? (
          <AttendanceCamera onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'history' ? (
          <AttendanceHistory onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'leave' ? (
          <LeaveRequestForm onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'settings' ? (
          <UserSettings onBack={() => setActiveMenu(null)} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AttendanceCamera({ onBack }: { onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('front');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [inRange, setInRange] = useState(false);
  const [distance, setDistance] = useState(0);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const loc = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(loc.status === 'granted');
    if (loc.status === 'granted') {
      getLocation();
    }
  };

  const getLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const loc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation(loc);

      const settings = await getSettings();
      if (settings) {
        const dist = calculateDistance(
          loc.latitude,
          loc.longitude,
          settings.coordLatitude,
          settings.coordLongitude,
        );
        setDistance(Math.round(dist));
        setInRange(dist <= settings.coordRadius);
      }
    } catch {
      Alert.alert('Error', 'Gagal mendapatkan lokasi');
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        setPhotoUri(photo.uri);
        setCameraVisible(false);
      } catch {
        Alert.alert('Error', 'Gagal mengambil foto');
      }
    }
  };

  const handleAttendance = async (type: 'Masuk' | 'Pulang') => {
    if (!currentLocation) {
      Alert.alert('Error', 'Lokasi belum tersedia');
      return;
    }
    if (!inRange) {
      Alert.alert(
        'Di Luar Jangkauan',
        `Anda berada ${distance}m dari titik absensi. Harap berada dalam radius yang ditentukan.`,
      );
      return;
    }
    if (!photoUri) {
      Alert.alert('Error', 'Ambil foto terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User tidak ditemukan');
        return;
      }

      const record: AttendanceRecord = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        type,
        timestamp: new Date().toISOString(),
        date: getTodayDate(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        photoUri: photoUri,
      };

      await saveAttendanceRecord(record);
      Alert.alert('Berhasil', `Absensi ${type} berhasil`);
      setPhotoUri(null);
    } catch {
      Alert.alert('Error', 'Gagal menyimpan absensi');
    } finally {
      setLoading(false);
    }
  };

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={takePhoto}
            >
              <View style={styles.cameraBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flipBtn}
              onPress={() =>
                setFacing(facing === 'front' ? 'back' : 'front')
              }
            >
              <Text style={styles.flipBtnText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelCameraBtn}
              onPress={() => setCameraVisible(false)}
            >
              <Text style={styles.cancelCameraText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Absensi</Text>
      </View>

      <TouchableOpacity style={styles.locationCard} onPress={getLocation}>
        <Text style={styles.locationLabel}>
          📍 {currentLocation ? 'Lokasi tersedia' : 'Ambil Lokasi'}
        </Text>
        {currentLocation && (
          <>
            <Text style={styles.locationText}>
              Lat: {currentLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Lng: {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text
              style={[
                styles.rangeText,
                { color: inRange ? '#059669' : '#EF4444' },
              ]}
            >
              {inRange
                ? `✅ Dalam jangkauan (${distance}m)`
                : `❌ Di luar jangkauan (${distance}m)`}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.photoBtn, !photoUri && styles.photoBtnInactive]}
        onPress={() => {
          if (!permission?.granted) {
            requestPermission();
            return;
          }
          setCameraVisible(true);
        }}
      >
        <Text style={styles.photoBtnText}>
          {photoUri ? '✅ Foto sudah diambil' : '📸 Ambil Foto Selfie'}
        </Text>
      </TouchableOpacity>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
      )}

      <View style={styles.attendanceRow}>
        <TouchableOpacity
          style={[styles.attendanceBtn, styles.masukBtn]}
          onPress={() => handleAttendance('Masuk')}
          disabled={loading || !photoUri}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.attendanceBtnText}>Absen Masuk</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attendanceBtn, styles.pulangBtn]}
          onPress={() => handleAttendance('Pulang')}
          disabled={loading || !photoUri}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.attendanceBtnText}>Absen Pulang</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AttendanceHistory({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filtered, setFiltered] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState<FilterPeriod>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, period, selectedMonth, selectedYear]);

  const loadRecords = async () => {
    const user = await getCurrentUser();
    if (user) {
      const all = await getAttendanceByUser(user.id);
      setRecords(all);
    }
  };

  const filterRecords = () => {
    let start = '';
    let end = '';

    if (period === 'harian') {
      start = getTodayDate();
      end = getTodayDate();
    } else if (period === 'bulanan') {
      start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`;
    } else {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
    }

    setFiltered(records.filter(r => r.date >= start && r.date <= end));
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Riwayat Absensi</Text>
      </View>

      <View style={styles.filterRow}>
        {(['harian', 'bulanan', 'tahunan'] as FilterPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.filterText,
                period === p && styles.filterTextActive,
              ]}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'bulanan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity
            onPress={() =>
              setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1))
            }
          >
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>
            {months[selectedMonth]} {selectedYear}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1))
            }
          >
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}

      {period === 'tahunan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}>
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}>
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.countText}>Total: {filtered.length} data</Text>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada data absensi</Text>
      ) : (
        filtered.map(record => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordType}>{record.type}</Text>
              <Text style={styles.recordDate}>
                {formatDateTime(record.timestamp)}
              </Text>
            </View>
            <Text style={styles.recordCoords}>
              Lat: {record.latitude.toFixed(6)}, Lng:{' '}
              {record.longitude.toFixed(6)}
            </Text>
            {record.photoUri && (
              <Image
                source={{ uri: record.photoUri }}
                style={styles.recordPhoto}
              />
            )}
          </View>
        ))
      )}
    </View>
  );
}

function LeaveRequestForm({ onBack }: { onBack: () => void }) {
  const [type, setType] = useState<'izin' | 'sakit'>('izin');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Alasan harus diisi');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Error', 'Tanggal selesai harus setelah tanggal mulai');
      return;
    }

    setSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User tidak ditemukan');
        return;
      }

      const request: LeaveRequest = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        type,
        reason: reason.trim(),
        startDate,
        endDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addLeaveRequest(request);
      Alert.alert('Berhasil', 'Permintaan izin/sakit telah diajukan');
      setReason('');
      setStartDate(getTodayDate());
      setEndDate(getTodayDate());
    } catch {
      Alert.alert('Error', 'Gagal mengajukan permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Ajukan Izin / Sakit</Text>
      </View>

      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'izin' && styles.typeBtnActive]}
          onPress={() => setType('izin')}
        >
          <Text
            style={[
              styles.typeBtnText,
              type === 'izin' && styles.typeBtnTextActive,
            ]}
          >
            📝 Izin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'sakit' && styles.typeBtnActive]}
          onPress={() => setType('sakit')}
        >
          <Text
            style={[
              styles.typeBtnText,
              type === 'sakit' && styles.typeBtnTextActive,
            ]}
          >
            🩺 Sakit
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Tanggal Mulai</Text>
      <TextInput
        style={styles.input}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.inputLabel}>Tanggal Selesai</Text>
      <TextInput
        style={styles.input}
        value={endDate}
        onChangeText={setEndDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.inputLabel}>Alasan</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={reason}
        onChangeText={setReason}
        placeholder="Tuliskan alasan izin/sakit..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Ajukan</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function UserSettings({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) {
        setUserId(u.id);
        setName(u.name);
        setEmail(u.email);
      }
    });
  }, []);

  const handleSave = async () => {
    const updates: Partial<any> = {};
    if (name.trim()) updates.name = name.trim();
    if (email.trim()) updates.email = email.trim();
    if (password.trim()) updates.password = password.trim();

    if (Object.keys(updates).length === 0) {
      Alert.alert('Info', 'Tidak ada perubahan');
      return;
    }

    await updateUser(userId, updates);
    Alert.alert('Berhasil', 'Data berhasil diperbarui');
    setPassword('');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Pengaturan Akun</Text>
      </View>

      <Text style={styles.inputLabel}>Nama Lengkap</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nama"
      />

      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Email"
      />

      <Text style={styles.inputLabel}>Password Baru</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Kosongkan jika tidak diubah"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcome: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '48%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 32,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  pickerArrow: {
    fontSize: 20,
    color: '#3B82F6',
    padding: 8,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 150,
    textAlign: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  recordDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  recordCoords: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  recordPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  photoBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoBtnInactive: {
    opacity: 0.7,
  },
  photoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attendanceBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  masukBtn: {
    backgroundColor: '#10B981',
  },
  pulangBtn: {
    backgroundColor: '#F59E0B',
  },
  attendanceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cameraContainer: {
    flex: 1,
    minHeight: 500,
  },
  camera: {
    flex: 1,
    minHeight: 500,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
  },
  cameraBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  cameraBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  flipBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  flipBtnText: {
    fontSize: 24,
  },
  cancelCameraBtn: {
    position: 'absolute',
    top: 48,
    left: 24,
    padding: 10,
  },
  cancelCameraText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeBtnActive: {
    borderColor: '#1E3A5F',
    backgroundColor: '#EFF6FF',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeBtnTextActive: {
    color: '#1E3A5F',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

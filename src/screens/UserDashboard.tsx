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
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AttendanceRecord, LeaveRequest, FilterPeriod, User } from '../utils/types';
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
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function UserDashboard({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [todayAttendance, setTodayAttendance] = useState<{masuk?: AttendanceRecord; pulang?: AttendanceRecord}>({});
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [weeklySummary, setWeeklySummary] = useState({ hadir: 0, terlambat: 0, alpa: 0 });
  const [inRange, setInRange] = useState(false);
  const [distance, setDistance] = useState(0);
  const [locationName, setLocationName] = useState('Mengambil lokasi...');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserName(u.name); });
    loadTodayData();
    getLocation();
    const timeInterval = setInterval(updateClock, 1000);
    updateClock();
    return () => clearInterval(timeInterval);
  }, []);

  const updateClock = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setCurrentTime(`${h}:${m}`);
    setCurrentDate(`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`);
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Izin lokasi ditolak');
        return;
      }

      // Langsung pakai posisi terakhir yang di-cache (instan, tanpa tunggu GPS)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        setCurrentLocation(coords);
        const settings = await getSettings();
        if (settings) {
          const dist = calculateDistance(coords.latitude, coords.longitude, settings.coordLatitude, settings.coordLongitude);
          setDistance(Math.round(dist));
          setInRange(dist <= settings.coordRadius);
        }
      }

      // Update lokasi akurat di background (Balanced = cepat & hemat baterai)
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrentLocation(coords);

      // Jalankan paralel: hitung jarak + reverse geocode sekaligus
      const [settings, geocode] = await Promise.all([
        getSettings(),
        Location.reverseGeocodeAsync(coords),
      ]);

      if (settings) {
        const dist = calculateDistance(coords.latitude, coords.longitude, settings.coordLatitude, settings.coordLongitude);
        setDistance(Math.round(dist));
        setInRange(dist <= settings.coordRadius);
      }
      if (geocode.length > 0) {
        const addr = geocode[0];
        setLocationName(
          `${addr.street || addr.district || ''}, ${addr.city || addr.subregion || ''}`.trim() || 'Lokasi terdeteksi'
        );
      }
    } catch {
      setLocationName('Lokasi tidak tersedia');
    }
  };


  const loadTodayData = async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const all = await getAttendanceByUser(user.id);
    const today = all.filter(r => r.date === getTodayDate());
    const masuk = today.find(r => r.type === 'Masuk');
    const pulang = today.find(r => r.type === 'Pulang');
    setTodayAttendance({ masuk, pulang });
    setRecentRecords(all.slice(0, 10));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().split('T')[0];
    const weekRecords = all.filter(r => r.date >= weekStr);
    const masukRecords = weekRecords.filter(r => r.type === 'Masuk');
    const hadir = masukRecords.length;

    const settings = await getSettings();
    let terlambat = 0;
    if (settings && settings.lateTime) {
      terlambat = masukRecords.filter(r => {
        const d = new Date(r.timestamp);
        const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return t > settings.lateTime;
      }).length;
    }

    setWeeklySummary({ hadir, terlambat, alpa: 0 });
  };

  const handleLogout = () => {
    const performLogout = async () => {
      await logoutUser();
      navigation.replace('Login');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Yakin ingin logout?')) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Yakin ingin logout?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const renderDashboard = () => (
    <>
      {/* Attendance Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusTop}>
          <View>
            <Text style={styles.statusLabel}>Status Kehadiran</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: todayAttendance.masuk ? COLORS.secondary : COLORS.outline }]} />
              <Text style={styles.statusTitle}>
                {todayAttendance.pulang ? 'Sudah Absen Pulang' : todayAttendance.masuk ? 'Sudah Absen Masuk' : 'Belum Absen'}
              </Text>
            </View>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.currentTime}>{currentTime}</Text>
            <Text style={styles.currentDate}>{currentDate}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.locationIconBox}>
            <Text style={styles.locationIcon}>📍</Text>
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>Lokasi Terdeteksi</Text>
            <Text style={styles.locationValue} numberOfLines={1}>{locationName}</Text>
          </View>
        </View>
      </View>

      {/* Quick Action Button */}
      <View style={styles.quickActionSection}>
        <AttendanceButton
          todayAttendance={todayAttendance}
          onSuccess={loadTodayData}
          currentLocation={currentLocation}
          inRange={inRange}
          distance={distance}
        />
        <Text style={styles.quickActionHint}>Tekan untuk melakukan absensi</Text>
      </View>

      {/* Mini Map View */}
      <View style={styles.mapSection}>
        <Text style={styles.sectionTitle}>Geofence Kantor</Text>
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>
              {inRange ? '📍 Dalam jangkauan' : `📍 Di luar jangkauan (${distance}m)`}
            </Text>
          </View>
          <View style={[styles.rangeBadge, { backgroundColor: inRange ? COLORS.secondary + '20' : COLORS.error + '20' }]}>
            <View style={[styles.rangeDot, { backgroundColor: inRange ? COLORS.secondary : COLORS.error }]} />
            <Text style={[styles.rangeBadgeText, { color: inRange ? COLORS.secondary : COLORS.error }]}>
              {inRange ? 'Dalam Jangkauan' : 'Luar Jangkauan'}
            </Text>
          </View>
        </View>
      </View>

      {/* Weekly Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Ringkasan Minggu Ini</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>{weeklySummary.hadir}</Text>
            <Text style={styles.summaryLabel}>Hadir</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.tertiary }]}>{weeklySummary.terlambat}</Text>
            <Text style={styles.summaryLabel}>Terlambat</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.error }]}>{weeklySummary.alpa}</Text>
            <Text style={styles.summaryLabel}>Alpa</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Aktivitas Terakhir</Text>
          <TouchableOpacity onPress={() => setActiveTab('history')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        {recentRecords.length === 0 ? (
          <View style={styles.activityCard}>
            <Text style={styles.activityEmpty}>Belum ada aktivitas absensi</Text>
          </View>
        ) : (
          recentRecords.slice(0, 5).map((record, idx) => {
            const isMasuk = record.type === 'Masuk';
            return (
              <View key={record.id || idx} style={styles.activityCard}>
                <View style={[styles.activityIconBox, { backgroundColor: isMasuk ? COLORS.secondary + '15' : COLORS.error + '15' }]}>
                  <Text style={styles.activityIcon}>{isMasuk ? '🔓' : '🔒'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>Absen {record.type}</Text>
                  <Text style={styles.activityMeta}>
                    {new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </Text>
                </View>
                <View style={[styles.activityBadge, { backgroundColor: isMasuk ? COLORS.secondaryContainer : COLORS.surfaceContainerHighest }]}>
                  <Text style={[styles.activityBadgeText, { color: isMasuk ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant }]}>
                    {isMasuk ? 'Tepat Waktu' : 'Selesai'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.topBarTitle}>Attendance</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.error, borderRadius: 6, marginRight: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.error }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'history' && <HistoryView onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'map' && <MapView onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'profile' && <ProfileView onBack={() => setActiveTab('dashboard')} onLogout={handleLogout} />}
      </ScrollView>

      {/* BottomNavBar */}
      <View style={styles.bottomNav}>
        {[
          { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
          { key: 'history', icon: '📋', label: 'History' },
          { key: 'map', icon: '🗺️', label: 'Map' },
          { key: 'profile', icon: '👤', label: 'Profile' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.navItem, activeTab === tab.key && styles.navItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.navIcon, activeTab === tab.key && styles.navIconActive]}>{tab.icon}</Text>
            <Text style={[styles.navLabel, activeTab === tab.key && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function AttendanceButton({ 
  todayAttendance, 
  onSuccess,
  currentLocation,
  inRange,
  distance
}: { 
  todayAttendance: any; 
  onSuccess: () => void;
  currentLocation: { latitude: number; longitude: number } | null;
  inRange: boolean;
  distance: number;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('front');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);

  const nextAction = todayAttendance.pulang ? 'Masuk' : todayAttendance.masuk ? 'Pulang' : 'Masuk';

  useEffect(() => {
    // Location is now handled by the parent UserDashboard component
  }, []);

  const handleAttendance = async (type: 'Masuk' | 'Pulang', capturedUri?: string) => {
    const finalUri = capturedUri || photoUri;
    if (!currentLocation) { Alert.alert('Error', 'Lokasi belum tersedia'); return; }
    if (!inRange) { Alert.alert('Di Luar Jangkauan', `Anda berada ${distance}m dari titik absensi.`); return; }
    if (!finalUri) { Alert.alert('Error', 'Ambil foto selfie terlebih dahulu'); return; }
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const settings = await getSettings();
      if (!user) { Alert.alert('Error', 'User tidak ditemukan'); return; }

      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      let statusString = 'Tepat Waktu';

      if (settings) {
        if (type === 'Masuk' && settings.startTime && currentTimeStr < settings.startTime) {
          Alert.alert('Belum Waktunya', `Jam mulai absen adalah ${settings.startTime}. Anda belum bisa absen masuk.`);
          setLoading(false);
          return;
        }
        if (type === 'Pulang' && settings.endTime && currentTimeStr < settings.endTime) {
          Alert.alert('Belum Waktunya Pulang', `Jam pulang adalah ${settings.endTime}. Anda belum bisa absen pulang.`);
          setLoading(false);
          return;
        }
        if (type === 'Masuk' && settings.lateTime && currentTimeStr > settings.lateTime) {
          statusString = 'Terlambat';
          Alert.alert('Info', 'Anda tercatat terlambat.');
        }
      }

      const record: AttendanceRecord & { status?: string } = {
        id: generateId(), userId: user.id, userName: user.name, type,
        timestamp: now.toISOString(), date: getTodayDate(),
        latitude: currentLocation.latitude, longitude: currentLocation.longitude, photoUri: finalUri,
        status: statusString
      };
      await saveAttendanceRecord(record);
      Alert.alert('Berhasil', `Absensi ${type} berhasil`);
      setPhotoUri(null);
      onSuccess();
    } catch { Alert.alert('Error', 'Gagal menyimpan absensi'); } finally { setLoading(false); }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        setPhotoUri(photo.uri);
        setCameraVisible(false);
        // Langsung auto-submit agar lebih cepat
        handleAttendance(nextAction as 'Masuk' | 'Pulang', photo.uri);
      } catch (err: any) { 
        Alert.alert('Error', 'Gagal mengambil foto: ' + (err?.message || 'Unknown')); 
      }
    }
  };

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        <View style={[StyleSheet.absoluteFill, styles.cameraOverlay]}>
          <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
            <View style={styles.cameraBtnInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.flipBtn} onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}>
            <Text style={styles.flipBtnText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setCameraVisible(false)}>
            <Text style={styles.cancelCameraText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fingerprintWrap}>
      <TouchableOpacity
        style={styles.fingerprintOuter}
        onPress={async () => {
          if (!permission?.granted) { 
            const req = await requestPermission(); 
            if (!req.granted) return;
          }
          setCameraVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.fingerprintInner}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.fingerprintIcon}>🖐️</Text>
              <Text style={styles.fingerprintLabel}>Absen {nextAction}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      {photoUri && (
        <TouchableOpacity style={styles.photoPreviewBtn} onPress={() => handleAttendance(nextAction as 'Masuk' | 'Pulang')}>
          <Image source={{ uri: photoUri }} style={styles.photoPreviewThumb} />
          <Text style={styles.photoPreviewText}>Konfirmasi {nextAction}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filtered, setFiltered] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState<FilterPeriod>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => { filterRecords(); }, [records, period, selectedMonth, selectedYear]);

  const loadRecords = async () => {
    const user = await getCurrentUser();
    if (user) setRecords(await getAttendanceByUser(user.id));
  };

  const filterRecords = () => {
    let start = ''; let end = '';
    if (period === 'harian') { start = getTodayDate(); end = getTodayDate(); }
    else if (period === 'bulanan') {
      start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`;
    } else { start = `${selectedYear}-01-01`; end = `${selectedYear}-12-31`; }
    setFiltered(records.filter(r => r.date >= start && r.date <= end));
  };

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <View>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Riwayat Absensi</Text>
      </View>
      <View style={styles.filterRow}>
        {(['harian', 'bulanan', 'tahunan'] as FilterPeriod[]).map(p => (
          <TouchableOpacity key={p} style={[styles.filterBtn, period === p && styles.filterBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {period === 'bulanan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1))}><Text style={styles.pickerArrow}>◀</Text></TouchableOpacity>
          <Text style={styles.pickerLabel}>{months[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1))}><Text style={styles.pickerArrow}>▶</Text></TouchableOpacity>
        </View>
      )}
      {period === 'tahunan' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}><Text style={styles.pickerArrow}>◀</Text></TouchableOpacity>
          <Text style={styles.pickerLabel}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}><Text style={styles.pickerArrow}>▶</Text></TouchableOpacity>
        </View>
      )}
      <Text style={styles.recordCount}>Total: {filtered.length} data</Text>
      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada data absensi</Text>
      ) : (
        filtered.map(r => (
          <View key={r.id} style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyType}>{r.type === 'Masuk' ? '🔓 Absen Masuk' : '🔒 Absen Pulang'}</Text>
              <Text style={styles.historyTime}>{new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.historyDate}>{formatDateTime(r.timestamp)}</Text>
            <Text style={styles.historyCoords}>Lat: {r.latitude.toFixed(6)}, Lng: {r.longitude.toFixed(6)}</Text>
            {r.photoUri && <Image source={{ uri: r.photoUri }} style={styles.historyPhoto} />}
          </View>
        ))
      )}
    </View>
  );
}

function MapView({ onBack }: { onBack: () => void }) {
  const [inRange, setInRange] = useState(false);
  const [distance, setDistance] = useState(0);
  const [locationName, setLocationName] = useState('Memuat...');

  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.requestForegroundPermissionsAsync();
        if (loc.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const settings = await getSettings();
          if (settings) {
            const dist = calculateDistance(coords.latitude, coords.longitude, settings.coordLatitude, settings.coordLongitude);
            setDistance(Math.round(dist));
            setInRange(dist <= settings.coordRadius);
          }
          const geocode = await Location.reverseGeocodeAsync(coords);
          if (geocode.length > 0) {
            const addr = geocode[0];
            setLocationName(`${addr.street || addr.district || ''}, ${addr.city || addr.subregion || ''}`.trim() || 'Lokasi terdeteksi');
          }
        }
      } catch {}
    })();
  }, []);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Geofence Kantor</Text>
      </View>
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapDesc}>{locationName}</Text>
          <View style={[styles.rangeBadgeLarge, { backgroundColor: inRange ? COLORS.secondary + '15' : COLORS.error + '15' }]}>
            <View style={[styles.rangeDotLarge, { backgroundColor: inRange ? COLORS.secondary : COLORS.error }]} />
            <Text style={[styles.rangeTextLarge, { color: inRange ? COLORS.secondary : COLORS.error }]}>
              {inRange ? `Dalam Jangkauan (${distance}m)` : `Luar Jangkauan (${distance}m)`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ProfileView({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => { if (u) { setUserId(u.id); setName(u.name); setEmail(u.email); } });
  }, []);

  const handleSave = async () => {
    const updates: Partial<User> = {};
    if (name.trim()) updates.name = name.trim();
    if (email.trim()) updates.email = email.trim();
    if (password.trim()) updates.password = password.trim();
    if (Object.keys(updates).length === 0) { Alert.alert('Info', 'Tidak ada perubahan'); return; }
    await updateUser(userId, updates);
    Alert.alert('Berhasil', 'Data berhasil diperbarui');
    setPassword('');
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Profil Saya</Text>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{name || 'Karyawan'}</Text>
        <Text style={styles.profileRole}>Karyawan</Text>
      </View>
      <Text style={styles.inputLabel}>Nama Lengkap</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama" />
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email" />
      <Text style={styles.inputLabel}>Password Baru</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Kosongkan jika tidak diubah" />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Simpan Perubahan</Text></TouchableOpacity>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}><Text style={styles.logoutBtnText}>Logout</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, height: 64,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryContainer, borderWidth: 1, borderColor: COLORS.outlineVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.onPrimary },
  topBarTitle: { fontSize: 20, fontWeight: '600', color: COLORS.primary },
  notifBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifIcon: { fontSize: 22 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 20 },

  // Status Card
  statusCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  statusLabel: { fontSize: 12, fontWeight: '600', color: COLORS.outline, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 20, fontWeight: '600', color: COLORS.onSurface },
  timeBox: { alignItems: 'flex-end' },
  currentTime: { fontSize: 32, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.5 },
  currentDate: { fontSize: 12, fontWeight: '600', color: COLORS.outline, marginTop: 2 },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surfaceContainerLow, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.outlineVariant + '50',
  },
  locationIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '12', justifyContent: 'center', alignItems: 'center' },
  locationIcon: { fontSize: 18 },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },
  locationValue: { fontSize: 14, color: COLORS.onSurface },

  // Quick Action
  quickActionSection: { alignItems: 'center' },
  fingerprintWrap: { alignItems: 'center' },
  fingerprintOuter: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: COLORS.primary + '20',
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fingerprintInner: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fingerprintIcon: { fontSize: 40, marginBottom: 4 },
  fingerprintLabel: { fontSize: 11, fontWeight: '700', color: COLORS.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickActionHint: { marginTop: 12, fontSize: 14, color: COLORS.outline, textAlign: 'center' },
  photoPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, backgroundColor: COLORS.primary + '10', padding: 10, borderRadius: 12,
  },
  photoPreviewThumb: { width: 36, height: 36, borderRadius: 8 },
  photoPreviewText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Map
  mapSection: { gap: 10 },
  mapContainer: {
    width: '100%', height: 160, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  mapPlaceholder: { alignItems: 'center', gap: 6 },
  mapPlaceholderIcon: { fontSize: 36 },
  mapPlaceholderText: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant },
  mapEmoji: { fontSize: 48 },
  mapDesc: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 20 },
  rangeBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  rangeDot: { width: 8, height: 8, borderRadius: 4 },
  rangeBadgeText: { fontSize: 11, fontWeight: '600' },
  rangeBadgeLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 8,
  },
  rangeDotLarge: { width: 10, height: 10, borderRadius: 5 },
  rangeTextLarge: { fontSize: 13, fontWeight: '600' },

  // Summary
  summarySection: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.onSurface },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surfaceContainerLow, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryNumber: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant, marginTop: 4 },

  // Activity
  activitySection: { gap: 10 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surfaceContainerLowest, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.outlineVariant, marginBottom: 8,
  },
  activityIconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityType: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  activityMeta: { fontSize: 13, color: COLORS.outline, marginTop: 2 },
  activityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  activityBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  activityEmpty: { fontSize: 14, color: COLORS.outline, textAlign: 'center', padding: 20 },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant,
    height: 72, paddingBottom: 8, paddingHorizontal: 8,
  },
  navItem: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, gap: 2 },
  navItemActive: { backgroundColor: COLORS.primaryContainer },
  navIcon: { fontSize: 22, opacity: 0.6 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant },
  navLabelActive: { color: COLORS.onPrimaryContainer, fontWeight: '700' },

  // Camera
  cameraContainer: { 
    flex: 1, 
    width: '100%', 
    height: 400, 
    borderRadius: 14, 
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 20
  },
  camera: { 
    flex: 1, 
    width: '100%',
    aspectRatio: 3/4
  },
  cameraOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 48 },
  cameraBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  cameraBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  flipBtn: { position: 'absolute', top: 48, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 30 },
  flipBtnText: { fontSize: 24 },
  cancelCameraBtn: { position: 'absolute', top: 48, left: 24, padding: 10 },
  cancelCameraText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // History
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.white,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: COLORS.textGray },
  filterTextActive: { color: COLORS.white },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 },
  pickerArrow: { fontSize: 20, color: COLORS.primary, padding: 8 },
  pickerLabel: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface, minWidth: 150, textAlign: 'center' },
  recordCount: { fontSize: 14, fontWeight: '600', color: COLORS.textGray, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, fontSize: 14, marginTop: 32 },
  historyCard: {
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyType: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  historyTime: { fontSize: 13, color: COLORS.outline, fontWeight: '600' },
  historyDate: { fontSize: 13, color: COLORS.textGray, marginBottom: 2 },
  historyCoords: { fontSize: 11, color: COLORS.textLight },
  historyPhoto: { width: '100%', height: 120, borderRadius: 10, marginTop: 8, backgroundColor: '#F3F4F6' },

  // Profile
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  profileAvatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileAvatarText: { fontSize: 32, fontWeight: '700', color: COLORS.white },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  profileRole: { fontSize: 14, color: COLORS.outline, marginTop: 2 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 6 },
  input: {
    height: 48, borderColor: COLORS.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: COLORS.white, fontSize: 15, color: COLORS.textDark, marginBottom: 12,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  logoutBtn: { backgroundColor: COLORS.error + '12', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  logoutBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 16 },
});

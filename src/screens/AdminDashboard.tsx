import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { User, AttendanceRecord, LeaveRequest, AppSettings, FilterPeriod } from '../utils/types';
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getAttendanceRecords,
  getAttendanceByDateRange,
  getLeaveRequests,
  updateLeaveRequestStatus,
  getSettings,
  saveSettings,
  logoutUser,
  generateId,
  getCurrentUser,
  formatDate,
  formatDateTime,
  getTodayDate,
} from '../utils/storage';
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function AdminDashboard({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [adminName, setAdminName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0, belumAbsen: 0, izin: 0 });
  const [recentActivity, setRecentActivity] = useState<AttendanceRecord[]>([]);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setAdminName(u.name); });
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const records = await getAttendanceRecords();
    const today = getTodayDate();
    const todayRecords = records.filter(r => r.date === today);
    const hadir = todayRecords.filter(r => r.type === 'Masuk').length;
    const izin = (await getLeaveRequests()).filter(r => r.status === 'approved').length;

    setStats({ hadir, terlambat: 0, belumAbsen: Math.max(0, 5 - hadir), izin });
    setRecentActivity(records.slice(0, 10));

    // Build 7-day chart data
    const weekData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weekData.push(records.filter(r => r.date === dateStr && r.type === 'Masuk').length);
    }
    setChartData(weekData);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin logout?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logoutUser(); navigation.replace('Login'); } },
    ]);
  };

  const maxChart = Math.max(...chartData, 1);

  const renderDashboard = () => (
    <>
      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Hadir</Text>
          <Text style={[styles.statNumber, { color: COLORS.secondary }]}>{stats.hadir}</Text>
          <View style={[styles.statBar, { backgroundColor: COLORS.secondary + '30' }]} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Terlambat</Text>
          <Text style={[styles.statNumber, { color: COLORS.tertiaryContainer }]}>{stats.terlambat}</Text>
          <View style={[styles.statBar, { backgroundColor: COLORS.tertiaryContainer + '30' }]} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Belum Absen</Text>
          <Text style={[styles.statNumber, { color: COLORS.error }]}>{stats.belumAbsen}</Text>
          <View style={[styles.statBar, { backgroundColor: COLORS.error + '30' }]} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Izin/Cuti</Text>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.izin}</Text>
          <View style={[styles.statBar, { backgroundColor: COLORS.primary + '30' }]} />
        </View>
      </View>

      {/* Attendance Trend Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Attendance Trend</Text>
          <Text style={styles.chartBadge}>Last 7 Days</Text>
        </View>
        <View style={styles.chartContainer}>
          {chartData.map((val, i) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - i));
            return (
              <View key={i} style={styles.chartBarWrap}>
                <View style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${Math.max((val / maxChart) * 100, 2)}%`,
                        opacity: Math.max(0.2 + (i / 7) * 0.8, 0.3),
                        backgroundColor: COLORS.primaryContainer,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{DAYS[day.getDay()]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Active Geofences */}
      <View style={styles.geofenceSection}>
        <View style={styles.geofenceHeader}>
          <Text style={styles.sectionTitle}>Active Geofences</Text>
          <TouchableOpacity onPress={() => setActiveTab('settings')}>
            <Text style={styles.geofenceAction}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.geofenceMap}>
          <View style={styles.geofencePlaceholder}>
            <View style={styles.geofencePulse}>
              <View style={styles.geofenceDot} />
            </View>
          </View>
          <View style={styles.geofenceInfo}>
            <TouchableOpacity
              style={styles.geofenceItem}
              onPress={() => setActiveTab('settings')}
            >
              <View style={styles.geofenceItemTop}>
                <Text style={styles.geofenceItemName}>Jakarta Office</Text>
                <Text style={[styles.geofenceItemCount, { color: COLORS.secondary, backgroundColor: COLORS.secondary + '12' }]}>
                  {stats.hadir} Present
                </Text>
              </View>
              <Text style={styles.geofenceItemAddr}>HQ - Sudirman Central Business District</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.timeline}>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada aktivitas hari ini</Text>
          ) : (
            recentActivity.slice(0, 5).map((r, idx) => {
              const isOnTime = r.type === 'Masuk';
              return (
                <View key={r.id || idx} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: isOnTime ? COLORS.secondary : COLORS.tertiaryContainer }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineName}>{r.userName}</Text>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.timelineMetaText}>
                        {new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {isOnTime ? 'Clock In' : 'Clock Out'}
                      </Text>
                    </View>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.timelineMetaText}>📍 Jakarta Office</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={styles.viewAllBtnText}>View Complete Log</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{adminName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.topBarTitle}>Attendance Admin</Text>
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
        {activeTab === 'employees' && (
          <ManageUsers onBack={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'reports' && (
          <>
            <AttendanceReport onBack={() => setActiveTab('dashboard')} />
            <View style={{ height: 20 }} />
            <ManageRequests onBack={() => setActiveTab('dashboard')} />
          </>
        )}
        {activeTab === 'settings' && (
          <AdminSettings onBack={() => setActiveTab('dashboard')} />
        )}
      </ScrollView>

      {/* BottomNavBar */}
      <View style={styles.bottomNav}>
        {[
          { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
          { key: 'employees', icon: '👥', label: 'Employees' },
          { key: 'reports', icon: '📊', label: 'Reports' },
          { key: 'settings', icon: '⚙️', label: 'Settings' },
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

// ========== SUB-SCREENS ==========

function ManageUsers({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setUsers((await getUsers()).filter(u => u.role === 'karyawan'));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || (!editId && !password.trim())) { Alert.alert('Error', 'Semua field harus diisi'); return; }
    try {
      if (editId) {
        await updateUser(editId, { name: name.trim(), email: email.trim(), ...(password.trim() ? { password: password.trim() } : {}) });
        Alert.alert('Berhasil', 'Akun user diperbarui');
      } else {
        await addUser({ id: generateId(), name: name.trim(), email: email.trim(), password: password.trim(), role: 'karyawan', createdAt: new Date().toISOString() });
        Alert.alert('Berhasil', 'Akun user dibuat');
      }
      setModalVisible(false); resetForm(); loadUsers();
    } catch { Alert.alert('Error', 'Gagal menyimpan user'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus User', 'Yakin ingin menghapus?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => { await deleteUser(id); loadUsers(); } },
    ]);
  };

  const resetForm = () => { setName(''); setEmail(''); setPassword(''); setEditId(null); };

  return (
    <View style={styles.subScreen}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Manage Employees</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Text style={styles.addBtnText}>+ Add Employee</Text>
      </TouchableOpacity>
      {users.map(u => (
        <View key={u.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{u.name}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => { setName(u.name); setEmail(u.email); setPassword(''); setEditId(u.id); setModalVisible(true); }}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(u.id)}>
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Employee' : 'Add Employee'}</Text>
            <TextInput style={styles.modalInput} placeholder="Nama Lengkap" value={name} onChangeText={setName} />
            <TextInput style={styles.modalInput} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.modalInput} placeholder={editId ? 'Password (kosongkan jika tidak diubah)' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setModalVisible(false); resetForm(); }}><Text style={styles.modalCancelText}>Batal</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave}><Text style={styles.modalSaveText}>Simpan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AttendanceReport({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filtered, setFiltered] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState<FilterPeriod>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { getAttendanceRecords().then(setRecords); }, []);
  useEffect(() => {
    let start = ''; let end = '';
    if (period === 'harian') { start = getTodayDate(); end = getTodayDate(); }
    else if (period === 'bulanan') {
      start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;
    } else { start = `${selectedYear}-01-01`; end = `${selectedYear}-12-31`; }
    setFiltered(records.filter(r => r.date >= start && r.date <= end));
  }, [records, period, selectedMonth, selectedYear]);

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <View style={styles.subScreen}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Attendance Reports</Text>
      </View>
      <View style={styles.filterRow}>
        {(['harian', 'bulanan', 'tahunan'] as FilterPeriod[]).map(p => (
          <TouchableOpacity key={p} style={[styles.filterBtn, period === p && styles.filterBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {period !== 'harian' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity onPress={() => period === 'bulanan' ? setSelectedMonth(p => p === 0 ? 11 : p - 1) : setSelectedYear(p => p - 1)}>
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>{period === 'bulanan' ? `${months[selectedMonth]} ${selectedYear}` : String(selectedYear)}</Text>
          <TouchableOpacity onPress={() => period === 'bulanan' ? setSelectedMonth(p => p === 11 ? 0 : p + 1) : setSelectedYear(p => p + 1)}>
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.countText}>Total: {filtered.length} data</Text>
      {filtered.map(r => (
        <View key={r.id} style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordType}>{r.type}</Text>
            <Text style={styles.recordDate}>{formatDateTime(r.timestamp)}</Text>
          </View>
          <Text style={styles.recordUser}>{r.userName}</Text>
          <Text style={styles.recordCoords}>Lat: {r.latitude.toFixed(6)}, Lng: {r.longitude.toFixed(6)}</Text>
        </View>
      ))}
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={async () => {
          if (filtered.length === 0) { Alert.alert('Info', 'Tidak ada data'); return; }
          const csv = 'No,Tanggal,Jam,Nama User,Tipe,Latitude,Longitude\n' + filtered.map((r, i) => `${i + 1},${r.date},${new Date(r.timestamp).toLocaleTimeString('id-ID')},"${r.userName}",${r.type},${r.latitude},${r.longitude}`).join('\n');
          const f = new File(Paths.document, `absensi_${getTodayDate()}.csv`);
          await f.write(csv); await Sharing.shareAsync(f.uri, { mimeType: 'text/csv' });
        }}><Text style={styles.exportBtnText}>📊 Export</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function ManageRequests({ onBack }: { onBack: () => void }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  useEffect(() => { getLeaveRequests().then(r => setRequests(r.filter(x => x.status === 'pending'))); }, []);

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    await updateLeaveRequestStatus(id, status);
    Alert.alert('Berhasil', status === 'approved' ? 'Disetujui' : 'Ditolak');
    getLeaveRequests().then(r => setRequests(r.filter(x => x.status === 'pending')));
  };

  return (
    <View style={styles.subScreen}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Leave Requests</Text>
      </View>
      {requests.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada permintaan izin/sakit</Text>
      ) : requests.map(req => (
        <View key={req.id} style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestType}>{req.type === 'sakit' ? '🩺 Sakit' : '📝 Izin'}</Text>
            <Text style={styles.requestDate}>{formatDate(req.createdAt)}</Text>
          </View>
          <Text style={styles.requestUser}>{req.userName}</Text>
          <Text style={styles.requestReason}>{req.reason}</Text>
          <Text style={styles.requestDateRange}>{formatDate(req.startDate)} - {formatDate(req.endDate)}</Text>
          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatus(req.id, 'approved')}>
              <Text style={styles.approveBtnText}>✓ Terima</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleStatus(req.id, 'rejected')}>
              <Text style={styles.rejectBtnText}>✕ Tolak</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

function AdminSettings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<AppSettings>({ coordLatitude: 0, coordLongitude: 0, coordRadius: 100 });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    getSettings().then(s => { if (s) setSettings(s); });
    getCurrentUser().then(u => { if (u) setAdminEmail(u.email); });
  }, []);

  const handleSaveCoord = async () => { await saveSettings(settings); Alert.alert('Berhasil', 'Koordinat diperbarui'); };
  const handleSaveAdmin = async () => {
    const u = await getCurrentUser();
    if (u) {
      const updates: Partial<User> = {};
      if (adminEmail.trim()) updates.email = adminEmail.trim();
      if (adminPassword.trim()) updates.password = adminPassword.trim();
      await updateUser(u.id, updates);
      Alert.alert('Berhasil', 'Data admin diperbarui');
      setAdminPassword('');
    }
  };

  return (
    <View style={styles.subScreen}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Kembali</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Geofence Settings</Text>
      </View>
      <Text style={styles.settingsSub}>Titik Koordinat Absensi</Text>
      <TextInput style={styles.settingsInput} placeholder="Latitude" value={String(settings.coordLatitude || 5.547596)} onChangeText={v => setSettings({ ...settings, coordLatitude: parseFloat(v) || 0 })} keyboardType="numeric" />
      <TextInput style={styles.settingsInput} placeholder="Longitude" value={String(settings.coordLongitude || 95.318178)} onChangeText={v => setSettings({ ...settings, coordLongitude: parseFloat(v) || 0 })} keyboardType="numeric" />
      <TextInput style={styles.settingsInput} placeholder="Radius (meter)" value={String(settings.coordRadius)} onChangeText={v => setSettings({ ...settings, coordRadius: parseInt(v) || 0 })} keyboardType="numeric" />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCoord}><Text style={styles.saveBtnText}>Simpan Koordinat</Text></TouchableOpacity>
      <Text style={[styles.settingsSub, { marginTop: 24 }]}>Data Admin</Text>
      <TextInput style={styles.settingsInput} placeholder="Email baru" value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.settingsInput} placeholder="Password baru" value={adminPassword} onChangeText={setAdminPassword} secureTextEntry />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAdmin}><Text style={styles.saveBtnText}>Simpan Data Admin</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, height: 64,
    backgroundColor: COLORS.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryContainer, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.onPrimary },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  notifBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifIcon: { fontSize: 22 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 20 },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surfaceContainerLowest, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  statNumber: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  statBar: { height: 4, borderRadius: 2, marginTop: 8 },

  // Chart
  chartSection: { backgroundColor: COLORS.surfaceContainerLowest, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.outlineVariant },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartBadge: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant, backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', gap: 6 },
  chartBar: { width: '70%', height: 140, justifyContent: 'flex-end', alignItems: 'center' },
  chartBarFill: { width: '100%', borderRadius: 6, minHeight: 4 },
  chartLabel: { fontSize: 10, fontWeight: '600', color: COLORS.onSurfaceVariant },

  // Geofence
  geofenceSection: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 14, borderWidth: 1, borderColor: COLORS.outlineVariant, overflow: 'hidden' },
  geofenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  geofenceAction: { fontSize: 20 },
  geofenceMap: { flexDirection: 'column' },
  geofencePlaceholder: {
    height: 140, backgroundColor: COLORS.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
  },
  geofencePulse: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: COLORS.primary + '40',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
  },
  geofenceDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 3, borderColor: COLORS.white,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  geofenceInfo: { padding: 12 },
  geofenceItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant + '50' },
  geofenceItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  geofenceItemName: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  geofenceItemCount: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  geofenceItemAddr: { fontSize: 13, color: COLORS.onSurfaceVariant },

  // Activity
  activitySection: { backgroundColor: COLORS.surfaceContainerLowest, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.outlineVariant },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.onSurface },
  emptyText: { textAlign: 'center', color: COLORS.outline, fontSize: 14, marginTop: 20, marginBottom: 20 },
  timeline: { marginTop: 16, gap: 16 },
  timelineItem: { flexDirection: 'row', gap: 12, position: 'relative' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, borderWidth: 3, borderColor: COLORS.white },
  timelineContent: { flex: 1, paddingBottom: 8 },
  timelineName: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timelineMetaText: { fontSize: 13, color: COLORS.onSurfaceVariant },
  viewAllBtn: {
    marginTop: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center',
  },
  viewAllBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant,
    height: 72, paddingBottom: 8, paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  navItem: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, gap: 2 },
  navItemActive: { backgroundColor: COLORS.secondaryContainer },
  navIcon: { fontSize: 22, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant },
  navLabelActive: { color: COLORS.onSecondaryContainer, fontWeight: '700' },

  // Sub-screens
  subScreen: { flex: 1 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  userCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  userEmail: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  editBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  modalInput: {
    height: 48, borderColor: COLORS.outlineVariant, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: COLORS.inputBg, fontSize: 15, color: COLORS.onSurface, marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center' },
  modalCancelText: { color: COLORS.onSurfaceVariant, fontWeight: '600' },
  modalSave: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { color: COLORS.white, fontWeight: '600' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.white,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: COLORS.onSurfaceVariant },
  filterTextActive: { color: COLORS.white },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 },
  pickerArrow: { fontSize: 20, color: COLORS.primary, padding: 8 },
  pickerLabel: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface, minWidth: 150, textAlign: 'center' },
  countText: { fontSize: 14, fontWeight: '600', color: COLORS.onSurfaceVariant, marginBottom: 12 },
  recordCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recordType: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  recordDate: { fontSize: 12, color: COLORS.outline },
  recordUser: { fontSize: 14, fontWeight: '500', color: COLORS.onSurface },
  recordCoords: { fontSize: 11, color: COLORS.outline, marginTop: 2 },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  exportBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.secondary, alignItems: 'center' },
  exportBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Requests
  requestCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  requestType: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  requestDate: { fontSize: 12, color: COLORS.outline },
  requestUser: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface, marginBottom: 4 },
  requestReason: { fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 4 },
  requestDateRange: { fontSize: 12, color: COLORS.outline, marginBottom: 10 },
  requestActions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.secondaryContainer, alignItems: 'center' },
  approveBtnText: { color: COLORS.onSecondaryContainer, fontWeight: '700' },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.errorContainer, alignItems: 'center' },
  rejectBtnText: { color: COLORS.onErrorContainer, fontWeight: '700' },

  // Settings
  settingsSub: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },
  settingsInput: {
    height: 48, borderColor: COLORS.outlineVariant, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: COLORS.white, fontSize: 15, color: COLORS.onSurface, marginBottom: 10,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});

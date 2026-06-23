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
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { User, AttendanceRecord, LeaveRequest, AppSettings } from '../utils/types';
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
  { key: 'users', title: 'Kelola Akun User', icon: '👥', color: '#3B82F6' },
  { key: 'attendance', title: 'Laporan Absensi', icon: '📊', color: '#10B981' },
  { key: 'requests', title: 'Izin / Sakit', icon: '📋', color: '#F59E0B' },
  { key: 'settings', title: 'Pengaturan', icon: '⚙️', color: '#6366F1' },
];

type FilterPeriod = 'harian' | 'bulanan' | 'tahunan';

export default function AdminDashboard({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) setAdminName(u.name);
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
          <Text style={styles.welcome}>Dashboard Admin</Text>
          <Text style={styles.userName}>Halo, {adminName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeMenu === null ? (
          renderMenuGrid()
        ) : activeMenu === 'users' ? (
          <ManageUsers onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'attendance' ? (
          <AttendanceReport onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'requests' ? (
          <ManageRequests onBack={() => setActiveMenu(null)} />
        ) : activeMenu === 'settings' ? (
          <AdminSettings onBack={() => setActiveMenu(null)} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ManageUsers({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const all = await getUsers();
    setUsers(all.filter(u => u.role === 'karyawan'));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || (!editId && !password.trim())) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    try {
      if (editId) {
        await updateUser(editId, {
          name: name.trim(),
          email: email.trim(),
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        Alert.alert('Berhasil', 'Akun user diperbarui');
      } else {
        const newUser: User = {
          id: generateId(),
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role: 'karyawan',
          createdAt: new Date().toISOString(),
        };
        await addUser(newUser);
        Alert.alert('Berhasil', 'Akun user dibuat');
      }
      setModalVisible(false);
      resetForm();
      loadUsers();
    } catch {
      Alert.alert('Error', 'Gagal menyimpan user');
    }
  };

  const handleDelete = (userId: string) => {
    Alert.alert('Hapus User', 'Yakin ingin menghapus user ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteUser(userId);
          loadUsers();
        },
      },
    ]);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setEditId(null);
  };

  const openEdit = (user: User) => {
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setEditId(user.id);
    setModalVisible(true);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Kelola Akun User</Text>
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Text style={styles.addBtnText}>+ Tambah User Baru</Text>
      </TouchableOpacity>

      {users.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada user karyawan</Text>
      ) : (
        users.map(user => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userNameText}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEdit(user)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(user.id)}
              >
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editId ? 'Edit User' : 'Tambah User Baru'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nama Lengkap"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={editId ? 'Password (kosongkan jika tidak diubah)' : 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
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

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, period, selectedMonth, selectedYear]);

  const loadRecords = async () => {
    const all = await getAttendanceRecords();
    setRecords(all);
  };

  const filterRecords = () => {
    const now = new Date();
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
        <Text style={styles.sectionTitle}>Laporan Absensi</Text>
      </View>

      <View style={styles.filterRow}>
        {(['harian', 'bulanan', 'tahunan'] as FilterPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
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
          <TouchableOpacity
            onPress={() => setSelectedYear(prev => prev - 1)}
          >
            <Text style={styles.pickerArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.pickerLabel}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear(prev => prev + 1)}
          >
            <Text style={styles.pickerArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.countText}>
        Total: {filtered.length} data
      </Text>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada data absensi</Text>
      ) : (
        filtered.map(record => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordType}>{record.type}</Text>
              <Text style={styles.recordDate}>{formatDateTime(record.timestamp)}</Text>
            </View>
            <Text style={styles.recordUser}>{record.userName}</Text>
            <Text style={styles.recordCoords}>
              Lat: {record.latitude.toFixed(6)}, Lng: {record.longitude.toFixed(6)}
            </Text>
          </View>
        ))
      )}

      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={() => exportExcel(filtered)}>
          <Text style={styles.exportBtnText}>📊 Export Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, styles.exportPdf]} onPress={() => exportPdf(filtered)}>
          <Text style={styles.exportBtnText}>📄 Export PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

async function exportExcel(records: AttendanceRecord[]) {
  if (records.length === 0) {
    Alert.alert('Info', 'Tidak ada data untuk diexport');
    return;
  }

  try {
    const csvHeader = 'No,Tanggal,Jam,Nama User,Tipe,Latitude,Longitude\n';
    const csvRows = records
      .map(
        (r, i) =>
          `${i + 1},${r.date},${new Date(r.timestamp).toLocaleTimeString('id-ID')},"${r.userName}",${r.type},${r.latitude},${r.longitude}`,
      )
      .join('\n');
    const csvContent = csvHeader + csvRows;
    const file = new File(Paths.document, `absensi_${getTodayDate()}.csv`);
    await file.write(csvContent);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Absensi',
    });
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Gagal export');
  }
}

async function exportPdf(records: AttendanceRecord[]) {
  if (records.length === 0) {
    Alert.alert('Info', 'Tidak ada data untuk diexport');
    return;
  }

  try {
    let content = `LAPORAN ABSENSI - ${getTodayDate()}\n`;
    content += '='.repeat(50) + '\n\n';
    records.forEach((r, i) => {
      content += `${i + 1}. ${r.type}\n`;
      content += `   Tanggal: ${formatDateTime(r.timestamp)}\n`;
      content += `   Nama: ${r.userName}\n`;
      content += `   Koordinat: ${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}\n`;
      content += '-'.repeat(30) + '\n';
    });
    const file = new File(Paths.document, `absensi_${getTodayDate()}.txt`);
    await file.write(content);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export Absensi',
    });
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Gagal export');
  }
}

function ManageRequests({ onBack }: { onBack: () => void }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const all = await getLeaveRequests();
    setRequests(all.filter(r => r.status === 'pending'));
  };

  const handleStatus = async (
    requestId: string,
    status: 'approved' | 'rejected',
  ) => {
    await updateLeaveRequestStatus(requestId, status);
    Alert.alert(
      'Berhasil',
      status === 'approved' ? 'Izin disetujui' : 'Izin ditolak',
    );
    loadRequests();
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Izin / Sakit</Text>
      </View>

      {requests.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada permintaan izin/sakit</Text>
      ) : (
        requests.map(req => (
          <View key={req.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestType}>
                {req.type === 'sakit' ? '🩺 Sakit' : '📝 Izin'}
              </Text>
              <Text style={styles.requestDate}>
                {formatDate(req.createdAt)}
              </Text>
            </View>
            <Text style={styles.requestUser}>{req.userName}</Text>
            <Text style={styles.requestReason}>{req.reason}</Text>
            <Text style={styles.requestDateRange}>
              {formatDate(req.startDate)} - {formatDate(req.endDate)}
            </Text>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleStatus(req.id, 'approved')}
              >
                <Text style={styles.approveBtnText}>✓ Terima</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleStatus(req.id, 'rejected')}
              >
                <Text style={styles.rejectBtnText}>✕ Tolak</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function AdminSettings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<AppSettings>({
    coordLatitude: 0,
    coordLongitude: 0,
    coordRadius: 100,
  });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    loadSettings();
    getCurrentUser().then(u => {
      if (u) {
        setAdminEmail(u.email);
      }
    });
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    if (s) setSettings(s);
  };

  const handleSaveCoord = async () => {
    await saveSettings(settings);
    Alert.alert('Berhasil', 'Titik koordinat absen diperbarui');
  };

  const handleSaveAdmin = async () => {
    const user = await getCurrentUser();
    if (user) {
      const updates: Partial<User> = {};
      if (adminEmail.trim()) updates.email = adminEmail.trim();
      if (adminPassword.trim()) updates.password = adminPassword.trim();
      await updateUser(user.id, updates);
      Alert.alert('Berhasil', 'Data admin diperbarui');
      setAdminPassword('');
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Pengaturan</Text>
      </View>

      <Text style={styles.settingsSubtitle}>Titik Koordinat Absensi</Text>
      <TextInput
        style={styles.settingsInput}
        placeholder="Latitude"
        value={String(settings.coordLatitude)}
        onChangeText={v =>
          setSettings({ ...settings, coordLatitude: parseFloat(v) || 0 })
        }
        keyboardType="numeric"
      />
      <TextInput
        style={styles.settingsInput}
        placeholder="Longitude"
        value={String(settings.coordLongitude)}
        onChangeText={v =>
          setSettings({ ...settings, coordLongitude: parseFloat(v) || 0 })
        }
        keyboardType="numeric"
      />
      <TextInput
        style={styles.settingsInput}
        placeholder="Radius (meter)"
        value={String(settings.coordRadius)}
        onChangeText={v =>
          setSettings({ ...settings, coordRadius: parseInt(v) || 0 })
        }
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCoord}>
        <Text style={styles.saveBtnText}>Simpan Koordinat</Text>
      </TouchableOpacity>

      <Text style={[styles.settingsSubtitle, { marginTop: 24 }]}>
        Data Admin
      </Text>
      <TextInput
        style={styles.settingsInput}
        placeholder="Email baru"
        value={adminEmail}
        onChangeText={setAdminEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.settingsInput}
        placeholder="Password baru"
        value={adminPassword}
        onChangeText={setAdminPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAdmin}>
        <Text style={styles.saveBtnText}>Simpan Data Admin</Text>
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
  addBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 32,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  editBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  modalSave: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  recordUser: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  recordCoords: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  exportPdf: {
    backgroundColor: '#EF4444',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  requestDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  requestUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestReason: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  requestDateRange: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#059669',
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  settingsSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  settingsInput: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

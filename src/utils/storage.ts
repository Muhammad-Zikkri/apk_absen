import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  AttendanceRecord,
  LeaveRequest,
  AppSettings,
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_ADMIN } from './types';

const KEYS = {
  USERS: '@users',
  ATTENDANCE: '@attendance_records',
  LEAVE_REQUESTS: '@leave_requests',
  SETTINGS: '@app_settings',
  CURRENT_USER: '@current_user',
};

export async function initializeApp(): Promise<void> {
  const users = await getUsers();
  if (users.length === 0) {
    await saveUsers([DEFAULT_ADMIN]);
  }
  const settings = await getSettings();
  if (!settings) {
    await saveSettings(DEFAULT_SETTINGS);
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
  } catch {
    console.warn('Gagal menyimpan data users');
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<User | null> {
  const users = await getUsers();
  const user = users.find(
    u => u.email === email && u.password === password,
  );
  if (user) {
    await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.CURRENT_USER);
}

export async function addUser(user: User): Promise<void> {
  const users = await getUsers();
  users.push(user);
  await saveUsers(users);
}

export async function updateUser(
  userId: string,
  updates: Partial<User>,
): Promise<void> {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    await saveUsers(users);
    const current = await getCurrentUser();
    if (current && current.id === userId) {
      await AsyncStorage.setItem(
        KEYS.CURRENT_USER,
        JSON.stringify(users[idx]),
      );
    }
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const users = await getUsers();
  await saveUsers(users.filter(u => u.id !== userId));
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveAttendanceRecord(
  record: AttendanceRecord,
): Promise<void> {
  const records = await getAttendanceRecords();
  records.unshift(record);
  await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
}

export async function getAttendanceByUser(
  userId: string,
): Promise<AttendanceRecord[]> {
  const records = await getAttendanceRecords();
  return records.filter(r => r.userId === userId);
}

export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string,
  userId?: string,
): Promise<AttendanceRecord[]> {
  const records = await getAttendanceRecords();
  return records.filter(r => {
    const inRange = r.date >= startDate && r.date <= endDate;
    return userId ? inRange && r.userId === userId : inRange;
  });
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LEAVE_REQUESTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getLeaveRequestsByUser(
  userId: string,
): Promise<LeaveRequest[]> {
  const requests = await getLeaveRequests();
  return requests.filter(r => r.userId === userId);
}

export async function addLeaveRequest(
  request: LeaveRequest,
): Promise<void> {
  const requests = await getLeaveRequests();
  requests.unshift(request);
  await AsyncStorage.setItem(KEYS.LEAVE_REQUESTS, JSON.stringify(requests));
}

export async function updateLeaveRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const requests = await getLeaveRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    requests[idx].status = status;
    await AsyncStorage.setItem(
      KEYS.LEAVE_REQUESTS,
      JSON.stringify(requests),
    );
  }
}

export async function getSettings(): Promise<AppSettings | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(
  settings: AppSettings,
): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 8);
}

export function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

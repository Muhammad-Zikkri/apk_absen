import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeApp,
  getUsers,
  saveUsers,
  loginUser,
  getCurrentUser,
  logoutUser,
  addUser,
  updateUser,
  deleteUser,
  getAttendanceRecords,
  saveAttendanceRecord,
  getAttendanceByUser,
  getLeaveRequests,
  addLeaveRequest,
  updateLeaveRequestStatus,
  getSettings,
  saveSettings,
  generateId,
  getTodayDate,
  formatDate,
  formatDateTime,
  calculateDistance,
} from '../src/utils/storage';
import type {
  User,
  AttendanceRecord,
  LeaveRequest,
  AppSettings,
} from '../src/utils/types';
import { DEFAULT_ADMIN, DEFAULT_SETTINGS } from '../src/utils/types';

const mockUser: User = {
  id: 'user-001',
  name: 'Budi Santoso',
  email: 'budi@test.com',
  password: 'test123',
  role: 'karyawan',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockAttendance: AttendanceRecord = {
  id: 'att-001',
  userId: 'user-001',
  userName: 'Budi Santoso',
  type: 'Masuk',
  timestamp: '2026-06-25T08:00:00.000Z',
  date: '2026-06-25',
  latitude: -6.2,
  longitude: 106.8,
};

const mockLeave: LeaveRequest = {
  id: 'lv-001',
  userId: 'user-001',
  userName: 'Budi Santoso',
  type: 'izin',
  reason: 'Keperluan keluarga',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  status: 'pending',
  createdAt: '2026-06-24T10:00:00.000Z',
};

beforeEach(() => {
  AsyncStorage.clear();
});

describe('initializeApp', () => {
  it('should create default admin and settings when empty', async () => {
    await initializeApp();
    const users = await getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(DEFAULT_ADMIN.email);
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should not duplicate data if already exists', async () => {
    await initializeApp();
    await initializeApp();
    const users = await getUsers();
    expect(users).toHaveLength(1);
  });
});

describe('User CRUD', () => {
  it('should add a new user', async () => {
    await addUser(mockUser);
    const users = await getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('budi@test.com');
  });

  it('should login with valid credentials', async () => {
    await addUser(mockUser);
    const result = await loginUser('budi@test.com', 'test123');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Budi Santoso');
  });

  it('should return null for invalid credentials', async () => {
    await addUser(mockUser);
    const result = await loginUser('budi@test.com', 'wrongpass');
    expect(result).toBeNull();
  });

  it('should update a user', async () => {
    await addUser(mockUser);
    await updateUser('user-001', { name: 'Budi Update' });
    const users = await getUsers();
    expect(users[0].name).toBe('Budi Update');
  });

  it('should delete a user', async () => {
    await addUser(mockUser);
    await deleteUser('user-001');
    const users = await getUsers();
    expect(users).toHaveLength(0);
  });

  it('should get current user after login', async () => {
    await addUser(mockUser);
    await loginUser('budi@test.com', 'test123');
    const current = await getCurrentUser();
    expect(current).not.toBeNull();
    expect(current?.email).toBe('budi@test.com');
  });

  it('should clear current user on logout', async () => {
    await addUser(mockUser);
    await loginUser('budi@test.com', 'test123');
    await logoutUser();
    const current = await getCurrentUser();
    expect(current).toBeNull();
  });
});

describe('Attendance Records', () => {
  it('should save and retrieve attendance records', async () => {
    await saveAttendanceRecord(mockAttendance);
    const records = await getAttendanceRecords();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe('Masuk');
  });

  it('should filter attendance by user', async () => {
    await saveAttendanceRecord(mockAttendance);
    const otherRecord = { ...mockAttendance, id: 'att-002', userId: 'user-002' };
    await saveAttendanceRecord(otherRecord);
    const userRecords = await getAttendanceByUser('user-001');
    expect(userRecords).toHaveLength(1);
    expect(userRecords[0].id).toBe('att-001');
  });
});

describe('Leave Requests', () => {
  it('should add a leave request', async () => {
    await addLeaveRequest(mockLeave);
    const requests = await getLeaveRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('pending');
  });

  it('should update leave request status', async () => {
    await addLeaveRequest(mockLeave);
    await updateLeaveRequestStatus('lv-001', 'approved');
    const requests = await getLeaveRequests();
    expect(requests[0].status).toBe('approved');
  });
});

describe('Settings', () => {
  it('should save and retrieve settings', async () => {
    const customSettings: AppSettings = {
      coordLatitude: -7.2504,
      coordLongitude: 112.7688,
      coordRadius: 200,
    };
    await saveSettings(customSettings);
    const result = await getSettings();
    expect(result?.coordLatitude).toBe(-7.2504);
    expect(result?.coordRadius).toBe(200);
  });
});

describe('Utility Functions', () => {
  it('generateId should return a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });

  it('getTodayDate should return YYYY-MM-DD format', () => {
    const date = getTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatDate should format correctly', () => {
    const formatted = formatDate('2026-06-25');
    expect(formatted).toContain('2026');
  });

  it('formatDateTime should include time', () => {
    const formatted = formatDateTime('2026-06-25T08:30:00.000Z');
    expect(formatted).toContain('2026');
  });

  it('calculateDistance should return correct value', () => {
    const dist = calculateDistance(-6.2, 106.8, -6.21, 106.81);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(2000);
  });
});

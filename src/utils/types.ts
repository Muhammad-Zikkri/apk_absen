export type UserRole = 'admin' | 'karyawan';

export type AttendanceType = 'Masuk' | 'Pulang';

export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestType = 'izin' | 'sakit';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  type: AttendanceType;
  timestamp: string;
  date: string;
  latitude: number;
  longitude: number;
  photoUri?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: RequestType;
  reason: string;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  createdAt: string;
}

export interface AppSettings {
  coordLatitude: number;
  coordLongitude: number;
  coordRadius: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  coordLatitude: -6.2088,
  coordLongitude: 106.8456,
  coordRadius: 100,
};

export type FilterPeriod = 'harian' | 'bulanan' | 'tahunan';

export const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  name: 'Administrator',
  email: 'admin@inventaris.com',
  password: 'admin123',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

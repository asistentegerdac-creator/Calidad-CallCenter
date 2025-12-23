import { Complaint, ComplaintStatus, DailyStat, User } from '../types';

const API_BASE = 'http://192.168.99.180:3008/api';

export const dbService = {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.ok;
    } catch { return false; }
  },

  // USUARIOS
  async fetchUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE}/users`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async saveUser(user: User): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return response.ok;
    } catch { return false; }
  },

  async updateUserRole(id: string, role: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      return response.ok;
    } catch { return false; }
  },

  // INCIDENCIAS
  async fetchComplaints(start?: string, end?: string): Promise<Complaint[]> {
    try {
      let url = `${API_BASE}/complaints`;
      if (start && end) url += `?start=${start}&end=${end}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      return await response.json();
    } catch { return []; }
  },

  async saveComplaint(complaint: Complaint): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
      });
      return response.ok;
    } catch { return false; }
  },

  async updateComplaint(id: string, status: ComplaintStatus, managementResponse: string, resolvedBy: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, managementResponse, resolvedBy })
      });
      return response.ok;
    } catch { return false; }
  },

  // MANTENIMIENTO
  async clearData(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/clear-data`, { method: 'DELETE' });
      return response.ok;
    } catch { return false; }
  },

  // ESTADISTICAS
  async fetchDailyStats(): Promise<DailyStat[]> {
    try {
      const response = await fetch(`${API_BASE}/daily-stats`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async saveDailyStat(stat: DailyStat): Promise<void> {
    try {
      await fetch(`${API_BASE}/daily-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stat)
      });
    } catch {}
  }
};
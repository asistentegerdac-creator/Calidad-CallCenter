
import { Complaint, ComplaintStatus, DailyStat, User } from '../types';

// Detectamos la IP actual para asegurar conexión en red local
const API_BASE = `http://${window.location.hostname}:3008/api`;

export const dbService = {
  async checkHealth(): Promise<{ connected: boolean; message?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/health`, { 
        method: 'GET',
        cache: 'no-store'
      });
      if (resp.ok) return await resp.json();
      return { connected: false, message: 'Fallo de respuesta servidor' };
    } catch (e) {
      return { connected: false, message: 'Backend no accesible' };
    }
  },

  async testConnection(config: any): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) return { success: true };
      const err = await response.json();
      return { success: false, message: err.error || 'Error desconocido' };
    } catch (e) { 
      return { success: false, message: 'Error de red (Puerto 3008)' }; 
    }
  },

  async fetchUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE}/users`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async saveUser(user: User): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },

  async fetchComplaints(start?: string, end?: string): Promise<Complaint[]> {
    try {
      let url = `${API_BASE}/complaints`;
      if (start && end) url += `?start=${start}&end=${end}`;
      const response = await fetch(url);
      return response.ok ? await response.json() : [];
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

  async fetchDailyStats(): Promise<DailyStat[]> {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async saveDailyStat(stat: DailyStat): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stat)
      });
      return response.ok;
    } catch { return false; }
  }
};

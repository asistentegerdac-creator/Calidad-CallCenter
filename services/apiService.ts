
import { Complaint, ComplaintStatus, DailyStat, User } from '../types';

const API_BASE = 'http://192.168.99.180:3008/api';

export const dbService = {
  // Verifica si el servidor responde Y si la DB está conectada
  async checkHealth(): Promise<{ connected: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) return await response.json();
      return { connected: false, message: 'Servidor no responde correctamente' };
    } catch (e) {
      return { connected: false, message: 'No se puede contactar al servidor' };
    }
  },

  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.ok;
    } catch (e) { 
      return false; 
    }
  },

  async repairDatabase(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/repair-db`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch { return false; }
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
      if (response.ok) return await response.json();
      const err = await response.json();
      throw new Error(err.message || 'Error al guardar usuario');
    } catch (e: any) { 
      console.error(e.message);
      return null; 
    }
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
  },

  async clearData(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/clear-data`, { method: 'DELETE' });
      return response.ok;
    } catch { return false; }
  }
};

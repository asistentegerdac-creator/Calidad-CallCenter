
import { Complaint, ComplaintStatus, DailyStat, User } from '../types';

const API_BASE = `http://${window.location.hostname}:3008/api`;

export const dbService = {
  // Verifica el estado del servidor y de la conexión a Postgres simultáneamente
  async checkHealth(): Promise<{ connected: boolean; status: string; message?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) return await response.json();
      return { connected: false, status: 'error', message: 'Servidor responde con error' };
    } catch (e: any) {
      return { connected: false, status: 'offline', message: 'Backend fuera de línea' };
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
    } catch (e: any) { 
      return { success: false, message: 'No se pudo contactar con el backend en el puerto 3008' }; 
    }
  },

  async fetchUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (response.status === 503) throw new Error('DB_OFFLINE');
      return response.ok ? await response.json() : [];
    } catch (e) { 
      console.warn("Error fetching users:", e);
      return []; 
    }
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
      throw new Error(err.message || 'Error al grabar');
    } catch (e: any) { 
      console.error("Save User Fail:", e.message);
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
  }
};

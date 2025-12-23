
import { Complaint, ComplaintStatus, DailyStat, User } from '../types';

const API_BASE = 'http://192.168.99.180:3008/api';

const getStoredConfig = () => {
  const saved = localStorage.getItem('dac_db_config');
  return saved ? JSON.parse(saved) : null;
};

// Wrapper para manejar reconexión automática si el servidor responde con 503
async function fetchWithRetry(url: string, options: any = {}): Promise<Response> {
  let response = await fetch(url, options);
  
  if (response.status === 503) {
    console.warn("Nodo Central reiniciado. Intentando auto-vincular...");
    const config = getStoredConfig();
    if (config) {
      const rebind = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (rebind.ok) {
        console.log("Auto-vínculo exitoso. Reintentando petición original...");
        response = await fetch(url, options);
      }
    }
  }
  return response;
}

export const dbService = {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        localStorage.setItem('dac_db_config', JSON.stringify(config));
        return true;
      }
      return false;
    } catch (e) { 
      return false; 
    }
  },

  async repairDatabase(): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/repair-db`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (e) {
      return false; 
    }
  },

  async fetchUsers(): Promise<User[]> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/users`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },

  async saveUser(user: User): Promise<User | null> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },

  async fetchComplaints(start?: string, end?: string): Promise<Complaint[]> {
    try {
      let url = `${API_BASE}/complaints`;
      if (start && end) url += `?start=${start}&end=${end}`;
      const response = await fetchWithRetry(url);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async saveComplaint(complaint: Complaint): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
      });
      return response.ok;
    } catch { return false; }
  },

  async updateComplaint(id: string, status: ComplaintStatus, managementResponse: string, resolvedBy: string): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, managementResponse, resolvedBy })
      });
      return response.ok;
    } catch { return false; }
  },

  // Fix: Implementation of missing fetchDailyStats for Dashboard
  async fetchDailyStats(): Promise<DailyStat[]> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/stats`);
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  // Fix: Implementation of missing saveDailyStat for Dashboard
  async saveDailyStat(stat: DailyStat): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stat)
      });
      return response.ok;
    } catch { return false; }
  },

  async clearData(): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/clear-data`, { method: 'DELETE' });
      return response.ok;
    } catch { return false; }
  }
};

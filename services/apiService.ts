
import { Complaint, ComplaintStatus, DailyStat, User, AreaMapping } from '../types';

const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_BASE = `http://${hostname}:3008/api`;

export const dbService = {
  async checkHealth(): Promise<{ connected: boolean; message?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/health`);
      if (resp.ok) return await resp.json();
      return { connected: false, message: 'Backend desconectado' };
    } catch { return { connected: false }; }
  },

  async testConnection(config: any) {
    try {
      const r = await fetch(`${API_BASE}/test-db`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return { success: r.ok };
    } catch { return { success: false }; }
  },

  // --- MÉTODOS CATÁLOGOS MAESTROS ---
  async fetchAreas(): Promise<string[]> {
    try {
      const r = await fetch(`${API_BASE}/catalog/areas`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveArea(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/areas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch {}
  },

  async deleteArea(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/areas/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  async fetchSpecialties(): Promise<string[]> {
    try {
      const r = await fetch(`${API_BASE}/catalog/specialties`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveSpecialty(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/specialties`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch {}
  },

  async deleteSpecialty(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/specialties/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  // --- MÉTODOS CONFIGURACIÓN JEFATURAS ---
  async fetchAreasConfig(): Promise<AreaMapping[]> {
    try {
      const r = await fetch(`${API_BASE}/areas-config`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveAreaConfig(mapping: AreaMapping) {
    try {
      await fetch(`${API_BASE}/areas-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
    } catch {}
  },

  async deleteAreaConfig(areaName: string) {
    try {
      await fetch(`${API_BASE}/areas-config/${encodeURIComponent(areaName)}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  // --- MÉTODOS USUARIOS ---
  async fetchUsers(): Promise<User[]> {
    try {
      const r = await fetch(`${API_BASE}/users`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveUser(u: User): Promise<User | null> {
    const r = await fetch(`${API_BASE}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u)
    });
    return r.ok ? await r.json() : null;
  },

  async deleteUser(userId: string) {
    try {
      await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  async login(username: string, password: string): Promise<User | null> {
    const r = await fetch(`${API_BASE}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return r.ok ? await r.json() : null;
  },

  // --- MÉTODOS INCIDENCIAS ---
  async fetchComplaints(): Promise<Complaint[]> {
    try {
      const r = await fetch(`${API_BASE}/complaints`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveComplaint(c: Complaint): Promise<boolean> {
    const r = await fetch(`${API_BASE}/complaints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    });
    return r.ok;
  },

  async deleteComplaint(id: string): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/complaints/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return r.ok;
    } catch { return false; }
  },

  async updateComplaint(id: string, status: ComplaintStatus, managementResponse: string, resolvedBy: string): Promise<boolean> {
    const r = await fetch(`${API_BASE}/complaints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, managementResponse, resolvedBy })
    });
    return r.ok;
  },

  // --- MÉTODOS ESTADÍSTICAS ---
  async fetchDailyStats(): Promise<DailyStat[]> {
    const r = await fetch(`${API_BASE}/stats`);
    return r.ok ? await r.json() : [];
  },

  async saveDailyStat(s: DailyStat): Promise<boolean> {
    const r = await fetch(`${API_BASE}/stats`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    return r.ok;
  }
};


import { Complaint, DailyStat, User, AreaMapping, NoCallPatient } from '../types';

const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_BASE = `http://${hostname}:3008/api`;

export const dbService = {
  async checkHealth(): Promise<{ connected: boolean; message?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/health`);
      if (resp.ok) return await resp.json();
      return { connected: false, message: 'Nodo no responde' };
    } catch { return { connected: false, message: 'Error de red' }; }
  },

  async initDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      const r = await fetch(`${API_BASE}/init-db`, { method: 'POST' });
      return await r.json();
    } catch { return { success: false, message: 'Fallo al comunicar con el Nodo' }; }
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      const r = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (r.ok) return await r.json();
      return null;
    } catch { return null; }
  },

  async fetchUsers(): Promise<User[]> {
    try {
      const r = await fetch(`${API_BASE}/users`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveUser(u: User): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      });
      return r.ok;
    } catch { return false; }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      return r.ok;
    } catch { return false; }
  },

  async testConnection(config: any) {
    try {
      const r = await fetch(`${API_BASE}/test-db`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return { success: r.ok };
    } catch { return { success: false }; }
  },

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

  async deleteAreaCatalog(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/areas/${encodeURIComponent(name)}`, { method: 'DELETE' });
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

  async deleteSpecialtyCatalog(name: string) {
    try {
      await fetch(`${API_BASE}/catalog/specialties/${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch {}
  },

  async fetchAreasConfig(): Promise<AreaMapping[]> {
    try {
      const r = await fetch(`${API_BASE}/areas-config`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveAreaConfig(mapping: AreaMapping) {
    try {
      await fetch(`${API_BASE}/areas-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
    } catch {}
  },

  async deleteAreaConfig(areaName: string): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/areas-config/${encodeURIComponent(areaName)}`, { method: 'DELETE' });
      return r.ok;
    } catch { return false; }
  },

  async fetchComplaints(): Promise<Complaint[]> {
    try {
      const r = await fetch(`${API_BASE}/complaints`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveComplaint(c: Complaint): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/complaints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
      return r.ok;
    } catch { return false; }
  },

  async fetchDailyStats(): Promise<DailyStat[]> {
    try {
      const r = await fetch(`${API_BASE}/stats`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveDailyStat(s: DailyStat): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/stats`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: s.date,
          patients_attended: Number(s.patients_attended),
          patients_called: Number(s.patients_called),
          calls_unanswered: Number(s.calls_unanswered)
        })
      });
      return r.ok;
    } catch { return false; }
  },

  async fetchNoCallList(): Promise<NoCallPatient[]> {
    try {
      const r = await fetch(`${API_BASE}/nocall`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },

  async saveNoCallPatient(p: NoCallPatient): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/nocall`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      return r.ok;
    } catch { return false; }
  },

  async deleteNoCallPatient(id: string): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/nocall/${id}`, { method: 'DELETE' });
      return r.ok;
    } catch { return false; }
  }
};

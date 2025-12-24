
import { Complaint, ComplaintStatus, DailyStat, User, AreaMapping } from '../types';

const API_BASE = `http://${window.location.hostname}:3008/api`;

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

  async fetchUsers(): Promise<User[]> {
    const r = await fetch(`${API_BASE}/users`);
    return r.ok ? await r.json() : [];
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

  async fetchComplaints(start?: string, end?: string): Promise<Complaint[]> {
    let url = `${API_BASE}/complaints`;
    const r = await fetch(url);
    return r.ok ? await r.json() : [];
  },

  async saveComplaint(c: Complaint): Promise<boolean> {
    const r = await fetch(`${API_BASE}/complaints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    });
    return r.ok;
  },

  async updateComplaint(id: string, status: ComplaintStatus, managementResponse: string, resolvedBy: string): Promise<boolean> {
    const r = await fetch(`${API_BASE}/complaints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, managementResponse, resolvedBy })
    });
    return r.ok;
  },

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

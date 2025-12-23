import { Complaint, ComplaintStatus } from '../types';

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

  async fetchComplaints(): Promise<Complaint[]> {
    try {
      const response = await fetch(`${API_BASE}/complaints`);
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

  async bulkSync(complaints: Complaint[]): Promise<{success: boolean, count: number}> {
    try {
      const response = await fetch(`${API_BASE}/complaints/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaints })
      });
      return await response.json();
    } catch { return { success: false, count: 0 }; }
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

  async syncStructure(type: 'area' | 'specialty', name: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/sync-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });
    } catch (e) { console.error('Sync error:', e); }
  }
};
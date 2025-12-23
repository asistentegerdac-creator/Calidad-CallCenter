import { Complaint, ComplaintStatus } from '../types';

// En producción, esto apuntaría a tu servidor Node.js
const API_BASE = 'http://localhost:3000/api';

export const dbService = {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async fetchComplaints(): Promise<Complaint[]> {
    try {
      const response = await fetch(`${API_BASE}/complaints`);
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      return [];
    }
  },

  async saveComplaint(complaint: Complaint): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async syncStructure(type: 'area' | 'specialty', name: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/sync-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });
    } catch (e) {
      console.error('Sync error:', e);
    }
  }
};
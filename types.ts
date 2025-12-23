export enum ComplaintStatus {
  PENDIENTE = 'Pendiente',
  PROCESO = 'En Proceso',
  RESUELTO = 'Resuelto'
}

export enum Priority {
  BAJA = 'Baja',
  MEDIA = 'Media',
  ALTA = 'Alta',
  CRITICA = 'Crítica'
}

export interface Complaint {
  id: string;
  date: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  specialty: string;
  area: string;
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  satisfaction: number; // 1-5
  sentiment?: string;
  suggestedResponse?: string;
  managementResponse?: string;
  resolvedBy?: string; // ID o nombre del admin que resolvió
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'agent';
}

export type View = 'dashboard' | 'complaints' | 'reports' | 'settings';
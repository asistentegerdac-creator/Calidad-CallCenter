
export enum ComplaintStatus {
  PENDIENTE = 'Pendiente',
  PROCESO = 'En Proceso',
  RESUELTO = 'Resuelto',
  CERRADO = 'Cerrado'
}

export enum Priority {
  BAJA = 'Baja',
  MEDIA = 'Media',
  ALTA = 'Alta',
  CRITICA = 'Crítica'
}

export interface ResponseHistoryEntry {
  text: string;
  user: string;
  timestamp: string;
  type: 'manager' | 'auditor';
}

export interface Complaint {
  id: string;
  date: string;
  patientName: string;
  patientPhone: string;
  doctorName?: string;
  specialty: string;
  area: string;
  managerName?: string; 
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  satisfaction: number;
  sentiment?: string;
  suggestedResponse?: string;
  managementResponse?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  registeredAt?: string;
  isObserved?: boolean;
  responseHistory?: ResponseHistoryEntry[];
  dimension: string;
  evidenceImages?: string[];
}

export interface AreaMapping {
  areaName: string;
  managerName: string;
}

export interface DailyStat {
  id?: string;
  date: string;
  patients_attended: number;
  patients_called: number;
  calls_unanswered: number;
}

export interface NoCallPatient {
  id: string;
  patientName: string;
  patientPhone: string;
  reason?: string;
  registeredAt: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'agent' | 'auditor';
  permissions: string[];
}

export type View = 'dashboard' | 'incidences' | 'new-incidence' | 'reports' | 'analytics' | 'settings' | 'no-call';

export const DIMENSIONS = [
  'Fiabilidad o Confiabilidad',
  'Capacidad de Respuesta',
  'Seguridad o Aseguramiento',
  'Empatía',
  'Aspectos Tangibles',
  'Buen trato',
  'Privacidad',
  'Comunicación / Información'
];

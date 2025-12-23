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
  doctorName?: string;
  specialty: string;
  area: string;
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  satisfaction: number;
  sentiment?: string;
  suggestedResponse?: string;
  managementResponse?: string;
  resolvedBy?: string;
}

export interface DailyStat {
  id?: string;
  date: string;
  patients_attended: number;
  patients_called: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'agent';
}

export type View = 'dashboard' | 'incidences' | 'new-incidence' | 'reports' | 'settings';
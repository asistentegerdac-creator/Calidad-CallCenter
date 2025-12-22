
export enum ComplaintStatus {
  PENDIENTE = 'pendiente',
  PROCESO = 'proceso',
  RESUELTO = 'resuelto'
}

export enum Priority {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'crítica'
}

export interface Complaint {
  id: string;
  date: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  managementResponse?: string;
  area: string;
  followUpDate: string;
}

export interface CallRecord {
  id: string;
  date: string;
  totalPatients: number; // Total pacientes del día
  calledCount: number;   // Cuántos fueron llamados
  notCalledCount: number; // Cuántos quedaron sin llamar
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'staff';
}

export type View = 'new-complaint' | 'dashboard' | 'complaints' | 'calls' | 'reports';

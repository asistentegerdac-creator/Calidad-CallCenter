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
  sentiment?: string;
  suggestedResponse?: string;
  managementResponse?: string;
}

export interface CallRecord {
  id: string;
  date: string;
  totalPatients: number;
  calledCount: number;
  notCalledCount: number;
  agent: string;
}

export interface PhoneConfig {
  socketUrl: string;
  sipDomain: string;
  sipUser: string;
  sipPass: string;
  status: 'offline' | 'online' | 'connecting';
}

export interface IPCall {
  id: string;
  number: string;
  status: 'ringing' | 'active' | 'missed' | 'ended';
  timestamp: string;
  duration: number;
  direction: 'incoming' | 'outgoing';
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'agent';
}

export type View = 'dashboard' | 'complaints' | 'crm' | 'reports' | 'settings';
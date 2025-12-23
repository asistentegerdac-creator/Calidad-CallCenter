import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Complaint, ComplaintStatus, User } from '../types';
import { ComplaintList } from './ComplaintList';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void; 
}

export const Dashboard: React.FC<Props> = ({ complaints, areas, currentUser, onUpdate }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const patientsToday = complaints.filter(c => c.date === today).length;
    const pending = complaints.filter(c => c.status !== ComplaintStatus.RESUELTO).length;
    const resolved = complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    
    const promoters = complaints.filter(c => c.satisfaction === 5).length;
    const detractors = complaints.filter(c => c.satisfaction <= 3).length;
    const nps = complaints.length > 0 ? Math.round(((promoters - detractors) / complaints.length) * 100) : 0;

    const monthlyData = complaints.reduce((acc: any, c) => {
      const month = new Date(c.date).toLocaleString('es-ES', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const trend = Object.keys(monthlyData).map(m => ({ name: m, total: monthlyData[m] }));

    return { patientsToday, pending, resolved, nps, trend };
  }, [complaints]);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-8 bg-white border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pacientes del Día</p>
          <h2 className="text-4xl font-black text-blue-600">{stats.patientsToday}</h2>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Registrados en las últimas 24h</p>
        </div>

        <div className="glass-card p-8 bg-white border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incidencias Pendientes</p>
          <h2 className="text-4xl font-black text-rose-600">{stats.pending}</h2>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Casos sin resolución definitiva</p>
        </div>

        <div className="glass-card p-8 bg-white border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reclamos Atendidos</p>
          <h2 className="text-4xl font-black text-emerald-600">{stats.resolved}</h2>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Total de cierres satisfactorios</p>
        </div>

        <div className="glass-card p-8 bg-slate-900 border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Índice NPS Actual</p>
          <h2 className="text-4xl font-black text-white">{stats.nps} pts</h2>
          <p className="text-[9px] font-medium text-slate-500 mt-2">Satisfacción del paciente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card p-10 bg-white col-span-2 shadow-sm border border-orange-50">
          <h4 className="text-xl font-black text-slate-900 mb-10">Evolución de Reclamos</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={4} fill="#fef3c7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 bg-white border border-orange-50">
          <h4 className="text-xl font-black text-slate-900 mb-8">Estado por Áreas</h4>
          <div className="space-y-6">
            {areas.slice(0, 5).map(a => {
              const count = complaints.filter(c => c.area === a).length;
              return (
                <div key={a} className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-xs font-bold text-slate-500">{a}</span>
                  <span className="text-xs font-black text-amber-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-orange-50">
        <h3 className="text-3xl font-black tracking-tight text-slate-900 mb-10">Incidencias Recientes</h3>
        <ComplaintList complaints={complaints} currentUser={currentUser} onUpdate={onUpdate} />
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Complaint, CallRecord, ComplaintStatus, Priority } from '../types';

interface DashboardProps {
  complaints: Complaint[];
  calls: CallRecord[];
}

const DAC_COLORS = ['#3b82f6', '#0ea5e9', '#6366f1', '#bae6fd', '#020617'];

export const Dashboard: React.FC<DashboardProps> = ({ complaints, calls }) => {
  const stats = useMemo(() => {
    const totalComplaints = complaints.length;
    const resolved = complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const critical = complaints.filter(c => c.priority === Priority.CRITICA).length;
    
    const totalPats = calls.reduce((acc, curr) => acc + curr.totalPatients, 0);
    const totalCalled = calls.reduce((acc, curr) => acc + curr.calledCount, 0);
    
    return {
      totalComplaints,
      critical,
      resolutionRate: totalComplaints ? ((resolved / totalComplaints) * 100).toFixed(0) : 0,
      contactRate: totalPats ? ((totalCalled / totalPats) * 100).toFixed(0) : 0
    };
  }, [complaints, calls]);

  const byPriority = useMemo(() => [
    { name: 'Baja', value: complaints.filter(c => c.priority === Priority.BAJA).length },
    { name: 'Media', value: complaints.filter(c => c.priority === Priority.MEDIA).length },
    { name: 'Alta', value: complaints.filter(c => c.priority === Priority.ALTA).length },
    { name: 'Crítica', value: complaints.filter(c => c.priority === Priority.CRITICA).length },
  ], [complaints]);

  const hasData = complaints.length > 0 || calls.length > 0;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard title="Total Casos DAC" value={stats.totalComplaints} type="primary" icon="💿" />
        <MetricCard title="Efectividad Contacto" value={`${stats.contactRate}%`} type="success" icon="⚡" />
        <MetricCard title="Nivel Resolutivo" value={`${stats.resolutionRate}%`} type="info" icon="💎" />
        <MetricCard title="Alertas Críticas" value={stats.critical} type="danger" icon="🚨" />
      </div>

      {!hasData ? (
        <div className="bg-white p-20 rounded-[60px] border-2 border-dashed border-slate-200 text-center">
           <div className="text-7xl mb-8 opacity-20">📡</div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Esperando Recepción de Datos</h3>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Comience a registrar quejas o jornadas de llamadas para visualizar el análisis</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white p-12 rounded-[50px] shadow-2xl shadow-slate-100 border border-slate-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-6xl font-black italic">ANALYTICS</div>
             <h3 className="text-2xl font-black text-slate-900 mb-10 tracking-tighter">Segmentación por Prioridad</h3>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPriority}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[15, 15, 0, 0]} barSize={45} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-slate-900 p-12 rounded-[50px] shadow-2xl border border-slate-800 relative group overflow-hidden">
             <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <h3 className="text-2xl font-black text-white mb-10 tracking-tighter">Flujo de Contacto DAC</h3>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calls.slice(-7)}>
                    <defs>
                      <linearGradient id="dacGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#020617', color: 'white' }} />
                    <Area type="monotone" dataKey="calledCount" name="Llamados" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#dacGrad)" />
                    <Area type="monotone" dataKey="totalPatients" name="Pacientes" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, type, icon }: { title: string, value: string | number, type: string, icon: string }) => {
  const styles: Record<string, string> = {
    primary: 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20',
    success: 'bg-white text-slate-900 border border-slate-100 shadow-xl shadow-slate-200/50',
    info: 'bg-slate-800 text-white shadow-2xl shadow-slate-900/20',
    danger: 'bg-rose-600 text-white shadow-2xl shadow-rose-600/20'
  };

  return (
    <div className={`${styles[type]} p-8 rounded-[40px] flex flex-col items-center text-center transition-all hover:-translate-y-2 duration-500`}>
      <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner border border-white/10">{icon}</div>
      <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${type === 'success' ? 'text-slate-400' : 'text-white/60'}`}>{title}</p>
      <p className="text-4xl font-black tracking-tighter">{value}</p>
    </div>
  );
};

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
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
    const total = complaints.length || 1;
    const satisfied = complaints.filter(c => c.satisfaction >= 4).length;
    const unsatisfied = complaints.filter(c => c.satisfaction <= 2).length;
    const promoters = complaints.filter(c => c.satisfaction === 5).length;
    const detractors = complaints.filter(c => c.satisfaction <= 3).length;
    
    const nps = Math.round(((promoters - detractors) / total) * 100);
    const csat = (complaints.reduce((acc, c) => acc + c.satisfaction, 0) / total).toFixed(1);
    const resRate = Math.round((complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length / total) * 100);

    const monthlyData = complaints.reduce((acc: any, c) => {
      const month = new Date(c.date).toLocaleString('es-ES', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const trend = Object.keys(monthlyData).map(m => ({ name: m, total: monthlyData[m] }));

    return { satisfied, unsatisfied, nps, csat, resRate, trend };
  }, [complaints]);

  return (
    <div className="space-y-12">
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-8 bg-white border border-orange-100 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Promoter Score (NPS)</p>
          <div className="flex items-end gap-3">
             <h2 className={`text-4xl font-black ${stats.nps > 30 ? 'text-emerald-500' : stats.nps > 0 ? 'text-amber-500' : 'text-rose-500'}`}>{stats.nps}</h2>
             <span className="text-[10px] font-bold text-slate-400 mb-2">PUNTOS</span>
          </div>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Lealtad del paciente institucional</p>
        </div>

        <div className="glass-card p-8 bg-white border border-orange-100 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satisfacción (CSAT)</p>
          <div className="flex items-end gap-3">
             <h2 className="text-4xl font-black text-indigo-600">{stats.csat}</h2>
             <span className="text-[10px] font-bold text-slate-400 mb-2">/ 5.0</span>
          </div>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Promedio de calidad percibida</p>
        </div>

        <div className="glass-card p-8 bg-white border border-orange-100 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa de Resolución</p>
          <div className="flex items-end gap-3">
             <h2 className="text-4xl font-black text-emerald-600">{stats.resRate}%</h2>
          </div>
          <p className="text-[9px] font-medium text-slate-400 mt-2">Eficiencia en gestión de auditoría</p>
        </div>

        <div className="glass-card p-8 bg-slate-900 border-slate-800 relative group overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Auditorías</p>
          <h2 className="text-4xl font-black text-white">{complaints.length}</h2>
          <p className="text-[9px] font-medium text-slate-500 mt-2">Expedientes registrados hoy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="glass-card p-10 bg-white col-span-2 shadow-sm border border-orange-50">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <span className="text-2xl">📈</span> Tendencia de Incidencias
            </h4>
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volumen Mensual</span>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Areas Breakdown */}
        <div className="glass-card p-10 bg-white shadow-sm border border-orange-50 overflow-hidden">
          <h4 className="text-xl font-black text-slate-900 mb-8">Críticos por Área</h4>
          <div className="space-y-6">
            {areas.slice(0, 5).map(a => {
              const count = complaints.filter(c => c.area === a).length;
              const percent = Math.round((count / (complaints.length || 1)) * 100);
              return (
                <div key={a} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">{a}</span>
                    <span className="text-amber-600">{count}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Embedded Historical Audit List */}
      <div className="pt-10 border-t border-orange-50">
        <div className="flex justify-between items-center mb-10">
           <h3 className="text-3xl font-black tracking-tight text-slate-900">Histórico de Auditoría <span className="text-amber-500">Control DAC</span></h3>
           <div className="flex gap-4">
              <span className="px-5 py-2 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">Tiempo Real</span>
           </div>
        </div>
        <ComplaintList complaints={complaints} currentUser={currentUser} onUpdate={onUpdate} />
      </div>
    </div>
  );
};
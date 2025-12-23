import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; areas: string[]; }

export const Dashboard: React.FC<Props> = ({ complaints, areas }) => {
  const stats = useMemo(() => {
    const satisfied = complaints.filter(c => c.satisfaction >= 4).length;
    const unsatisfied = complaints.filter(c => c.satisfaction <= 2).length;
    const pending = complaints.filter(c => c.status !== ComplaintStatus.RESUELTO).length;
    
    // Calcular área con más quejas
    const areaCounts = areas.map(a => ({ name: a, count: complaints.filter(c => c.area === a).length }));
    const areaMax = [...areaCounts].sort((a,b) => b.count - a.count)[0];
    const areaMin = [...areaCounts].sort((a,b) => a.count - b.count)[0];

    // Jefe/Auditor con más pendientes atendidos
    const admins = Array.from(new Set(complaints.filter(c => c.resolvedBy).map(c => c.resolvedBy)));
    const adminStats = admins.map(name => ({
      name,
      count: complaints.filter(c => c.resolvedBy === name && c.status === ComplaintStatus.RESUELTO).length
    })).sort((a,b) => b.count - a.count);

    return { satisfied, unsatisfied, pending, areaMax, areaMin, adminStats };
  }, [complaints, areas]);

  const WARM_COLORS = ['#f59e0b', '#fbbf24', '#d97706', '#fcd34d', '#78350f'];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Pacientes Atendidos', val: complaints.length, icon: '🏥', color: 'text-slate-900' },
          { label: 'Satisfechos (4-5★)', val: stats.satisfied, icon: '😊', color: 'text-emerald-600' },
          { label: 'Insatisfechos (1-2★)', val: stats.unsatisfied, icon: '☹️', color: 'text-rose-600' },
          { label: 'Sin Atender', val: stats.pending, icon: '⏳', color: 'text-orange-600' }
        ].map((item, i) => (
          <div key={i} className="glass-card p-8 bg-white border border-orange-50 relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 text-6xl opacity-10">{item.icon}</div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
            <p className={`text-3xl font-black ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="glass-card p-10 bg-white col-span-2">
            <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <span className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">🏢</span>
              Análisis por Departamento
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areas.map(a => ({ name: a, total: complaints.filter(c => c.area === a).length }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                  <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={40}>
                    {areas.map((_, i) => <Cell key={i} fill={WARM_COLORS[i % WARM_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="space-y-6">
            <div className="glass-card p-8 bg-rose-50/50 border-rose-100 border-2">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Área más crítica</p>
              <h5 className="text-xl font-black text-rose-700">{stats.areaMax?.count > 0 ? stats.areaMax.name : 'Ninguna'}</h5>
              <p className="text-[9px] font-bold text-rose-400 mt-2">{stats.areaMax?.count || 0} Incidencias totales</p>
            </div>
            <div className="glass-card p-8 bg-emerald-50/50 border-emerald-100 border-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Área con menos quejas</p>
              <h5 className="text-xl font-black text-emerald-700">{stats.areaMin?.name || 'N/A'}</h5>
              <p className="text-[9px] font-bold text-emerald-400 mt-2">Eficiencia en calidad</p>
            </div>
            <div className="glass-card p-8 bg-amber-50/50 border-amber-100 border-2">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Ranking de Gestión (Auditor)</p>
              <div className="space-y-3">
                {stats.adminStats.slice(0, 3).map((admin, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100">
                    <span className="text-xs font-black text-slate-700">{admin.name}</span>
                    <span className="bg-amber-500 text-white text-[9px] px-2 py-1 rounded-lg font-black">{admin.count} RESUELTOS</span>
                  </div>
                ))}
                {stats.adminStats.length === 0 && <p className="text-[10px] italic text-amber-400">Sin resoluciones registradas</p>}
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};
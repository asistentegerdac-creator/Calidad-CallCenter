
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; areas: string[]; }

export const Dashboard: React.FC<Props> = ({ complaints, areas }) => {
  const areaData = useMemo(() => {
    return areas.map(area => ({
      name: area,
      value: complaints.filter(c => c.area === area).length
    })).sort((a,b) => b.value - a.value);
  }, [complaints, areas]);

  const priorityData = useMemo(() => {
    const priorities = ['Baja', 'Media', 'Alta', 'Crítica'];
    return priorities.map(p => ({
      name: p,
      value: complaints.filter(c => c.priority === p).length
    }));
  }, [complaints]);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      resolved: complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length,
      pending: complaints.filter(c => c.status !== ComplaintStatus.RESUELTO).length
    };
  }, [complaints]);

  const WARM_COLORS = ['#f59e0b', '#fbbf24', '#d97706', '#fcd34d', '#78350f'];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { label: 'Auditorías Totales', val: stats.total, color: 'text-amber-600', icon: '📈' },
          { label: 'Casos Resueltos', val: stats.resolved, color: 'text-emerald-600', icon: '✨' },
          { label: 'Pendientes Críticos', val: complaints.filter(c => c.priority === 'Crítica' && c.status !== ComplaintStatus.RESUELTO).length, color: 'text-rose-600', icon: '🔥' }
        ].map((item, i) => (
          <div key={i} className="glass-card p-10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 group-hover:scale-125 transition-transform duration-500">{item.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{item.label}</p>
            <p className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-12">
          <div className="mb-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Carga por Departamento</h3>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">VOLUMEN DE INCIDENCIAS</p>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fff1e6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#fff9f2'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                  {areaData.map((_, i) => <Cell key={i} fill={WARM_COLORS[i % WARM_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-12">
          <div className="mb-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Priorización de Casos</h3>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">DISTRIBUCIÓN DE GRAVEDAD</p>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} innerRadius={80} outerRadius={140} paddingAngle={5} dataKey="value">
                  {priorityData.map((_, i) => <Cell key={i} fill={WARM_COLORS[i % WARM_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area 
} from 'recharts';
import { Complaint, CallRecord, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; calls: CallRecord[]; areas: string[]; }

export const Dashboard: React.FC<Props> = ({ complaints, calls, areas }) => {
  const areaData = useMemo(() => {
    return areas.map(area => ({
      name: area,
      value: complaints.filter(c => c.area === area).length
    })).sort((a,b) => b.value - a.value);
  }, [complaints, areas]);

  const stats = useMemo(() => {
    const totalPats = calls.reduce((acc, c) => acc + c.totalPatients, 0);
    const totalCalled = calls.reduce((acc, c) => acc + c.calledCount, 0);
    return {
      total: complaints.length,
      resolved: complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length,
      efficiency: totalPats ? Math.round((totalCalled / totalPats) * 100) : 0
    };
  }, [complaints, calls]);

  const VIBRANT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const safeAreaData = areaData.length > 0 ? areaData : [{ name: 'Sin datos', value: 0 }];
  const chartCalls = calls.length > 0 ? [...calls].slice(-7).reverse() : [{ date: 'N/A', calledCount: 0 }];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Auditorías', val: stats.total, color: 'text-indigo-600', icon: '📈', bg: 'bg-indigo-50' },
          { label: 'Eficiencia de Contacto', val: `${stats.efficiency}%`, color: 'text-emerald-600', icon: '🎯', bg: 'bg-emerald-50' },
          { label: 'Casos Resueltos', val: stats.resolved, color: 'text-rose-600', icon: '✨', bg: 'bg-rose-50' },
          { label: 'Pendientes Críticos', val: complaints.filter(c => c.priority === 'Crítica' && c.status !== ComplaintStatus.RESUELTO).length, color: 'text-amber-600', icon: '🔥', bg: 'bg-amber-50' }
        ].map((item, i) => (
          <div key={i} className={`glass-card p-10 relative overflow-hidden group border-indigo-100`}>
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 group-hover:scale-125 transition-transform duration-500">{item.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{item.label}</p>
            <p className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.val}</p>
            <div className="w-10 h-1 bg-current opacity-20 mt-4 rounded-full"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-12">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Ranking de Inconformidades</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">VOLUMEN POR ÁREA OPERATIVA</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner border border-slate-100">🏢</div>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeAreaData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{fill: 'rgba(99, 102, 241, 0.05)'}}
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '15px'}} 
                />
                <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={45}>
                  {safeAreaData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-12">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Curva de Contactabilidad</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">TRAZABILIDAD DE LLAMADAS DIARIAS</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl shadow-inner border border-indigo-100 text-indigo-600">📡</div>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCalls}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '15px'}} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calledCount" 
                  stroke="#6366f1" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorCalls)" 
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                  activeDot={{ r: 10, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
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

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  const safeAreaData = areaData.length > 0 ? areaData : [{ name: 'Sin datos', value: 0 }];
  const chartCalls = calls.length > 0 ? [...calls].slice(-7).reverse() : [{ date: 'N/A', calledCount: 0 }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Quejas Totales', val: stats.total, color: 'text-slate-900' },
          { label: 'Eficiencia CRM', val: `${stats.efficiency}%`, color: 'text-blue-600' },
          { label: 'Tasa Resolución', val: `${stats.total ? Math.round((stats.resolved/stats.total)*100) : 0}%`, color: 'text-emerald-600' },
          { label: 'Casos Pendientes', val: complaints.filter(c => c.status === ComplaintStatus.PENDIENTE).length, color: 'text-rose-600' }
        ].map((item, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl bg-white">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-3xl font-black ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-3xl bg-white min-h-[400px]">
          <h3 className="text-lg font-black mb-6 text-slate-800">Quejas por Área Crítica</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeAreaData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                  {safeAreaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl bg-white min-h-[400px]">
          <h3 className="text-lg font-black mb-6 text-slate-800">Contactabilidad Diaria</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCalls}>
                <defs>
                  <linearGradient id="colorCall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calledCount" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCall)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
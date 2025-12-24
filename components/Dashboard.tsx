
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Complaint, ComplaintStatus, DailyStat } from '../types';
import { dbService } from '../services/apiService';

interface Props { complaints: Complaint[]; }

export const Dashboard: React.FC<Props> = ({ complaints }) => {
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [dateControl, setDateControl] = useState(new Date().toISOString().split('T')[0]);
  const [attended, setAttended] = useState(0);
  const [called, setCalled] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const stats = await dbService.fetchDailyStats();
      setDailyStats(stats);
      const todayStat = stats.find(s => s.date.includes(dateControl));
      if (todayStat) {
        setAttended(todayStat.patients_attended);
        setCalled(todayStat.patients_called);
      } else {
        setAttended(0);
        setCalled(0);
      }
    };
    fetch();
  }, [dateControl]);

  const handleSaveStats = async () => {
    await dbService.saveDailyStat({ date: dateControl, patients_attended: attended, patients_called: called });
    const stats = await dbService.fetchDailyStats();
    setDailyStats(stats);
    alert("Control diario actualizado.");
  };

  const metrics = useMemo(() => {
    const total = complaints.length || 0;
    const resolved = complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const pending = complaints.filter(c => c.status === ComplaintStatus.PENDIENTE).length;
    
    const satisfactionAvg = total > 0 ? (complaints.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : 0;
    
    // Áreas Críticas (Top 3)
    const areaCounts: any = {};
    complaints.forEach(c => areaCounts[c.area] = (areaCounts[c.area] || 0) + 1);
    const criticalAreas = Object.entries(areaCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);

    return { total, resolved, pending, satisfactionAvg, criticalAreas };
  }, [complaints]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="glass-card p-10 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-widest">Indicadores DAC</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">SISTEMA DE GESTIÓN DE CALIDAD DAC</p>
          </div>
          <div className="bg-slate-800 p-2 rounded-2xl flex items-center gap-4">
             <span className="text-[10px] font-black uppercase text-slate-500 ml-4">Fecha Control:</span>
             <input type="date" className="bg-slate-700 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none text-white" value={dateControl} onChange={e => setDateControl(e.target.value)} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pacientes Atendidos</label>
            <input type="number" className="w-full bg-white/5 rounded-2xl p-5 text-2xl font-black outline-none border border-white/10" value={attended} onChange={e => setAttended(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pacientes Llamados</label>
            <input type="number" className="w-full bg-white/5 rounded-2xl p-5 text-2xl font-black outline-none border border-white/10" value={called} onChange={e => setCalled(parseInt(e.target.value) || 0)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleSaveStats} className="w-full py-6 bg-amber-500 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-white hover:text-amber-600 transition-all">Sincronizar Datos</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-8 bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satisfacción Promedio</p>
          <h2 className="text-4xl font-black text-slate-900">{metrics.satisfactionAvg} <span className="text-sm font-bold text-slate-400">/ 5.0</span></h2>
          <div className="mt-4 flex gap-1">
             {[1,2,3,4,5].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full ${Number(metrics.satisfactionAvg) >= s ? 'bg-amber-500' : 'bg-slate-100'}`}></div>)}
          </div>
        </div>
        <div className="glass-card p-8 bg-white border-l-8 border-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Casos Resueltos</p>
          <h2 className="text-4xl font-black text-emerald-600">{metrics.resolved}</h2>
        </div>
        <div className="glass-card p-8 bg-white border-l-8 border-rose-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Casos Pendientes</p>
          <h2 className="text-4xl font-black text-rose-600">{metrics.pending}</h2>
        </div>
        <div className="glass-card p-8 bg-slate-100 border-none">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Áreas Críticas (Quejas)</p>
          <div className="space-y-2">
            {metrics.criticalAreas.map(([area, count]: any) => (
              <div key={area} className="flex justify-between items-center text-[10px] font-black">
                <span className="text-slate-600 uppercase truncate max-w-[100px]">{area}</span>
                <span className="text-slate-900 bg-white px-2 py-0.5 rounded-md shadow-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px]">
          <h4 className="text-sm font-black text-slate-900 mb-10 uppercase tracking-widest">Desempeño Operativo (7 Días)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats.slice(0, 7).reverse()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={(v) => v.split('-').slice(1).join('/')} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Legend iconType="circle" />
              <Bar dataKey="patients_attended" name="Atendidos" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
              <Bar dataKey="patients_called" name="Llamados" fill="#f59e0b" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px]">
          <h4 className="text-sm font-black text-slate-900 mb-10 uppercase tracking-widest">Índice Mensual de Calidad</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={complaints.slice(0, 30).reverse()}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <Tooltip />
              <Area type="monotone" dataKey="satisfaction" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

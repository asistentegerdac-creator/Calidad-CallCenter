
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
      // Fix: Use 'date' property from DailyStat interface instead of 'stat_date'
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
    alert("Estadísticas sincronizadas.");
  };

  const metrics = useMemo(() => {
    const total = complaints.length || 0;
    const resolved = complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const pending = complaints.filter(c => c.status === ComplaintStatus.PENDIENTE).length;
    const processing = complaints.filter(c => c.status === ComplaintStatus.PROCESO).length;
    
    // Comparativa satisfacción vs llamadas (Simplificado)
    const satisfactionAvg = total > 0 ? (complaints.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : 0;
    
    return { total, resolved, pending, processing, satisfactionAvg };
  }, [complaints]);

  return (
    <div className="space-y-8">
      {/* Panel de Control Diario */}
      <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest">Métricas de Gestión Operativa</h3>
            <p className="text-slate-400 text-[10px] font-bold">CONTROL DIARIO DE ATENCIÓN Y SEGUIMIENTO</p>
          </div>
          <input type="date" className="bg-slate-700 border-none rounded-xl p-3 text-xs font-bold outline-none" value={dateControl} onChange={e => setDateControl(e.target.value)} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Pacientes Atendidos</label>
            <div className="flex items-center gap-4">
              <input type="number" className="flex-1 bg-white/10 rounded-xl p-4 text-xl font-black outline-none border border-white/5" value={attended} onChange={e => setAttended(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Pacientes Llamados</label>
            <div className="flex items-center gap-4">
              <input type="number" className="flex-1 bg-white/10 rounded-xl p-4 text-xl font-black outline-none border border-white/5" value={called} onChange={e => setCalled(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleSaveStats} className="w-full py-5 bg-amber-500 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-white hover:text-amber-600 transition-all">Sincronizar Control</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 bg-white border border-orange-100">
          <p className="text-[10px] font-black text-slate-400 uppercase">Estado Resueltos</p>
          <h2 className="text-3xl font-black text-emerald-500">{metrics.resolved}</h2>
          <div className="h-1 w-full bg-slate-50 mt-2 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{width: `${(metrics.resolved / metrics.total) * 100}%`}}></div>
          </div>
        </div>
        <div className="glass-card p-6 bg-white border border-orange-100">
          <p className="text-[10px] font-black text-slate-400 uppercase">Estado Pendientes</p>
          <h2 className="text-3xl font-black text-rose-500">{metrics.pending}</h2>
        </div>
        <div className="glass-card p-6 bg-white border border-orange-100">
          <p className="text-[10px] font-black text-slate-400 uppercase">En Proceso</p>
          <h2 className="text-3xl font-black text-amber-500">{metrics.processing}</h2>
        </div>
        <div className="glass-card p-6 bg-slate-100 border-none">
          <p className="text-[10px] font-black text-slate-500 uppercase">Calidad Percibida</p>
          <h2 className="text-3xl font-black text-slate-900">{metrics.satisfactionAvg} <span className="text-sm">/ 5</span></h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 bg-white border border-orange-50 min-h-[400px]">
          <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Llamadas vs Atendidos (Historial)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats.slice(0, 7).reverse()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              {/* Fix: Use 'date' property from DailyStat interface instead of 'stat_date' */}
              <XAxis dataKey="date" tickFormatter={(v) => v.split('T')[0].slice(5)} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="patients_attended" name="Atendidos" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="patients_called" name="Llamados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-8 bg-white border border-orange-50 min-h-[400px]">
          <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Tendencia Mensual de Incidencias</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={complaints.slice(0, 30)}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <Tooltip />
              <Area type="monotone" dataKey="satisfaction" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CallRecord } from '../types';

interface Props { calls: CallRecord[]; onAdd: (c: CallRecord) => void; }

export const CallLog: React.FC<Props> = ({ calls, onAdd }) => {
  const [total, setTotal] = useState(0);
  const [called, setCalled] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `CALL-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      totalPatients: total,
      calledCount: called,
      notCalledCount: Math.max(0, total - called),
      agent: 'Admin Central'
    });
    setTotal(0); setCalled(0);
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
      <div className="glass-card p-12 rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-slate-800">
        <h3 className="text-2xl font-black mb-8">Nueva Jornada de Contactabilidad</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Universo de Pacientes (Día)</label>
            <input type="number" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xl font-black outline-none focus:border-blue-500" value={total || ''} onChange={e => setTotal(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Pacientes Contactados</label>
            <input type="number" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xl font-black outline-none focus:border-emerald-500 text-emerald-500" value={called || ''} onChange={e => setCalled(parseInt(e.target.value) || 0)} />
          </div>
          <button className="py-6 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20">Cerrar Jornada ➔</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {calls.map(call => (
          <div key={call.id} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group hover:-translate-y-2 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-6xl group-hover:opacity-10 transition-opacity">📞</div>
            <p className="text-[10px] font-black text-slate-500 mb-6">{call.date} • {call.agent}</p>
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-4xl font-black">{call.totalPatients}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-blue-500">{call.calledCount}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Éxito</p>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${(call.calledCount/call.totalPatients)*100}%`}} />
            </div>
            <p className="text-center mt-6 text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Contactabilidad: {Math.round((call.calledCount/call.totalPatients)*100)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CallRecord } from '../types';

interface CallLogProps {
  calls: CallRecord[];
  onAddCallRecord: (record: Omit<CallRecord, 'id'>) => void;
}

export const CallLog: React.FC<CallLogProps> = ({ calls, onAddCallRecord }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    totalPatients: 0,
    calledCount: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCallRecord({
      date: formData.date,
      totalPatients: formData.totalPatients,
      calledCount: formData.calledCount,
      notCalledCount: Math.max(0, formData.totalPatients - formData.calledCount)
    });
    setShowForm(false);
    setFormData({ date: new Date().toISOString().split('T')[0], totalPatients: 0, calledCount: 0 });
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Panel de Contactabilidad</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Métricas de Alcance Diario</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-10 py-5 rounded-[25px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
        >
          {showForm ? 'Cerrar Registro' : '+ Reportar Jornada'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-12 rounded-[50px] border border-blue-100 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.1)] animate-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Reporte</label>
              <input 
                type="date" required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:border-blue-500 font-bold text-slate-800"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pacientes Visita</label>
              <input 
                type="number" required min="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:border-blue-500 font-bold text-slate-800"
                value={formData.totalPatients}
                onChange={(e) => setFormData({...formData, totalPatients: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pacientes Llamados</label>
              <input 
                type="number" required min="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:border-blue-500 font-bold text-slate-800"
                value={formData.calledCount}
                onChange={(e) => setFormData({...formData, calledCount: parseInt(e.target.value) || 0})}
              />
            </div>
            <button 
              type="submit"
              className="bg-blue-600 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all"
            >
              Publicar Log
            </button>
          </form>
        </div>
      )}

      {calls.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[60px] border-2 border-dashed border-slate-200">
           <div className="text-6xl mb-6 opacity-30">📭</div>
           <p className="text-slate-400 font-black uppercase tracking-widest">Sin registros de contacto en el historial</p>
           <button onClick={() => setShowForm(true)} className="mt-6 text-blue-600 font-bold hover:underline">Registrar mi primer jornada</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {calls.slice().reverse().map(call => (
            <div key={call.id} className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-6xl font-black italic group-hover:opacity-[0.06] transition-opacity">DAC</div>
              
              <div className="flex items-center justify-between mb-10">
                <span className="px-5 py-2 bg-slate-50 rounded-full text-slate-500 font-black text-[10px] uppercase tracking-widest border border-slate-100">{call.date}</span>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-100">📞</div>
              </div>
              
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Padrón de Pacientes</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{call.totalPatients}</span>
                </div>
                
                <div className="relative h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-200 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 shadow-lg shadow-blue-200"
                    style={{ width: `${(call.calledCount/call.totalPatients)*100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50/50 p-6 rounded-[35px] border border-slate-100">
                    <p className="text-[9px] uppercase font-black text-blue-600 tracking-widest mb-1">Éxito</p>
                    <p className="text-3xl font-black text-slate-800">{call.calledCount}</p>
                  </div>
                  <div className="bg-rose-50/50 p-6 rounded-[35px] border border-rose-100">
                    <p className="text-[9px] uppercase font-black text-rose-500 tracking-widest mb-1">Pendiente</p>
                    <p className="text-3xl font-black text-slate-800">{call.notCalledCount}</p>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-50 flex justify-center">
                   <div className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-[0.3em] shadow-xl">
                     Ratio: {((call.calledCount / call.totalPatients) * 100).toFixed(0)}%
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

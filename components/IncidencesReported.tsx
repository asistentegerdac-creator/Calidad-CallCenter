import React, { useState, useEffect, useMemo } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void;
  isOnline: boolean;
}

export const IncidencesReported: React.FC<Props> = ({ complaints: initialComplaints, currentUser, onUpdate, isOnline }) => {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selected, setSelected] = useState<Complaint | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (isOnline) {
        const data = await dbService.fetchComplaints(startDate, endDate);
        setComplaints(data);
      }
    };
    fetch();
  }, [startDate, endDate, isOnline, initialComplaints]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-orange-50 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 uppercase">Incidencias Reportadas</h2>
        <div className="flex gap-4">
          <input type="date" className="p-3 bg-slate-50 border-none rounded-xl text-xs font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="p-3 bg-slate-50 border-none rounded-xl text-xs font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {complaints.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-white border-dashed border-2">
            <p className="text-slate-400 font-black uppercase text-xs">Sin registros para el periodo seleccionado</p>
          </div>
        ) : complaints.map(c => (
          <div key={c.id} onClick={() => setSelected(c)} className="glass-card bg-white p-8 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{c.id} • {c.date}</p>
                <h4 className="text-lg font-black text-slate-900">{c.patientName}</h4>
              </div>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-500' : 'bg-amber-500'}`}>{c.priority}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{c.area}</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{c.specialty}</span>
            </div>
            <p className="text-xs text-slate-600 italic line-clamp-2">"{c.description}"</p>
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className={`text-[9px] font-black uppercase ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-500' : 'text-amber-500'}`}>{c.status}</span>
              <span className="text-[9px] font-bold text-slate-300">CLICK PARA GESTIONAR</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500]">
           <div className="bg-white w-full max-w-xl p-10 rounded-[3rem] shadow-2xl relative">
              <button onClick={() => setSelected(null)} className="absolute top-8 right-8 text-2xl">✕</button>
              <h3 className="text-xl font-black mb-6">Gestión de Incidencia {selected.id}</h3>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase">Relato del Paciente</p>
                   <p className="text-sm font-medium mt-1 italic">"{selected.description}"</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Solución Administrativa</label>
                   <textarea id="resp_adm" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm" defaultValue={selected.managementResponse} />
                </div>
                <button onClick={() => {
                  const r = (document.getElementById('resp_adm') as HTMLTextAreaElement).value;
                  onUpdate(selected.id, ComplaintStatus.RESUELTO, r, currentUser?.name || 'Administrador');
                  setSelected(null);
                }} className="w-full py-4 neo-warm-button rounded-2xl font-black uppercase text-[10px] tracking-widest">Finalizar y Cerrar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
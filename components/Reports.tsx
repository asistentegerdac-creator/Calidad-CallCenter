
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  specialties: string[];
  onUpdateFull: (c: Complaint) => void;
  currentUser: User | null;
}

export const Reports: React.FC<Props> = ({ complaints, areas, specialties, onUpdateFull, currentUser }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [resolving, setResolving] = useState<Complaint | null>(null);

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || p.patientName.toLowerCase() === name.toLowerCase());
  };

  const managers = useMemo(() => {
    const list = Array.from(new Set(complaints.map(c => c.managerName).filter(Boolean)));
    return list.sort();
  }, [complaints]);

  const filtered = useMemo(() => {
    const statusOrder = {
      [ComplaintStatus.PENDIENTE]: 0,
      [ComplaintStatus.PROCESO]: 1,
      [ComplaintStatus.RESUELTO]: 2,
    };

    return [...complaints]
      .filter(c => {
        const matchManager = filterManager === 'Todos' ? true : c.managerName === filterManager;
        const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
        const matchStatus = filterStatus === 'Todos' ? true : c.status === filterStatus;
        const matchDate = c.date >= dateFrom && c.date <= dateTo;
        return matchManager && matchArea && matchStatus && matchDate;
      })
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [complaints, filterManager, filterArea, filterStatus, dateFrom, dateTo]);

  const groupedByManager = useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    filtered.forEach(c => {
      const boss = c.managerName || 'SIN JEFE ASIGNADO';
      if (!groups[boss]) groups[boss] = [];
      groups[boss].push(c);
    });
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const resueltos = filtered.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const activos = filtered.filter(c => c.status !== ComplaintStatus.RESUELTO).length;
    const criticas = filtered.filter(c => c.priority === Priority.CRITICA).length;
    const satisfaction = total > 0 ? (filtered.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : "0";
    return { total, resueltos, activos, criticas, satisfaction };
  }, [filtered]);

  const handleSave = () => {
    const data = editing || resolving;
    if (data) {
      onUpdateFull({ ...data, resolvedBy: currentUser?.name || 'Admin' });
      setEditing(null);
      setResolving(null);
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="glass-card p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-3">
                 <span className="w-10 h-10 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-lg">📊</span>
                 Reportes y Auditoría Hospitalaria
              </h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filtre y genere documentos con validez oficial</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button onClick={() => window.print()} className="px-8 py-5 bg-indigo-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition-all">📄 PDF DASHBOARD</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Desde</label>
            <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Hasta</label>
            <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Área</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Unidades</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Jefatura</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todos los Jefes</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Estado</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos los Estados</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Total</label>
             <div className="p-4 bg-indigo-900 text-white rounded-xl font-black text-center text-sm">{filtered.length} CASOS</div>
          </div>
        </div>
      </div>

      <div className="space-y-10 no-print">
        {(Object.entries(groupedByManager) as [string, Complaint[]][]).map(([manager, items]) => (
          <div key={manager} className="glass-card bg-white p-8 border border-slate-100 shadow-md">
            <h4 className="font-black text-indigo-900 text-sm uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
              JEFATURA: <span className="text-amber-600 ml-2">{manager}</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase border-b pb-4">
                    <th className="pb-4" style={{ width: '15%' }}>FECHA / ID</th>
                    <th className="pb-4" style={{ width: '20%' }}>PACIENTE / ALERTA</th>
                    <th className="pb-4" style={{ width: '30%' }}>DESCRIPCIÓN RECLAMO</th>
                    <th className="pb-4" style={{ width: '15%' }}>ESTADO</th>
                    <th className="pb-4 text-right" style={{ width: '20%' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map(c => (
                    <tr key={c.id} onClick={() => setResolving({...c})} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                      <td className="py-4">
                        <p className="font-black text-slate-900 text-[11px]">{c.date}</p>
                        <p className="text-[8px] text-slate-400 font-bold">{c.id}</p>
                      </td>
                      <td className="py-4">
                        <p className="font-black text-slate-900 uppercase text-[11px]">{c.patientName}</p>
                        {isNoCall(c.patientPhone, c.patientName) && <span className="text-rose-600 text-[7px] font-black border border-rose-200 px-1 rounded">📵 NO LLAMAR</span>}
                      </td>
                      <td className="py-4">
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{c.description}"</p>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                          c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                         <button onClick={(e) => { e.stopPropagation(); setEditing({...c}); }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase hover:bg-amber-600 transition-all">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print">
          <div className="bg-white w-full max-w-2xl p-10 rounded-[2.5rem] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-6 right-6 text-2xl text-slate-300">✕</button>
            <h3 className="text-2xl font-black text-slate-900 uppercase mb-8">Edición de Registro Maestro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Fecha</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Paciente</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Médico</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Área</label>
                <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Especialidad</label>
                <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Jefe</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.managerName} onChange={e => setEditing({...editing, managerName: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Descripción</label>
                <textarea className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold h-24" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
              <button onClick={handleSave} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

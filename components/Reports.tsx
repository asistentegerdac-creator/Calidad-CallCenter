import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { 
  complaints: Complaint[]; 
  areas: string[];
}

export const Reports: React.FC<Props> = ({ complaints, areas }) => {
  const [filterDate, setFilterDate] = useState('');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchDate = filterDate ? c.date.includes(filterDate) : true;
      const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
      const matchStatus = filterStatus === 'Todos' ? true : c.status === filterStatus;
      return matchDate && matchArea && matchStatus;
    });
  }, [complaints, filterDate, filterArea, filterStatus]);

  return (
    <div className="space-y-10">
      <div className="glass-card p-10 bg-white border border-orange-100 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Fecha</label>
            <input type="month" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área / Depto</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos los estados</option>
              <option value={ComplaintStatus.PENDIENTE}>Pendiente</option>
              <option value={ComplaintStatus.PROCESO}>En Proceso</option>
              <option value={ComplaintStatus.RESUELTO}>Resuelto</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => window.print()} className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">
              Exportar PDF Profesional
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card bg-white border border-orange-100 overflow-hidden no-print">
        <div className="p-8 border-b border-orange-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900">Vista Previa de Datos ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">ID / Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Paciente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Área</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-xs">{c.id}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{c.date}</p>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-800 text-sm">{c.patientName}</td>
                  <td className="px-8 py-6 font-black text-amber-600 text-[10px] uppercase">{c.area}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print:block hidden bg-white p-20">
        <div className="border-b-4 border-slate-900 pb-10 mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black text-slate-900">CALIDAD DAC</h1>
            <p className="text-amber-500 font-black text-[10px] uppercase tracking-widest mt-2">Hospital Management Report</p>
          </div>
          <p className="font-black text-slate-400 text-xs">FECHA: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="grid grid-cols-2 gap-10 mb-16">
          <div className="p-10 bg-slate-900 text-white rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total de Registros</p>
            <p className="text-6xl font-black">{filtered.length}</p>
          </div>
          <div className="p-10 border-4 border-slate-900 rounded-[3rem]">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Filtros Aplicados</p>
             <p className="text-xs font-black uppercase">{filterArea} / {filterStatus} / {filterDate || 'Todo el tiempo'}</p>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="border-y border-slate-900">
            <tr>
              <th className="px-4 py-4 text-[10px] font-black uppercase">Paciente</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase">Área</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase">Fecha</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-4 text-[11px] font-bold">{c.patientName}</td>
                <td className="px-4 py-4 text-[11px] font-bold">{c.area}</td>
                <td className="px-4 py-4 text-[11px] font-bold">{c.date}</td>
                <td className="px-4 py-4 text-[11px] font-black uppercase">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-40 pt-4 border-t border-slate-900 w-64 text-center mx-auto">
          <p className="text-[10px] font-black uppercase">Firma del Auditor de Calidad</p>
        </div>
      </div>
    </div>
  );
};
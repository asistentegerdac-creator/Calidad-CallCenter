import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; areas: string[]; }

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
    <div className="space-y-8">
      <div className="glass-card p-6 md:p-10 bg-white border border-orange-100 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Mes/Año</label>
            <input type="month" className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Área</label>
            <select className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Estado</label>
            <select className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Exportar PDF</button>
          </div>
        </div>
      </div>

      <div className="glass-card bg-white border border-orange-100 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-8 py-4">Información del Caso</th>
                <th className="px-8 py-4">Descripción de la Queja</th>
                <th className="px-8 py-4">Área</th>
                <th className="px-8 py-4">Satisfacción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-900 text-sm">{c.patientName}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{c.id} • {c.date}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-slate-600 line-clamp-2 italic">"{c.description}"</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg uppercase">{c.area}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-1">
                      {[...Array(c.satisfaction)].map((_, i) => <span key={i} className="text-amber-400">★</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formato de Impresión Profesional */}
      <div className="print:block hidden bg-white p-12">
        <div className="border-b-4 border-slate-900 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black">REPORTE DAC</h1>
            <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.5em]">Hospital Management v4.0</p>
          </div>
          <p className="text-xs font-black uppercase text-slate-400">{new Date().toLocaleDateString()}</p>
        </div>
        <table className="w-full mt-10 text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-4 text-xs font-black uppercase">Paciente y Detalle de Queja</th>
              <th className="py-4 text-xs font-black uppercase">Área</th>
              <th className="py-4 text-xs font-black uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="py-6 pr-8">
                  <p className="font-black text-sm">{c.patientName}</p>
                  <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">"{c.description}"</p>
                </td>
                <td className="py-6 text-xs font-bold uppercase">{c.area}</td>
                <td className="py-6 text-xs font-black uppercase">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
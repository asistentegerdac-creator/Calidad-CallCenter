
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

  const statsByArea = useMemo(() => {
    const data: any = {};
    areas.forEach(a => {
      const areaComplaints = complaints.filter(c => c.area === a);
      if (areaComplaints.length > 0) {
        const avg = areaComplaints.reduce((acc, curr) => acc + curr.satisfaction, 0) / areaComplaints.length;
        data[a] = { avg: avg.toFixed(1), total: areaComplaints.length };
      }
    });
    return Object.entries(data).sort((a: any, b: any) => b[1].total - a[1].total);
  }, [complaints, areas]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="glass-card p-10 bg-white shadow-xl no-print">
        <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-slate-900">Filtros de Auditoría</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Periodo Mensual</label>
            <input type="month" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:ring-2 ring-amber-500" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Área Operativa</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Estado Gestión</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos los Estados</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase shadow-lg hover:scale-[1.02] transition-transform">Exportar PDF</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 glass-card bg-white border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
              <tr>
                <th className="px-8 py-5">Identificación y Paciente</th>
                <th className="px-8 py-5">Área / Depto.</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-900 text-sm">{c.patientName}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase">{c.id} • {c.date}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[9px] font-black rounded-lg uppercase">{c.area}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[9px] font-black uppercase ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-500' : 'text-amber-500'}`}>{c.status}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="font-black text-slate-900">{c.satisfaction}★</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card p-10 bg-white border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-900 uppercase mb-8 tracking-widest border-b pb-4">Desempeño por Área</h4>
          <div className="space-y-6">
            {statsByArea.map(([area, data]: any) => (
              <div key={area} className="space-y-2">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{area}</p>
                   <p className="text-[10px] font-black text-amber-600">{data.avg}★ <span className="text-slate-300 ml-1">({data.total})</span></p>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{width: `${(data.avg / 5) * 100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="print:block hidden bg-white p-12">
        <div className="border-b-4 border-slate-900 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black">DAC - REPORTE DE CALIDAD</h1>
            <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.5em] mt-1">HOSPITAL MANAGEMENT CENTER</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-900">Emisión: {new Date().toLocaleDateString()}</p>
            <p className="text-[9px] font-black uppercase text-slate-400">Total Casos: {filtered.length}</p>
          </div>
        </div>
        <table className="w-full mt-12 text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-4 text-[10px] font-black uppercase">Paciente y Detalle</th>
              <th className="py-4 text-[10px] font-black uppercase">Área Médica</th>
              <th className="py-4 text-[10px] font-black uppercase">Especialidad</th>
              <th className="py-4 text-[10px] font-black uppercase text-right">Satisfacción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="py-6 pr-8">
                  <p className="font-black text-xs uppercase text-slate-900">{c.patientName}</p>
                  <p className="text-[10px] text-slate-500 italic mt-2 leading-relaxed">"{c.description}"</p>
                  {c.managementResponse && <p className="text-[9px] font-black text-emerald-600 mt-2 uppercase">SOLUCIÓN: {c.managementResponse}</p>}
                </td>
                <td className="py-6 text-[10px] font-bold uppercase text-slate-600">{c.area}</td>
                <td className="py-6 text-[10px] font-bold uppercase text-slate-600">{c.specialty}</td>
                <td className="py-6 text-[10px] font-black uppercase text-right">{c.satisfaction}/5</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center opacity-50">
           <p className="text-[9px] font-black uppercase">Firma del Auditor de Calidad</p>
           <p className="text-[9px] font-black uppercase">DAC - Gestión Hospitalaria</p>
        </div>
      </div>
    </div>
  );
};

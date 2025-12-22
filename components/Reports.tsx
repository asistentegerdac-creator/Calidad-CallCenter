import React from 'react';
import { Complaint, CallRecord, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; calls: CallRecord[]; }

export const Reports: React.FC<Props> = ({ complaints, calls }) => {
  const handlePrint = () => window.print();

  return (
    <div className="space-y-8">
      <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-100 no-print">
        <h3 className="text-xl font-extrabold mb-4 tracking-tight">Auditoría Operativa</h3>
        <p className="text-slate-500 mb-8">Genere el reporte detallado de todas las incidencias y métricas de contacto registradas en el sistema para su revisión por gerencia.</p>
        <button onClick={handlePrint} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">🖨️ Generar Reporte PDF</button>
      </div>

      <div className="print:block hidden bg-white p-20 min-h-screen">
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-12 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter">DAC Hospital Intelligence</h1>
            <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-2">Reporte de Auditoría de Calidad</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">Emisión: {new Date().toLocaleDateString()}</p>
            <p className="text-slate-400">Ref: AUDIT-2024-SYS</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-20">
          <div className="p-8 bg-slate-50 rounded-3xl text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total Inconformidades</p>
            <p className="text-4xl font-extrabold">{complaints.length}</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-3xl text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Casos Resueltos</p>
            <p className="text-4xl font-extrabold text-emerald-600">{complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length}</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-3xl text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Efectividad Contacto</p>
            <p className="text-4xl font-extrabold text-blue-600">
              {calls.length ? Math.round((calls.reduce((a,b)=>a+b.calledCount,0)/calls.reduce((a,b)=>a+b.totalPatients,0))*100) : 0}%
            </p>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-6 py-4 rounded-tl-xl text-xs uppercase font-bold">Fecha</th>
              <th className="px-6 py-4 text-xs uppercase font-bold">Paciente</th>
              <th className="px-6 py-4 text-xs uppercase font-bold">Área</th>
              <th className="px-6 py-4 text-xs uppercase font-bold">Inconformidad</th>
              <th className="px-6 py-4 rounded-tr-xl text-xs uppercase font-bold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-6 text-sm">{c.date}</td>
                <td className="px-6 py-6 font-bold">{c.patientName}</td>
                <td className="px-6 py-6 text-sm">{c.area}</td>
                <td className="px-6 py-6 text-sm italic">"{c.description.substring(0, 50)}..."</td>
                <td className="px-6 py-6 text-xs font-bold uppercase">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-40 grid grid-cols-2 gap-20 text-center">
          <div className="border-t border-slate-900 pt-4">
            <p className="font-bold uppercase text-[10px] tracking-[0.4em]">Firma Responsable DAC</p>
          </div>
          <div className="border-t border-slate-900 pt-4">
            <p className="font-bold uppercase text-[10px] tracking-[0.4em]">Visto Bueno Gerencial</p>
          </div>
        </div>
      </div>
    </div>
  );
};
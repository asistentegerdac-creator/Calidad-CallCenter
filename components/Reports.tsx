
import React from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; }

export const Reports: React.FC<Props> = ({ complaints }) => {
  const handlePrint = () => window.print();

  return (
    <div className="space-y-8">
      <div className="glass-card p-12 no-print">
        <h3 className="text-2xl font-black mb-4 tracking-tighter text-slate-800">Exportación de Auditoría</h3>
        <p className="text-slate-500 mb-10 text-sm">Genere documentos oficiales para revisiones de gerencia o acreditación hospitalaria.</p>
        <button onClick={handlePrint} className="px-12 py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-amber-600 transition-all active:scale-95">🖨️ Imprimir Reporte Oficial</button>
      </div>

      <div className="print:block hidden bg-white p-20 min-h-screen">
        <div className="flex justify-between items-center border-b-4 border-amber-500 pb-12 mb-16">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">CALIDAD DAC</h1>
            <p className="text-orange-500 font-black uppercase tracking-widest text-[10px] mt-4">Auditoría Clínica de Alta Dirección</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-black text-slate-400 mb-1">REGISTRO: {new Date().toLocaleDateString()}</p>
            <p className="font-bold">SISTEMA v2.5.0</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-20">
          <div className="p-10 bg-orange-50 rounded-[3rem] text-center">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Expedientes Totales</p>
            <p className="text-5xl font-black">{complaints.length}</p>
          </div>
          <div className="p-10 bg-amber-50 rounded-[3rem] text-center">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Tasa de Resolución</p>
            <p className="text-5xl font-black text-amber-600">
              {complaints.length ? Math.round((complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length / complaints.length) * 100) : 0}%
            </p>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-6 py-5 rounded-tl-2xl text-[10px] uppercase font-black tracking-widest">Paciente</th>
              <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Área</th>
              <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Doctor</th>
              <th className="px-6 py-5 rounded-tr-2xl text-[10px] uppercase font-black tracking-widest">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-6 font-bold text-sm">{c.patientName}</td>
                <td className="px-6 py-6 text-xs">{c.area}</td>
                <td className="px-6 py-6 text-xs italic">Dr. {c.doctorName}</td>
                <td className="px-6 py-6 text-[10px] font-black uppercase tracking-tighter text-amber-600">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-48 grid grid-cols-2 gap-32 text-center">
          <div className="border-t-2 border-slate-900 pt-6">
            <p className="font-black uppercase text-[9px] tracking-[0.4em]">Firma Dirección Médica</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-6">
            <p className="font-black uppercase text-[9px] tracking-[0.4em]">Sello Calidad DAC</p>
          </div>
        </div>
      </div>
    </div>
  );
};

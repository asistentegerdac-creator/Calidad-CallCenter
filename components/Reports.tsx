import React from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; }

export const Reports: React.FC<Props> = ({ complaints }) => {
  const handlePrint = () => window.print();

  const solvedCount = complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
  const criticalCount = complaints.filter(c => c.priority === 'Crítica').length;
  const avgSatisfaction = (complaints.reduce((a,b) => a + b.satisfaction, 0) / (complaints.length || 1)).toFixed(1);

  return (
    <div className="space-y-10">
      <div className="glass-card p-12 no-print bg-white border-2 border-slate-900/5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-black tracking-tighter text-slate-900">Centro de Exportación Oficial</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium">Documento legalmente vinculante para procesos de acreditación hospitalaria.</p>
          </div>
          <button onClick={handlePrint} className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-amber-600 transition-all flex items-center gap-4 group">
            <span className="text-xl">🖨️</span> GENERAR PDF PROFESIONAL
          </button>
        </div>
      </div>

      <div className="print:block hidden bg-white p-20 min-h-screen">
        {/* Header Reporte */}
        <div className="flex justify-between items-start border-b-8 border-amber-500 pb-16 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-6">
               <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-3xl font-black">CD</div>
               <div>
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900">CALIDAD DAC</h1>
                  <p className="text-amber-600 font-black uppercase tracking-[0.5em] text-[10px] mt-1">Hospital Management System</p>
               </div>
            </div>
            <p className="text-slate-400 font-bold text-xs">INFORME DE AUDITORÍA CLÍNICA Y SATISFACCIÓN</p>
          </div>
          <div className="text-right">
            <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem]">
              <p className="font-black text-slate-400 text-[10px] uppercase mb-1">Registro de Emisión</p>
              <p className="text-2xl font-black text-slate-900">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Folio: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-slate-900 mb-10 border-l-8 border-slate-900 pl-6 uppercase tracking-widest">I. RESUMEN EJECUTIVO</h2>
          <div className="grid grid-cols-3 gap-10">
             <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-xl">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Expedientes Totales</p>
               <p className="text-6xl font-black">{complaints.length}</p>
               <div className="mt-4 h-1 w-full bg-white/20 rounded-full"></div>
             </div>
             <div className="p-10 bg-amber-50 border-2 border-amber-100 rounded-[3rem] text-center">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Tasa de Eficiencia</p>
               <p className="text-6xl font-black text-amber-600">{complaints.length ? Math.round((solvedCount/complaints.length)*100) : 0}%</p>
               <p className="text-[10px] font-black text-amber-400 mt-4 uppercase">Casos Resueltos</p>
             </div>
             <div className="p-10 bg-indigo-50 border-2 border-indigo-100 rounded-[3rem] text-center">
               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Satisfacción Media</p>
               <p className="text-6xl font-black text-indigo-600">{avgSatisfaction}</p>
               <p className="text-[10px] font-black text-indigo-400 mt-4 uppercase">Escala de 1 a 5</p>
             </div>
          </div>
        </div>

        {/* Detalles de Auditoría */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-slate-900 mb-10 border-l-8 border-slate-900 pl-6 uppercase tracking-widest">II. DETALLE DE INCIDENCIAS CRÍTICAS</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-200">
                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">ID Auditoría</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Paciente</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Área</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Nivel Crítico</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-400 text-xs">{c.id}</td>
                  <td className="px-8 py-6 font-bold text-slate-900 text-sm">{c.patientName}</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-500">{c.area}</td>
                  <td className={`px-8 py-6 text-[10px] font-black uppercase ${c.priority === 'Crítica' ? 'text-rose-500' : 'text-slate-400'}`}>{c.priority}</td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-40 grid grid-cols-2 gap-32">
          <div className="text-center">
            <div className="h-0.5 bg-slate-900 w-full mb-4"></div>
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">Firma Auditor Jefe de Calidad</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 italic">Dirección Administrativa Hospitalaria</p>
          </div>
          <div className="text-center">
            <div className="h-0.5 bg-slate-900 w-full mb-4"></div>
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">Firma Dirección Médica</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 italic">Visto Bueno y Aprobación Legal</p>
          </div>
        </div>
      </div>
    </div>
  );
};
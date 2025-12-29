
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  onUpdateFull: (c: Complaint) => void;
  currentUser: User | null;
}

export const Reports: React.FC<Props> = ({ complaints, areas, onUpdateFull, currentUser }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  
  // Rango de fechas para el reporte
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  const [editing, setEditing] = useState<Complaint | null>(null);

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || p.patientName.toLowerCase() === name.toLowerCase());
  };

  const filtered = useMemo(() => {
    const statusOrder = {
      [ComplaintStatus.PENDIENTE]: 0,
      [ComplaintStatus.PROCESO]: 1,
      [ComplaintStatus.RESUELTO]: 2,
    };

    return complaints
      .filter(c => {
        const matchManager = filterManager === 'Todos' ? true : c.managerName === filterManager;
        const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
        const matchStatus = filterStatus === 'Todos' ? true : c.status === filterStatus;
        const matchDate = c.date >= dateFrom && c.date <= dateTo;
        return matchManager && matchArea && matchStatus && matchDate;
      })
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [complaints, filterManager, filterArea, filterStatus, dateFrom, dateTo]);

  const managers = useMemo(() => Array.from(new Set(complaints.map(c => c.managerName).filter(Boolean))), [complaints]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const resueltos = filtered.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const pendientes = filtered.filter(c => c.status === ComplaintStatus.PENDIENTE).length;
    const proceso = filtered.filter(c => c.status === ComplaintStatus.PROCESO).length;
    const avgSatisfaction = total > 0 ? (filtered.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : "0";
    return { total, resueltos, pendientes, proceso, avgSatisfaction };
  }, [filtered]);

  const groupedByManager = useMemo(() => {
    const groups: any = {};
    filtered.forEach(c => {
      const jefe = c.managerName || 'Sin Jefe Asignado';
      if (!groups[jefe]) groups[jefe] = [];
      groups[jefe].push(c);
    });
    return groups;
  }, [filtered]);

  const handleSaveEdit = () => {
    if (editing) {
      onUpdateFull({
        ...editing,
        resolvedBy: currentUser?.name || 'Administrador'
      });
      setEditing(null);
    }
  };

  const exportExcel = () => {
    const headers = ["ESTADO", "PRIORIDAD", "ID EXPEDIENTE", "FECHA", "PACIENTE", "RESTRICCION", "AREA", "ESPECIALIDAD", "MEDICO", "JEFE", "QUEJA", "GESTION", "PTS", "AUDITOR"];
    const rows = filtered.map(c => [
      c.status.toUpperCase(), 
      c.priority.toUpperCase(), 
      c.id, 
      c.date, 
      c.patientName.toUpperCase(),
      isNoCall(c.patientPhone, c.patientName) ? "NO LLAMAR" : "OK",
      c.area.toUpperCase(), 
      (c.specialty || 'N/A').toUpperCase(), 
      (c.doctorName || 'N/A').toUpperCase(),
      (c.managerName || 'N/A').toUpperCase(), 
      `"${c.description.replace(/"/g, '""')}"`,
      `"${(c.managementResponse || '').replace(/"/g, '""')}"`, 
      c.satisfaction, 
      (c.resolvedBy || '').toUpperCase()
    ]);
    const csvContent = "\ufeff" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `REPORTE_DAC_${dateFrom}_AL_${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* PANEL DE FILTROS PROFESIONAL */}
      <div className="glass-card p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
            <div>
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                 <span className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg">📋</span>
                 Generación de Reportes Gerenciales
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina el rango de fechas y filtros para el informe</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button onClick={exportExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                 <span>📗</span> EXPORTAR EXCEL
               </button>
               <button onClick={() => window.print()} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2">
                 <span>📄</span> GENERAR PDF
               </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Desde</label>
            <input type="date" className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Hasta</label>
            <input type="date" className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jefe / Responsable</label>
            <select className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todos los Jefes</option>
              {managers.map(m => <option key={String(m)} value={String(m)}>{String(m)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área</label>
            <select className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Estado</label>
            <select className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos los Estados</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE RESULTADOS EN PANTALLA */}
      <div className="space-y-6 no-print">
         {filtered.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Sin resultados en este rango de fechas</p>
             </div>
         ) : (
            Object.entries(groupedByManager).map(([manager, items]: any) => (
              <div key={manager} className="glass-card bg-white p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                 <div className="flex justify-between items-center mb-6 bg-slate-50 -mx-8 -mt-8 px-8 py-4 border-b">
                    <h4 className="font-black text-slate-900 text-sm uppercase">JEFATURA: <span className="text-amber-500 ml-2">{manager}</span></h4>
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black">{items.length} CASOS ENCONTRADOS</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                             <th className="pb-4">Paciente / Alerta</th>
                             <th className="pb-4">Área / Médico</th>
                             <th className="pb-4">Estado / Prioridad</th>
                             <th className="pb-4 text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {items.map((c: any) => {
                            const noLlamar = isNoCall(c.patientPhone, c.patientName);
                            return (
                              <tr key={c.id} className={`text-xs hover:bg-slate-50/50 transition-colors ${noLlamar ? 'bg-rose-50/40' : ''}`}>
                                <td className="py-4">
                                   <div className="flex flex-col">
                                     <span className="font-black text-slate-900 uppercase">{c.patientName}</span>
                                     <span className="text-[9px] text-slate-400 font-bold">{c.id} | {c.date}</span>
                                     {noLlamar && <span className="mt-1 px-2 py-0.5 bg-rose-600 text-white text-[7px] font-black rounded-full inline-block w-fit animate-pulse">⚠️ NO LLAMAR</span>}
                                   </div>
                                </td>
                                <td className="py-4">
                                   <p className="font-black text-amber-600 uppercase">{c.area}</p>
                                   <p className="text-[9px] text-indigo-500 font-bold uppercase">DR: {c.doctorName || 'N/A'}</p>
                                </td>
                                <td className="py-4">
                                   <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                         c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' :
                                         c.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                         {c.status}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${c.priority === 'Crítica' ? 'bg-rose-500 text-white' : 'text-slate-400 bg-slate-100'}`}>{c.priority}</span>
                                   </div>
                                </td>
                                <td className="py-4 text-right">
                                   <button onClick={() => setEditing({...c})} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-black transition-colors">Ver Detalles</button>
                                </td>
                              </tr>
                            );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            ))
         )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in no-print">
           <div className="bg-white w-full max-w-2xl p-10 rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[95vh]">
              <button onClick={() => setEditing(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Gestión Administrativa de Reporte</h3>
                <p className="text-amber-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Expediente: {editing.id}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nombre Paciente</label>
                    <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Médico Responsable</label>
                    <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Área del Evento</label>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                       {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Estado de la Gestión</label>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold border-amber-500" value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as ComplaintStatus})}>
                       {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Relato / Descripción del Problema</label>
                    <textarea className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold h-24" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                 </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Solución Aplicada / Descargo Final</label>
                    <textarea className="w-full p-3 bg-slate-100 border-2 border-amber-200 rounded-xl text-xs font-bold h-32 outline-none focus:ring-2 ring-amber-500" value={editing.managementResponse} onChange={e => setEditing({...editing, managementResponse: e.target.value})} placeholder="Escriba aquí la resolución oficial..." />
                 </div>
                 <button onClick={handleSaveEdit} className="md:col-span-2 w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 hover:bg-amber-600 transition-colors">Guardar Gestión y Actualizar Reporte</button>
              </div>
           </div>
        </div>
      )}

      {/* DISEÑO PROFESIONAL PDF GERENCIAL (SOLO IMPRESIÓN) */}
      <div className="hidden print:block bg-white font-sans text-slate-900 p-0">
        <style>{`
          @media print {
            @page { size: portrait; margin: 12mm; }
            .page-break { page-break-before: always; }
            .break-inside-avoid { break-inside: avoid; }
            body { background: white !important; font-size: 10pt; }
            .print-header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; text-align: left; padding: 8px; font-size: 8pt; border-bottom: 1px solid #000; }
            td { padding: 8px; border-bottom: 1px solid #eee; font-size: 8pt; vertical-align: top; }
          }
        `}</style>
        
        <div className="print-header flex justify-between items-end">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-white text-2xl font-black">DAC</div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Informe de Gestión de Calidad</h1>
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">Rango de Reporte: {dateFrom} AL {dateTo}</p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[8px] font-black uppercase text-slate-400">Emisión: {new Date().toLocaleString()}</p>
             <p className="text-[8px] font-black uppercase text-slate-400">Auditor: {currentUser?.name || 'Administrador'}</p>
          </div>
        </div>

        <div className="mb-6">
           <h2 className="text-sm font-black uppercase bg-slate-100 p-2 border-l-4 border-black mb-4">Detalle de Incidencias Pendientes y En Proceso</h2>
           
           {filtered.filter(c => c.status !== ComplaintStatus.RESUELTO).length === 0 ? (
             <p className="text-center py-10 italic text-slate-400">No hay incidencias activas en el rango seleccionado.</p>
           ) : (
             <table>
                <thead>
                   <tr>
                      <th>FECHA / ID</th>
                      <th>PACIENTE / CONTACTO</th>
                      <th>ÁREA / MÉDICO</th>
                      <th>JEFE RESPONSABLE</th>
                      <th>RELATO DE LA QUEJA</th>
                      <th>ESTADO</th>
                   </tr>
                </thead>
                <tbody>
                   {filtered
                     .filter(c => c.status !== ComplaintStatus.RESUELTO)
                     .map(c => (
                     <tr key={c.id} className="break-inside-avoid">
                        <td><span className="font-bold">{c.date}</span><br/><span className="text-[7pt] text-slate-400">{c.id}</span></td>
                        <td><span className="font-bold uppercase">{c.patientName}</span><br/>{c.patientPhone}</td>
                        <td><span className="font-bold">{c.area}</span><br/>{c.doctorName || 'N/A'}</td>
                        <td>{c.managerName || 'Sin Jefe'}</td>
                        <td className="w-1/3 italic">"{c.description}"</td>
                        <td><span className="font-bold uppercase text-[7pt]">{c.status}</span><br/><span className="text-rose-600 font-bold">{c.priority}</span></td>
                     </tr>
                   ))}
                </tbody>
             </table>
           )}
        </div>

        {/* RESUMEN ESTADÍSTICO AL FINAL DEL INFORME */}
        <div className="page-break"></div>
        <div className="mt-10 pt-10 border-t-2 border-black">
           <h2 className="text-lg font-black uppercase text-center mb-8">Cuadro Estadístico de Calidad DAC</h2>
           <div className="grid grid-cols-4 gap-4 mb-20">
              <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-3xl text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">Volumen Total</p>
                <p className="text-3xl font-black">{stats.total}</p>
              </div>
              <div className="p-6 bg-emerald-50 border-2 border-emerald-600 rounded-3xl text-center">
                <p className="text-[8px] font-black uppercase text-emerald-600">Eficiencia (Resueltos)</p>
                <p className="text-3xl font-black text-emerald-700">{stats.resueltos}</p>
              </div>
              <div className="p-6 bg-amber-50 border-2 border-amber-600 rounded-3xl text-center">
                <p className="text-[8px] font-black uppercase text-amber-600">Activos (Pendientes)</p>
                <p className="text-3xl font-black text-amber-700">{stats.pendientes + stats.proceso}</p>
              </div>
              <div className="p-6 bg-slate-900 text-white rounded-3xl text-center shadow-xl">
                <p className="text-[8px] font-black uppercase text-slate-400">Satisfacción NPS</p>
                <p className="text-3xl font-black">{stats.avgSatisfaction}/5</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-20 px-10">
              <div className="text-center">
                 <div className="border-b border-black w-full h-20 mb-4"></div>
                 <p className="text-[9px] font-black uppercase">Firma del Auditor de Calidad</p>
              </div>
              <div className="text-center">
                 <div className="border-b border-black w-full h-20 mb-4"></div>
                 <p className="text-[9px] font-black uppercase">Firma de Dirección Médica</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

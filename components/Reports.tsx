
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
  const [editing, setEditing] = useState<Complaint | null>(null); // Edición de cabecera
  const [resolving, setResolving] = useState<Complaint | null>(null); // Resolución rápida

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

  // Generador de Excel con formato Real (Usa HTML Table con MIME de Excel)
  const exportExcel = () => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          .header { background-color: #1a237e; color: white; font-weight: bold; font-size: 16pt; text-align: center; }
          .title { background-color: #ad1457; color: white; font-weight: bold; text-align: left; }
          .th { background-color: #eeeeee; border: 0.5pt solid #000000; font-weight: bold; }
          .td { border: 0.5pt solid #cccccc; }
          .pending { color: #f97316; font-weight: bold; }
          .resolved { color: #10b981; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="10" class="header">DASHBOARD DE GESTIÓN DE CALIDAD DAC</td></tr>
          <tr><td colspan="10">Periodo: ${dateFrom} al ${dateTo} | Generado: ${new Date().toLocaleString()}</td></tr>
          <tr></tr>
          <tr><td colspan="2" class="th">Total Casos</td><td class="td">${stats.total}</td><td colspan="2" class="th">Satisfacción</td><td class="td">${stats.satisfaction}</td></tr>
          <tr></tr>
          <tr>
            <th class="th">ESTADO</th><th class="th">PRIORIDAD</th><th class="th">ID</th><th class="th">FECHA</th>
            <th class="th">PACIENTE</th><th class="th">AREA</th><th class="th">MEDICO</th><th class="th">JEFE</th>
            <th class="th">RECLAMO</th><th class="th">RESOLUCION</th>
          </tr>
          ${filtered.map(c => `
            <tr>
              <td class="td ${c.status === 'Resuelto' ? 'resolved' : 'pending'}">${c.status.toUpperCase()}</td>
              <td class="td">${c.priority}</td>
              <td class="td">${c.id}</td>
              <td class="td">${c.date}</td>
              <td class="td">${c.patientName}</td>
              <td class="td">${c.area}</td>
              <td class="td">${c.doctorName || 'N/A'}</td>
              <td class="td">${c.managerName || 'N/A'}</td>
              <td class="td">${c.description}</td>
              <td class="td">${c.managementResponse || ''}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `REPORTE_GERENCIAL_DAC.xls`;
    link.click();
  };

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
      {/* PANEL DE CONTROL NO-IMPRIMIBLE */}
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
               <button onClick={exportExcel} className="px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all">📘 EXCEL PROFESIONAL</button>
               <button onClick={() => window.print()} className="px-8 py-5 bg-indigo-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition-all">📄 PDF DASHBOARD</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
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

      {/* LISTA AGRUPADA POR JEFATURA */}
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
                         <button onClick={(e) => { e.stopPropagation(); setEditing({...c}); }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase hover:bg-amber-600 transition-colors">Editar Datos</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* MODALES DE EDICIÓN Y RESOLUCIÓN */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print">
          <div className="bg-white w-full max-w-2xl p-10 rounded-[2.5rem] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-6 right-6 text-2xl text-slate-300">✕</button>
            <h3 className="text-2xl font-black text-slate-900 uppercase mb-8">Edición Maestra de Registro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Nombre Paciente</label><input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Médico Responsable</label><input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Área</label><select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>{areas.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Especialidad</label><select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>{specialties.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="col-span-2 space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Reclamo Original</label><textarea className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold h-24" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} /></div>
              <button onClick={handleSave} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Guardar Cambios Maestros</button>
            </div>
          </div>
        </div>
      )}

      {resolving && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print">
          <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl relative">
            <button onClick={() => setResolving(null)} className="absolute top-6 right-6 text-2xl text-slate-300">✕</button>
            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">Resolución de Incidencia</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-6 italic">"{resolving.description}"</p>
            <div className="space-y-6">
              <div className="flex gap-2">
                {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                  <button key={s} onClick={() => setResolving({...resolving, status: s})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${resolving.status === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{s}</button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Descargo / Solución Aplicada</label>
                <textarea className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold h-32 outline-none focus:ring-2 ring-amber-500" value={resolving.managementResponse || ''} onChange={e => setResolving({...resolving, managementResponse: e.target.value})} placeholder="Escriba la gestión realizada..." />
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Finalizar Gestión</button>
            </div>
          </div>
        </div>
      )}

      {/* DISEÑO PDF DASHBOARD REAL */}
      <div className="hidden print:block bg-white text-slate-900 font-sans p-0 m-0">
         <style>{`
           @media print {
             @page { size: portrait; margin: 0; }
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             .pdf-header { background: #1a237e !important; color: white !important; padding: 30px; text-align: center; }
             .pdf-header h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
             .pdf-header p { font-size: 10px; margin-top: 5px; opacity: 0.8; font-weight: 700; }
             .pdf-kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 20px 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
             .pdf-kpi-box { text-align: center; }
             .pdf-kpi-box .val { font-size: 26px; font-weight: 900; color: #1a237e; margin: 0; }
             .pdf-kpi-box .lab { font-size: 8px; font-weight: 800; color: #666; text-transform: uppercase; line-height: 1.1; margin-top: 4px; }
             .pdf-section-title { background: #ad1457 !important; color: white !important; padding: 10px 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 30px 0 10px; }
             .pdf-table { width: 100%; border-collapse: collapse; margin: 0 0 30px; }
             .pdf-table th { background: #f5f5f5; text-align: left; padding: 10px 8px; font-size: 9px; font-weight: 800; border-bottom: 2px solid #000; text-transform: uppercase; }
             .pdf-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 9px; vertical-align: top; }
             .break-avoid { break-inside: avoid; page-break-inside: avoid; }
             .pdf-footer { margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; padding: 0 100px; text-align: center; }
             .pdf-sig { border-top: 1.5px solid #000; padding-top: 10px; font-size: 10px; font-weight: 800; }
           }
         `}</style>

         <div className="pdf-header">
            <h1>Customer Service Dashboard - DAC Hospitalario</h1>
            <p>GESTIÓN DE CALIDAD Y CONTROL DE INCIDENCIAS | PERIODO: {dateFrom} AL {dateTo}</p>
         </div>

         <div className="pdf-kpi-row">
            <div className="pdf-kpi-box"><p className="val">{stats.total}</p><p className="lab">Incidencias<br/>Reportadas</p></div>
            <div className="pdf-kpi-box"><p className="val">{stats.resueltos}</p><p className="lab">Casos<br/>Cerrados</p></div>
            <div className="pdf-kpi-box"><p className="val">{stats.activos}</p><p className="lab">Casos<br/>en Gestión</p></div>
            <div className="pdf-kpi-box"><p className="val">{stats.criticas}</p><p className="lab">Alertas<br/>Críticas</p></div>
            <div className="pdf-kpi-box"><p className="val">{stats.satisfaction}</p><p className="lab">Rating<br/>Satisfacción</p></div>
            <div className="pdf-kpi-box"><p className="val">{((stats.resueltos/(stats.total||1))*100).toFixed(0)}%</p><p className="lab">Eficiencia<br/>DAC</p></div>
         </div>

         <div style={{ padding: '0 40px' }}>
            <div className="pdf-section-title">Análisis de Casos Pendientes y en Proceso</div>
            <table className="pdf-table">
               <thead>
                  <tr>
                     <th style={{ width: '15%' }}>FECHA / ID</th>
                     <th style={{ width: '20%' }}>PACIENTE / CONTACTO</th>
                     <th style={{ width: '20%' }}>ÁREA / JEFATURA</th>
                     <th style={{ width: '35%' }}>RELATO DE INCIDENCIA</th>
                     <th style={{ width: '10%' }}>ESTADO</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.filter(c => c.status !== ComplaintStatus.RESUELTO).map(c => (
                    <tr key={c.id} className="break-avoid">
                       <td><b>{c.date}</b><br/>{c.id}</td>
                       <td><b className="uppercase">{c.patientName}</b><br/>{c.patientPhone}</td>
                       <td><b>{c.area}</b><br/>{c.managerName || 'Sin Jefe'}</td>
                       <td className="italic text-slate-500">"{c.description}"</td>
                       <td style={{ color: c.status === 'Pendiente' ? '#f97316' : '#2563eb', fontWeight: 900 }}>{c.status.toUpperCase()}</td>
                    </tr>
                  ))}
               </tbody>
            </table>

            <div className="pdf-section-title" style={{ background: '#333 !important' }}>Histórico de Resoluciones Cerradas</div>
            <table className="pdf-table">
               <thead>
                  <tr>
                     <th style={{ width: '15%' }}>ID / PACIENTE</th>
                     <th style={{ width: '20%' }}>ÁREA / MÉDICO</th>
                     <th style={{ width: '45%' }}>RESOLUCIÓN Y DESCARGO DAC</th>
                     <th style={{ width: '12%' }}>AUDITOR</th>
                     <th style={{ width: '8%' }}>NOTA</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.filter(c => c.status === ComplaintStatus.RESUELTO).map(c => (
                    <tr key={c.id} className="break-avoid">
                       <td><b>{c.id}</b><br/><span className="uppercase">{c.patientName}</span></td>
                       <td><b>{c.area}</b><br/>Dr. {c.doctorName || 'N/A'}</td>
                       <td><p className="font-bold">"{c.managementResponse}"</p></td>
                       <td>{c.resolvedBy || 'Central'}</td>
                       <td style={{textAlign:'center'}}><b>{c.satisfaction}/5</b></td>
                    </tr>
                  ))}
               </tbody>
            </table>

            <div className="pdf-footer break-avoid">
               <div className="pdf-sig">Firma de Auditoría de Calidad DAC</div>
               <div className="pdf-sig">Firma de Dirección Médica</div>
            </div>
         </div>
      </div>
    </div>
  );
};

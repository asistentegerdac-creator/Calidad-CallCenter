
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

  const stats = useMemo(() => {
    const total = filtered.length;
    const resueltos = filtered.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const activos = filtered.filter(c => c.status !== ComplaintStatus.RESUELTO).length;
    const criticas = filtered.filter(c => c.priority === Priority.CRITICA).length;
    const satisfaction = total > 0 ? (filtered.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : "0";
    return { total, resueltos, activos, criticas, satisfaction };
  }, [filtered]);

  const exportExcel = () => {
    const title = `INFORME GERENCIAL DAC - PERIODO ${dateFrom} AL ${dateTo}`;
    const headers = ["ESTADO", "PRIORIDAD", "ID", "FECHA", "PACIENTE", "ALERTA", "AREA", "ESPECIALIDAD", "MEDICO", "JEFE", "QUEJA", "RESOLUCION", "NOTA", "AUDITOR"];
    const rows = filtered.map(c => [
      c.status.toUpperCase(), c.priority.toUpperCase(), c.id, c.date, c.patientName.toUpperCase(),
      isNoCall(c.patientPhone, c.patientName) ? "NO LLAMAR" : "OK",
      c.area.toUpperCase(), (c.specialty || 'N/A').toUpperCase(), (c.doctorName || 'N/A').toUpperCase(),
      (c.managerName || 'N/A').toUpperCase(), `"${c.description.replace(/"/g, '""')}"`,
      `"${(c.managementResponse || '').replace(/"/g, '""')}"`, c.satisfaction, (c.resolvedBy || '').toUpperCase()
    ]);
    const csvContent = "\ufeff" + title + "\n\n" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `REPORTE_DAC_GERENCIAL_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="glass-card p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-3">
                 <span className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-lg">📊</span>
                 Dashboard de Inteligencia Gerencial
              </h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Generación de documentación oficial bajo estándares de calidad</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button onClick={exportExcel} className="px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all">Exportar a Excel</button>
               <button onClick={() => window.print()} className="px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 hover:scale-105 transition-all">Imprimir Informe PDF</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Rango Inicio</label>
            <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Rango Final</label>
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
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Resultados</label>
             <div className="p-4 bg-slate-900 text-white rounded-xl font-black text-center text-sm">{filtered.length} CASOS</div>
          </div>
        </div>
      </div>

      {/* VISTA PREVIA PROFESIONAL EN PANTALLA */}
      <div className="space-y-8 no-print">
         {filtered.length > 0 ? (
           <div className="grid grid-cols-1 gap-6">
             {filtered.map(c => (
                <div key={c.id} className="glass-card bg-white p-8 border-l-8 hover:shadow-xl transition-all" style={{ borderLeftColor: c.status === ComplaintStatus.PENDIENTE ? '#f97316' : c.status === ComplaintStatus.PROCESO ? '#2563eb' : '#10b981' }}>
                   <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{c.id} | {c.date}</span>
                        <h4 className="text-xl font-black text-slate-900 uppercase mt-1">{c.patientName}</h4>
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase ${c.status === 'Pendiente' ? 'bg-orange-500' : c.status === 'En Proceso' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                        {c.status}
                      </span>
                   </div>
                   <div className="mt-6 flex gap-10">
                      <div className="flex-1">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Descripción del Evento</p>
                         <p className="text-sm text-slate-600 italic font-medium leading-relaxed">"{c.description}"</p>
                      </div>
                      <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Gestión de Calidad / Resolución</p>
                         <p className="text-sm text-slate-900 font-bold">{c.managementResponse || 'En espera de resolución administrativa...'}</p>
                      </div>
                   </div>
                </div>
             ))}
           </div>
         ) : (
           <div className="text-center py-32 glass-card bg-white border-dashed border-2">
              <p className="text-slate-400 font-black uppercase text-xs">No se encontraron incidencias en este rango</p>
           </div>
         )}
      </div>

      {/* DISEÑO DE INFORME PDF DE ALTO NIVEL (MIMETIZANDO LA IMAGEN) */}
      <div className="hidden print:block bg-white text-slate-900 font-sans p-0 m-0">
         <style>{`
           @media print {
             @page { size: portrait; margin: 0; }
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; }
             .p-container { padding: 40px; }
             .header-nav { background: #1a237e !important; color: white !important; padding: 25px; text-align: center; }
             .header-nav h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
             .kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 15px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
             .kpi-box { text-align: center; }
             .kpi-box p.val { font-size: 26px; font-weight: 800; margin: 0; color: #1a237e; }
             .kpi-box p.lab { font-size: 8px; font-weight: 800; margin: 2px 0; color: #666; text-transform: uppercase; line-height: 1; }
             .section-title { background: #ad1457 !important; color: white !important; padding: 10px 20px; font-size: 14px; font-weight: 800; text-transform: uppercase; margin-top: 25px; }
             table { width: 100%; border-collapse: collapse; margin-top: 5px; border: 1px solid #ddd; }
             th { background: #f5f5f5; text-align: left; padding: 10px; font-size: 9px; font-weight: 800; border-bottom: 1px solid #333; }
             td { padding: 10px; border-bottom: 1px solid #eee; font-size: 9px; vertical-align: top; }
             .break-avoid { break-inside: avoid; }
             .footer-sig { margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; padding: 0 50px; text-align: center; }
             .sig-line { border-top: 1px solid #000; padding-top: 10px; font-size: 10px; font-weight: 800; }
           }
         `}</style>

         {/* CABECERA AZUL MARINO */}
         <div className="header-nav">
            <h1>INFORME GERENCIAL DE CALIDAD DAC</h1>
            <p style={{fontSize:'10px', fontWeight: 'bold', marginTop:'5px', opacity:0.8}}>PERIODO DE GESTIÓN: {dateFrom} AL {dateTo}</p>
         </div>

         <div className="p-container">
            {/* KPI ROW IGUAL A LA IMAGEN */}
            <div className="kpi-row">
               <div className="kpi-box"><p className="val">{stats.total}</p><p className="lab">Incidencias<br/>Reportadas</p></div>
               <div className="kpi-box"><p className="val">{stats.resueltos}</p><p className="lab">Casos<br/>Cerrados</p></div>
               <div className="kpi-box"><p className="val">{stats.activos}</p><p className="lab">Pendientes<br/>de Gestión</p></div>
               <div className="kpi-box"><p className="val">{stats.criticas}</p><p className="lab">Alertas<br/>Críticas</p></div>
               <div className="kpi-box"><p className="val">{stats.satisfaction}</p><p className="lab">Nivel de<br/>Satisfacción (5.0)</p></div>
               <div className="kpi-box"><p className="val">{((stats.resueltos/(stats.total||1))*100).toFixed(0)}%</p><p className="lab">Tasa de<br/>Resolución</p></div>
            </div>

            {/* SECCIÓN PENDIENTES (COLOR MARRÓN) */}
            <div className="section-title">Detalle de Incidencias Prioritarias (Pendientes / Proceso)</div>
            <table>
               <thead>
                  <tr>
                     <th width="12%">FECHA / ID</th>
                     <th width="18%">PACIENTE / TEL.</th>
                     <th width="18%">ÁREA / JEFATURA</th>
                     <th width="35%">RELATO DEL PACIENTE</th>
                     <th width="10%">ESTADO</th>
                     <th width="7%">PRIO.</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.filter(c => c.status !== ComplaintStatus.RESUELTO).map(c => (
                    <tr key={c.id} className="break-avoid">
                       <td><b>{c.date}</b><br/>{c.id}</td>
                       <td><b className="uppercase">{c.patientName}</b><br/>{c.patientPhone} {isNoCall(c.patientPhone, c.patientName) ? "(RESTRICTO)" : ""}</td>
                       <td><b>{c.area}</b><br/>{c.managerName || 'Sin Jefe'}</td>
                       <td className="italic text-slate-500">"{c.description}"</td>
                       <td><b>{c.status.toUpperCase()}</b></td>
                       <td style={{color: c.priority === 'Crítica' ? 'red' : 'inherit'}}><b>{c.priority}</b></td>
                    </tr>
                  ))}
               </tbody>
            </table>

            {/* SECCIÓN RESUELTOS */}
            <div className="section-title">Histórico de Casos Resueltos en el Periodo</div>
            <table>
               <thead>
                  <tr>
                     <th width="15%">PACIENTE / ID</th>
                     <th width="15%">ÁREA / MÉDICO</th>
                     <th width="35%">RESOLUCIÓN ADMINISTRATIVA</th>
                     <th width="15%">AUDITOR</th>
                     <th width="10%">FECHA</th>
                     <th width="10%">SAT.</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.filter(c => c.status === ComplaintStatus.RESUELTO).map(c => (
                    <tr key={c.id} className="break-avoid">
                       <td><b className="uppercase">{c.patientName}</b><br/>{c.id}</td>
                       <td><b>{c.area}</b><br/>Dr. {c.doctorName || 'N/A'}</td>
                       <td><p className="font-bold text-slate-800">"{c.managementResponse}"</p></td>
                       <td>{c.resolvedBy || 'Central'}</td>
                       <td>{c.date}</td>
                       <td><b>{c.satisfaction}/5</b></td>
                    </tr>
                  ))}
               </tbody>
            </table>

            {/* RESUMEN ESTADÍSTICO FINAL */}
            <div style={{pageBreakBefore: 'always'}} className="p-container">
               <div className="section-title" style={{textAlign: 'center', background: '#333 !important'}}>Cuadro de Firmas y Auditoría Interna</div>
               
               <div className="footer-sig">
                  <div className="sig-line">AUDITORÍA DE CALIDAD DAC</div>
                  <div className="sig-line">DIRECCIÓN MÉDICA HOSPITALARIA</div>
               </div>

               <div style={{marginTop: '100px', padding: '40px', background:'#f9f9f9', border:'1px solid #eee', borderRadius:'20px'}}>
                  <h2 style={{fontSize:'12px', fontWeight:'900', textAlign:'center', textTransform:'uppercase', borderBottom:'1px solid #333', paddingBottom:'10px', marginBottom:'20px'}}>Nota del Sistema</h2>
                  <p style={{fontSize:'10px', lineHeight:'1.5', textAlign:'justify'}}>
                    Este documento ha sido generado automáticamente por el Sistema de Gestión de Calidad DAC v8.0. La información aquí presentada refleja fielmente los registros capturados durante el periodo comprendido entre el {dateFrom} y el {dateTo}. La exactitud de las resoluciones recae sobre los auditores firmantes y el Nodo Postgres centralizado. Queda prohibida la reproducción parcial o total sin autorización de la Dirección General.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

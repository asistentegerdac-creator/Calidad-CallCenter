
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority } from '../types';
import { dbService } from '../services/apiService';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  specialties: string[];
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  currentUser: User | null;
}

export const Reports: React.FC<Props> = ({ complaints, areas, specialties, onUpdateFull, onDelete, currentUser }) => {
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
    return noCallList.some(p => p.patientPhone === phone || (p.patientName && p.patientName.toLowerCase() === name.toLowerCase()));
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

  const handleSave = () => {
    const data = editing || resolving;
    if (data) {
      onUpdateFull({ ...data, resolvedBy: currentUser?.name || 'Admin' });
      setEditing(null);
      setResolving(null);
    }
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Pendientes y Proceso');

    // Estilos base
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' } // Indigo 950
    };

    const managerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF59E0B' } // Amber 500
    };

    const fontWhite: Partial<ExcelJS.Font> = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Plus Jakarta Sans',
      size: 11
    };

    const fontBlackBold: Partial<ExcelJS.Font> = {
      bold: true,
      name: 'Plus Jakarta Sans',
      size: 10
    };

    const fontStandard: Partial<ExcelJS.Font> = {
      name: 'Plus Jakarta Sans',
      size: 10
    };

    // Columnas
    worksheet.columns = [
      { header: 'FECHA', key: 'date', width: 15 },
      { header: 'ID', key: 'id', width: 15 },
      { header: 'PACIENTE', key: 'patientName', width: 30 },
      { header: 'ÁREA', key: 'area', width: 20 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'ESTADO', key: 'status', width: 15 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 50 },
    ];

    // Estilo de cabecera
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = fontWhite;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Filtrar y agrupar
    const pendingItems = complaints.filter(c => 
      c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO
    );

    const grouped: Record<string, Complaint[]> = {};
    pendingItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!grouped[mgr]) grouped[mgr] = [];
      grouped[mgr].push(c);
    });

    // Agregar datos agrupados
    Object.entries(grouped).forEach(([manager, items]) => {
      // Fila de Jefe
      const managerRow = worksheet.addRow([`JEFATURA: ${manager}`]);
      worksheet.mergeCells(`A${managerRow.number}:G${managerRow.number}`);
      managerRow.getCell(1).fill = managerFill;
      managerRow.getCell(1).font = fontWhite;
      managerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      items.forEach(item => {
        const row = worksheet.addRow({
          date: item.date,
          id: item.id,
          patientName: item.patientName.toUpperCase(),
          area: item.area,
          specialty: item.specialty,
          status: item.status,
          description: '' // Se deja vacío para usar la fila combinada abajo
        });

        row.eachCell((cell) => {
          cell.font = fontStandard;
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (cell.address.includes('F' + row.number)) { // Columna de Estado (F)
            cell.font = fontBlackBold;
            if (item.status === ComplaintStatus.PENDIENTE) {
              cell.font = { ...fontBlackBold, color: { argb: 'FFEA580C' } }; // Orange 600
            } else if (item.status === ComplaintStatus.PROCESO) {
              cell.font = { ...fontBlackBold, color: { argb: 'FF2563EB' } }; // Blue 600
            }
          }
        });

        // FILA DE DESCRIPCIÓN COMBINADA (Para mejor lectura de textos largos)
        const descRow = worksheet.addRow([`DESCRIPCIÓN: ${item.description}`]);
        worksheet.mergeCells(`A${descRow.number}:G${descRow.number}`);
        const descCell = descRow.getCell(1);
        descCell.font = { ...fontStandard, italic: true, size: 9, color: { argb: 'FF475569' } };
        descCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };
        descCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Slate 50
        };
        descCell.border = {
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        
        // Ajustar altura de fila según longitud del texto
        const estimatedLines = Math.ceil(item.description.length / 120);
        descRow.height = Math.max(25, estimatedLines * 15);
      });

      // Espacio entre grupos
      worksheet.addRow([]);
    });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_DAC_Pendientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setEditing(null);
    setResolving(null);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="glass-card p-6 md:p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-3">
                 <span className="w-10 h-10 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-lg">📊</span>
                 Informes y Auditoría
              </h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Visualice el historial y gestione resoluciones</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button onClick={() => window.print()} className="px-8 py-5 bg-indigo-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition-all">📄 PDF DASHBOARD</button>
               <button onClick={handleExportExcel} className="px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all">📊 EXCEL PENDIENTES</button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 p-6 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
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
              <option value="Todas">Todas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Jefe</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todos</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Estado</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Total</label>
             <div className="p-4 bg-indigo-900 text-white rounded-xl font-black text-center text-sm">{filtered.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-10 no-print">
        {(Object.entries(groupedByManager) as [string, Complaint[]][]).map(([manager, items]) => (
          <div key={manager} className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-md overflow-hidden">
            <h4 className="font-black text-indigo-900 text-sm uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
              JEFATURA: <span className="text-amber-600 ml-2">{manager}</span>
            </h4>
            <div className="overflow-x-auto -mx-6 md:mx-0">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase border-b pb-4">
                    <th className="px-4 pb-4" style={{ width: '120px' }}>FECHA / ID</th>
                    <th className="px-4 pb-4">PACIENTE</th>
                    <th className="px-4 pb-4">DESCRIPCIÓN</th>
                    <th className="px-4 pb-4" style={{ width: '120px' }}>ESTADO</th>
                    <th className="px-4 pb-4 text-right" style={{ width: '120px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => setResolving({...c})} 
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-6">
                        <p className="font-black text-slate-900 text-[11px] whitespace-nowrap">{c.date}</p>
                        <p className="text-[8px] text-slate-400 font-bold">{c.id}</p>
                      </td>
                      <td className="px-4 py-6">
                        <p className="font-black text-slate-900 uppercase text-[11px] truncate max-w-[150px]">{c.patientName}</p>
                        {isNoCall(c.patientPhone, c.patientName) && <span className="text-rose-600 text-[7px] font-black block mt-1">📵 RESTRINGIDO</span>}
                      </td>
                      <td className="px-4 py-6">
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{c.description}"</p>
                      </td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase inline-block whitespace-nowrap ${
                          c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 
                          c.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-right">
                         <button 
                            onClick={(e) => { e.stopPropagation(); setEditing({...c}); }} 
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 transition-all shadow-md"
                          >
                            Editar
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDICIÓN TOTAL (BOTÓN EDITAR) */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 md:p-12 rounded-[2.5rem] shadow-2xl relative my-auto border border-white/20">
            <button onClick={() => setEditing(null)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-rose-500 transition-colors">✕</button>
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-10 flex items-center gap-4">
              <span className="w-1.5 h-10 bg-orange-500 rounded-full"></span>
              Maestro de Registro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Fecha</label>
                <input type="date" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Paciente</label>
                <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Área</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Especialidad</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descripción Original</label>
                <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] text-sm font-bold h-32 outline-none transition-all" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                <button onClick={handleSave} className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all">
                  Guardar Cambios Maestros
                </button>
                <button onClick={() => handleDelete(editing.id)} className="py-6 px-10 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-700 transition-all">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESOLUCIÓN (CLIC EN FILA) */}
      {resolving && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3.5rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setResolving(null)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-orange-500 transition-colors">✕</button>
            <div className="mb-8">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Expediente</h3>
               <p className="text-[10px] font-black text-orange-500 tracking-[0.2em] mt-2 uppercase">{resolving.id} | {resolving.patientName}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100 shadow-inner max-h-32 overflow-y-auto">
               <p className="text-xs text-slate-600 font-bold italic leading-relaxed">"{resolving.description}"</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Actualizar Estado</label>
                <div className="flex gap-3">
                  {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setResolving({...resolving, status: s})} 
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm ${resolving.status === s ? 'bg-slate-900 text-white scale-105' : 'bg-slate-50 text-slate-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Resolución / Descargo Jefatura</label>
                <textarea 
                  className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] text-sm font-bold h-40 outline-none transition-all shadow-inner" 
                  value={resolving.managementResponse || ''} 
                  onChange={e => setResolving({...resolving, managementResponse: e.target.value})} 
                  placeholder="Detalle los pasos seguidos para solventar el reclamo..." 
                />
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleSave} 
                  className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-orange-600 transition-all transform hover:-translate-y-1"
                >
                  Finalizar Gestión
                </button>
                <button 
                  onClick={() => handleDelete(resolving.id)} 
                  className="w-full py-4 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all"
                >
                  Eliminar permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

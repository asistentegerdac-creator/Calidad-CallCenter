
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority, DIMENSIONS } from '../types';
import { dbService } from '../services/apiService';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  specialties: string[];
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  currentUser: User | null;
  timezone: string;
  onPreviewImage?: (img: string) => void;
}

export const Reports: React.FC<Props> = ({ complaints, areas, specialties, onUpdateFull, onDelete, currentUser, timezone, onPreviewImage }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDimension, setFilterDimension] = useState('Todas');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'pending' | 'resolved'>('pending');
  const [exportDateFrom, setExportDateFrom] = useState(dateFrom);
  const [exportDateTo, setExportDateTo] = useState(dateTo);

  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [resolving, setResolving] = useState<Complaint | null>(null);
  const [tempResponse, setTempResponse] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  useEffect(() => {
    if (resolving || editing) {
      setEvidenceImages([]); // Initialize as empty for new uploads
      // Si es auditor o está observado, empezamos con campo vacío para nueva respuesta/observación
      const current = resolving || editing;
      if (current) {
        const shouldClear = currentUser?.role === 'auditor' || current.isObserved;
        setTempResponse(shouldClear ? '' : (current.managementResponse || ''));
      }
    }
  }, [resolving, editing, currentUser]);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || (p.patientName && p.patientName.toLowerCase() === name.toLowerCase()));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidenceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
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
      [ComplaintStatus.CERRADO]: 3,
    };

    return [...complaints]
      .filter(c => {
        const matchManager = filterManager === 'Todos' ? true : c.managerName === filterManager;
        const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
        const matchStatus = filterStatus === 'Todos' ? true : (filterStatus === 'Observados' ? c.isObserved : c.status === filterStatus);
        const matchDimension = filterDimension === 'Todas' ? true : c.dimension === filterDimension;
        const matchDate = c.date >= dateFrom && c.date <= dateTo;
        return matchManager && matchArea && matchStatus && matchDimension && matchDate;
      })
      .sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
  }, [complaints, filterManager, filterArea, filterStatus, filterDimension, dateFrom, dateTo]);

  const groupedByManager = useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    filtered.forEach(c => {
      const boss = c.managerName || 'SIN JEFE ASIGNADO';
      if (!groups[boss]) groups[boss] = [];
      groups[boss].push(c);
    });
    return groups;
  }, [filtered]);

  const handleFullEditSave = () => {
    if (editing) {
      onUpdateFull(editing);
      setEditing(null);
      setResolving(null);
    }
  };

  const handleResolutionSave = (auditAction?: 'observe' | 'close' | 'approve') => {
    if (resolving) {
      if (resolving.status === ComplaintStatus.CERRADO && currentUser?.role !== 'admin') {
        return alert("Este caso ya está cerrado.");
      }

      const history = resolving.responseHistory || [];
      const newHistory = [...history];
      const userInput = tempResponse || '';

      // Si el usuario es auditor
      if (currentUser?.role === 'auditor') {
        if (!userInput.trim()) return alert("Debe ingresar una observación.");
        
        newHistory.push({
          text: userInput,
          user: currentUser.name,
          timestamp: getCurrentTimeInTimezone(timezone),
          type: 'auditor'
        });

        const isMarkingObserved = auditAction === 'observe';
        const isClosing = auditAction === 'close';
        
        const updatedData: Complaint = {
          ...resolving,
          status: isClosing ? ComplaintStatus.CERRADO : (isMarkingObserved ? ComplaintStatus.PENDIENTE : ComplaintStatus.RESUELTO),
          isObserved: isMarkingObserved,
          responseHistory: newHistory,
          evidenceImages: [...(resolving.evidenceImages || []), ...evidenceImages], // Include new images
          resolvedBy: isMarkingObserved ? undefined : (resolving.resolvedBy || currentUser.name),
          managementResponse: isMarkingObserved ? '' : resolving.managementResponse 
        };

        onUpdateFull(updatedData);
        setEditing(null);
        setResolving(null);
        setTempResponse('');
        return;
      }

      // Si el usuario es manager/jefe (o admin)
      if (!userInput.trim()) return alert("Debe ingresar su descargo.");

      newHistory.push({
        text: userInput,
        user: currentUser?.name || 'Admin',
        timestamp: getCurrentTimeInTimezone(timezone),
        type: 'manager'
      });

      const updatedData: Complaint = { 
        ...resolving, 
        managementResponse: userInput,
        responseHistory: newHistory,
        isObserved: false,
        evidenceImages: [...(resolving.evidenceImages || []), ...evidenceImages], // Support cumulative images
        resolvedBy: currentUser?.name || 'Admin' 
      };
      
      if (updatedData.status === ComplaintStatus.RESUELTO && !updatedData.resolvedAt) {
        updatedData.resolvedAt = getCurrentTimeInTimezone(timezone);
      }
      onUpdateFull(updatedData);
      setEditing(null);
      setResolving(null);
      setTempResponse('');
    }
  };

  const handleExportExcel = async (from: string, to: string) => {
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
      { header: 'DIMENSIÓN', key: 'dimension', width: 25 },
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

    // Filtrar y agrupar por rango de fecha solicitado (asegurando comparación limpia de fechas)
    const pendingItems = complaints.filter(c => {
      const cDate = c.date.trim().substring(0, 10);
      const fromDate = from.trim().substring(0, 10);
      const toDate = to.trim().substring(0, 10);
      return (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO) &&
             cDate >= fromDate && cDate <= toDate;
    });

    const grouped: Record<string, Complaint[]> = {};
    pendingItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!grouped[mgr]) grouped[mgr] = [];
      grouped[mgr].push(c);
    });

    // Agregar datos agrupados
    Object.entries(grouped).forEach(([manager, items]) => {
      const totalCount = items.length;
      // Fila de Jefe con TOTAL
      const managerRow = worksheet.addRow([`JEFATURA: ${manager} (TOTAL PENDIENTES: ${totalCount})`]);
      worksheet.mergeCells(`A${managerRow.number}:H${managerRow.number}`);
      managerRow.getCell(1).fill = managerFill;
      managerRow.getCell(1).font = fontWhite;
      managerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      items.forEach(item => {
        const row = worksheet.addRow({
          date: item.date,
          id: item.id,
          dimension: item.dimension,
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
          
          // Columna de Estado (F)
          if (cell.address.includes('F' + row.number)) { 
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
        worksheet.mergeCells(`A${descRow.number}:H${descRow.number}`);
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
    saveAs(new Blob([buffer]), `Reporte_DAC_Pendientes_${from}_al_${to}.xlsx`);
  };

  const handleExportExcelResolved = async (from: string, to: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Resueltos');

    // Estilos base
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' } // Indigo 950
    };

    const managerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' } // Emerald 500 para resueltos
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
      { header: 'FECHA INICIO', key: 'date', width: 15 },
      { header: 'ID', key: 'id', width: 15 },
      { header: 'DIMENSIÓN', key: 'dimension', width: 25 },
      { header: 'PACIENTE', key: 'patientName', width: 30 },
      { header: 'ÁREA', key: 'area', width: 20 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'ESTADO', key: 'status', width: 15 },
      { header: 'FECHA RES.', key: 'resolvedDate', width: 15 },
      { header: 'HORA RES.', key: 'resolvedTime', width: 15 },
      { header: 'RESUELTO POR', key: 'resolvedBy', width: 25 },
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

    // Filtrar por RESUELTOS y rango de fecha solicitado (asegurando comparación limpia de fechas)
    const resolvedItems = complaints.filter(c => {
      const cDate = c.date.trim().substring(0, 10);
      const fromDate = from.trim().substring(0, 10);
      const toDate = to.trim().substring(0, 10);
      return c.status === ComplaintStatus.RESUELTO && cDate >= fromDate && cDate <= toDate;
    });

    const grouped: Record<string, Complaint[]> = {};
    resolvedItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!grouped[mgr]) grouped[mgr] = [];
      grouped[mgr].push(c);
    });

    // Agregar datos agrupados
    Object.entries(grouped).forEach(([manager, items]) => {
      const totalCount = items.length;
      // Fila de Jefe con TOTAL
      const managerRow = worksheet.addRow([`JEFATURA: ${manager} (TOTAL RESUELTOS: ${totalCount})`]);
      worksheet.mergeCells(`A${managerRow.number}:K${managerRow.number}`);
      managerRow.getCell(1).fill = managerFill;
      managerRow.getCell(1).font = fontWhite;
      managerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      items.forEach(item => {
        const resolvedDateObj = item.resolvedAt ? new Date(item.resolvedAt) : null;
        
        const row = worksheet.addRow({
          date: item.date,
          id: item.id,
          dimension: item.dimension,
          patientName: item.patientName.toUpperCase(),
          area: item.area,
          specialty: item.specialty,
          status: item.status,
          resolvedDate: resolvedDateObj ? resolvedDateObj.toLocaleDateString() : 'N/A',
          resolvedTime: resolvedDateObj ? resolvedDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          resolvedBy: item.resolvedBy || 'N/A',
          description: '' 
        });

        row.eachCell((cell) => {
          cell.font = fontStandard;
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (cell.address.includes('F' + row.number)) { 
            cell.font = { ...fontBlackBold, color: { argb: 'FF10B981' } }; // Emerald 600
          }
        });

        // FILA DE DESCRIPCIÓN COMBINADA
        const descRow = worksheet.addRow([`DESCRIPCIÓN: ${item.description}`]);
        worksheet.mergeCells(`A${descRow.number}:K${descRow.number}`);
        const descCell = descRow.getCell(1);
        descCell.font = { ...fontStandard, italic: true, size: 9, color: { argb: 'FF475569' } };
        descCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };
        descCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } 
        };
        descCell.border = {
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        
        const estimatedLines = Math.ceil(item.description.length / 150);
        descRow.height = Math.max(25, estimatedLines * 15);

        // FILA(S) DE RESPUESTA(S) / AUDITORÍA
        if (item.responseHistory && item.responseHistory.length > 0) {
          item.responseHistory.forEach((entry, eIdx) => {
            const entryRow = worksheet.addRow([`${entry.type === 'auditor' ? 'AUDITORÍA' : 'RESPUESTA JEFE'} (${entry.user} - ${entry.timestamp}): ${entry.text}`]);
            worksheet.mergeCells(`A${entryRow.number}:K${entryRow.number}`);
            const entryCell = entryRow.getCell(1);
            
            const isAuditor = entry.type === 'auditor';
            entryCell.font = { ...fontStandard, bold: true, size: 9, color: { argb: isAuditor ? 'FFBE123C' : 'FF1E40AF' } }; 
            entryCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };
            entryCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isAuditor ? 'FFFFF1F2' : 'FFEFF6FF' } 
            };
            entryCell.border = {
              bottom: { style: 'thin', color: { argb: isAuditor ? 'FFFECDD3' : 'FFBFDBFE' } },
              left: { style: 'thin', color: { argb: isAuditor ? 'FFFECDD3' : 'FFBFDBFE' } },
              right: { style: 'thin', color: { argb: isAuditor ? 'FFFECDD3' : 'FFBFDBFE' } }
            };
            
            const eLines = Math.ceil(entry.text.length / 150);
            entryRow.height = Math.max(25, eLines * 15);
          });
        } else {
          // Fallback para datos antiguos sin historial
          const responseText = item.managementResponse || 'SIN RESPUESTA REGISTRADA';
          const resDate = resolvedDateObj ? resolvedDateObj.toLocaleDateString() : 'N/A';
          const resTime = resolvedDateObj ? resolvedDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
          
          const respRow = worksheet.addRow([`RESPUESTA JEFE (${resDate} ${resTime}): ${responseText}`]);
          worksheet.mergeCells(`A${respRow.number}:K${respRow.number}`);
          const respCell = respRow.getCell(1);
          respCell.font = { ...fontStandard, bold: true, size: 9, color: { argb: 'FF1E40AF' } }; 
          respCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };
          respCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFF6FF' } 
          };
          respCell.border = {
            bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
            left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
            right: { style: 'thin', color: { argb: 'FFBFDBFE' } }
          };
          
          const estimatedRespLines = Math.ceil(responseText.length / 150);
          respRow.height = Math.max(25, estimatedRespLines * 15);
        }
      });

      worksheet.addRow([]);
    });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_DAC_Resueltos_${from}_al_${to}.xlsx`);
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
               <button onClick={() => { setExportType('pending'); setExportDateFrom(dateFrom); setExportDateTo(dateTo); setShowExportModal(true); }} className="px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all">📊 EXCEL PENDIENTES</button>
               <button onClick={() => { setExportType('resolved'); setExportDateFrom(dateFrom); setExportDateTo(dateTo); setShowExportModal(true); }} className="px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 hover:scale-105 transition-all">📊 EXCEL RESUELTOS</button>
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
              <option value="Observados">SÓLO OBSERVADOS</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dimensión</label>
            <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterDimension} onChange={e => setFilterDimension(e.target.value)}>
              <option value="Todas">Todas</option>
              {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
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
                    <th className="px-4 pb-4">DIMENSIÓN</th>
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
                        className={`hover:bg-slate-50 transition-colors group cursor-pointer ${c.isObserved ? 'bg-rose-50/50' : ''}`}
                      >
                      <td className="px-4 py-6">
                        <p className="font-black text-slate-900 text-[11px] whitespace-nowrap">{c.date}</p>
                        <p className="text-[8px] text-slate-400 font-bold">{c.id}</p>
                      </td>
                      <td className="px-4 py-6">
                        <p className="font-black text-slate-900 text-[11px]">{c.dimension || 'General'}</p>
                      </td>
                      <td className="px-4 py-6">
                        <p className="font-black text-slate-900 uppercase text-[11px] truncate max-w-[150px]">{c.patientName}</p>
                        {isNoCall(c.patientPhone, c.patientName) && <span className="text-rose-600 text-[7px] font-black block mt-1">📵 RESTRINGIDO</span>}
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{c.description}"</p>
                          {c.evidenceImages && c.evidenceImages.length > 0 && (
                            <div className="flex gap-1 overflow-x-auto">
                               {c.evidenceImages.slice(0, 3).map((img, idx) => (
                                 <img 
                                   key={idx} 
                                   src={img} 
                                   className="w-6 h-6 object-cover rounded border border-slate-200 cursor-zoom-in" 
                                   alt="Sustento" 
                                   onClick={(e) => { e.stopPropagation(); onPreviewImage?.(img); }}
                                 />
                               ))}
                               {c.evidenceImages.length > 3 && <span className="text-[7px] text-slate-400 font-black">+{c.evidenceImages.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase inline-block whitespace-nowrap text-center ${
                            c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-100 text-emerald-700' : 
                            c.status === ComplaintStatus.CERRADO ? 'bg-slate-900 text-white' :
                            c.status === ComplaintStatus.PROCESO ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          } ${c.isObserved ? 'border-2 border-rose-600 bg-rose-50 text-rose-700 animate-pulse' : ''}`}>
                            {c.status}
                          </span>
                          {c.isObserved && (
                            <span className="bg-rose-600 text-white text-[7px] font-black px-2 py-0.5 rounded text-center uppercase tracking-tighter">
                              ⚠️ Observado
                            </span>
                          )}
                          {c.evidenceImages && c.evidenceImages.length > 0 && (
                            <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded text-center uppercase tracking-tighter">
                              🖼️ Con Sustento
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6 text-right">
                         {currentUser?.role === 'admin' && (
                           <button 
                              onClick={(e) => { e.stopPropagation(); setEditing({...c}); }} 
                              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 transition-all shadow-md"
                            >
                              Editar
                            </button>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EXPORTACIÓN */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[600] no-print">
          <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setShowExportModal(false)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-rose-500 transition-colors">✕</button>
            <div className="mb-8">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Exportar a Excel</h3>
               <p className="text-[10px] font-black text-indigo-500 tracking-[0.2em] mt-2 uppercase">
                 {exportType === 'pending' ? 'Casos Pendientes y en Proceso' : 'Casos Resueltos'}
               </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Desde (Fecha Incidencia)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner" 
                  value={exportDateFrom} 
                  onChange={e => setExportDateFrom(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Hasta (Fecha Incidencia)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner" 
                  value={exportDateTo} 
                  onChange={e => setExportDateTo(e.target.value)} 
                />
              </div>

              <button 
                onClick={() => {
                  if (exportType === 'pending') {
                    handleExportExcel(exportDateFrom, exportDateTo);
                  } else {
                    handleExportExcelResolved(exportDateFrom, exportDateTo);
                  }
                  setShowExportModal(false);
                }} 
                className="w-full py-6 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all transform hover:-translate-y-1"
              >
                GENERAR EXCEL
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descripción Original</label>
                <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] text-sm font-bold h-32 outline-none transition-all" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
              {editing.evidenceImages && editing.evidenceImages.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Imágenes de Sustento Existentes</label>
                  <div className="flex flex-wrap gap-2">
                    {editing.evidenceImages.map((img, idx) => (
                      <div key={idx} className="relative group cursor-zoom-in" onClick={() => onPreviewImage?.(img)}>
                        <img src={img} alt="Sustento" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                        <button onClick={(e) => { e.stopPropagation(); setEditing({...editing, evidenceImages: editing.evidenceImages?.filter((_, i) => i !== idx)}); }} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-100">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                <button onClick={() => handleFullEditSave()} className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all">
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
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-4 border border-slate-100 shadow-inner max-h-40 overflow-y-auto">
               <div className="mb-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dimensión:</p>
                 <p className="text-[11px] font-black text-slate-900">{resolving.dimension}</p>
               </div>
               <p className="text-xs text-slate-600 font-bold italic leading-relaxed">"{resolving.description}"</p>
            </div>

            {/* IMÁGENES DE SUSTENTO */}
            {resolving.evidenceImages && resolving.evidenceImages.length > 0 && (
              <div className="mb-6 space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                <div className="flex flex-wrap gap-2">
                  {resolving.evidenceImages.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="Evidencia" 
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:scale-105 transition-all" 
                      onClick={() => onPreviewImage?.(img)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* HISTORIAL - Mostrar solo si hay historial y NO es auditor viendo caso no resuelto */}
            {((resolving.responseHistory && resolving.responseHistory.length > 0) || resolving.managementResponse) && 
             !(currentUser?.role === 'auditor' && resolving.status !== ComplaintStatus.RESUELTO) && (
              <div className="space-y-3 mb-6">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Respuesta de Jefatura / Seguimiento</label>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {resolving.responseHistory && resolving.responseHistory.map((h, i) => (
                    <div key={i} className={`p-4 rounded-2xl text-[10px] border ${h.type === 'auditor' ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                      <div className="flex justify-between mb-1">
                        <span className="font-black uppercase">{h.type === 'auditor' ? 'AUDIT' : 'JEFE'}</span>
                        <span className="text-slate-400">{h.timestamp}</span>
                      </div>
                      <p className="font-bold">{h.user}: <span className="font-medium text-slate-600">{h.text}</span></p>
                    </div>
                  ))}

                  {/* Compatibilidad: mostrar managementResponse si no está en historial */}
                  {resolving.managementResponse && (!resolving.responseHistory || !resolving.responseHistory.some(h => h.text === resolving.managementResponse)) && (
                    <div className="p-4 rounded-2xl text-[10px] border bg-amber-50 border-amber-100">
                      <div className="flex justify-between mb-1">
                        <span className="font-black uppercase text-amber-600">ÚLTIMO DESCARGO (ACTUAL)</span>
                      </div>
                      <p className="text-slate-600 font-medium italic">"{resolving.managementResponse}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {currentUser?.role === 'auditor' ? (
                resolving.status === ComplaintStatus.RESUELTO ? (
                  <div className="space-y-4 bg-slate-900 p-6 rounded-[2rem]">
                    <label className="text-[10px] font-black uppercase text-white/50 ml-2 tracking-widest">Observación de Auditoría</label>
                    <textarea 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-bold h-24 outline-none"
                      value={tempResponse}
                      onChange={e => setTempResponse(e.target.value)}
                      placeholder="Ingrese su observación aquí..."
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleResolutionSave('approve')} className="py-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-[9px]">Aprobar</button>
                      <button onClick={() => handleResolutionSave('observe')} className="py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-[9px]">Observar</button>
                      <button onClick={() => handleResolutionSave('close')} className="py-4 bg-slate-700 text-white rounded-xl font-black uppercase text-[9px]">Cerrar Caso</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-loose">
                      Auditoría disponible solo para casos <br/><span className="text-orange-500">RESUELTOS</span>
                    </p>
                  </div>
                )
              ) : (
                <>
                  {resolving?.isObserved && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-4 flex items-center gap-3">
                       <span className="text-xl">⚠️</span>
                       <div>
                         <p className="text-[10px] font-black text-rose-600 uppercase">Incidencia Observada por Auditoría</p>
                         <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Debe ingresar un nuevo descargo detallado.</p>
                       </div>
                    </div>
                  )}
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
                      className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] text-sm font-bold h-32 outline-none transition-all shadow-inner" 
                      value={tempResponse} 
                      onChange={e => setTempResponse(e.target.value)} 
                      placeholder="Ingrese un nuevo descargo..." 
                    />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                     <div className="flex flex-wrap gap-3 mb-4">
                        {evidenceImages.map((img, idx) => (
                         <div key={idx} className="relative group cursor-zoom-in" onClick={() => onPreviewImage?.(img)}>
                           <img src={img} alt="Sustento" className="w-16 h-16 object-cover rounded-xl border-2 border-slate-200" />
                           <button onClick={(e) => { e.stopPropagation(); setEvidenceImages(prev => prev.filter((_, i) => i !== idx)); }} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                         </div>
                       ))}
                       <label className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-300 hover:text-blue-500 hover:border-blue-500">
                         <span className="text-lg font-bold">+</span>
                         <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                       </label>
                     </div>
                  </div>

                  <button 
                    onClick={() => handleResolutionSave()} 
                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all"
                  >
                    Actualizar Descargo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

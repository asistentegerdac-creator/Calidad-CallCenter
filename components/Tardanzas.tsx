import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';
import { 
  Clock, 
  Search, 
  Calendar, 
  Download, 
  User as UserIcon, 
  CheckCircle2, 
  AlertTriangle,
  Upload,
  X,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  Sparkles,
  Check,
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  Activity,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Props {
  complaints: Complaint[];
  currentUser: User | null;
  onUpdateFull: (c: Complaint) => void;
  timezone: string;
  areas?: string[];
}

const MONTH_NAMES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

export const Tardanzas: React.FC<Props> = ({ 
  complaints, 
  currentUser, 
  onUpdateFull, 
  timezone,
  areas = ["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]
}) => {
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedArea, setSelectedArea] = useState<string>('Consultas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gestion' | 'dashboard'>('gestion');

  // Form State for Mass Resolution
  const [tempResponse, setTempResponse] = useState('');
  const [involvedPersonnel, setInvolvedPersonnel] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [correctiveMeasure, setCorrectiveMeasure] = useState('');
  const [correctiveMeasureOther, setCorrectiveMeasureOther] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Helper to identify if a complaint is a lateness/tardiness report based on the sub-dimension
  const isTardinessComplaint = (c: Complaint) => {
    if (!c.subDimension) return false;
    const sub = c.subDimension.toLowerCase().trim();
    return sub.includes('tarde') || sub.includes('tardanza') || sub.includes('demora') || sub.includes('retraso');
  };

  // Extract complaints for the selected month/year that match tardiness criteria and selected area
  const tardinessComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (!isTardinessComplaint(c)) return false;
      const [y, m] = c.date.split('-');
      if (y !== selectedYear || m !== selectedMonth) return false;
      
      if (selectedArea !== 'all') {
        return (c.area || '').toLowerCase().trim() === selectedArea.toLowerCase().trim();
      }
      return true;
    });
  }, [complaints, selectedMonth, selectedYear, selectedArea]);

  // Group complaints by Doctor
  const groupedDoctors = useMemo(() => {
    const map: Record<string, { doctorName: string; complaints: Complaint[]; dates: string[]; unresolvedCount: number }> = {};
    
    tardinessComplaints.forEach(c => {
      const docRaw = c.doctorName || 'MÉDICO NO ASIGNADO';
      const docKey = docRaw.trim().toUpperCase();
      
      if (!map[docKey]) {
        map[docKey] = {
          doctorName: docRaw,
          complaints: [],
          dates: [],
          unresolvedCount: 0
        };
      }
      
      map[docKey].complaints.push(c);
      
      if (!map[docKey].dates.includes(c.date)) {
        map[docKey].dates.push(c.date);
      }

      if (c.status !== ComplaintStatus.RESUELTO && c.status !== ComplaintStatus.CERRADO) {
        map[docKey].unresolvedCount += 1;
      }
    });

    // Sort dates
    Object.values(map).forEach(doc => {
      doc.dates.sort();
    });

    return Object.values(map).filter(doc => {
      if (!searchQuery.trim()) return true;
      return doc.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [tardinessComplaints, searchQuery]);

  // Analytical statistics for the Dashboard View
  const stats = useMemo(() => {
    const total = tardinessComplaints.length;
    const resolved = tardinessComplaints.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const pending = tardinessComplaints.filter(c => c.status !== ComplaintStatus.RESUELTO && c.status !== ComplaintStatus.CERRADO).length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const uniqueDocs = new Set(tardinessComplaints.map(c => (c.doctorName || '').trim().toUpperCase()).filter(Boolean)).size;

    // Doctor with most tardiness
    let topDocName = 'Ninguno';
    let topDocCount = 0;
    const docCounts: Record<string, number> = {};
    tardinessComplaints.forEach(c => {
      const doc = (c.doctorName || 'Médico No Asignado').trim();
      docCounts[doc] = (docCounts[doc] || 0) + 1;
      if (docCounts[doc] > topDocCount) {
        topDocCount = docCounts[doc];
        topDocName = doc;
      }
    });

    // Delays by Area
    const areaCounts: Record<string, number> = {};
    tardinessComplaints.forEach(c => {
      const area = c.area || 'Sin especificar';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    const areaData = Object.entries(areaCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Delays by Specialty
    const specialtyCounts: Record<string, number> = {};
    tardinessComplaints.forEach(c => {
      const sp = c.specialty || 'Sin especificar';
      specialtyCounts[sp] = (specialtyCounts[sp] || 0) + 1;
    });
    const specialtyData = Object.entries(specialtyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Doctors with most accumulated tardiness for bar ranking (up to top 10)
    const docChartData = groupedDoctors
      .map(doc => ({
        name: doc.doctorName,
        tardanzas: doc.complaints.length,
        pendientes: doc.unresolvedCount,
        resueltos: doc.complaints.length - doc.unresolvedCount
      }))
      .sort((a, b) => b.tardanzas - a.tardanzas)
      .slice(0, 10);

    return {
      total,
      resolved,
      pending,
      rate,
      uniqueDocs,
      topDocName,
      topDocCount,
      areaData,
      specialtyData,
      docChartData
    };
  }, [tardinessComplaints, groupedDoctors]);

  const activeDoctorData = useMemo(() => {
    if (!selectedDoctor) return null;
    return groupedDoctors.find(doc => doc.doctorName.toUpperCase() === selectedDoctor.toUpperCase()) || null;
  }, [selectedDoctor, groupedDoctors]);

  const handleSelectDoctor = (docName: string) => {
    setSelectedDoctor(docName);
    setInvolvedPersonnel(docName);
    setTempResponse('');
    setActionTaken('');
    setCorrectiveMeasure('');
    setCorrectiveMeasureOther('');
    setEvidenceImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidenceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleMassResolve = () => {
    if (!activeDoctorData) return;

    const unresolvedComplaints = activeDoctorData.complaints.filter(
      c => c.status !== ComplaintStatus.RESUELTO && c.status !== ComplaintStatus.CERRADO
    );

    if (unresolvedComplaints.length === 0) {
      alert("No hay reclamos pendientes para resolver de este médico.");
      return;
    }

    // Standard validations matching Reports.tsx & IncidencesReported.tsx
    const missingFields: string[] = [];

    if (!tempResponse.trim()) {
      missingFields.push("- Detalles de la acción tomada / Seguimiento de control");
    }
    if (!involvedPersonnel.trim()) {
      missingFields.push("- Personal Involucrado");
    }
    if (!actionTaken.trim()) {
      missingFields.push("- Acción Tomada por Jefatura");
    }
    if (!correctiveMeasure) {
      missingFields.push("- Medida Correctiva");
    } else {
      if (correctiveMeasure === 'otra' && !correctiveMeasureOther.trim()) {
        missingFields.push("- Especificación de la otra medida correctiva");
      }
      if (correctiveMeasure === 'Memorandum' && (!evidenceImages || !evidenceImages.length)) {
        missingFields.push("- Sustento fotográfico (Imagen de evidencia obligatoria para la medida correctiva 'Memorandum')");
      }
    }

    if (missingFields.length > 0) {
      alert(`No se puede resolver masivamente porque faltan completar datos obligatorios:\n\n${missingFields.join('\n')}`);
      return;
    }

    setIsResolving(true);

    try {
      unresolvedComplaints.forEach(selected => {
        const history = selected.responseHistory || [];
        const newHistory = [...history];

        newHistory.push({
          text: tempResponse.trim(),
          user: currentUser?.name || 'Jefe de Jefatura',
          timestamp: getCurrentTimeInTimezone(timezone),
          type: 'manager'
        });

        const updatedData: Complaint = {
          ...selected,
          status: ComplaintStatus.RESUELTO,
          managementResponse: tempResponse.trim(),
          responseHistory: newHistory,
          isObserved: false,
          resolvedBy: currentUser?.name || 'Jefe de Jefatura',
          resolvedAt: getCurrentTimeInTimezone(timezone),
          evidenceImages: [...(selected.evidenceImages || []), ...evidenceImages],
          involvedPersonnel: involvedPersonnel.trim(),
          actionTaken: actionTaken.trim(),
          correctiveMeasure: correctiveMeasure,
          correctiveMeasureOther: correctiveMeasure === 'otra' ? correctiveMeasureOther.trim() : '',
        };

        onUpdateFull(updatedData);
      });

      alert(`¡Éxito! Se han resuelto masivamente ${unresolvedComplaints.length} reclamos asociados a tardanzas del Dr. ${activeDoctorData.doctorName}.`);
      
      // Reset form states
      setTempResponse('');
      setActionTaken('');
      setCorrectiveMeasure('');
      setCorrectiveMeasureOther('');
      setEvidenceImages([]);
      setSelectedDoctor(null);
    } catch (err: any) {
      alert("Error al guardar cambios: " + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const handleExportExcel = async () => {
    if (groupedDoctors.length === 0) {
      alert("No hay registros de tardanzas para exportar en este mes.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tardanzas de Médicos');

    worksheet.views = [{ showGridLines: true }];

    const titleFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 16, bold: true, color: { argb: 'FF1E1B4B' } };
    const subtitleFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 11, italic: true, color: { argb: 'FF475569' } };
    const sectionHeaderFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    const tableHeaderFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    const dataFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 9 };
    const boldDataFont: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 9, bold: true };

    const navyFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
    const lightSlateFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const softGreenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    const softOrangeFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };

    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // Title Block
    worksheet.addRow(['REPORTE MENSUAL DE TARDANZAS DE PERSONAL MÉDICO']).font = titleFont;
    worksheet.addRow([`Período: ${MONTH_NAMES.find(m => m.value === selectedMonth)?.label} ${selectedYear} • Área: ${selectedArea === 'all' ? 'Todas' : selectedArea}`]).font = subtitleFont;
    worksheet.addRow([]);

    // Summary Section
    worksheet.addRow(['RESUMEN DE TARDANZAS POR MÉDICO']).font = { name: 'Plus Jakarta Sans', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    const summaryHeaderRow = worksheet.addRow(['MÉDICO / PERSONAL', 'CANTIDAD DE TARDANZAS EN EL MES', 'FECHAS REGISTRADAS']);
    summaryHeaderRow.eachCell(c => {
      c.font = { ...tableHeaderFont, color: { argb: 'FFFFFFFF' } };
      c.fill = navyFill;
      c.border = borderStyle;
    });

    groupedDoctors.forEach(doc => {
      const row = worksheet.addRow([
        doc.doctorName,
        doc.complaints.length,
        doc.dates.join(', ')
      ]);
      row.eachCell(c => {
        c.font = dataFont;
        c.border = borderStyle;
        c.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Section per Doctor
    worksheet.addRow(['DETALLE DE RECLAMOS POR MÉDICO']).font = { name: 'Plus Jakarta Sans', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.addRow([]);

    groupedDoctors.forEach(doc => {
      const secRow = worksheet.addRow([`MÉDICO: ${doc.doctorName} (Total tardanzas: ${doc.complaints.length})`]);
      secRow.font = sectionHeaderFont;
      worksheet.mergeCells(`A${secRow.number}:I${secRow.number}`);
      secRow.getCell(1).fill = navyFill;
      secRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      const detailHeaderRow = worksheet.addRow([
        'CÓDIGO',
        'FECHA',
        'ÁREA',
        'ESPECIALIDAD',
        'PACIENTE',
        'TELÉFONO',
        'RELATO DE INCIDENCIA',
        'ESTADO',
        'MEDIDA CORRECTIVA / ACCIÓN'
      ]);
      detailHeaderRow.eachCell(c => {
        c.font = tableHeaderFont;
        c.fill = lightSlateFill;
        c.border = borderStyle;
        c.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      doc.complaints.forEach(c => {
        const row = worksheet.addRow([
          c.id,
          c.date,
          c.area,
          c.specialty,
          c.patientName,
          c.patientPhone,
          c.description,
          c.status,
          c.status === ComplaintStatus.RESUELTO
            ? `${c.correctiveMeasure || 'Resuelto'} - ${c.actionTaken || ''}`
            : 'Pendiente de Gestión'
        ]);
        row.eachCell(cell => {
          cell.font = dataFont;
          cell.border = borderStyle;
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

          if (cell.address.startsWith('H')) {
            cell.font = boldDataFont;
            if (c.status === ComplaintStatus.PENDIENTE) {
              cell.font.color = { argb: 'FFEA580C' };
              cell.fill = softOrangeFill;
            } else if (c.status === ComplaintStatus.RESUELTO) {
              cell.font.color = { argb: 'FF10B981' };
              cell.fill = softGreenFill;
            }
          }
        });
        
        const maxChars = Math.max(c.description.length / 50, 1);
        row.height = Math.max(20, Math.ceil(maxChars) * 12);
      });

      worksheet.addRow([]); 
    });

    // Column widths
    worksheet.columns = [
      { key: 'col1', width: 15 }, // CÓDIGO
      { key: 'col2', width: 15 }, // FECHA
      { key: 'col3', width: 20 }, // ÁREA
      { key: 'col4', width: 20 }, // ESPECIALIDAD
      { key: 'col5', width: 25 }, // PACIENTE
      { key: 'col6', width: 18 }, // TELÉFONO
      { key: 'col7', width: 50 }, // RELATO
      { key: 'col8', width: 15 }, // ESTADO
      { key: 'col9', width: 40 }  // MEDIDA CORRECTIVA
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_Tardanzas_Medicos_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
            Control de Tardanzas
          </h2>
          <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">
            Reportes Detallados y Respuestas Masivas a Jefatura por Lateness/Demoras
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select 
              className="bg-transparent text-white font-extrabold text-[11px] uppercase tracking-wide outline-none cursor-pointer"
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setSelectedDoctor(null); }}
            >
              {MONTH_NAMES.map(m => (
                <option key={m.value} value={m.value} className="bg-slate-900 text-white font-medium">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
            <select 
              className="bg-transparent text-white font-extrabold text-[11px] uppercase tracking-wide outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => { setSelectedYear(e.target.value); setSelectedDoctor(null); }}
            >
              {['2024', '2025', '2026', '2027'].map(yr => (
                <option key={yr} value={yr} className="bg-slate-900 text-white font-medium">{yr}</option>
              ))}
            </select>
          </div>

          {/* Area Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select 
              className="bg-transparent text-white font-extrabold text-[11px] uppercase tracking-wide outline-none cursor-pointer max-w-[160px]"
              value={selectedArea}
              onChange={e => { setSelectedArea(e.target.value); setSelectedDoctor(null); }}
            >
              <option value="all" className="bg-slate-900 text-white font-medium">Todas las áreas</option>
              {areas.map(a => (
                <option key={a} value={a} className="bg-slate-900 text-white font-medium">{a}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('gestion')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'gestion'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Gestión de Tardanzas
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'dashboard'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Dashboard y Rankings
        </button>
      </div>

      {activeTab === 'gestion' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* DOCTOR LIST SIDE PANEL */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <div className="flex flex-col gap-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Médicos con Tardanzas ({groupedDoctors.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg uppercase">
                    Mes: {MONTH_NAMES.find(m => m.value === selectedMonth)?.label}
                  </span>
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-lg uppercase">
                    Área: {selectedArea === 'all' ? 'Todas' : selectedArea}
                  </span>
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar médico..."
                />
              </div>

              {/* LIST */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {groupedDoctors.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-35" />
                    <p className="text-[10px] font-black uppercase tracking-wider">Sin incidencias de tardanza</p>
                  </div>
                ) : (
                  groupedDoctors.map(doc => {
                    const isSelected = selectedDoctor?.toUpperCase() === doc.doctorName.toUpperCase();
                    return (
                      <button
                        key={doc.doctorName}
                        onClick={() => handleSelectDoctor(doc.doctorName)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-250 flex items-center justify-between ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-x-1' 
                            : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className={`font-black text-xs uppercase tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            Dr. {doc.doctorName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                              {doc.complaints.length} reclamo{doc.complaints.length !== 1 ? 's' : ''}
                            </span>
                            {doc.unresolvedCount > 0 && (
                              <span className="bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                                {doc.unresolvedCount} PENDIENTE{doc.unresolvedCount !== 1 ? 'S' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* DETAILS AND MASS RESOLUTION PANEL */}
          <div className="lg:col-span-7">
            {activeDoctorData ? (
              <div className="space-y-6">
                {/* DOCTOR DETAILS */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 border shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-5 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase leading-none">
                          Dr. {activeDoctorData.doctorName}
                        </h3>
                        <p className="text-[9px] font-black uppercase text-slate-400 mt-1 tracking-widest">
                          Historial del Mes • {activeDoctorData.complaints.length} incidencias registradas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-xl">
                        {activeDoctorData.complaints.filter(c => c.status === ComplaintStatus.RESUELTO).length} Resueltos
                      </span>
                      <span className="text-[9px] font-black bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1 rounded-xl">
                        {activeDoctorData.unresolvedCount} Pendientes
                      </span>
                    </div>
                  </div>

                  {/* DATES LIST */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Días reportados como tarde:</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeDoctorData.dates.map(dt => (
                        <span key={dt} className="bg-slate-50 border text-slate-700 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* DETAILED LIST OF COMPLAINTS */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Incidencias individuales:</h4>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {activeDoctorData.complaints.map(c => (
                        <div key={c.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{c.id} • {c.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              c.status === ComplaintStatus.RESUELTO 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-orange-50 text-orange-700 border border-orange-100'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium italic">"{c.description}"</p>
                          <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-400">
                            <span>Área: <strong className="text-slate-600 uppercase">{c.area}</strong></span>
                            <span>•</span>
                            <span>Especialidad: <strong className="text-slate-600 uppercase">{c.specialty}</strong></span>
                          </div>
                          {c.status === ComplaintStatus.RESUELTO && c.managementResponse && (
                            <div className="mt-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-[10px]">
                              <strong className="text-emerald-700 block uppercase text-[8px] font-black tracking-wider mb-0.5">Respuesta de Calidad:</strong>
                              <p className="text-slate-600 leading-relaxed italic">"{c.managementResponse}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MASS RESOLUTION CARD */}
                {activeDoctorData.unresolvedCount > 0 ? (
                  <div className="bg-white rounded-[2rem] p-6 md:p-8 border shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b pb-4">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase">
                          Resolución Masiva de Descargos
                        </h3>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                          Se responderán de forma masiva los ({activeDoctorData.unresolvedCount}) reclamos pendientes de este médico
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Personal Involucrado */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-wider">Personal Involucrado (Obligatorio)</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none"
                              value={involvedPersonnel}
                              onChange={e => setInvolvedPersonnel(e.target.value)}
                              placeholder="Dr. Nombre..."
                            />
                          </div>
                        </div>

                        {/* Acción Tomada */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-wider">Acción Tomada por Jefatura (Obligatorio)</label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none"
                              value={actionTaken}
                              onChange={e => setActionTaken(e.target.value)}
                              placeholder="Ej: Reunión con médico, llamada de atención..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Medida Correctiva */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-wider">Medida Correctiva (Obligatorio)</label>
                          <div className="relative">
                            <Layers className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select 
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none"
                              value={correctiveMeasure}
                              onChange={e => setCorrectiveMeasure(e.target.value)}
                            >
                              <option value="">-- Seleccionar --</option>
                              <option value="Llamado de atención verbal">Llamado de atención verbal</option>
                              <option value="Memorandum">Memorandum</option>
                              <option value="Capacitación">Capacitación de personal</option>
                              <option value="Cambio de rol/turno">Cambio de rol/turno</option>
                              <option value="otra">Otra medida</option>
                            </select>
                          </div>
                        </div>

                        {correctiveMeasure === 'otra' && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-wider">Especificar otra medida correctiva</label>
                            <input 
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none"
                              value={correctiveMeasureOther}
                              onChange={e => setCorrectiveMeasureOther(e.target.value)}
                              placeholder="Detallar otra medida..."
                            />
                          </div>
                        )}
                      </div>

                      {/* Descargo / Comentarios de Gestión */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-wider">Detalles de la acción tomada / Seguimiento de control (Obligatorio)</label>
                        <textarea 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none min-h-[90px] focus:ring-1 focus:ring-amber-500"
                          value={tempResponse}
                          onChange={e => setTempResponse(e.target.value)}
                          placeholder="Detalles de la justificación, descargo o solución de control adoptada..."
                        />
                      </div>

                      {/* Sustento Fotográfico */}
                      <div className="space-y-2.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento fotográfico (Obligatorio si se selecciona 'Memorandum')</label>
                        <div className="flex flex-wrap gap-2.5">
                          {evidenceImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} className="w-14 h-14 object-cover rounded-lg border border-slate-200" alt="Sustento" />
                              <button 
                                type="button" 
                                onClick={() => setEvidenceImages(prev => prev.filter((_, i) => i !== idx))} 
                                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <label className="w-14 h-14 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-400">
                            <Upload className="w-4 h-4" />
                            <span className="text-[7px] font-black uppercase mt-1">Subir</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </div>

                      {/* RESOLUTION BUTTON */}
                      <div className="pt-2 border-t mt-4 flex justify-end">
                        <button
                          onClick={handleMassResolve}
                          disabled={isResolving}
                          className="flex items-center gap-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-black text-[10px] uppercase tracking-wider px-8 py-4 rounded-xl shadow-xl transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isResolving ? 'Guardando Descargos...' : 'Guardar y Resolver Reclamos en Masa'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-[2rem] text-center space-y-2">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide">¡Todo Gestionado!</h4>
                    <p className="text-[10px] font-medium text-emerald-600">
                      No quedan reclamos de tardanza pendientes para el Dr. {activeDoctorData.doctorName} en este período.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-12 border shadow-sm text-center space-y-4">
                <Clock className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
                <div>
                  <h4 className="text-slate-400 font-black uppercase text-xs tracking-wider">Detalle del Médico</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Seleccione un médico de la lista lateral para visualizar el reporte consolidado de tardanzas, examinar sus reclamos y registrar sus descargos o descargos masivos de calidad.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Tardanzas */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Total Tardanzas</span>
                <span className="text-2xl font-black text-slate-800 block mt-0.5">{stats.total}</span>
                <span className="text-[9px] font-semibold text-slate-400">En el período seleccionado</span>
              </div>
            </div>

            {/* Card 2: Médicos Involucrados */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Médicos Afectados</span>
                <span className="text-2xl font-black text-slate-800 block mt-0.5">{stats.uniqueDocs}</span>
                <span className="text-[9px] font-semibold text-slate-400">Personal con retrasos</span>
              </div>
            </div>

            {/* Card 3: Médico con más Demoras */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Mayor Reincidencia</span>
                <span className="text-sm font-black text-slate-800 truncate block mt-0.5" title={stats.topDocName}>
                  {stats.topDocName.length > 20 ? stats.topDocName.slice(0, 18) + '...' : stats.topDocName}
                </span>
                <span className="text-[10px] font-extrabold text-rose-600 uppercase">
                  {stats.topDocCount} tardanza{stats.topDocCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Card 4: Tasa de Resolución */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Tasa de Gestión</span>
                <span className="text-2xl font-black text-slate-800 block mt-0.5">{stats.rate}%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.rate}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Doctor Ranking (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-8 border shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Ranking: Médicos con Más Tardanzas Acumuladas
                    </h3>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">Top 10 personal médico en el mes</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-xl">
                  Unidad: N° Tardanzas
                </span>
              </div>

              {stats.docChartData.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-black uppercase tracking-wider">No hay suficientes datos para el gráfico</p>
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.docChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} fontWeight={700} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} fontWeight={700} width={140} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                        labelStyle={{ fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                      <Bar name="Resueltas" dataKey="resueltos" stackId="a" fill="#10b981" />
                      <Bar name="Pendientes" dataKey="pendientes" stackId="a" fill="#f97316" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Specialty/Area Breakdown (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 border shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b pb-4">
                  <PieChartIcon className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Tardanzas por Área
                    </h3>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">Zonas críticas de demoras</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {stats.areaData.length === 0 ? (
                    <p className="text-center py-12 text-slate-400 text-xs font-bold uppercase">Sin datos de área</p>
                  ) : (
                    stats.areaData.map((area, idx) => {
                      const percentage = stats.total > 0 ? Math.round((area.value / stats.total) * 100) : 0;
                      const colors = ['bg-indigo-600', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-sky-500'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={area.name} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-700 uppercase truncate max-w-[180px]">{area.name}</span>
                            <span className="text-slate-500">{area.value} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                            <div className={`${color} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Especialidades con Mayor Demora</h4>
                <div className="flex flex-wrap gap-1.5">
                  {stats.specialtyData.map((sp) => (
                    <span key={sp.name} className="bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-600 px-2.5 py-1.5 rounded-xl uppercase">
                      {sp.name}: {sp.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Repeat Offenders Control Table (Valuable control tool) */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Panel de Alerta: Médicos Reincidentes
                  </h3>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Médicos con 2 o más tardanzas acumuladas en el mes</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-xl uppercase animate-pulse">
                Requieren atención prioritaria
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Médico / Profesional</th>
                    <th className="py-3 px-4 text-center">Tardanzas Acumuladas</th>
                    <th className="py-3 px-4">Fechas Registradas</th>
                    <th className="py-3 px-4 text-center">Casos Pendientes</th>
                    <th className="py-3 px-4">Área de Mayor Incidencia</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDoctors.filter(doc => doc.complaints.length >= 2).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-bold uppercase text-[10px]">
                        No hay médicos reincidentes (≥ 2 tardanzas) registrados en este mes.
                      </td>
                    </tr>
                  ) : (
                    groupedDoctors
                      .filter(doc => doc.complaints.length >= 2)
                      .sort((a, b) => b.complaints.length - a.complaints.length)
                      .map(doc => {
                        // Find most frequent area for this doctor
                        const areaCounts: Record<string, number> = {};
                        doc.complaints.forEach(c => { areaCounts[c.area] = (areaCounts[c.area] || 0) + 1; });
                        const mostFrequentArea = Object.entries(areaCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';

                        return (
                          <tr key={doc.doctorName} className="border-b text-xs hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-black text-slate-800 uppercase">
                              Dr. {doc.doctorName}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-3 py-1 rounded-xl">
                                {doc.complaints.length}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-medium">
                              {doc.dates.join(', ')}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {doc.unresolvedCount > 0 ? (
                                <span className="bg-orange-50 border border-orange-100 text-orange-700 font-extrabold px-2 py-0.5 rounded text-[10px] animate-pulse">
                                  {doc.unresolvedCount} pendiente{doc.unresolvedCount !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                  Gestionado
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-semibold uppercase">
                              {mostFrequentArea}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => {
                                  setActiveTab('gestion');
                                  handleSelectDoctor(doc.doctorName);
                                }}
                                className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-black text-[9px] uppercase tracking-wider px-3 py-2 rounded-xl transition-colors"
                              >
                                Gestionar Caso
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  adminPassword: string;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, adminPassword }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  
  // DB Config State
  const [dbPassword, setDbPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dbParams, setDbParams] = useState({
    host: 'localhost',
    port: '5432',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });
  const [generatedSql, setGeneratedSql] = useState('');

  const handleUnlock = () => {
    if (dbPassword === adminPassword) {
      setIsUnlocked(true);
    } else {
      alert('Contraseña Administrativa Incorrecta');
    }
  };

  const generateSchema = () => {
    const sql = `-- CALIDAD DAC v2.5 - POSTGRESQL INITIALIZATION
-- Script de generación automática de tablas de auditoría

CREATE TABLE IF NOT EXISTS audit_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS medical_incidences (
    audit_id VARCHAR(50) PRIMARY KEY,
    incidence_date DATE NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(50),
    doctor_name VARCHAR(255),
    specialty_name VARCHAR(100),
    area_name VARCHAR(100),
    complaint_description TEXT NOT NULL,
    current_status VARCHAR(50) DEFAULT 'Pendiente',
    priority_level VARCHAR(50) DEFAULT 'Media',
    satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
    ai_sentiment VARCHAR(50),
    ai_suggested_response TEXT,
    management_solution TEXT,
    resolved_by_admin VARCHAR(150),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserción de Áreas según configuración actual
${areas.map(a => `INSERT INTO audit_areas (name) VALUES ('${a}') ON CONFLICT (name) DO NOTHING;`).join('\n')}

-- Inserción de Especialidades según configuración actual
${specialties.map(s => `INSERT INTO audit_specialties (name) VALUES ('${s}') ON CONFLICT (name) DO NOTHING;`).join('\n')}

COMMENT ON TABLE medical_incidences IS 'Tabla principal de auditoría de calidad hospitalaria DAC';
`;
    setGeneratedSql(sql);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🏢</span> 
            Gestión de Departamentos
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej: Rayos X..." />
            <button onClick={() => { if(newArea) setAreas([...areas, newArea]); setNewArea(''); }} className="w-16 h-16 bg-amber-500 text-white rounded-2xl font-black text-3xl shadow-xl hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map(a => (
              <span key={a} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-slate-200 group">
                {a} <button onClick={() => setAreas(areas.filter(x => x !== a))} className="text-slate-400 group-hover:text-rose-500 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🎓</span> 
            Especialidades Médicas
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej: Oncología..." />
            <button onClick={() => { if(newSpec) setSpecialties([...specialties, newSpec]); setNewSpec(''); }} className="w-16 h-16 bg-orange-500 text-white rounded-2xl font-black text-3xl shadow-xl hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {specialties.map(s => (
              <span key={s} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-slate-200 group">
                {s} <button onClick={() => setSpecialties(specialties.filter(x => x !== s))} className="text-slate-400 group-hover:text-rose-500 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card bg-white p-12 border-2 border-dashed border-amber-300 shadow-inner">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
              <span className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">🐘</span> 
              Conexión Externa (PostgreSQL)
            </h3>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2 ml-16">Acceso Protegido - Use su contraseña de inicio de sesión</p>
          </div>
          {!isUnlocked && (
            <div className="flex items-center gap-3">
              <input type="password" placeholder="Confirmar Contraseña" className="p-4 bg-slate-50 rounded-2xl text-sm border-2 border-slate-100 outline-none focus:border-amber-500 font-bold text-slate-900" value={dbPassword} onChange={e => setDbPassword(e.target.value)} />
              <button onClick={handleUnlock} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Desbloquear</button>
            </div>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-6 duration-700 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Servidor (Host)</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto de Escucha</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Base de Datos</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario DB</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña DB</label>
                <input type="password" placeholder="••••••••" className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-500" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              </div>
              <div className="flex items-end">
                <button onClick={() => alert('Parámetros guardados localmente')} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Guardar Configuración</button>
              </div>
            </div>

            <div className="pt-10 border-t-2 border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-2xl font-black text-slate-900">Scripts de Implementación</h4>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Esquema automatizado para motor PostgreSQL 14+</p>
                </div>
                <button onClick={generateSchema} className="px-12 py-5 border-2 border-slate-900 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md">Generar Esquema SQL</button>
              </div>
              
              {generatedSql && (
                <div className="relative group">
                  <div className="absolute -top-4 -left-4 bg-amber-500 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest z-10 shadow-lg">CALIDAD_DAC_SCHEMA.SQL</div>
                  <pre className="bg-slate-900 text-amber-400 p-10 rounded-[3rem] text-[12px] overflow-x-auto font-mono shadow-2xl max-h-[500px] border-4 border-slate-800 custom-scrollbar">
                    <code>{generatedSql}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
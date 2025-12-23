import React, { useState } from 'react';
import { dbService } from '../services/apiService';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  adminPassword: string;
  onConnStatusChange: (s: boolean) => void;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, adminPassword, onConnStatusChange }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  
  // DB Config State
  const [dbPasswordAuth, setDbPasswordAuth] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [dbParams, setDbParams] = useState({
    host: '192.168.99.180',
    port: '3008',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });
  const [generatedSql, setGeneratedSql] = useState('');

  const handleUnlock = () => {
    if (dbPasswordAuth === adminPassword) {
      setIsUnlocked(true);
    } else {
      alert('Contraseña Administrativa Incorrecta');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const success = await dbService.testConnection(dbParams);
    setTestStatus(success ? 'success' : 'error');
    onConnStatusChange(success);
    if (success) {
      alert('¡Conexión exitosa! Todas las tablas necesarias han sido verificadas/creadas en PostgreSQL.');
    } else {
      alert('Error: No se pudo conectar al servidor en ' + dbParams.host + ':' + dbParams.port);
    }
  };

  const handleAddArea = async () => {
    if (newArea) {
      const updated = [...areas, newArea];
      setAreas(updated);
      await dbService.syncStructure('area', newArea);
      setNewArea('');
    }
  };

  const handleAddSpec = async () => {
    if (newSpec) {
      const updated = [...specialties, newSpec];
      setSpecialties(updated);
      await dbService.syncStructure('specialty', newSpec);
      setNewSpec('');
    }
  };

  const generateSchema = () => {
    const sql = `-- SCRIPT COMPLETO DE BASE DE DATOS - CALIDAD DAC v3.5
-- 1. Tabla de Incidencias Médicas
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
    satisfaction_score INTEGER,
    ai_sentiment VARCHAR(50),
    ai_suggested_response TEXT,
    management_solution TEXT,
    resolved_by_admin VARCHAR(150),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin'
);

-- 3. Tabla de Áreas Hospitalarias
CREATE TABLE IF NOT EXISTS hospital_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. Tabla de Especialidades Médicas
CREATE TABLE IF NOT EXISTS hospital_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Datos iniciales sugeridos
INSERT INTO hospital_areas (name) VALUES 
('Urgencias'), ('UCI'), ('Consultas Externas'), ('Laboratorio'), ('Hospitalización')
ON CONFLICT DO NOTHING;

INSERT INTO hospital_specialties (name) VALUES 
('Medicina General'), ('Pediatría'), ('Cardiología'), ('Ginecología'), ('Traumatología')
ON CONFLICT DO NOTHING;`;
    setGeneratedSql(sql);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🏢</span> 
            Departamentos
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Nueva Área..." />
            <button onClick={handleAddArea} className="w-16 h-16 bg-amber-500 text-white rounded-2xl font-black text-3xl shadow-xl hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map(a => (
              <span key={a} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-slate-200">{a}</span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🎓</span> 
            Especialidades
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Nueva Especialidad..." />
            <button onClick={handleAddSpec} className="w-16 h-16 bg-orange-500 text-white rounded-2xl font-black text-3xl shadow-xl hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {specialties.map(s => (
              <span key={s} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-slate-200">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card bg-white p-12 border-2 border-dashed border-amber-300 shadow-inner">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
              <span className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">🐘</span> 
              Conexión PostgreSQL
            </h3>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2 ml-16">Acceso Remoto Protegido</p>
          </div>
          {!isUnlocked && (
            <div className="flex items-center gap-3">
              <input type="password" placeholder="Clave Administrador" className="p-4 bg-slate-50 rounded-2xl text-sm border-2 border-slate-100 outline-none focus:border-amber-500 font-bold text-slate-900" value={dbPasswordAuth} onChange={e => setDbPasswordAuth(e.target.value)} />
              <button onClick={handleUnlock} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Desbloquear</button>
            </div>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-6 duration-700 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Servidor (IP/Host)</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Base de Datos</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario Postgres</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña Postgres</label>
                <input type="password" placeholder="••••••••" className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              </div>
              <div className="flex items-end gap-4">
                <button 
                  onClick={handleTestConnection} 
                  disabled={testStatus === 'testing'}
                  className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${testStatus === 'testing' ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-amber-600'}`}
                >
                  {testStatus === 'testing' ? 'PROBANDO...' : 'TEST & CONFIGURAR'}
                </button>
              </div>
            </div>

            <div className="pt-10 border-t-2 border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-2xl font-black text-slate-900">Scripts de Base de Datos</h4>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Esquema relacional completo para PostgreSQL</p>
                </div>
                <button onClick={generateSchema} className="px-12 py-5 border-2 border-slate-900 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md">Generar Todos los Scripts</button>
              </div>
              {generatedSql && (
                <div className="relative group">
                  <pre className="bg-slate-900 text-amber-400 p-10 rounded-[3rem] text-[12px] font-mono shadow-2xl overflow-x-auto">
                    <code>{generatedSql}</code>
                  </pre>
                  <button onClick={() => { navigator.clipboard.writeText(generatedSql); alert('Copiado al portapapeles'); }} className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black px-4 py-2 rounded-xl transition-all">COPIAR SCRIPT</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

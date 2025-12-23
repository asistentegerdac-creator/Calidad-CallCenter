
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser: User | null;
  isOnline: boolean;
  onConnStatusChange: (s: boolean) => void;
  currentTheme: string;
  setTheme: (t: string) => void;
}

export const Settings: React.FC<Props> = ({ 
  areas, setAreas, specialties, setSpecialties, 
  users, setUsers, currentUser, isOnline, onConnStatusChange,
  currentTheme, setTheme
}) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'agent' as 'admin' | 'agent',
    permissions: ['dashboard', 'incidences', 'new-incidence'] as string[]
  });

  const [dbParams, setDbParams] = useState(() => {
    const saved = localStorage.getItem('dac_db_config');
    return saved ? JSON.parse(saved) : {
      host: '192.168.99.180',
      port: '3008',
      database: 'calidad_dac_db',
      user: 'postgres',
      password: ''
    };
  });

  const themes = [
    { id: 'classic', name: 'Dac Classic', color: '#f59e0b', desc: 'Ámbar Cálido (Claro)' },
    { id: 'midnight', name: 'Midnight Node', color: '#6366f1', desc: 'Modo Oscuro Profundo' },
    { id: 'emerald', name: 'Emerald Glass', color: '#10b981', desc: 'Médico Profesional' },
    { id: 'cyber', name: 'Cyber 3D', color: '#d946ef', desc: 'Contraste Alto 3D' },
    { id: 'oceanic', name: 'Oceanic Gradient', color: '#06b6d4', desc: 'Relajante / Auditivo' },
  ];

  const loadAllUsers = async () => {
    if (isOnline) {
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
      }
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, [isOnline]);

  const handleManualMigration = async () => {
    if (!isOnline) return alert("❌ Error: No se detecta conexión activa con el servidor. Vincule el Nodo primero.");
    
    const localComplaints: Complaint[] = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers: User[] = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      return alert("No hay datos pendientes de migrar en el almacenamiento local.");
    }

    setSyncing(true);
    let uCount = 0, cCount = 0;
    
    try {
      // 1. Migrar Usuarios primero (evita errores de integridad en el servidor)
      for (const u of localUsers) {
        const saved = await dbService.saveUser(u);
        if (saved) uCount++;
      }
      
      // 2. Migrar Incidencias
      for (const c of localComplaints) {
        const ok = await dbService.saveComplaint(c);
        if (ok) cCount++;
      }

      // 3. Limpiar local tras éxito
      localStorage.setItem('dac_complaints', '[]');
      localStorage.setItem('dac_users', '[]');
      alert(`✅ MIGRACIÓN COMPLETADA: Se han grabado en PostgreSQL ${uCount} Usuarios y ${cCount} Casos.`);
      window.location.reload();
    } catch (err) {
      alert("❌ Error durante la migración masiva. Verifique la consola del servidor.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRepairDB = async () => {
    setRepairing(true);
    try {
      const ok = await dbService.repairDatabase();
      if (ok) {
        alert("✅ Verificación de estructura finalizada: Tablas revisadas y sanas en PostgreSQL.");
      } else {
        alert("❌ El servidor no respondió a la reparación. Intente re-vincular el Nodo.");
      }
    } catch (e) {
      alert("❌ Fallo crítico de comunicación.");
    } finally {
      setRepairing(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Complete los datos requeridos.");
    
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUserForm.username,
      password: newUserForm.password,
      name: newUserForm.username,
      role: newUserForm.role,
      permissions: newUserForm.permissions
    };

    if (isOnline) {
      const savedUser = await dbService.saveUser(newUser);
      if (savedUser) {
        alert(`✅ Auditor ${savedUser.username} grabado en Servidor.`);
        await loadAllUsers();
      } else {
        alert("❌ Error: El servidor no permitió grabar el usuario. ¿Ya existe?");
      }
    } else {
      setUsers([...users, newUser]);
      alert("⚠️ Guardado en Local (Modo Offline).");
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-12 pb-20">
      {/* SECCIÓN TEMAS VISUALES */}
      <div className="glass-card bg-white p-10 shadow-xl border border-slate-100">
        <h3 className="text-xl font-black mb-10 text-slate-900 uppercase flex items-center gap-3">
          <span className="text-2xl">🎨</span> Personalización Visual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {themes.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTheme(t.id)}
              className={`group flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 hover:scale-105 ${currentTheme === t.id ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100'}`}
            >
              <div className="w-12 h-12 rounded-2xl shadow-lg mb-4" style={{ background: t.color }}></div>
              <p className="text-[10px] font-black uppercase text-slate-900 mb-1">{t.name}</p>
              <p className="text-[8px] font-bold text-slate-400 text-center uppercase leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN CONFIGURACIÓN NODO */}
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3 text-white">
              <span className="text-2xl">🐘</span> Nodo Central (PostgreSQL)
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               ESTADO ACTUAL: <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>{isOnline ? 'CONECTADO Y ACTIVO' : 'SIN CONEXIÓN AL NODO'}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-6 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-white/20 transition-all">Ajustar IP/DB</button>
            {isOnline && (
               <button onClick={handleRepairDB} disabled={repairing} className="px-6 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-600 transition-all">
                 {repairing ? 'Verificando SQL...' : 'Revisar Base'}
               </button>
            )}
          </div>
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-4 duration-300 space-y-8 mt-10 p-8 bg-black/20 rounded-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border border-white/5" placeholder="IP del Servidor" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border border-white/5" placeholder="Puerto" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border border-white/5" placeholder="Base de Datos" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border border-white/5" placeholder="Usuario" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border border-white/5" type="password" placeholder="Contraseña" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              <button onClick={async () => {
                const ok = await dbService.testConnection(dbParams);
                onConnStatusChange(ok);
                if (ok) alert('✅ Nodo Central vinculado con éxito.');
                else alert('❌ Falló la conexión. Verifique que el servidor Node.js esté corriendo.');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg text-white hover:bg-amber-400">Sincronizar Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4">
              <button onClick={handleManualMigration} disabled={syncing} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50">
                {syncing ? 'Moviendo Datos a PostgreSQL...' : '🚀 Migrar Datos Local -> Servidor'}
              </button>
              {isAdmin && (
                <button onClick={async () => {
                  if (confirm("⚠️ ¿Resetear Nodo? Esto borrará TODO en la base de datos de PostgreSQL.")) {
                    const ok = await dbService.clearData();
                    if (ok) window.location.reload();
                  }
                }} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-rose-600">
                  🗑️ Formatear Nodo Central
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GESTION DE USUARIOS */}
      <div className="glass-card bg-white p-10 border shadow-xl">
        <h3 className="text-xl font-black mb-10 text-slate-900 uppercase">👥 Auditores y Permisos</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          
          <div className={`space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border ${!isAdmin ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registrar Nuevo Acceso</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200" type="password" placeholder="Contraseña" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Rol</label>
               <div className="flex gap-4">
                 {['admin', 'agent'].map(r => (
                   <button key={r} onClick={() => setNewUserForm({...newUserForm, role: r as any})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newUserForm.role === r ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>{r}</button>
                 ))}
               </div>
            </div>
            <button onClick={handleCreateUser} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-amber-500 transition-all">Grabar en Base de Datos</button>
          </div>

          <div className="overflow-x-auto">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Auditores</h4>
                <button onClick={loadAllUsers} className="text-[8px] font-black text-amber-500 uppercase">Refrescar</button>
             </div>
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                 <tr>
                   <th className="px-4 py-3">Usuario</th>
                   <th className="px-4 py-3 text-right">Acceso</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(user => (
                   <tr key={user.id}>
                     <td className="py-4 px-4 font-black text-slate-900 text-sm">{user.username}</td>
                     <td className="py-4 px-4 text-right">
                       <span className={`text-[8px] font-black uppercase ${user.role === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}>{user.role}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

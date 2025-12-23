
import React, { useState, useEffect, useCallback } from 'react';
import { Complaint, View, User, ComplaintStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { IncidencesReported } from './components/IncidencesReported';
import { dbService } from './services/apiService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [users, setUsers] = useState<User[]>(() => JSON.parse(localStorage.getItem('dac_users') || '[]'));
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Ginecología", "Cardiología"]'));

  useEffect(() => {
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
  }, [areas, specialties]);

  useEffect(() => {
    localStorage.setItem('dac_users', JSON.stringify(users));
  }, [users]);

  // Sincronización Automática Integral (Local -> Postgres)
  const autoSync = useCallback(async () => {
    const localComplaints = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      // Si no hay nada local pendiente de subir, bajamos lo del servidor
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers.length > 0) setUsers(remoteUsers);
      const remoteComplaints = await dbService.fetchComplaints();
      if (remoteComplaints.length > 0) setComplaints(remoteComplaints);
      return;
    }

    setNotification({ msg: 'Sincronizando con Nodo Central...', type: 'success' });
    
    try {
      // 1. Migrar Usuarios locales
      for (const u of localUsers) {
        await dbService.saveUser(u);
      }
      // 2. Migrar Incidencias locales
      for (const c of localComplaints) {
        await dbService.saveComplaint(c);
      }

      // 3. Una vez subido todo, limpiamos la cola de subida local y bajamos la verdad del servidor
      localStorage.setItem('dac_complaints', '[]');
      
      const remoteUsers = await dbService.fetchUsers();
      const remoteComplaints = await dbService.fetchComplaints();
      
      if (remoteUsers.length > 0) setUsers(remoteUsers);
      if (remoteComplaints.length > 0) setComplaints(remoteComplaints);
      
      setNotification({ msg: 'Sincronización Completada', type: 'success' });
    } catch (e) {
      setNotification({ msg: 'Nodo Central no respondió correctamente', type: 'error' });
    }
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    const init = async () => {
      const connected = await dbService.testConnection({});
      setIsOnline(connected);
      if (connected) {
        await autoSync();
      }
    };
    init();
  }, [autoSync]);

  const handleAddComplaint = async (c: Complaint) => {
    // Primero visualmente y local
    setComplaints(prev => [c, ...prev]);
    const local = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    localStorage.setItem('dac_complaints', JSON.stringify([c, ...local]));

    if (isOnline) {
      const success = await dbService.saveComplaint(c);
      if (success) {
        // Si se guardó en el servidor, lo quitamos de la cola local de pendientes
        const remainingLocal = JSON.parse(localStorage.getItem('dac_complaints') || '[]').filter((x: Complaint) => x.id !== c.id);
        localStorage.setItem('dac_complaints', JSON.stringify(remainingLocal));
        setNotification({ msg: 'Incidencia Sincronizada', type: 'success' });
      } else {
        setNotification({ msg: 'Error de Red - Pendiente de Envío', type: 'error' });
      }
    } else {
      setNotification({ msg: 'Guardado Local (Modo Offline)', type: 'success' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateComplaint = async (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    const updated = complaints.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: auditor} : c);
    setComplaints(updated);
    if (isOnline) {
      await dbService.updateComplaint(id, s, r, auditor);
    } else {
      // Si estamos offline, guardamos el cambio localmente en la lista general
      localStorage.setItem('dac_local_updates', JSON.stringify(updated));
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = fd.get('user') as string;
    const p = fd.get('pass') as string;

    if (isRegisterMode) {
      const isFirst = users.length === 0;
      const newUser: User = { 
        id: `USR-${Date.now().toString().slice(-4)}`, 
        username: u, 
        password: p, 
        name: u, 
        role: isFirst ? 'admin' : 'agent',
        permissions: ['dashboard', 'incidences', 'new-incidence', 'reports', 'settings']
      };
      
      if (isOnline) {
        const saved = await dbService.saveUser(newUser);
        if (saved) {
          setUsers(prev => [...prev, saved]);
          setCurrentUser(saved);
        } else {
          setUsers(prev => [...prev, newUser]);
          setCurrentUser(newUser);
        }
      } else {
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
      }
      setIsLoggedIn(true);
      return;
    }

    // Login Online
    if (isOnline) {
      const userFromDb = await dbService.login(u, p);
      if (userFromDb) {
        setCurrentUser({
          ...userFromDb,
          permissions: userFromDb.permissions || ['dashboard', 'settings']
        });
        setIsLoggedIn(true);
        return;
      }
    }

    // Login Local
    const found = users.find(x => x.username === u && x.password === p);
    if (found || (u === 'admin' && p === 'admin')) {
      const userToLogin = found || { 
        id: '1', name: 'Super Admin', username: 'admin', role: 'admin' as const,
        permissions: ['dashboard', 'incidences', 'new-incidence', 'reports', 'settings']
      };
      setCurrentUser(userToLogin);
      setIsLoggedIn(true);
    } else {
      alert('Acceso denegado: Usuario o contraseña incorrectos.');
    }
  };

  const hasPermission = (view: View) => {
    if (!currentUser) return false;
    if (view === 'settings') return true; // Siempre visible para configuración de red
    return currentUser.permissions.includes(view);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fffcf9]">
      {!isLoggedIn ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className="glass-card p-10 w-full max-w-md shadow-2xl border-orange-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-900 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black">CD</div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Calidad DAC <span className="text-amber-500">v5.2</span></h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gestión de Seguridad y Calidad Médica</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input name="user" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Usuario" />
              <input name="pass" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Contraseña" />
              <button className="w-full py-4 neo-warm-button rounded-2xl font-black text-[10px] uppercase tracking-widest">
                {isRegisterMode ? 'Crear Cuenta Maestra' : 'Entrar al Sistema'}
              </button>
            </form>
            <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full mt-6 text-[9px] font-black uppercase text-slate-400 tracking-widest hover:text-amber-500">
              {isRegisterMode ? 'Regresar al Login' : '¿Nuevo Auditor? Registro Local'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <aside className="w-full md:w-72 bg-white border-r border-orange-50 flex flex-col p-6 no-print h-auto md:h-screen sticky top-0 z-[100]">
            <div className="mb-10 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">CD</div>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-none tracking-tighter">DAC PRO</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  <span className={`text-[7px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isOnline ? 'Sincronizado' : 'Modo Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 space-y-2">
              {[
                { id: 'dashboard', label: 'Monitor Calidad', icon: '📈' },
                { id: 'incidences', label: 'Gestión de Casos', icon: '📑' },
                { id: 'new-incidence', label: 'Nuevo Reporte', icon: '➕' },
                { id: 'reports', label: 'Centro de Datos', icon: '📋' },
                { id: 'settings', label: 'Ajustes Nodo', icon: '⚙️' }
              ].filter(item => hasPermission(item.id as View)).map((item) => (
                <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-orange-50'}`}>
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            
            <div className="mt-8 pt-6 border-t border-orange-50">
              <div className="mb-4 text-center">
                <p className="text-[9px] font-black text-slate-900 uppercase">{currentUser?.name}</p>
                <p className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">{currentUser?.role === 'admin' ? 'Super Administrador' : 'Auditor'}</p>
              </div>
              <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase hover:bg-rose-100 transition-all">Cerrar Sesión</button>
            </div>
          </aside>

          <main className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
            {notification && (
              <div className={`fixed top-4 right-4 z-[500] p-4 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} text-white rounded-2xl shadow-2xl font-black text-[10px] uppercase animate-in slide-in-from-top-4 duration-300`}>
                {notification.msg}
              </div>
            )}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeView === 'dashboard' && <Dashboard complaints={complaints} />}
              {activeView === 'incidences' && <IncidencesReported complaints={complaints} currentUser={currentUser} onUpdate={handleUpdateComplaint} isOnline={isOnline} />}
              {activeView === 'new-incidence' && <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />}
              {activeView === 'reports' && <Reports complaints={complaints} areas={areas} />}
              {activeView === 'settings' && (
                <Settings 
                  areas={areas} setAreas={setAreas} 
                  specialties={specialties} setSpecialties={setSpecialties}
                  users={users} setUsers={setUsers}
                  currentUser={currentUser}
                  isOnline={isOnline} 
                  onConnStatusChange={async (s) => {
                    setIsOnline(s);
                    if (s) await autoSync();
                  }} 
                />
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;

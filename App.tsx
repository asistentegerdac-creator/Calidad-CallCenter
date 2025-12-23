import React, { useState, useEffect } from 'react';
import { Complaint, View, User, ComplaintStatus, Priority } from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { dbService } from './services/apiService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Estados de datos
  const [users, setUsers] = useState<User[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_users') || '[]'); } catch { return []; }
  });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [areas, setAreas] = useState<string[]>(["Urgencias", "UCI", "Consultas Externas", "Laboratorio", "Hospitalización"]);
  const [specialties, setSpecialties] = useState<string[]>(["Medicina General", "Pediatría", "Cardiología", "Ginecología", "Traumatología"]);

  // Verificar conexión al inicio
  useEffect(() => {
    const checkConn = async () => {
      const online = await dbService.testConnection({});
      setIsOnline(online);
      if (online) {
        const data = await dbService.fetchComplaints();
        setComplaints(data);
      }
    };
    checkConn();
  }, []);

  // Persistir usuarios localmente (único dato local por seguridad de acceso inicial)
  useEffect(() => {
    localStorage.setItem('dac_users', JSON.stringify(users));
  }, [users]);

  const handleAddComplaint = async (c: Complaint) => {
    if (isOnline) {
      const success = await dbService.saveComplaint(c);
      if (success) {
        setComplaints(prev => [c, ...prev]);
        setNotification({ msg: 'Sincronizado con PostgreSQL', type: 'success' });
      } else {
        setNotification({ msg: 'Error de red - Guardado temporal', type: 'error' });
      }
    } else {
      setComplaints(prev => [c, ...prev]);
      setNotification({ msg: 'Modo Offline - Datos locales', type: 'error' });
    }
  };

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = (fd.get('username') as string || '').trim();
    const p = (fd.get('password') as string || '').trim();
    const n = (fd.get('name') as string || '').trim();

    if (!u || !p) return setNotification({ msg: 'Campos requeridos', type: 'error' });

    if (isRegisterMode) {
      const newUser: User = { id: Date.now().toString(), username: u, password: p, name: n || u, role: 'admin' };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setIsLoggedIn(true);
    } else {
      const found = users.find(x => x.username === u && x.password === p);
      if (found) { setCurrentUser(found); setIsLoggedIn(true); }
      else setNotification({ msg: 'Credenciales inválidas', type: 'error' });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fffcf9] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[4rem] w-full max-w-md shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-amber-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-lg">CD</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CALIDAD DAC</h1>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mt-2">Audit Control Platform</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegisterMode && <input name="name" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Nombre Completo" />}
            <input name="username" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Usuario" />
            <input name="password" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Contraseña" />
            <button className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] mt-6">
              {isRegisterMode ? 'CONFIGURAR ADMINISTRADOR' : 'ENTRAR AL PANEL'}
            </button>
          </form>
          <div className="mt-6 flex justify-center gap-4">
             <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{isRegisterMode ? 'Ir al Login' : 'Crear Cuenta'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fffcf9]">
      <aside className="w-80 bg-white border-r border-orange-50 flex flex-col p-8 no-print sticky top-0 h-screen">
        <div className="mb-14 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">CD</div>
          <div>
            <h2 className="text-xl font-black tracking-tighter text-slate-900 leading-none">CALIDAD DAC</h2>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
               <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {isOnline ? 'ONLINE: POSTGRES' : 'OFFLINE: LOCAL'}
               </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Dashboard Real-Time', icon: '📊' },
            { id: 'complaints', label: 'Incidencias & Auditoría', icon: '🩺' },
            { id: 'reports', label: 'Reportes Oficiales', icon: '📋' },
            { id: 'settings', label: 'Configuración de Sistema', icon: '⚙️' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-orange-50 hover:text-amber-600'}`}>
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-orange-50 mt-auto">
          <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-[11px] font-black">AD</div>
            <div className="truncate">
              <p className="text-[10px] font-black text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Administrador Jefe</p>
            </div>
          </div>
          <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors shadow-sm">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-10 lg:p-16 overflow-y-auto">
        {notification && (
          <div className={`fixed top-10 right-10 z-[300] p-6 rounded-3xl shadow-2xl animate-in slide-in-from-right duration-500 border flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            <span className="text-2xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <p className="text-xs font-black uppercase tracking-widest">{notification.msg}</p>
            <button onClick={() => setNotification(null)} className="ml-4 font-black">×</button>
          </div>
        )}

        <header className="mb-14 no-print flex justify-between items-end border-b border-orange-50 pb-10">
          <div>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">GESTIÓN INTEGRAL HOSPITALARIA</p>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 capitalize">
              {activeView === 'dashboard' ? 'Métricas de Calidad' : activeView === 'complaints' ? 'Control de Incidencias' : activeView}
            </h1>
          </div>
          <div className="text-right">
             <div className="bg-white px-6 py-3 rounded-2xl border border-orange-50 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
             </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} areas={areas} />}
          {activeView === 'complaints' && (
            <div className="space-y-16">
              <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />
              <div className="pt-4">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black tracking-tight text-slate-900">Histórico de Auditoría</h3>
                   <span className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{complaints.length} REGISTROS</span>
                </div>
                <ComplaintList complaints={complaints} currentUser={currentUser} onUpdate={(id, s, r, a) => {
                   setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: a} : c));
                }} />
              </div>
            </div>
          )}
          {activeView === 'reports' && <Reports complaints={complaints} />}
          {activeView === 'settings' && (
            <Settings 
              areas={areas} 
              setAreas={setAreas} 
              specialties={specialties} 
              setSpecialties={setSpecialties} 
              adminPassword={currentUser?.password || ''} 
              onConnStatusChange={setIsOnline}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
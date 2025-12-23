import React, { useState, useEffect } from 'react';
import { Complaint, View, User, ComplaintStatus, Priority } from './types';
import { Dashboard } from './components/Dashboard';
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

  const [users, setUsers] = useState<User[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_users') || '[]'); } catch { return []; }
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_complaints') || '[]'); } catch { return []; }
  });

  const [areas, setAreas] = useState<string[]>(["Urgencias", "UCI", "Consultas Externas", "Laboratorio", "Hospitalización"]);
  const [specialties, setSpecialties] = useState<string[]>(["Medicina General", "Pediatría", "Cardiología", "Ginecología", "Traumatología"]);

  useEffect(() => {
    const initData = async () => {
      const connected = await dbService.testConnection({});
      setIsOnline(connected);
      if (connected) {
        const data = await dbService.fetchComplaints();
        if (data.length > 0) setComplaints(data);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('dac_complaints', JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem('dac_users', JSON.stringify(users));
  }, [users]);

  const handleAddComplaint = async (c: Complaint) => {
    const success = isOnline ? await dbService.saveComplaint(c) : false;
    setComplaints(prev => [c, ...prev]);
    setNotification({ 
      msg: success ? 'Sincronizado con PostgreSQL' : 'Registrado localmente (Offline)', 
      type: success ? 'success' : 'error' 
    });
  };

  const handleUpdateComplaint = async (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    const success = isOnline ? await dbService.updateComplaint(id, s, r, auditor) : false;
    setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: auditor} : c));
    if (success) setNotification({ msg: 'Expediente auditado y cerrado en central', type: 'success' });
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
        <div className="bg-white p-12 rounded-[4rem] w-full max-w-md shadow-2xl border border-orange-100 relative">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-lg">CD</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CALIDAD DAC</h1>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mt-2">Hospital Audit Platform</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegisterMode && <input name="name" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Nombre Completo" />}
            <input name="username" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Usuario" />
            <input name="password" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Contraseña" />
            <button className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] mt-6">
              {isRegisterMode ? 'CONFIGURAR ADMINISTRADOR' : 'ACCEDER AL PANEL'}
            </button>
          </form>
          <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full mt-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">{isRegisterMode ? 'Volver al Ingreso' : 'Crear Cuenta Nueva'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fffcf9]">
      <aside className="w-80 bg-white border-r border-orange-50 flex flex-col p-8 no-print sticky top-0 h-screen overflow-hidden">
        <div className="mb-14 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">CD</div>
          <div>
            <h2 className="text-xl font-black tracking-tighter text-slate-900 leading-none">CALIDAD DAC</h2>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
               <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {isOnline ? 'NODO CENTRAL OK' : 'MODO STANDALONE'}
               </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Monitor Calidad (KPI)', icon: '📊' },
            { id: 'complaints', label: 'Nueva Auditoría', icon: '📝' },
            { id: 'reports', label: 'Reportes Oficiales', icon: '📋' },
            { id: 'settings', label: 'Configuración Nodo', icon: '⚙️' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-orange-50 hover:text-amber-600'}`}>
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-orange-50 mt-auto text-center">
          <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100">Salir del Sistema</button>
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
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">MANAGEMENT & AUDIT SYSTEM</p>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">
              {activeView === 'dashboard' ? 'Métricas de Gestión' : activeView === 'complaints' ? 'Control de Auditoría' : activeView}
            </h1>
          </div>
          <div className="text-right flex items-center gap-4">
             <div className="bg-white px-6 py-3 rounded-2xl border border-orange-50 shadow-sm text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SISTEMA V3.0 PRO</p>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
             </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} areas={areas} currentUser={currentUser} onUpdate={handleUpdateComplaint} />}
          {activeView === 'complaints' && (
            <div className="max-w-4xl mx-auto">
              <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />
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
              onConnStatusChange={async (s) => {
                setIsOnline(s);
                if (s) {
                  const data = await dbService.fetchComplaints();
                  setComplaints(data);
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
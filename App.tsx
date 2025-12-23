
import React, { useState, useEffect } from 'react';
import { 
  Complaint, View, User, ComplaintStatus, Priority 
} from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // Persistencia de datos
  const [users, setUsers] = useState<User[]>(() => JSON.parse(localStorage.getItem('dac_users') || '[]'));
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Consultas", "UCI", "Laboratorio"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Cardiología", "Pediatría", "Medicina General"]'));

  useEffect(() => {
    localStorage.setItem('dac_users', JSON.stringify(users));
    localStorage.setItem('dac_complaints', JSON.stringify(complaints));
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
  }, [users, complaints, areas, specialties]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    if (isRegisterMode) {
      // Lógica de Registro
      if (users.find(u => u.username === username)) {
        setNotification({ msg: 'El usuario ya existe', type: 'error' });
        return;
      }
      const newUser: User = { id: Date.now().toString(), username, password, name: name || username, role: 'admin' };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setIsLoggedIn(true);
      setNotification({ msg: 'Usuario creado con éxito', type: 'success' });
    } else {
      // Lógica de Login
      const foundUser = users.find(u => u.username === username && u.password === password);
      if (foundUser) {
        setCurrentUser(foundUser);
        setIsLoggedIn(true);
        setNotification({ msg: `Bienvenido, ${foundUser.name}`, type: 'success' });
      } else {
        setNotification({ msg: 'Credenciales inválidas', type: 'error' });
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fffcf9] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_40px_80px_-15px_rgba(245,158,11,0.2)] border border-orange-100 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500"></div>
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2.2rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl shadow-2xl shadow-orange-100 animate-pulse">✨</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CALIDAD DAC</h1>
            <p className="text-orange-400 font-bold uppercase tracking-[0.3em] text-[9px] mt-3">Gestión Hospitalaria Intelligence</p>
          </div>

          <div className="flex bg-orange-50/50 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegisterMode ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Ingresar
            </button>
            <button 
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegisterMode ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {isRegisterMode && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre Completo</label>
                <input name="name" required className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-2xl p-4 text-slate-900 outline-none focus:border-amber-400 font-bold text-sm transition-all" placeholder="Ej: Juan Pérez" />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario</label>
              <input name="username" required className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-2xl p-4 text-slate-900 outline-none focus:border-amber-400 font-bold text-sm transition-all" placeholder="usuario_admin" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
              <input name="password" type="password" required className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-2xl p-4 text-slate-900 outline-none focus:border-amber-400 font-bold text-sm transition-all" placeholder="••••••••" />
            </div>

            <button className="w-full py-5 neo-warm-button text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] mt-4 shadow-xl">
              {isRegisterMode ? 'Crear Cuenta y Acceder' : 'Entrar al Sistema'}
            </button>
          </form>

          {!isRegisterMode && users.length === 0 && (
            <p className="text-center mt-6 text-[10px] font-bold text-amber-600 animate-bounce">
              ⚠️ No hay usuarios. Por favor, regístrese primero.
            </p>
          )}
        </div>
        
        {notification && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right duration-300">
            {notification.msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-slate-900 relative">
      {notification && (
        <div className={`fixed top-8 right-8 z-[300] p-6 rounded-[2rem] shadow-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-500 backdrop-blur-xl ${
          notification.type === 'success' ? 'bg-amber-600/90 text-white border-amber-400' :
          notification.type === 'error' ? 'bg-rose-600/90 text-white border-rose-400' :
          'bg-orange-600/90 text-white border-orange-400'
        }`}>
          <div className="text-xs font-black uppercase tracking-widest">{notification.msg}</div>
        </div>
      )}

      <aside className="w-24 lg:w-80 bg-white border-r border-orange-50 flex flex-col no-print z-50">
        <div className="p-10 border-b border-orange-50 flex flex-col items-center lg:items-start gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-amber-100 text-xl">CD</div>
          <div className="hidden lg:block">
            <span className="text-2xl font-black tracking-tighter block leading-none text-slate-900">CALIDAD DAC</span>
            <p className="text-[10px] font-bold uppercase text-orange-400 tracking-widest mt-1">SISTEMA INTEGRAL</p>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 mt-4">
          {[
            { id: 'dashboard', label: 'Estadísticas', icon: '📊' },
            { id: 'complaints', label: 'Auditorías', icon: '🩺' },
            { id: 'reports', label: 'Reportes', icon: '📋' },
            { id: 'settings', label: 'Configuración', icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-black text-sm transition-all group ${
                activeView === item.id 
                ? 'sidebar-item-active text-white' 
                : 'text-slate-500 hover:bg-orange-50/50 hover:text-amber-600'
              }`}
            >
              <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span> 
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-orange-50">
          <div className="mb-6 p-4 bg-orange-50/30 rounded-2xl border border-orange-50">
            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1">Operador</p>
            <p className="text-xs font-black text-slate-700 truncate">{currentUser?.name}</p>
          </div>
          <button onClick={() => {setIsLoggedIn(false); setCurrentUser(null);}} className="w-full py-5 bg-orange-50/50 hover:bg-rose-50 hover:text-rose-600 text-amber-700 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all">Salir del Sistema</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 relative bg-[#fffcf9]">
        <header className="mb-16 no-print flex justify-between items-start">
          <div>
            <h2 className="text-5xl font-black tracking-tighter capitalize text-slate-900 mb-3">{activeView}</h2>
            <div className="flex items-center gap-3">
              <span className="w-10 h-1.5 bg-amber-500 rounded-full"></span>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.4em]">Panel de Control de Calidad</p>
            </div>
          </div>
          <div className="w-16 h-16 glass-card flex items-center justify-center text-3xl shadow-xl border-orange-100 text-amber-500">✨</div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} areas={areas} />}
          {activeView === 'complaints' && (
            <div className="space-y-16">
              <ComplaintForm areas={areas} specialties={specialties} onAdd={c => setComplaints([c, ...complaints])} />
              <ComplaintList complaints={complaints} onUpdate={(id, s, r) => setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r} : c))} />
            </div>
          )}
          {activeView === 'reports' && <Reports complaints={complaints} />}
          {activeView === 'settings' && (
            <Settings 
              areas={areas} setAreas={setAreas} 
              specialties={specialties} setSpecialties={setSpecialties}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

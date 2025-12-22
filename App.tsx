import React, { useState, useEffect, useRef } from 'react';
import * as JsSIP from 'jssip';
import { 
  Complaint, CallRecord, View, User, ComplaintStatus, 
  Priority, PhoneConfig, IPCall 
} from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { CallLog } from './components/CallLog';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PhoneWidget } from './components/PhoneWidget';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [calls, setCalls] = useState<CallRecord[]>(() => JSON.parse(localStorage.getItem('dac_calls') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Consultas", "UCI", "Laboratorio"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Cardiología", "Pediatría", "Medicina General"]'));

  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig>(() => {
    const saved = localStorage.getItem('dac_phone_config');
    return saved ? JSON.parse(saved) : {
      sipDomain: '192.168.22.101',
      sipUser: '172.28.38.250',
      sipPass: '12345AD',
      status: 'offline'
    };
  });

  const [activeIPCall, setActiveIPCall] = useState<IPCall | null>(null);
  const [callHistory, setCallHistory] = useState<IPCall[]>([]);
  const uaRef = useRef<JsSIP.UA | null>(null);

  useEffect(() => {
    localStorage.setItem('dac_complaints', JSON.stringify(complaints));
    localStorage.setItem('dac_calls', JSON.stringify(calls));
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
    localStorage.setItem('dac_phone_config', JSON.stringify(phoneConfig));
  }, [complaints, calls, areas, specialties, phoneConfig]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const connectSIP = () => {
    if (!phoneConfig.sipDomain || !phoneConfig.sipUser) {
      setNotification({ msg: 'Faltan datos de servidor o usuario', type: 'error' });
      return;
    }

    setPhoneConfig(prev => ({ ...prev, status: 'connecting' }));
    setNotification({ msg: 'Estableciendo enlace con central...', type: 'info' });

    try {
      if (uaRef.current) {
        uaRef.current.stop();
      }

      const wsUrl = phoneConfig.sipDomain.startsWith('ws') 
        ? phoneConfig.sipDomain 
        : `ws://${phoneConfig.sipDomain}:8088/ws`;

      const socket = new JsSIP.WebSocketInterface(wsUrl);
      const configuration = {
        sockets: [socket],
        uri: `sip:${phoneConfig.sipUser}@${phoneConfig.sipDomain.split(':')[0]}`,
        password: phoneConfig.sipPass,
        register: true
      };

      const ua = new JsSIP.UA(configuration);
      uaRef.current = ua;

      ua.on('connected', () => {
        console.log('SIP Connection established at socket level');
      });
      
      ua.on('disconnected', () => {
        setPhoneConfig(p => ({ ...p, status: 'offline' }));
      });
      
      ua.on('registered', () => {
        setPhoneConfig(p => ({ ...p, status: 'online' }));
        setNotification({ msg: 'Sistema de Telefonía Activo ✓', type: 'success' });
      });
      
      ua.on('registrationFailed', (e: any) => {
        setPhoneConfig(p => ({ ...p, status: 'offline' }));
        setNotification({ msg: `Fallo de registro: ${e.cause || 'Error de Red'}`, type: 'error' });
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;
        const number = session.remote_identity.uri.user;
        const newCall: IPCall = {
          id: Math.random().toString(),
          number,
          status: 'ringing',
          timestamp: new Date().toLocaleTimeString(),
          duration: 0,
          direction: session.direction === 'incoming' ? 'incoming' : 'outgoing'
        };
        setActiveIPCall(newCall);
        session.on('accepted', () => setActiveIPCall(prev => prev ? { ...prev, status: 'active' } : null));
        session.on('ended', () => {
          setActiveIPCall(null);
          setCallHistory(prev => [{ ...newCall, status: 'ended' as const }, ...prev].slice(0, 50));
        });
        session.on('failed', () => setActiveIPCall(null));
      });

      ua.start();
    } catch (e: any) {
      setPhoneConfig(p => ({ ...p, status: 'offline' }));
      setNotification({ msg: `Error de Central: ${e.message}`, type: 'error' });
    }
  };

  const handleDial = (number: string) => {
    if (uaRef.current && phoneConfig.status === 'online') {
      const options = { mediaConstraints: { audio: true, video: false } };
      uaRef.current.call(`sip:${number}@${phoneConfig.sipDomain}`, options);
    } else {
      setNotification({ msg: 'La central no está en línea', type: 'error' });
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    setUser({ id: '1', username, name: username, role: 'admin' });
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] mx-auto mb-8 flex items-center justify-center text-white text-5xl shadow-2xl shadow-indigo-200">🏥</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">DAC PRO</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">SISTEMA DE CALIDAD HOSPITALARIA</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identificación de Usuario</label>
              <input name="username" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-slate-900 outline-none focus:border-indigo-500 font-bold text-lg shadow-inner transition-all" placeholder="Nombre de usuario" />
            </div>
            <button className="w-full py-6 neo-3d-button text-white rounded-3xl font-black uppercase tracking-widest text-[11px] transition-all">Ingresar al Centro de Control</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-slate-900 relative">
      {notification && (
        <div className={`fixed top-8 right-8 z-[300] p-6 rounded-[2rem] shadow-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-500 backdrop-blur-xl ${
          notification.type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-400' :
          notification.type === 'error' ? 'bg-rose-600/90 text-white border-rose-400' :
          'bg-indigo-600/90 text-white border-indigo-400'
        }`}>
          <div className="text-2xl font-bold">{notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}</div>
          <div className="text-xs font-black uppercase tracking-widest">{notification.msg}</div>
        </div>
      )}

      <aside className="w-24 lg:w-80 bg-white border-r border-slate-200 flex flex-col no-print z-50">
        <div className="p-10 border-b border-slate-100 flex flex-col items-center lg:items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-100 text-xl">D</div>
          <div className="hidden lg:block">
            <span className="text-2xl font-black tracking-tighter block leading-none text-slate-900">DAC PRO</span>
            <div className={`mt-3 inline-flex items-center px-3 py-1.5 rounded-full border ${
              phoneConfig.status === 'online' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}>
              <span className={`status-dot ${phoneConfig.status === 'online' ? 'status-pulse-online' : 'status-offline'}`}></span>
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {phoneConfig.status === 'online' ? 'Central Conectada' : 'Central Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 mt-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'complaints', label: 'Atención', icon: '🩺' },
            { id: 'crm', label: 'CRM / Call', icon: '📞' },
            { id: 'reports', label: 'Informes', icon: '📋' },
            { id: 'settings', label: 'Ajustes', icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-black text-sm transition-all group ${
                activeView === item.id 
                ? 'sidebar-item-active text-white' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span> 
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-100">
          <div className="hidden lg:flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-black shadow-sm border border-slate-200">U</div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase truncate">Sesión Activa</p>
              <p className="text-sm font-black text-indigo-700 truncate">{user?.name}</p>
            </div>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="w-full py-5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-sm">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 relative bg-[#f8fafc]">
        <header className="mb-16 no-print flex justify-between items-start">
          <div>
            <h2 className="text-5xl font-black tracking-tighter capitalize text-slate-900 mb-3">{activeView}</h2>
            <div className="flex items-center gap-3">
              <span className="w-10 h-1.5 bg-indigo-600 rounded-full"></span>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.4em]">Intelligence Unit v2.5</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Operativo</p>
               <p className="text-sm font-black text-indigo-600">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
             </div>
             <div className="w-16 h-16 glass-card flex items-center justify-center text-3xl shadow-2xl border-white hover:scale-110 transition-transform">⚡</div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} calls={calls} areas={areas} />}
          {activeView === 'complaints' && (
            <div className="space-y-16">
              <ComplaintForm areas={areas} specialties={specialties} onAdd={c => setComplaints([c, ...complaints])} />
              <ComplaintList complaints={complaints} onDial={handleDial} onUpdate={(id, s, r) => setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r} : c))} />
            </div>
          )}
          {activeView === 'crm' && <CallLog calls={calls} onAdd={c => setCalls([c, ...calls])} />}
          {activeView === 'reports' && <Reports complaints={complaints} calls={calls} />}
          {activeView === 'settings' && (
            <Settings 
              areas={areas} setAreas={setAreas} 
              specialties={specialties} setSpecialties={setSpecialties}
              phoneConfig={phoneConfig} setPhoneConfig={setPhoneConfig}
              onConnect={connectSIP}
              callHistory={callHistory}
            />
          )}
        </div>

        <PhoneWidget config={phoneConfig} activeCall={activeIPCall} onDial={handleDial} />
      </main>
    </div>
  );
};

export default App;
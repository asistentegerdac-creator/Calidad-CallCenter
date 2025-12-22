import React, { useState } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  phoneConfig: PhoneConfig;
  setPhoneConfig: (p: PhoneConfig) => void;
  onConnect: () => void;
  callHistory: IPCall[];
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, phoneConfig, setPhoneConfig, onConnect, callHistory }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');

  const getStatusButtonConfig = () => {
    switch (phoneConfig.status) {
      case 'online':
        return { text: 'CENTRAL EN LÍNEA ✓', class: 'bg-emerald-500 text-white status-pulse-online', disabled: false };
      case 'connecting':
        return { text: 'ESTABLECIENDO ENLACE...', class: 'bg-blue-400 text-white cursor-wait animate-pulse', disabled: true };
      default:
        return { text: 'CONECTAR CON CENTRAL PBX', class: 'btn-vibrant text-white', disabled: false };
    }
  };

  const btnConfig = getStatusButtonConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="glass-card bg-white p-10 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -z-10 opacity-50"></div>
        
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${phoneConfig.status === 'online' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
              📞
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Infraestructura SIP</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuración de Voz sobre IP</p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${phoneConfig.status === 'online' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {phoneConfig.status === 'online' ? '● En línea' : '● Desconectado'}
          </span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Host / Dirección IP PBX</label>
             <input 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="192.168.1.100" 
              value={phoneConfig.sipDomain} 
              onChange={e => setPhoneConfig({...phoneConfig, sipDomain: e.target.value})} 
             />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Extensión DAC</label>
               <input 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" 
                value={phoneConfig.sipUser} 
                onChange={e => setPhoneConfig({...phoneConfig, sipUser: e.target.value})} 
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Password SIP</label>
               <input 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" 
                type="password" 
                value={phoneConfig.sipPass} 
                onChange={e => setPhoneConfig({...phoneConfig, sipPass: e.target.value})} 
               />
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              onClick={onConnect}
              disabled={btnConfig.disabled}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${btnConfig.class}`}
            >
              {btnConfig.text}
            </button>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
            <p className="text-[11px] text-blue-600 leading-relaxed font-bold italic text-center">
              "El motor de comunicación utiliza WebRTC estándar para Asterisk/FreePBX. Asegúrese de habilitar los puertos UDP 10000-20000 en su red local."
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-8">
           <h4 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-widest">Actividad de Línea</h4>
           <div className="space-y-3">
              {callHistory.slice(0, 5).map(h => (
                <div key={h.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${h.direction === 'incoming' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {h.direction === 'incoming' ? '↙' : '↗'}
                    </div>
                    <div>
                      <span className="font-black text-slate-700 block">{h.number}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">{h.direction === 'incoming' ? 'Entrante' : 'Saliente'}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-[10px]">{h.timestamp}</span>
                </div>
              ))}
              {callHistory.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin llamadas registradas</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="glass-card bg-white p-10 border border-slate-200 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">🏢</span> 
            Infraestructura Médica
          </h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Nueva Área Clínica..." />
            <button onClick={() => { if(newArea) setAreas([...areas, newArea]); setNewArea(''); }} className="w-14 h-14 bg-emerald-500 text-white rounded-2xl font-black text-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map(a => (
              <span key={a} className="px-5 py-2.5 bg-slate-50 text-slate-700 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-default group">
                {a} <button onClick={() => setAreas(areas.filter(x => x !== a))} className="text-slate-300 group-hover:text-rose-600 font-bold text-lg leading-none">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-slate-200 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4">
            <span className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">🎓</span> 
            Cartera de Especialidades
          </h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Nueva Especialidad..." />
            <button onClick={() => { if(newSpec) setSpecialties([...specialties, newSpec]); setNewSpec(''); }} className="w-14 h-14 bg-indigo-500 text-white rounded-2xl font-black text-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {specialties.map(s => (
              <span key={s} className="px-5 py-2.5 bg-slate-50 text-slate-700 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-default group">
                {s} <button onClick={() => setSpecialties(specialties.filter(x => x !== s))} className="text-slate-300 group-hover:text-rose-600 font-bold text-lg leading-none">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
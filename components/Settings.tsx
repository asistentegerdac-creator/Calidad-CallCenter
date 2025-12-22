
import React from 'react';
import { PhoneConfig, IPCall } from '../types';

interface SettingsProps {
  phoneConfig: PhoneConfig;
  onUpdatePhoneConfig: (config: PhoneConfig) => void;
  ipCallHistory: IPCall[];
}

export const Settings: React.FC<SettingsProps> = ({ phoneConfig, onUpdatePhoneConfig, ipCallHistory }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdatePhoneConfig({ ...phoneConfig, [name]: value });
  };

  const connectPhone = () => {
    if (phoneConfig.ipAddress) {
      onUpdatePhoneConfig({ ...phoneConfig, status: 'online' });
    }
  };

  const disconnectPhone = () => {
    onUpdatePhoneConfig({ ...phoneConfig, status: 'offline' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-20">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center text-3xl">🎛️</div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Grandstream CTI Bridge</h3>
            <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Sincronización de Terminal SIP</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP del Dispositivo</label>
            <input 
              name="ipAddress" type="text" placeholder="192.168.X.X"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
              value={phoneConfig.ipAddress}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extensión / Usuario</label>
              <input 
                name="sipUser" type="text" placeholder="SIP-200"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={phoneConfig.sipUser}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SIP Secret</label>
              <input 
                name="sipPass" type="password" placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={phoneConfig.sipPass}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pt-8 flex gap-4">
            {phoneConfig.status === 'offline' ? (
              <button 
                onClick={connectPhone}
                className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all uppercase tracking-widest text-xs"
              >
                Iniciar Sesión SIP
              </button>
            ) : (
              <button 
                onClick={disconnectPhone}
                className="flex-1 bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-400 transition-all uppercase tracking-widest text-xs"
              >
                Cerrar Conexión
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
           <span className="text-2xl">💡</span>
           <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
             <span className="text-blue-600 font-black">CTI ACTIVO:</span> Su Grandstream ahora funciona como un terminal integrado. Las llamadas entrantes dispararán el widget flotante, permitiendo atender y registrar automáticamente la duración para sus reportes gerenciales de contactabilidad.
           </p>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[50px] shadow-2xl border border-slate-800 text-white flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-black tracking-tighter">CDR - Registro de Llamadas</h3>
          <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Real-Time Traffic</span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {ipCallHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <span className="text-6xl mb-4">📭</span>
               <p className="text-xs font-black uppercase tracking-widest">No hay tráfico registrado aún</p>
            </div>
          ) : (
            ipCallHistory.map(call => (
              <div key={call.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${call.status === 'missed' ? 'bg-rose-500/10 text-rose-500' : call.direction === 'incoming' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                     {call.status === 'missed' ? '📞' : call.direction === 'incoming' ? '↙️' : '↗️'}
                   </div>
                   <div>
                      <p className="font-black text-base">{call.number}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[9px] text-white/30 uppercase font-black">{call.timestamp}</span>
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${call.status === 'missed' ? 'border-rose-500/30 text-rose-500' : 'border-blue-500/30 text-blue-400'}`}>
                           {call.status}
                         </span>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className={`font-black text-base ${call.status === 'missed' ? 'text-white/20' : 'text-blue-400'}`}>
                     {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}
                   </p>
                   <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Duration</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

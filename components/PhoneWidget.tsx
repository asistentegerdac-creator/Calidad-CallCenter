import React, { useState, useEffect } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface Props {
  config: PhoneConfig;
  activeCall: IPCall | null;
  onDial: (num: string) => void;
}

export const PhoneWidget: React.FC<Props> = ({ config, activeCall, onDial }) => {
  const [timer, setTimer] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let int: any;
    if (activeCall?.status === 'active') int = setInterval(() => setTimer(t => t + 1), 1000);
    else setTimer(0);
    return () => clearInterval(int);
  }, [activeCall]);

  if (config.status === 'offline') return null;

  return (
    <div className={`fixed bottom-10 right-10 z-[100] transition-all duration-500 ${activeCall ? 'scale-110' : 'scale-100'}`}>
      <div className="bg-white rounded-[3rem] p-8 shadow-2xl min-w-[350px] border border-slate-200 neo-3d">
        {!activeCall ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${config.status === 'online' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                📞
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Enlace Telefónico</p>
                <p className={`text-xs font-black uppercase tracking-tight ${config.status === 'online' ? 'text-emerald-500' : 'text-slate-400'}`}>
                   Central en Línea
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShow(!show)} 
              className="w-14 h-14 btn-vibrant text-white rounded-2xl flex items-center justify-center text-xl shadow-lg active:scale-90 transition-transform"
            >
              {show ? '✕' : '⌨️'}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-5xl shadow-2xl ${activeCall.status === 'ringing' ? 'bg-amber-100 text-amber-500 animate-bounce' : 'bg-blue-600 text-white animate-pulse'}`}>
              📞
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{activeCall.number}</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                <p className="text-blue-600 text-[11px] font-black tracking-widest uppercase">
                  {activeCall.status === 'ringing' ? 'Solicitud Entrante' : `Duración: ${Math.floor(timer/60)}:${String(timer%60).padStart(2, '0')}`}
                </p>
              </div>
            </div>
            <button className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95">
              FINALIZAR CONEXIÓN
            </button>
          </div>
        )}

        {show && !activeCall && (
          <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-bottom-5 duration-300">
            <div className="relative mb-6">
              <input 
                id="dialer_input"
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-4xl font-black text-center tracking-[0.4em] text-slate-800 outline-none focus:border-blue-500 transition-all shadow-inner" 
                placeholder="---"
              />
              <p className="text-center text-[9px] font-black text-slate-300 uppercase mt-4 tracking-widest">Ingrese número de extensión o externo</p>
            </div>
            <button 
              onClick={() => { const el = document.getElementById('dialer_input') as HTMLInputElement; onDial(el.value); setShow(false); }}
              className="w-full py-5 btn-vibrant text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-95 transition-all"
            >
              INICIAR LLAMADA DIGITAL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
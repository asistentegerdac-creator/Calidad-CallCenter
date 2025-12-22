
import React, { useState, useEffect } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface PhoneWidgetProps {
  config: PhoneConfig;
  activeCall: IPCall | null;
  onAction: (action: 'answer' | 'hangup' | 'dial', number?: string) => void;
}

export const PhoneWidget: React.FC<PhoneWidgetProps> = ({ config, activeCall, onAction }) => {
  const [timer, setTimer] = useState(0);
  const [dialNumber, setDialNumber] = useState('');
  const [showDialpad, setShowDialpad] = useState(false);

  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === 'active') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  if (config.status === 'offline') return null;

  const handleDial = () => {
    if (dialNumber.trim()) {
      onAction('dial', dialNumber);
      setDialNumber('');
      setShowDialpad(false);
    }
  };

  const addDigit = (digit: string) => {
    setDialNumber(prev => prev + digit);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className={`bg-slate-900 rounded-[35px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 p-6 min-w-[340px] transition-all duration-500 overflow-hidden ${activeCall ? 'ring-4 ring-blue-500/40' : ''}`}>
        
        {!activeCall && !showDialpad && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center relative">
                 <span className="text-3xl">📳</span>
                 <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <div>
                 <p className="text-white font-black text-sm">Grandstream Ready</p>
                 <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-0.5">{config.ipAddress}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDialpad(true)}
              className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:bg-blue-500 transition-all"
            >
              ⌨️
            </button>
          </div>
        )}

        {showDialpad && !activeCall && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-2">
               <p className="text-white font-black text-xs uppercase tracking-widest">Llamada Saliente</p>
               <button onClick={() => setShowDialpad(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <div className="bg-slate-800 p-5 rounded-2xl text-center">
               <p className="text-2xl font-black text-white tracking-widest h-8">{dialNumber || '--- ---'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => (
                <button 
                  key={d} onClick={() => addDigit(d)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-xl transition-all"
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setDialNumber('')}
                className="w-20 bg-slate-800 text-white rounded-2xl font-black"
              >
                CLR
              </button>
              <button 
                onClick={handleDial}
                disabled={!dialNumber}
                className="flex-1 py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-600/20"
              >
                Llamar
              </button>
            </div>
          </div>
        )}

        {activeCall && (
          <div className="space-y-6 animate-in slide-in-from-right-10">
            <div className="flex items-center gap-5">
               <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center text-3xl shadow-lg ${activeCall.status === 'ringing' ? 'bg-amber-500 animate-bounce' : 'bg-blue-600 animate-pulse shadow-blue-600/30'}`}>
                 {activeCall.direction === 'incoming' ? '📞' : '📱'}
               </div>
               <div className="flex-1">
                  <p className="text-white font-black text-2xl tracking-tighter leading-none">{activeCall.number}</p>
                  <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">
                    {activeCall.status === 'ringing' ? 'LLAMADA ENTRANTE' : `ACTIVA: ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`}
                  </p>
               </div>
            </div>

            <div className="flex gap-4">
              {activeCall.status === 'ringing' ? (
                <>
                  <button 
                    onClick={() => onAction('answer')}
                    className="flex-1 py-5 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-400"
                  >
                    Contestar
                  </button>
                  <button 
                    onClick={() => onAction('hangup')}
                    className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500"
                  >
                    Ignorar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => onAction('hangup')}
                  className="w-full py-5 bg-rose-600 text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-rose-600/30 hover:bg-rose-500 transition-all"
                >
                  Finalizar Llamada
                </button>
              )}
            </div>

            <div className="flex justify-center gap-1.5 h-8 items-end px-4">
               {[...Array(15)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-1 bg-blue-500 rounded-full transition-all duration-300" 
                   style={{ 
                     height: activeCall.status === 'active' ? `${Math.random() * 100}%` : '20%',
                     opacity: activeCall.status === 'active' ? 1 : 0.3
                   }}
                 />
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

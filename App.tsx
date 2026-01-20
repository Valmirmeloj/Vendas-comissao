
import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, setDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { Zap, Loader2, Lock, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('novo-ped');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ store: '', firstName: '', lastName: '', isAdmin: false, adminPass: '' });
  const [isExpired, setIsExpired] = useState(false);
  const [allSales, setAllSales] = useState<any[]>([]);

  const getDeviceId = () => {
    let id = localStorage.getItem('vc_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('vc_device_id', id);
    }
    return id;
  };

  const checkExpiration = useCallback((userData: any) => {
    if (userData.r === 'admin') return false;
    if (userData.blocked) return true;
    return Date.now() > (userData.expiresAt || 0);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('crm_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setIsExpired(checkExpiration(parsed));
    }
  }, [checkExpiration]);

  useEffect(() => {
    if (!user || isExpired) return;
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      let sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (user.r === 'seller') sales = sales.filter((s: any) => s.seller === user.id);
      setAllSales(sales);
    });
    return () => unsubscribe();
  }, [user, isExpired]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginData.isAdmin) {
        if (loginData.adminPass === 'admin123') {
          const admin = { id: 'admin-master', name: 'ADMINISTRADOR', r: 'admin', store: 'CENTRAL' };
          setUser(admin);
          localStorage.setItem('crm_user', JSON.stringify(admin));
          return;
        }
        throw new Error("Senha administrativa incorreta.");
      }

      const { store, firstName, lastName } = loginData;
      if (!store || !firstName || !lastName) throw new Error("Preencha todos os campos.");

      const userId = `${store.toLowerCase()}-${firstName.toLowerCase()}-${lastName.toLowerCase()}`.replace(/\s+/g, '-');
      const uDoc = await getDoc(doc(db, 'users', userId));
      let userData: any;

      if (uDoc.exists()) {
        userData = { id: uDoc.id, ...uDoc.data() };
      } else {
        userData = {
          name: `${firstName} ${lastName}`.toUpperCase(),
          store: store.toUpperCase(),
          r: 'seller',
          deviceId: getDeviceId(),
          createdAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
          blocked: false
        };
        await setDoc(doc(db, 'users', userId), userData);
        userData.id = userId;
      }

      setUser(userData);
      localStorage.setItem('crm_user', JSON.stringify(userData));
      setIsExpired(checkExpiration(userData));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_user');
    setUser(null);
    setIsExpired(false);
  };

  if (!user || isExpired) {
    return (
      <div className="h-screen w-full bg-[#fdfaf7] flex items-center justify-center p-6">
        {isExpired ? (
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-red-50 text-center animate-in zoom-in-95">
             <div className="w-20 h-20 bg-red-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-red-100"><Lock size={40} /></div>
             <h2 className="text-2xl font-extrabold text-stone-800 uppercase mb-3">Acesso Bloqueado</h2>
             <p className="text-stone-400 text-sm mb-10 leading-relaxed">Seu período de avaliação de 30 dias expirou. Entre em contato com o suporte para renovar.</p>
             <button onClick={handleLogout} className="w-full bg-stone-900 text-white font-bold py-5 rounded-2xl uppercase text-[11px] tracking-widest shadow-lg hover:bg-black transition-all">Voltar ao Login</button>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl border border-white relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-100 rounded-full blur-3xl opacity-50" />
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-200 mb-6 animate-float">
                 <Zap className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-800 tracking-tighter uppercase">V&C CRM <span className="text-orange-500">Elite</span></h1>
              <p className="text-stone-400 text-[10px] font-bold uppercase mt-2 tracking-widest">Leveza e Elegância em Vendas</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {!loginData.isAdmin ? (
                <>
                  <input type="text" placeholder="Nome da Loja" className="premium-input w-full rounded-2xl py-4 px-6 font-semibold uppercase text-stone-700" value={loginData.store} onChange={e => setLoginData({...loginData, store: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Seu Nome" className="premium-input w-full rounded-2xl py-4 px-6 font-semibold text-stone-700" value={loginData.firstName} onChange={e => setLoginData({...loginData, firstName: e.target.value})} required />
                    <input type="text" placeholder="Sobrenome" className="premium-input w-full rounded-2xl py-4 px-6 font-semibold text-stone-700" value={loginData.lastName} onChange={e => setLoginData({...loginData, lastName: e.target.value})} required />
                  </div>
                </>
              ) : (
                <input type="password" placeholder="Senha Mestra" className="premium-input w-full rounded-2xl py-4 px-6 font-semibold" value={loginData.adminPass} onChange={e => setLoginData({...loginData, adminPass: e.target.value})} required />
              )}

              <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl shadow-orange-100 hover:bg-orange-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mt-4">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Sistema'}
              </button>

              <button type="button" onClick={() => setLoginData({...loginData, isAdmin: !loginData.isAdmin})} className="w-full text-[10px] font-bold text-stone-300 uppercase tracking-widest hover:text-orange-500 transition-colors">
                {loginData.isAdmin ? 'Acesso Vendedor' : 'Área do Gestor'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafaf9]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogout={handleLogout} user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-20 glass-card px-8 flex items-center justify-between border-b border-stone-100/50">
           <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white rounded-xl text-stone-400 shadow-sm"><Zap size={20} /></button>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{user.store}</p>
               <p className="text-sm font-extrabold text-stone-800">{user.name}</p>
             </div>
             <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">{user.name[0]}</div>
           </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
          <Dashboard activeTab={activeTab} user={user} allSales={allSales} onRefresh={() => {}} />
        </main>
      </div>
    </div>
  );
};

export default App;

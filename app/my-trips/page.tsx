"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AuthModal from '../AuthModal';

export default function MyTripsPage() {
  const [user, setUser] = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) { setLoading(false); return; }
      fetchSavedRoutes(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchSavedRoutes(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('saved_routes')
      .select('route_id, routes(*)')
      .eq('user_id', userId);
    if (data) setSavedRoutes(data.map((r: any) => r.routes));
    setLoading(false);
  }

  async function handleUnsave(routeId: string) {
    await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', routeId);
    setSavedRoutes(prev => prev.filter((r: any) => r.id !== routeId));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
    router.push('/');
  }

  useEffect(() => {
  if (user) fetchProfile(user.id);
}, [user]);

async function fetchProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
  if (data) setAvatarUrl(data.avatar_url || '');
}

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans">

      {/* NAVIGATION */}
        <nav
          className="flex justify-between items-center px-10 py-4"
          style={{ background: '#ffffff' }}
        >
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="leading-none">
              <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
                Scenic <br /> <span className="ml-4">Routes</span>
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-10">
            <Link href="/explore" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
              Explore Routes
            </Link>
            <Link href="/about" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
              About Us
            </Link>
            {user && (
              <Link href="/my-trips" className="text-emerald-600 hover:text-emerald-800 transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
                My Trips
              </Link>
            )}
          </div>

          {/* User / Login */}
          {user ? (
            <div className="relative user-menu-wrapper">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full border border-black/20 flex items-center justify-center hover:border-black/50 transition-all duration-200 overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black font-bold text-sm uppercase">{user.email?.[0]}</span>
                )}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 truncate tracking-widest">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    Profile
                  </Link>
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="text-[11px] uppercase tracking-[0.18em] font-semibold text-black/50 hover:text-black border border-black/20 hover:border-black/50 px-5 py-2 rounded-full transition-all duration-200"
            >
              Login
            </button>
          )}
        </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-black">My Trips</h1>
          <p className="text-gray-400 mt-2">Your saved scenic routes</p>
        </div>

        {!user ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg mb-6">Sign in to see your saved routes</p>
            <button onClick={() => setIsAuthOpen(true)} className="px-8 py-3 bg-[#003e4d] text-white rounded-[24px] font-bold uppercase text-sm tracking-wide hover:bg-[#004e61] transition-all">
              Login
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedRoutes.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg mb-6">You haven't saved any routes yet</p>
            <Link href="/explore" className="px-8 py-3 bg-[#003e4d] text-white rounded-[24px] font-bold uppercase text-sm tracking-wide hover:bg-[#004e61] transition-all">
              Explore Routes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {savedRoutes.map((route: any) => (
              <div key={route.id} className="group rounded-4xl border border-gray-100 shadow-sm overflow-hidden bg-white transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] hover:-translate-y-1">
                <div className="relative h-78 overflow-hidden">
                  <img src={route.image_url} alt={route.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  {/* СЕРДЕЧКО — убрать из сохранённых */}
                  <button
                    onClick={() => handleUnsave(route.id)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/40"
                  >
                    <svg className="w-5 h-5 fill-red-500 stroke-red-500" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
                <div className="p-5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{route.country}</span>
                  <h3 className="font-bold text-lg mt-1">{route.title}</h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{route.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {route.duration}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 18 C6 18 6 8 14 5" /><line x1="14" y1="5" x2="10" y2="3" /><line x1="14" y1="5" x2="14" y2="9" />
                        </svg>
                        {route.distance_km} km
                      </span>
                    </div>
                    <button className="text-sm font-semibold text-blue-600">View Route</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="w-full bg-[#0a0f1a] text-gray-500 py-12 px-12 mt-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 pb-16 border-b border-white/5">
          <div className="flex flex-col gap-2 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <img src="/mountains.png" alt="Logo" className="w-13 h-13 object-contain invert opacity-70" />
              <span className="text-lg font-black text-white tracking-tight whitespace-nowrap">Scenic Routes</span>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed max-w-[220px]">Curated routes for those who seek the road less travelled.</p>
          </div>
          <div className="flex flex-col items-center gap-3 text-[13px]">
            <div className="flex gap-8">
              {['Explore Routes', 'Mountains', 'Coastal', 'Forest'].map(link => (
                <a key={link} href="#" className="hover:text-white transition-colors whitespace-nowrap">{link}</a>
              ))}
            </div>
            <div className="flex gap-8">
              {['About Us', 'Contact', 'Privacy', 'Terms'].map(link => (
                <a key={link} href="#" className="hover:text-white transition-colors whitespace-nowrap">{link}</a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <p className="text-xs text-white font-semibold uppercase tracking-widest">Stay Inspired</p>
            <div className="flex items-center gap-2">
              <input type="email" placeholder="your@email.com" className="w-72 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors" />
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">→</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex items-center justify-between pt-5 text-xs text-gray-700">
          <p>© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
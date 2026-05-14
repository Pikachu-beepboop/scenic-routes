"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AuthModal from '../AuthModal';
import { supabase } from '../../lib/supabase';

const firstFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf',
  weight: '700',
});

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ─── Filter state — einmalig aus URL initialisiert ───────────────────────
  const [selected, setSelected] = useState(searchParams.get('destination') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('duration') || '');
  const [filters, setFilters] = useState<{
    difficulty: string[];
    duration: string;
    minRating: number;
    countries: string[];
  }>({
    difficulty: searchParams.get('terrain')?.split(',').filter(Boolean) || [],
    duration: searchParams.get('dur') || 'any',
    minRating: Number(searchParams.get('rating') || 0),
    countries: searchParams.get('countries')?.split(',').filter(Boolean) || [],
  });

  // ─── URL sync — läuft NUR nach dem Render, nie während ──────────────────
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Ersten Render überspringen — URL ist bereits korrekt beim Laden
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (selected) params.set('destination', selected);
    if (selectedDate) params.set('duration', selectedDate);
    if (filters.difficulty.length > 0) params.set('terrain', filters.difficulty.join(','));
    if (filters.duration !== 'any') params.set('dur', filters.duration);
    if (filters.minRating > 0) params.set('rating', String(filters.minRating));
    if (filters.countries.length > 0) params.set('countries', filters.countries.join(','));
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedDate, filters]);
  // router + pathname absichtlich nicht in deps — kein infinite loop

  // ─── UI State ────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [durations, setDurations] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  const toggleFilter = (key: 'difficulty' | 'countries', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v: string) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearAllFilters = () => {
    setSelected('');
    setSelectedDate('');
    setFilters({ difficulty: [], duration: 'any', minRating: 0, countries: [] });
  };

  const activeFilterCount =
    filters.difficulty.length +
    filters.countries.length +
    (filters.duration !== 'any' ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchSavedRoutes();
  }, [user]);

  async function fetchSavedRoutes() {
    const { data } = await supabase.from('saved_routes').select('route_id').eq('user_id', user.id);
    if (data) setSavedRoutes(data.map((r: any) => r.route_id));
  }

  async function toggleSave(routeId: string) {
    if (!user) { setIsAuthOpen(true); return; }
    const isSaved = savedRoutes.includes(routeId);
    if (isSaved) {
      await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', routeId);
      setSavedRoutes(prev => prev.filter(id => id !== routeId));
    } else {
      await supabase.from('saved_routes').insert({ user_id: user.id, route_id: routeId });
      setSavedRoutes(prev => [...prev, routeId]);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setSavedRoutes([]);
    setShowUserMenu(false);
  }

  // ─── Data fetching ────────────────────────────────────────────────────────
  async function fetchCountries() {
    const { data } = await supabase.from('routes').select('country');
    if (data) {
      const unique = [...new Set(data.map((r: any) => r.country))].sort() as string[];
      setCountries(unique);
    }
  }

  async function fetchDurations() {
    const { data } = await supabase.from('routes').select('duration');
    if (data) {
      const unique = [...new Set(data.map((r: any) => r.duration))].sort() as string[];
      setDurations(unique);
    }
  }

  async function fetchRoutes() {
    setLoading(true);
    let query = supabase.from('routes').select('*');
    if (selected && selected !== 'Choose destination') query = query.eq('country', selected);
    if (selectedDate && selectedDate !== 'Choose duration') query = query.eq('duration', selectedDate);
    if (filters.countries.length > 0) query = query.in('country', filters.countries);
    if (filters.minRating > 0) query = query.gte('rating', filters.minRating);
    const { data } = await query;
    if (data) setRoutes(data);
    setLoading(false);
  }

  useEffect(() => { fetchCountries(); fetchDurations(); }, []);
  useEffect(() => { fetchRoutes(); }, [selected, selectedDate, filters]);
  useEffect(() => { if (user) fetchProfile(user.id); }, [user]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data) setAvatarUrl(data.avatar_url || '');
  }

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans">

      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-10 py-4" style={{ background: '#ffffff' }}>
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <div className="leading-none">
            <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
              Scenic <br /> <span className="ml-4">Routes</span>
            </div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-10">
          <Link href="/explore" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">Explore Routes</Link>
          <Link href="/about" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">About Us</Link>
          {user && <Link href="/my-trips" className="text-emerald-600 hover:text-emerald-800 transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">My Trips</Link>}
        </div>
        {user ? (
          <div className="relative user-menu-wrapper">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-9 h-9 rounded-full border border-black/20 flex items-center justify-center hover:border-black/50 transition-all duration-200 overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-black font-bold text-sm uppercase">{user.email?.[0]}</span>}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100"><p className="text-[10px] text-gray-400 truncate tracking-widest">{user.email}</p></div>
                <Link href="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Profile</Link>
                <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors">Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setIsAuthOpen(true)} className="text-[11px] uppercase tracking-[0.18em] font-semibold text-black/50 hover:text-black border border-black/20 hover:border-black/50 px-5 py-2 rounded-full transition-all duration-200">Login</button>
        )}
      </nav>

      {/* HERO */}
      <section className="relative h-[70vh] flex items-center overflow-hidden">
        <img src="/iceland.jpg" className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-12 flex items-center justify-between gap-8">
          <div>
            <h1 className="text-7xl font-bold text-white italic tracking-[0.01em]">Explore Scenic Routes</h1>
            <p className={`${firstFont.className} text-white/90 text-[26px] mt-3 font-light italic`}>Discover the world's most breathtaking driving routes.</p>
          </div>
        </div>

        <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] p-2 shadow-2xl max-w-fit ml-auto mr-25">
          <div className="relative w-85 custom-dropdown group">
            <div onClick={() => { setIsOpen(!isOpen); setIsOpenDate(false); }} className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpen ? 'bg-white/5 backdrop-blur-xl rounded-2xl' : 'hover:bg-white/5 rounded-2xl'}`}>
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Country</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selected || 'Choose destination'}</span>
                <span className={`transition-transform duration-300 text-[10px] ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {isOpen && (
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                  <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer text-center" onClick={() => { setSelected(''); setIsOpen(false); }}>All</div>
                  {countries.map((country) => (
                    <div key={country} className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelected(country); setIsOpen(false); }}>{country}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-10 bg-white/10 mx-1" />

          <div className="relative w-85 custom-dropdown group">
            <div onClick={() => { setIsOpenDate(!isOpenDate); setIsOpen(false); }} className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpenDate ? 'bg-white/5 backdrop-blur-xl rounded-2xl' : 'hover:bg-white/5 rounded-2xl'}`}>
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Duration</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selectedDate || 'Choose duration'}</span>
                <span className={`transition-transform duration-300 text-[10px] ${isOpenDate ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {isOpenDate && (
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                  <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer text-center" onClick={() => { setSelectedDate(''); setIsOpenDate(false); }}>All</div>
                  {durations.map((duration) => (
                    <div key={duration} className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelectedDate(duration); setIsOpenDate(false); }}>{duration}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={fetchRoutes} className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg">FIND ROUTE</button>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-3 overflow-x-auto"></div>
          <div className="relative">
            <button onClick={() => setShowFilters(prev => !prev)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-400 transition whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="18" x2="12" y2="18" />
              </svg>
              More Filters
              {activeFilterCount > 0 && <span className="bg-[#1a3229] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>}
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 top-12 z-20 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Filters</h3>
                    <button onClick={() => setFilters({ difficulty: [], duration: 'any', minRating: 0, countries: [] })} className="text-xs text-gray-400 hover:text-gray-700 transition">Reset all</button>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Terrains</p>
                    <div className="flex flex-wrap gap-2">
                      {[{ label: 'Forest', color: 'bg-green-100 text-green-800' }, { label: 'Deserts', color: 'bg-yellow-100 text-yellow-800' }, { label: 'Coastal', color: 'bg-orange-100 text-orange-800' }, { label: 'Mountains', color: 'bg-blue-100 text-blue-800' }].map(({ label, color }) => (
                        <button key={label} onClick={() => toggleFilter('difficulty', label)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${filters.difficulty.includes(label) ? `${color} border-transparent ring-2 ring-offset-1 ring-gray-400` : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Duration</p>
                    <div className="flex flex-col gap-2">
                      {[{ value: 'any', label: 'Any duration' }, { value: 'half', label: 'Half day (< 4h)' }, { value: 'full', label: 'Full day (4–8h)' }, { value: 'weekend', label: 'Weekend trip' }, { value: 'multiday', label: 'Multi-day journey' }].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="duration" value={value} checked={filters.duration === value} onChange={() => setFilters(prev => ({ ...prev, duration: value }))} className="accent-[#1a3229]" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Minimum Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === star ? 0 : star }))} className={`text-2xl transition ${star <= filters.minRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>★</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Country</p>
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                      {countries.map(country => (
                        <label key={country} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.countries.includes(country)} onChange={() => toggleFilter('countries', country)} className="accent-[#1a3229] rounded" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">{country}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setShowFilters(false)} className="w-full bg-[#1a3229] text-white py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#2a4a3e] transition">Apply Filters</button>
                </div>
              </>
            )}
          </div>
        </div>

        {(activeFilterCount > 0 || selected || selectedDate) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.difficulty.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 bg-[#1a3229]/10 text-[#1a3229] border border-[#1a3229]/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                {tag}<button onClick={() => toggleFilter('difficulty', tag)} className="hover:text-red-500 transition text-base leading-none">×</button>
              </span>
            ))}
            {filters.countries.map(country => (
              <span key={country} className="flex items-center gap-1.5 bg-[#1a3229]/10 text-[#1a3229] border border-[#1a3229]/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                {country}<button onClick={() => toggleFilter('countries', country)} className="hover:text-red-500 transition text-base leading-none">×</button>
              </span>
            ))}
            {selected && (
              <span className="flex items-center gap-1.5 bg-[#1a3229]/10 text-[#1a3229] border border-[#1a3229]/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                {selected}<button onClick={() => setSelected('')} className="hover:text-red-500 transition text-base leading-none">×</button>
              </span>
            )}
            {selectedDate && (
              <span className="flex items-center gap-1.5 bg-[#1a3229]/10 text-[#1a3229] border border-[#1a3229]/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                {selectedDate}<button onClick={() => setSelectedDate('')} className="hover:text-red-500 transition text-base leading-none">×</button>
              </span>
            )}
            <button onClick={clearAllFilters} className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 transition">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {routes.map((route) => (
            <div key={route.id} className="group rounded-4xl border border-gray-100 shadow-sm overflow-hidden bg-white transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] hover:-translate-y-1 relative">
              <div className="relative h-78 overflow-hidden">
                <Link href={`/routedetail/${route.id}`}>
                  <img src={route.image_url} alt={route.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer" />
                </Link>
                <button onClick={(e) => { e.preventDefault(); toggleSave(route.id); }} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/40">
                  <svg className={`w-5 h-5 transition-colors duration-200 ${savedRoutes.includes(route.id) ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-white'}`} viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <Link href={`/routedetail/${route.id}`}>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{route.country}</span>
                  <h3 className="font-bold text-lg mt-1 hover:text-emerald-500 transition-colors cursor-pointer">{route.title}</h3>
                </Link>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{route.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"></div>
                  <Link href={`/routedetail/${route.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">View Route</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
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
              <Link href="/about" className="hover:text-white transition-colors whitespace-nowrap">About Us</Link>
              <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Contact</a>
              <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Privacy</a>
              <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Terms</a>
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
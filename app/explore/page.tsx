
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import { useSearchParams } from 'next/navigation';
import AuthModal from '../AuthModal';
import { supabase } from '../../lib/supabase';

const firstFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf',
  weight: '700',
});

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(searchParams.get('destination') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    difficulty: string[];
    duration: string;
    minRating: number;
    countries: string[];
  }>({
    difficulty: [],
    duration: 'any',
    minRating: 0,
    countries: [],
  });

  const toggleFilter = (key: 'difficulty' | 'countries', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v: string) => v !== value)
        : [...prev[key], value],
    }));
  };

  const activeFilterCount =
    filters.difficulty.length +
    filters.countries.length +
    (filters.duration !== 'any' ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  // Загрузка маршрутов из Supabase
  async function fetchRoutes() {
    setLoading(true);
    let query = supabase.from('routes').select('*');

    if (selected && selected !== 'Выберите направление') {
      query = query.eq('category', selected);
    }
    if (selectedDate && selectedDate !== 'Выберите дату') {
      query = query.eq('month', selectedDate);
    }
    if (filters.countries.length > 0) {
      query = query.in('country', filters.countries);
    }
    if (filters.minRating > 0) {
      query = query.gte('rating', filters.minRating);
    }

    const { data, error } = await query;
    if (data) setRoutes(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchRoutes();
  }, [selected, selectedDate, filters]);

  return (
    <div className="min-h-screen bg-white">

      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100 bg-white">
        <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
        <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
          <Link href="/explore" className="text-black border-b border-black transition">Explore Routes</Link>
          <a href="#" className="hover:text-black transition">About us</a>
        </div>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="px-6 py-2 border border-[#003e4d] hover:bg-[#003e4d] hover:text-white rounded-[24px] font-bold uppercase text-sm tracking-tighter transition-all active:scale-95 shadow-lg duration-300">
          Login
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-[70vh] flex items-center overflow-hidden">
        <img src="/iceland.jpg" className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-12 flex items-center justify-between gap-8">
          <div>
            <h1 className="text-5xl font-bold text-white italic tracking-[0.01em]">Explore Scenic Routes</h1>
            <p className={`${firstFont.className} text-white/90 text-[17.4px] mt-3 font-light italic`}>
              Discover the world's most breathtaking driving routes.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] p-2 shadow-2xl max-w-fit ml-auto mr-10">
          <div className="relative w-85 custom-dropdown group">
            <div
              onClick={() => { setIsOpen(!isOpen); setIsOpenDate(false); }}
              className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpen ? 'bg-white/5 backdrop-blur-xl rounded-2xl' : 'hover:bg-white/5 rounded-2xl'}`}
            >
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Направление</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selected || 'Выберите место'}</span>
                <span className={`transition-transform duration-300 text-[10px] ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {isOpen && (
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer text-center" onClick={() => { setSelected('Горы'); setIsOpen(false); }}>Горы</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelected('Лес'); setIsOpen(false); }}>Лес</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelected(''); setIsOpen(false); }}>Все</div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-10 bg-white/10 mx-1" />

          <div className="relative w-85 custom-dropdown group">
            <div
              onClick={() => { setIsOpenDate(!isOpenDate); setIsOpen(false); }}
              className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpenDate ? 'bg-white/5 backdrop-blur-xl rounded-2xl' : 'hover:bg-white/5 rounded-2xl'}`}
            >
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Период</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selectedDate || 'Выберите дату'}</span>
                <span className={`transition-transform duration-300 text-[10px] ${isOpenDate ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {isOpenDate && (
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer text-center" onClick={() => { setSelectedDate('Июнь'); setIsOpenDate(false); }}>Июнь</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelectedDate('Июль'); setIsOpenDate(false); }}>Июль</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer border-t border-white/10 text-center" onClick={() => { setSelectedDate(''); setIsOpenDate(false); }}>Все</div>
              </div>
            )}
          </div>

          <button
            onClick={fetchRoutes}
            className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg">
            НАЙТИ МАРШРУТ
          </button>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-3 overflow-x-auto"></div>
          <div className="relative">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-400 transition whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="18" x2="12" y2="18" />
              </svg>
              More Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#1a3229] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
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
                        <button key={label} onClick={() => toggleFilter('difficulty', label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${filters.difficulty.includes(label) ? `${color} border-transparent ring-2 ring-offset-1 ring-gray-400` : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                          {label}
                        </button>
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
                        <button key={star} onClick={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === star ? 0 : star }))}
                          className={`text-2xl transition ${star <= filters.minRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>★</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Country</p>
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                      {['Norway', 'Austria', 'Germany', 'Switzerland', 'Iceland', 'Scotland', 'New Zealand', 'USA', 'Italy', 'Morocco'].map(country => (
                        <label key={country} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.countries.includes(country)} onChange={() => toggleFilter('countries', country)} className="accent-[#1a3229] rounded" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">{country}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setShowFilters(false)} className="w-full bg-[#1a3229] text-white py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#2a4a3e] transition">
                    Apply Filters
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACTIVE FILTER TAGS */}
        {activeFilterCount > 0 && (
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
            <button onClick={() => setFilters({ difficulty: [], duration: 'any', minRating: 0, countries: [] })} className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 transition">Clear all</button>
          </div>
        )}

        {/* ROUTE GRID */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center text-gray-400 py-24 text-lg">No routes found. Try changing the filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div key={route.id} className="group rounded-4xl border border-gray-100 shadow-sm overflow-hidden bg-white transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] hover:-translate-y-1">
                <div className="relative h-78 overflow-hidden">
                  <img src={route.image_url} alt={route.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
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
          <div className="flex gap-3">
            {['IG', 'FB', 'X'].map(s => (
              <a key={s} href="#" className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:border-emerald-500 hover:text-emerald-400 transition-all text-xs font-bold">{s}</a>
            ))}
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}


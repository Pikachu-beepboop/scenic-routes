"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import { useSearchParams } from 'next/navigation';

const firstFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf',
  weight: '700',
});

const secondFont = localFont({
  src: './fonts/Agbalumo/Agbalumo-Regular.ttf',
  weight: '700',
});

const thirdFont = localFont({
  src: './fonts/colitez-serif/ColitezSerif-Italic.otf',
  weight: '700',
});

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(searchParams.get('destination') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);

  // Filter state — MUSS innerhalb der Komponente sein
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
          <Link href="/explore" className="text-black border-b border-black transition">
            Explore Routes
          </Link>
          <a href="#" className="hover:text-black transition">About us</a>
        </div>
        <button className="px-6 py-2 border border-[#003e4d] hover:bg-[#003e4d] hover:text-white rounded-[24px] font-bold uppercase text-sm tracking-tighter transition-all active:scale-95 shadow-lg duration-300">
          Login
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-[70vh] flex items-center overflow-hidden">
        <img
          src="/iceland.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Background"
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Innerer Container: Text links, Dropdown rechts */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-12 flex items-center justify-between gap-8">

          {/* TEXT LINKS */}
          <div>
            <h1 className="text-5xl font-bold text-white italic tracking-[0.01em]">
              Explore Scenic Routes
            </h1>
            <p className={`${firstFont.className} text-white/90 text-lg mt-3 font-light italic`}>
              Discover the world's most breathtaking driving routes.
            </p>
          </div>

        </div>

        <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] p-2 shadow-2xl max-w-fit ml-auto mr-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
          {/* Dropdown Destination */}
          <div className="relative w-85 custom-dropdown group">
            <div
              onClick={() => { setIsOpen(!isOpen); setIsOpenDate(false); }}
              className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpen ? 'bg-white/5 backdrop-blur-xl rounded-2xl' : 'hover:bg-white/5 rounded-2xl'
                }`}
            >
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Направление</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selected || 'Выберите место'}</span>
                <span className={`transition-transform duration-300 text-[10px] ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {isOpen && (
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer transition-colors text-center" onClick={() => { setSelected('Горы'); setIsOpen(false); }}>Горы</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer transition-colors border-t border-white/10 text-center" onClick={() => { setSelected('Лес'); setIsOpen(false); }}>Лес</div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-10 bg-white/10 mx-1" />

          {/* Dropdown Date */}
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
              <div className="absolute top-[117%] left-0 w-full z-[100] bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer transition-colors text-center" onClick={() => { setSelectedDate('Июнь'); setIsOpenDate(false); }}>Июнь</div>
                <div className="px-6 py-3 text-white hover:bg-white/10 cursor-pointer transition-colors border-t border-white/10 text-center" onClick={() => { setSelectedDate('Июль'); setIsOpenDate(false); }}>Июль</div>
              </div>
            )}
          </div>

          <button className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg">
            НАЙТИ МАРШРУТ
          </button>
        </div>
      </section >

      {/* CONTENT */}
      < main className="max-w-7xl mx-auto px-6 py-12" >

        {/* Filter bar */}
        < div className="flex items-center justify-between mb-10" >
          <div className="flex gap-3 overflow-x-auto">
            {['All Terrains', 'Mountains', 'Coastal', 'Forest'].map((item, i) => (
              <button
                key={item}
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${i === 0 ? 'bg-[#1a3229] text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* MORE FILTERS BUTTON */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-400 transition whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="16" y2="12" />
                <line x1="4" y1="18" x2="12" y2="18" />
              </svg>
              More Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#1a3229] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />

                {/* Panel */}
                <div className="absolute right-0 top-12 z-20 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-6">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Filters</h3>
                    <button
                      onClick={() => setFilters({ difficulty: [], duration: 'any', minRating: 0, countries: [] })}
                      className="text-xs text-gray-400 hover:text-gray-700 transition"
                    >
                      Reset all
                    </button>
                  </div>

                  {/* DIFFICULTY */}
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Difficulty</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Easy', color: 'bg-green-100 text-green-800' },
                        { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
                        { label: 'Hard', color: 'bg-orange-100 text-orange-800' },
                        { label: 'Extreme', color: 'bg-red-100 text-red-800' },
                      ].map(({ label, color }) => (
                        <button
                          key={label}
                          onClick={() => toggleFilter('difficulty', label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${filters.difficulty.includes(label)
                            ? `${color} border-transparent ring-2 ring-offset-1 ring-gray-400`
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DURATION */}
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Duration</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'any', label: 'Any duration' },
                        { value: 'half', label: 'Half day (< 4h)' },
                        { value: 'full', label: 'Full day (4–8h)' },
                        { value: 'weekend', label: 'Weekend trip' },
                        { value: 'multiday', label: 'Multi-day journey' },
                      ].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="radio"
                            name="duration"
                            value={value}
                            checked={filters.duration === value}
                            onChange={() => setFilters(prev => ({ ...prev, duration: value }))}
                            className="accent-[#1a3229]"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* MIN RATING */}
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Minimum Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === star ? 0 : star }))}
                          className={`text-2xl transition ${star <= filters.minRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
                        >
                          ★
                        </button>
                      ))}
                      {filters.minRating > 0 && (
                        <span className="ml-2 text-xs text-gray-400 self-center">{filters.minRating}+ stars</span>
                      )}
                    </div>
                  </div>

                  {/* COUNTRY */}
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Country</p>
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                      {['Norway', 'Austria', 'Germany', 'Switzerland', 'Iceland', 'Scotland', 'New Zealand', 'USA', 'Italy', 'Morocco'].map(country => (
                        <label key={country} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.countries.includes(country)}
                            onChange={() => toggleFilter('countries', country)}
                            className="accent-[#1a3229] rounded"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">{country}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* APPLY */}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full bg-[#1a3229] text-white py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#2a4a3e] transition"
                  >
                    Apply Filters
                  </button>

                </div>{/* end panel */}
              </>
            )}
          </div>{/* end relative */}
        </div > {/* end filter bar */}

        {/* Route Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <RouteCard title="Atlantic Ocean Road" country="Norway" info="2-3 h | 8.3 km" tag="Coastal" img="/Norway fjords.jpg" />
          <RouteCard title="Black Forest High Road" country="Germany" info="3-4 h | 60 km" tag="Forest" img="/black-forest-b500.jpg" />
          <RouteCard title="Grossglockner" country="Austria" info="2-4 h | 48 km" tag="Alpine" img="/grossglockner-high-alpine.jpg" />
        </div>

      </main >
    </div >
  );
}

function RouteCard({ title, country, info, tag, img }: any) {
  return (
    <div className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="relative h-64 overflow-hidden">
        <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt={title} />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black text-black uppercase">
          {country}
        </div>
        <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-tighter">
          {tag}
        </div>
      </div>
      <div className="p-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-black uppercase leading-tight mb-1">{title}</h3>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{info}</p>
        </div>
        <div className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300">
          →
        </div>
      </div>
    </div>
  );
}

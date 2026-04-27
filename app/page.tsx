"use client";
 
import { useState, useEffect } from "react";
import localFont from 'next/font/local';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';
 
const firstFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf',
  weight: '700',
});
 
const thirdFont = localFont({
  src: './fonts/colitez-serif/ColitezSerif-Italic.otf',
  weight: '700',
});
 
export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selected, setSelected] = useState("Выберите направление");
  const [selectedDate, setSelectedDate] = useState("Выберите дату");
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
 
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (!target.closest('.custom-dropdown')) {
        setIsOpen(false);
        setIsOpenDate(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
 
  async function fetchRoutes() {
    setLoading(true);
    const { data } = await supabase.from('routes').select('*').limit(3);
    if (data) setRoutes(data);
    setLoading(false);
  }
 
  useEffect(() => {
    fetchRoutes();
  }, []);
 
  const mockRoutes = [
    {
      id: 1,
      title: "Norway Fjords",
      country: "Norway",
      time: "2 days",
      image: "/Norway fjords.jpg",
      description: "Experience the breathtaking beauty of Norway's fjords, where towering cliffs meet serene waters.",
    },
    {
      id: 2,
      title: "Toscana",
      country: "Italia",
      time: "5 days",
      image: "/Toscana.jpg",
      description: "Discover the rolling hills, vineyards, and Renaissance art of Tuscany.",
    },
    {
      id: 3,
      title: "Fujiyoshida",
      country: "Japan",
      time: "1 week",
      image: "/Fujiyoshida.jpg",
      description: "Explore the scenic beauty of Fujiyoshida, nestled at the base of Mount Fuji.",
    }
  ];
 
  return (
    <>
      <main className="min-h-screen bg-white">
 
        {/* NAVIGATION */}
        <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
          <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
              Scenic <br /> <span className="ml-4">Routes</span>
            </div>
          </Link>
          <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
            <Link href="/explore" className="hover:text-black transition">Explore Routes</Link>
            <a href="#" className="hover:text-black transition">About us</a>
          </div>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-6 py-2 border border-[#003e4d] hover:bg-[#003e4d] hover:text-white rounded-[24px] font-bold uppercase text-sm tracking-tighter transition-all active:scale-95 shadow-lg duration-300">
            Login
          </button>
        </nav>
 
        {/* HERO */}
        <section className="relative px-12 text-center bg-cover bg-[center_bottom_-150px] bg-no-repeat min-h-screen flex flex-col items-center justify-center" style={{ backgroundImage: 'url("/mountains-forest.avif")' }}>
 
          <h1 className="pl-6 pr-5 pb-2 text-[120px] md:text-[165px] leading-[0.93] uppercase tracking-[0.04em] mb-8 italic antialiased font-normal bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-10 duration-1000"
            style={{ WebkitTextStroke: '20px transparent' }}>
            Scenic <br /> Routes
          </h1>
 
          <div className="relative mt-7 mb-14 mx-auto w-full max-w-[750px] px-8 py-12 border-0">
            <div className="absolute top-0 left-0 w-[42%] h-[2px] bg-gray-300 shadow-sm"></div>
            <div className="absolute top-0 right-0 w-[42%] h-[2px] bg-gray-300 shadow-sm"></div>
            <div className="absolute top-0 left-0 w-[2px] h-full bg-gray-300 shadow-sm"></div>
            <div className="absolute top-0 right-0 w-[2px] h-full bg-gray-300 shadow-sm"></div>
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-300 shadow-sm"></div>
            <div className="absolute -top-17 left-1/2 -translate-x-1/2 bg-transparent px-4">
              <img src="/mountains.png" alt="mountains" className="w-30 h-30 object-contain invert brightness-200" />
            </div>
            <p className={`${firstFont.className} text-sm md:text-[18px] text-white font-bold tracking-[0.15em] uppercase leading-relaxed drop-shadow-md`}>
              The most beautiful roads to explore through <br />
              mountains, coastlines and natural landscapes
            </p>
          </div>
 
          {/* SEARCH */}
          <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] p-2 shadow-2xl max-w-fit mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000">
            <div className="relative w-95 custom-dropdown group">
              <div
                onClick={() => { setIsOpen(!isOpen); setIsOpenDate(false); }}
                className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpen ? "bg-[#0a241a]/80 rounded-2xl" : "hover:bg-white/5 rounded-2xl"}`}
              >
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Направление</span>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{selected}</span>
                  <span className={`transition-transform duration-300 text-[10px] ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
              </div>
              {isOpen && (
                <div className="absolute top-[112%] left-0 w-full z-[100] bg-[#0a241a] backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-3 text-emerald-50 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => { setSelected("Горы"); setIsOpen(false); }}>Горы</div>
                  <div className="px-6 py-3 text-emerald-50 hover:bg-white/10 cursor-pointer transition-colors border-t border-white/5" onClick={() => { setSelected("Лес"); setIsOpen(false); }}>Лес</div>
                </div>
              )}
            </div>
 
            <div className="w-[1px] h-10 bg-white/10 mx-1" />
 
            <div className="relative w-95 custom-dropdown group">
              <div
                onClick={() => { setIsOpenDate(!isOpenDate); setIsOpen(false); }}
                className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full ${isOpenDate ? "bg-[#0a241a]/80 rounded-2xl" : "hover:bg-white/5 rounded-2xl"}`}
              >
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Период</span>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{selectedDate}</span>
                  <span className={`transition-transform duration-300 text-[10px] ${isOpenDate ? "rotate-180" : ""}`}>▼</span>
                </div>
              </div>
              {isOpenDate && (
                <div className="absolute top-[112%] left-0 w-full z-[100] bg-[#0a241a] backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-3 text-emerald-50 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => { setSelectedDate("Июнь"); setIsOpenDate(false); }}>Июнь</div>
                  <div className="px-6 py-3 text-emerald-50 hover:bg-white/10 cursor-pointer transition-colors border-t border-white/5" onClick={() => { setSelectedDate("Июль"); setIsOpenDate(false); }}>Июль</div>
                </div>
              )}
            </div>
 
            <button
              onClick={() => router.push(`/explore?destination=${selected}&date=${selectedDate}`)}
              className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg">
              НАЙТИ МАРШРУТ
            </button>
          </div>
        </section>
 
        {/* POPULAR DESTINATIONS */}
        <section className="p-12 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
            <div className="md:col-span-1 mb-25">
              <h2 className={`${firstFont.className} text-5xl font-bold leading-tight mb-6 text-black`}>
                Popular <br /> Destinations
              </h2>
              <p className={`${firstFont.className} text-gray-500 text-md mb-5 max-w-[330px]`}>
                Explore the world's most sought-after regions for scenic road trips.
              </p>
              <button className="px-8 py-3 border border-black rounded-full text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-300">
                Explore
              </button>
            </div>
 
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {mockRoutes.map((route, index) => (
                <div
                  key={route.id}
                  className={`group relative overflow-hidden transition-all duration-700 cursor-pointer h-[500px] shadow-2xl rounded-4xl ${
                    index === 0 ? 'mt-55' : index === 1 ? 'mt-40' : 'mt-25'
                  }`}
                >
                  <img src={route.image} alt={route.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-80" />
                  <div className="relative z-10 p-6">
                    <h3 className="text-white text-lg font-light tracking-wide drop-shadow-lg">{route.title}</h3>
                    <p className="text-white/90 text-sm mt-1 drop-shadow-md">{route.country} • {route.time}</p>
                    {route.description && (
                      <div className="mt-75 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                        <span className="text-white text-md font-light drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{route.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors ease-in-out duration-20" />
                </div>
              ))}
            </div>
          </div>
        </section>
 
        {/* QUOTE */}
        <section className="relative w-full mt-35 py-50 px-6 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src="/roadimage.avif" alt="Open Road" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="relative z-10 max-w-8xl px-2 text-center">
            <h2 className={`${thirdFont.className} text-white text-4xl md:text-6xl font-semibold leading-[1.5] tracking-tight drop-shadow-2xl`}>
              Experience the freedom of the <span className="block md:inline">open road. Discover hidden mountain passes, coastal highways, and breathtaking landscapes.</span>
            </h2>
          </div>
        </section>
 
        {/* BADGE */}
        <div className="mt-30 flex justify-center">
          <div className="inline-flex items-center gap-1.5 bg-[#f0f0f0] px-3 py-1 rounded-full shadow-sm">
            <svg className="w-5 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-[15px] font-medium text-emerald-800 tracking-tight">Perfect for Spring 2026</span>
          </div>
        </div>
 
        {/* ROUTES FROM SUPABASE */}
        <section className="py-5 max-w-7xl mx-auto px-5">
          <div className="text-center mb-25">
            <h2 className="text-5xl font-bold">Best Routes Right Now</h2>
            <p className="mt-5 text-[20px] text-gray-500">Handpicked routes for spring conditions.</p>
          </div>
 
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center text-gray-400 py-24 text-lg">No routes found.</div>
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
                    <div className="mt-8 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          {route.duration}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 18 C6 18 6 8 14 5" />
                            <line x1="14" y1="5" x2="10" y2="3" />
                            <line x1="14" y1="5" x2="14" y2="9" />
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
 
          <div className="mt-10 flex justify-center items-center gap-2 text-emerald-600 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Weather data updated • Conditions optimal for travel
          </div>
        </section>
 
        {/* FOOTER */}
        <footer className="w-full bg-[#0a0f1a] text-gray-500 py-12 px-12 mt-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 pb-16 border-b border-white/5">
            <div className="flex flex-col gap-2 flex-shrink-0 min-w-[180px]">
              <div className="flex items-center gap-3">
                <img src="/mountains.png" alt="Logo" className="w-13 h-13 object-contain invert opacity-70" />
                <span className="text-lg font-black text-white tracking-tight whitespace-nowrap">Scenic Routes</span>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed max-w-[220px]">
                Curated routes for those who seek the road less travelled.
              </p>
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
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-72 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors"
                />
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
 
      </main>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

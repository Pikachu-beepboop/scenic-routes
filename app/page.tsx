"use client";


import { useState } from "react";
import { useEffect } from 'react'; // Не забудьте добавить useEffect в импорт сверху
import localFont from 'next/font/local';
import seasonalRoutes from './routes-data';
import Footer from './Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';

const firstFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf', // Punkt und Slash bedeutet: im gleichen Ordner suchen
  weight: '700',
});

const secondFont = localFont({
  src: './fonts/Agbalumo/Agbalumo-Regular.ttf', // Punkt und Slash bedeutet: im gleichen Ordner suchen
  weight: '700',
});

const thirdFont = localFont({
  src: './fonts/colitez-serif/ColitezSerif-Italic.otf', // Punkt und Slash bedeutet: im gleichen Ordner suchen
  weight: '700',
});

export default function Home() {
  // Данные пока просто в коде (без базы), чтобы вы видели визуал
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selected, setSelected] = useState("Выберите направление");
  const [selectedDate, setSelectedDate] = useState("Выберите дату");
  const router = useRouter();
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      // Cast event.target to Element to access closest()
      const target = event.target as Element;

      if (!target.closest('.custom-dropdown')) {
        setIsOpen(false);
        setIsOpenDate(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);



  const mockRoutes = [
    {
      id: 1,
      title: "Norway Fjords",
      country: "Norway",
      time: "2 days",
      image: "/Norway fjords.jpg",
      description: "Experience the breathtaking beauty of Norway's fjords, where towering cliffs meet serene waters. Perfect for a quick getaway to nature's wonders.",
      //tag: "Экстрим"
    },
    {
      id: 2,
      title: "Toscana",
      country: "Италия",
      time: "5 days",
      image: "/Toscana.jpg",
      description: "Discover the rolling hills, vineyards, and Renaissance art of Tuscany. A perfect blend of culture, cuisine, and stunning landscapes for an unforgettable road trip.",
      //tag: "Горы"
    },
    {
      id: 3,
      title: "Fujiyoshida",
      country: "Japan",
      time: "1 week",
      image: "/Fujiyoshida.jpg",
      description: "Explore the scenic beauty of Fujiyoshida, nestled at the base of Mount Fuji. Experience traditional culture, hot springs, and breathtaking views in this unforgettable road trip.",
      //tag: "Природа"
    }
  ];
  // 2. Logik für die Jahreszeit
  const [currentSeason, setCurrentSeason] = useState<'spring'>('spring');

  return (
    <>
    <main className="min-h-screen bg-white">
      {/* Навигация (как в Wix) */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
        <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
          <Link href="/explore" className="hover:text-black transition">
            Explore Routes
          </Link>
          <a href="#" className="hover:text-black transition">About us</a>
        </div>
        <button
  onClick={() => setIsAuthOpen(true)}
  
className="px-6 py-2 border border-[#003e4d] hover:bg-[#003e4d] hover:text-white rounded-[24px] font-bold uppercase text-sm tracking-tighter transition-all active:scale-95 shadow-lg duration-300">
  Login
</button>
</nav>


      {/* Hero-секция (Главный баннер) */}
      <section className="relative px-12 pt-5 pb-50 text-center bg-cover bg-[center_bottom_-150px] bg-no-repeat min-h-screen flex flex-col items-center justify-center" style={{ backgroundImage: 'url("/mountains-forest.avif")' }}>

        {/* 1. Главный заголовок */}
        <h1 className="pl-6 pr-5 pb-2 text-[120px] md:text-[165px] leading-[0.93] uppercase tracking-[0.04em] mb-8 italic antialiased font-normal bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-10 duration-1000"
          style={{ WebkitTextStroke: '20px transparent' }}>
          Scenic <br /> Routes
        </h1>

        {/* Основной контейнер БЕЗ границ (border-0) */}
        <div className="relative mt-7 mb-14 mx-auto w-full max-w-[750px] px-8 py-12 border-0">

          {/* ЛЕВЫЙ ОТРЕЗОК ВЕРХА */}
          <div className="absolute top-0 left-0 w-[42%] h-[2px] bg-gray-300 shadow-sm"></div>

          {/* ПРАВЫЙ ОТРЕЗОК ВЕРХА */}
          <div className="absolute top-0 right-0 w-[42%] h-[2px] bg-gray-300 shadow-sm"></div>

          {/* ЛЕВАЯ СТОРОНА */}
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gray-300 shadow-sm"></div>

          {/* ПРАВАЯ СТОРОНА */}
          <div className="absolute top-0 right-0 w-[2px] h-full bg-gray-300 shadow-sm"></div>

          {/* НИЖНЯЯ ЛИНИЯ */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-300 shadow-sm"></div>

          <div className="absolute -top-17 left-1/2 -translate-x-1/2 bg-transparent px-4">
            <img
              src="/mountains.png"
              alt="mountains"
              className="w-30 h-30 object-contain invert brightness-200"
            />
          </div>

          {/* Текст внутри рамки */}
          <p className={`${firstFont.className} text-sm md:text-[18px] text-white font-bold tracking-[0.15em] uppercase leading-relaxed drop-shadow-md`}>
            The most beautiful roads to explore through <br />
            mountains, coastlines and natural landscapes
          </p>
        </div>

        {/* 3. Общий контейнер поиска (теперь внутри секции) */}
        <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] p-2 shadow-2xl max-w-fit mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000">

          {/* Первый Dropdown (Направление) */}
          <div className="relative w-95 custom-dropdown group">
            <div
              onClick={() => { setIsOpen(!isOpen); setIsOpenDate(false); }}
              className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full
        ${isOpen ? "bg-[#0a241a]/80 rounded-2xl" : "hover:bg-white/5 rounded-2xl"}`}
            >
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Направление</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selected || "Выберите место"}</span>
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

          {/* Разделитель */}
          <div className="w-[1px] h-10 bg-white/10 mx-1" />

          {/* Второй Dropdown (Дата) */}
          <div className="relative w-95 custom-dropdown group">
            <div
              onClick={() => { setIsOpenDate(!isOpenDate); setIsOpen(false); }}
              className={`cursor-pointer px-6 py-3 text-white transition-all flex flex-col justify-center z-50 relative h-full
        ${isOpenDate ? "bg-[#0a241a]/80 rounded-2xl" : "hover:bg-white/5 rounded-2xl"}`}
            >
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Период</span>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selectedDate || "Выберите дату"}</span>
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

          {/* Кнопка Поиска */}
          <button
            onClick={() => router.push(`/explore?destination=${selected}&date=${selectedDate}`)}
            className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg"
          >
            НАЙТИ МАРШРУТ
          </button>
        </div>
      </section>



      {/* Sektion: Populäre Ziele */}
      <section className="p-12 bg-white">
        {/* Das Container-Grid für die gesamte Ansicht */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">

          {/* LINKES DIV: Die textuelle Beschreibung (Popular Destinations) */}
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

          {/* RECHTES DIV: Die Karten-Sektion (diagonal steigend) */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {mockRoutes.map((route, index) => (
              <div
                key={route.id}
                className={`group relative overflow-hidden transition-all duration-700 cursor-pointer h-[500px] shadow-2xl rounded-4xl ${index === 0 ? 'mt-55' :
                  index === 1 ? 'mt-40' :
                    'mt-25'
                  }`}
              >
                {/* DAS HINTERGRUNDBILD */}
                <img
                  src={route.image} // Hier wird das Bild aus deinem Array geladen
                  alt={route.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                />

                {/* SCHWARZER VERLAUF (Damit man die Schrift besser liest) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-80" />

                {/* TEXT ÜBER DEM BILD */}
                <div className="relative z-10 p-6">
                  <h3 className="text-white text-lg font-light tracking-wide drop-shadow-lg">
                    {route.title}
                  </h3>

                  {/* Land & Dauer (z.B. Italien • 5 days) */}
                  <p className="text-white/90 text-sm mt-1 drop-shadow-md">
                    {route.country} • {route.time}
                  </p>

                  {/* Tag / Kategorie (falls vorhanden) */}
                  {route.description && (
                    <div className="mt-75 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-md font-light drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {route.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* Subtiler Hover-Dunkel-Effekt */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors ease-in-out duration-20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ZITAT SEKTION */}
      <section className="relative w-full mt-35 py-50 px-6 flex items-center justify-center overflow-hidden">
        {/* Hintergrundbild des Zitats */}
        <div className="absolute inset-0 z-0"> {/* z-index auf 0 gesetzt */}
          <img
            src="/roadimage.avif"  // Überprüfe links im Ordner: Kleines "t" und ".png"?
            alt="Open Road"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" /> {/* Etwas dunkler für Kontrast */}
        </div>

        {/* Der Text-Container */}
        <div className="relative z-10 max-w-8xl px-2 text-center">
          <h2 className={`${thirdFont.className} text-white text-4xl md:text-6xl font-semibold leading-[1.5] tracking-tight drop-shadow-2xl`}>
            Experience the freedom of the <span className="block md:inline">open road. Discover hidden mountain passes, coastal highways, and breathtaking landscapes.
            </span>
          </h2>
        </div>
      </section>

      {/* Das kleine Badge über der Überschrift */}
      <div className="mt-30 flex justify-center">
        <div className="inline-flex items-center gap-1.5 bg-[#f0f0f0] px-3 py-1 rounded-full shadow-sm">
          <svg
            className="w-5 h-6 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="text-[15px] font-medium text-emerald-800 tracking-tight">
            Perfect for Spring 2026
          </span>
        </div>
      </div>

      {/* 3. DIE NEUE ROUTEN-SEKTION */}
      <section className="py-5 max-w-7xl mx-auto px-5">
        <div className="text-center mb-25">
          <h2 className="text-5xl font-bold">Best Routes Right Now</h2>
          <p className="mt-5 text-[20px] text-gray-500">Handpicked routes for spring conditions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {seasonalRoutes[currentSeason].map((route) => (
            <div key={route.id} className="group rounded-4xl border border-gray-100 shadow-sm overflow-hidden bg-white transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] hover:-translate-y-1">
              <div className="relative h-78 overflow-hidden"> {/* overflow-hidden ist hier wichtig für den Zoom */}
                <img
                  src={route.image}
                  alt={route.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />



              </div>
              <div className="p-5">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{route.country}</span>
                <h3 className="font-bold text-lg mt-1">{route.name}</h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{route.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">🕒 {route.duration}</span>
                  <button className="text-sm font-semibold text-blue-600">View Route</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Status Indicator */}
        <div className="mt-10 flex justify-center items-center gap-2 text-emerald-600 text-sm font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Weather data updated • Conditions optimal for travel
        </div>
      </section>


      <footer className="w-full bg-[#0f172a] text-gray-300 py-16 px-6 mt-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">

          {/* Oberer Teil: 3 Spalten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 text-left">

            {/* Spalte 1: Logo & Info */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                {/* Das Berg-Logo aus deinem public Ordner */}
                <div className="w-25 h-25 flex items-center justify-center">
                  <img
                    src="/mountains.png"
                    alt="Logo"
                    className="w-full h-full object-contain invert brightness-0 invert"
                  />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">Scenic Routes</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
                Discover the world's most beautiful driving routes through mountains, coastlines, and breathtaking landscapes.
              </p>
            </div>

            {/* Spalte 2: Links */}
            <div className="flex flex-col">
              <h4 className="text-white font-bold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Explore Routes</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">My Trips</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Spalte 3: Kontakt */}
            <div className="flex flex-col">
              <h4 className="text-white font-bold mb-6 text-lg">Get in Touch</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-lg">📧</span>
                  <a href="mailto:hello@scenicroutes.com" className="hover:text-white transition-colors">hello@scenicroutes.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-lg">📍</span>
                  <span className="text-gray-400">Worldwide Routes</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Unterer Teil: Copyright & Socials */}
          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Scenic Routes. All rights reserved.
            </p>

            <div className="flex items-center gap-5">
              <div className="flex gap-3">
                {['IG', 'FB', 'X'].map((social) => (
                  <a key={social} href="#" className="w-9 h-9 flex items-center justify-center bg-gray-800/50 border border-gray-700 rounded-full text-white text-xs hover:bg-emerald-600 hover:border-emerald-500 transition-all">
                    {social}
                  </a>
                ))}
              </div>
              {/*<button className="w-10 h-10 bg-white text-[#0f172a] rounded-full flex items-center justify-center font-black shadow-xl hover:scale-110 active:scale-95 transition-all">
                ?
              </button>*/}
            </div>
          </div>

        </div>
      </footer>
    </main>
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </>
  );
}


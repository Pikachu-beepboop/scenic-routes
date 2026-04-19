"use client";

import { useState } from "react";
import { useEffect } from 'react'; // Не забудьте добавить useEffect в импорт сверху
import localFont from 'next/font/local';

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
  const [selected, setSelected] = useState("Выберите направление");
  const [selectedDate, setSelectedDate] = useState("Выберите дату");
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

  return (
    <main className="min-h-screen bg-white">
      {/* Навигация (как в Wix) */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <div className="text-2xl font-black leading-[0.8] tracking-tighter">
          Scenic <br /> <span className="text-black ml-4">Routes</span>
        </div>
        <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
          <a href="#" className="hover:text-black transition">Destinations</a>
          <a href="#" className="hover:text-black transition">About us</a>
          <a href="#" className="hover:text-black transition">Contacts</a>
        </div>
        <button className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-tighter hover:bg-gray-800 transition">
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
    <button className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg">
      НАЙТИ МАРШРУТ
    </button>
  </div>
</section>

   

      {/* Sektion: Populäre Ziele */}
<section className="p-12 bg-white">
  {/* Das Container-Grid für die gesamte Ansicht */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
    
    {/* LINKES DIV: Die textuelle Beschreibung (Popular Destinations) */}
    <div className="md:col-span-1 mb-10">
      <h2 className={`${secondFont.className} text-5xl font-bold leading-tight mb-6 text-black`}>
        Popular <br /> Destinations
      </h2>
      <p className={`${secondFont.className} text-gray-500 text-md mb-5 max-w-[200px]`}>
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
  className={`group relative overflow-hidden transition-all duration-700 cursor-pointer h-[500px] shadow-2xl rounded-4xl ${
    index === 0 ? 'mt-55' : 
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
<div className="relative z-10 max-w-[85%] px-2 text-center">
  <h2 className={`${thirdFont.className} text-white text-4xl md:text-6xl font-semibold leading-[1.5] tracking-tight drop-shadow-2xl`}>
    Experience the freedom of the <span className="block md:inline">open road. Discover hidden mountain passes, coastal highways, and breathtaking landscapes.
    </span>
  </h2>
</div>
  </section>



      {/* Футер */}
      <footer className="p-12 text-center text-gray-300 text-xs font-bold uppercase tracking-[0.2em]">
    
      </footer>
    </main>
  );
}


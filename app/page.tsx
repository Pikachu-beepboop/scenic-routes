"use client";

import { useState } from "react";
import { useEffect } from 'react'; // Не забудьте добавить useEffect в импорт сверху
import localFont from 'next/font/local';

const expressFont = localFont({
  src: './fonts/Julius_Sans_One/JuliusSansOne-Regular.ttf', // Punkt und Slash bedeutet: im gleichen Ordner suchen
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
      title: "Ледяные пещеры Ватнайёкюдль",
      country: "Исландия",
      price: "1,200",
      image: "https://unsplash.com",
      tag: "Экстрим"
    },
    {
      id: 2,
      title: "Доломитовые Альпы: Треккинг",
      country: "Италия",
      price: "950",
      image: "https://unsplash.com",
      tag: "Горы"
    },
    {
      id: 3,
      title: "Сафари в парке Серенгети",
      country: "Танзания",
      price: "2,100",
      image: "https://unsplash.com",
      tag: "Природа"
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
    <p className={`${expressFont.className} text-sm md:text-[18px] text-white font-bold tracking-[0.15em] uppercase leading-relaxed drop-shadow-md`}>
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

   

      {/* Сетка маршрутов */}
      <section className="p-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {mockRoutes.map((route) => (
            <div key={route.id} className="group relative aspect-[3/4] overflow-hidden bg-gray-100 border border-gray-200">
              <img 
                src={route.image} 
                alt={route.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Контент поверх картинки */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors p-8 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded">
                    {route.tag}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest">{route.country}</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-2 leading-tight">{route.title}</h3>
                  <div className="flex justify-between items-center border-t border-white/30 pt-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-500">
                    <span className="text-xl font-bold">${route.price}</span>
                    <button className="text-sm font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">
                      Подробнее
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Футер */}
      <footer className="p-12 text-center text-gray-300 text-xs font-bold uppercase tracking-[0.2em]">
    
      </footer>
    </main>
  );
}


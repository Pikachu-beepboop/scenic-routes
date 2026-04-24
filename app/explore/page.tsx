"use client"; // Wichtig für Interaktionen wie Filter

import React, { useState } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import { useSearchParams, } from 'next/navigation';
// Импортируй свои шрифты из правильного места, например:
// import { firstFont, secondFont, thirdFont } from "../fonts"; 


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





export default function ExplorePage() {
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState(searchParams.get('destination') || '')
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '')
  const [isOpen, setIsOpen] = useState(false)
  const [isOpenDate, setIsOpenDate] = useState(false)
  return (
    <div className="min-h-screen bg-white">
      {/* --- ТВОЯ НАВИГАЦИЯ --- */}
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

      {/* --- ГЕРОЙ-СЕКЦИЯ С ПОИСКОМ --- */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src="/mountains-hero.jpg" // Убедись, что картинка есть в public/
          className="absolute inset-0 w-full h-full object-cover"
          alt="Background"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 w-full max-w-6xl px-6">
          <h1 className="text-6xl font-bold text-white italic tracking-[0.01em] antialiased font-normal ">
            Explore Scenic Routes
          </h1>
          <p className={`${firstFont.className} text-white/90 text-xl mb-10 max-w-2xl font-light italic`}>
            Discover the world's most breathtaking driving routes.
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
            className="ml-2 bg-white text-black hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-[24px] font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg"
          >
            НАЙТИ МАРШРУТ
          </button>
        </div>
      </section>


      {/* --- КОНТЕНТ И КАРТОЧКИ --- */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-3 overflow-x-auto">
            {['All Terrains', 'Mountains', 'Coastal', 'Forest'].map((item, i) => (
              <button key={item} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${i === 0 ? 'bg-[#1a3a32] text-white' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Сетка маршрутов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <RouteCard title="Atlantic Ocean Road" country="Norway" info="2-3 h | 8.3 km" tag="Coastal" img="/norway.jpg" />
          <RouteCard title="Black Forest High Road" country="Germany" info="3-4 h | 60 km" tag="Forest" img="/forest.jpg" />
          <RouteCard title="Grossglockner" country="Austria" info="2-4 h | 48 km" tag="Alpine" img="/alps.jpg" />
        </div>
      </main>
    </div>
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
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Clock, MapPin, Navigation, Star, ChevronDown, 
  Heart, Plus, ExternalLink, Map as MapIcon, ArrowLeft, Check 
} from 'lucide-react';

// Import deines AuthModals (Pfad ggf. anpassen, falls der Ordner anders heißt)
import AuthModal from "@/app/AuthModal";

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // --- States ---
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // State für das Popup-Window
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const { scrollY } = useScroll();
  
  // Parallax Effekte für die Hero-Section
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      
      // 1. Authentifizierten User abrufen
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // 2. Route Details aus Supabase laden
      const { data: routeData } = await supabase
        .from('routes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (routeData) {
        setRoute(routeData);

        // 3. Prüfen, ob die Route bereits in 'saved_routes' gespeichert ist
        if (currentUser) {
          const { data: savedRecord } = await supabase
            .from('saved_routes')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('route_id', params.id)
            .single();
          
          if (savedRecord) setIsSaved(true);
        }
      }
      setLoading(false);
    }
    loadInitialData();
  }, [params.id]);

  // --- Zentrale Logik für Herz & Add-Button ---
  const handleAction = async () => {
    // Falls NICHT eingeloggt -> Zeige dein Popup Window
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Falls eingeloggt -> Speichern oder Löschen in 'saved_routes'
    if (isSaved) {
      const { error } = await supabase
        .from('saved_routes')
        .delete()
        .eq('user_id', user.id)
        .eq('route_id', params.id);
      
      if (!error) setIsSaved(false);
    } else {
      const { error } = await supabase
        .from('saved_routes')
        .insert([{ 
          user_id: user.id, 
          route_id: params.id 
        }]);
      
      if (!error) setIsSaved(true);
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!route) return (
    <div className="h-screen bg-black flex items-center justify-center text-white italic tracking-widest">
      Route not found.
    </div>
  );

  return (
    <div className="bg-black text-white font-sans selection:bg-emerald-500/30">
      
      {/* 0. DEIN POPUP WINDOW (AuthModal) */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* NAVIGATION: BACK BUTTON */}
      <button 
        onClick={() => router.back()}
        className="fixed top-8 left-8 z-50 flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group shadow-2xl"
      >
        <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold tracking-widest uppercase">Back</span>
      </button>

      {/* 1. HERO SECTION (100vh) */}
      <section className="relative h-screen w-full overflow-hidden flex items-end pb-24 px-8">
        <motion.div style={{ y: y1, opacity: opacityHero }} className="absolute inset-0 z-0">
          <img src={route.image_url} alt={route.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </motion.div>

        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="absolute top-[-65vh] right-0 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2"
          >
            <span className="text-xl">📍</span>
            <span className="font-medium tracking-wide uppercase text-[10px]">{route.country}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-9xl font-black italic uppercase leading-[0.85] tracking-tighter"
          >
            {route.title?.split(' ').slice(0, -1).join(' ')} <br /> 
            <span className="text-emerald-500">{route.title?.split(' ').pop()}</span>
          </motion.h1>

          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="mt-12 flex flex-col items-center w-fit opacity-40">
            <span className="text-[10px] uppercase tracking-[0.5em] mb-2">Scroll to explore</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </section>

      {/* 2. QUICK STATS BAR (Sticky) */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-black/80 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Clock className="text-emerald-400 w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{route.duration}</span>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Navigation className="text-emerald-400 w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{route.distance_km} km</span>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <MapPin className="text-emerald-400 w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest truncate">{route.country}</span>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Star className="fill-emerald-400 text-emerald-400 w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">4.9/5 Rating</span>
          </div>
        </div>
      </div>

      {/* 3. STORY SECTION */}
      <section className="max-w-7xl mx-auto px-8 py-32 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center text-center lg:text-left">
        <div className="space-y-8">
          <h2 className="text-5xl font-serif italic text-emerald-50 leading-tight">Beyond the <br/> Horizon.</h2>
          <p className="text-xl leading-relaxed text-gray-400 font-light italic">"{route.description}"</p>
          <div className="h-1 w-20 bg-emerald-500/50 mx-auto lg:mx-0" />
        </div>
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <img src={route.image_url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      </section>

      {/* 4. INTERACTIVE MAP SECTION */}
      <section className="px-8 pb-32">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <h3 className="text-center text-2xl font-bold uppercase tracking-[0.3em] opacity-50 mb-4 italic text-emerald-500">The Route Path</h3>
          <div className="relative h-[600px] w-full rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group bg-zinc-900/50">
            <iframe
              src={route['Google Maps']} 
              width="100%" height="100%" style={{ border: 0 }}
              allowFullScreen loading="lazy"
              className="grayscale invert opacity-70 contrast-125 hover:opacity-100 transition-opacity duration-1000"
            />
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
          </div>
          <div className="flex justify-center">
            <a 
              href={route['Maps URL']} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-12 py-6 rounded-full transition-all hover:shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 uppercase tracking-tighter"
            >
              <ExternalLink className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Open Full Map Experience
            </a>
          </div>
        </div>
      </section>

      {/* FLOATING CTA BUTTONS (DIESE NUTZEN JETZT DEIN AUTH-MODAL) */}
      <div className="fixed bottom-10 right-10 z-50 flex items-center gap-4">
        <button 
          onClick={handleAction}
          className="p-5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full hover:bg-zinc-800 transition-all hover:scale-110 shadow-2xl group"
        >
          <Heart 
            className={`w-6 h-6 transition-all duration-300 ${isSaved ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} 
          />
        </button>
        
        <button 
          onClick={handleAction}
          className={`flex items-center gap-4 font-black px-10 py-5 rounded-full shadow-2xl transition-all hover:translate-y-[-4px] active:translate-y-0 uppercase tracking-tighter ${
            isSaved ? 'bg-white text-black' : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }`}
        >
          {isSaved ? <Check size={24} /> : <Plus size={24} />}
          {isSaved ? "Saved in Trips" : "Add to My Trips"}
        </button>
      </div>

    </div>
  );
}
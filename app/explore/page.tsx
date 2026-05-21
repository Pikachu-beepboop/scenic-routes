"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AuthModal from '../AuthModal';
import { supabase } from '../../lib/supabase';

type Route = {
  id: string;
  title: string;
  country: string;
  distance_km?: number;
  image_url?: string;
  duration?: string;
  type?: string;
  terrain?: string;
  description?: string;
  rating?: number;
};

// locale-safe formatter — no hydration mismatch
const fmtKm = (km?: number) => (km != null ? `${km.toLocaleString("en-US")} km` : "—");

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selected, setSelected]       = useState(searchParams.get('destination') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('duration') || '');
  const [filters, setFilters] = useState<{
    difficulty: string[];
    duration: string;
    minRating: number;
    countries: string[];
  }>({
    difficulty: searchParams.get('terrain')?.split(',').filter(Boolean) || [],
    duration:   searchParams.get('dur') || 'any',
    minRating:  Number(searchParams.get('rating') || 0),
    countries:  searchParams.get('countries')?.split(',').filter(Boolean) || [],
  });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
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

  const [isOpen, setIsOpen]           = useState(false);
  const [isOpenDate, setIsOpenDate]   = useState(false);
  const [isAuthOpen, setIsAuthOpen]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes]           = useState<Route[]>([]);
  const [loading, setLoading]         = useState(true);
  const [countries, setCountries]     = useState<string[]>([]);
  const [durations, setDurations]     = useState<string[]>([]);
  const [user, setUser]               = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState('');
  const [navScrolled, setNavScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchSavedRoutes(); }, [user]);

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
    setUser(null); setSavedRoutes([]); setShowUserMenu(false);
  }

  async function fetchCountries() {
    const { data } = await supabase.from('routes').select('country');
    if (data) setCountries([...new Set(data.map((r: any) => r.country))].sort() as string[]);
  }

  async function fetchDurations() {
    const { data } = await supabase.from('routes').select('duration');
    if (data) setDurations([...new Set(data.map((r: any) => r.duration))].sort() as string[]);
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

  useEffect(() => {
    if (!user) { setAvatarUrl(''); return; }
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || ''));
  }, [user]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0c0b09; --bg2:#131109; --bg3:#1a1710;
          --gold:#C9A86A; --cream:#EDE5D4;
          --muted:rgba(237,229,212,0.56); --dim:rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.12);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }
        html { scroll-behavior:smooth; }
        body { background:var(--bg); overflow-x:hidden; }
        a { color:inherit; text-decoration:none; }
        button { border:none; font:inherit; cursor:pointer; }
        input, select { font:inherit; }
        img { display:block; }

        .page { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); }

        /* NAV */
        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:rgba(12,11,9,0.92); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .login-btn { padding:10px 22px; border:1px solid rgba(237,229,212,0.28); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:rgba(237,229,212,0.04); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }
        .user-avatar { width:38px; height:38px; border-radius:50%; border:1px solid var(--border); background:rgba(237,229,212,0.06); overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--cream); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }
        .user-dropdown { position:absolute; top:50px; right:0; width:210px; background:rgba(20,18,12,0.98); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.52); }
        .user-dropdown-email { padding:12px 14px; border-bottom:1px solid var(--border); font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .user-dropdown a, .user-dropdown button { display:block; width:100%; padding:12px 14px; font-size:13px; color:var(--cream); text-align:left; background:none; transition:background .15s; }
        .user-dropdown a:hover, .user-dropdown button:hover { background:rgba(237,229,212,0.06); }
        .user-dropdown button { color:#E08080; }

        /* HERO */
        .hero { position:relative; height:100vh; min-height:640px; display:flex; align-items:center; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; }
        .hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.52) saturate(0.9); }
        .hero-bg::after { content:""; position:absolute; inset:0; background: linear-gradient(to right,rgba(12,11,9,0.92) 0%,rgba(12,11,9,0.6) 40%,rgba(12,11,9,0.15) 100%), linear-gradient(to bottom,rgba(12,11,9,0.1) 0%,transparent 40%,rgba(12,11,9,0.95) 100%); }
        .hero-inner { position:relative; z-index:10; width:100%; max-width:1440px; margin:0 auto; padding:80px clamp(20px,4vw,60px) 0; display:grid; grid-template-columns:1fr auto; gap:clamp(32px,5vw,80px); align-items:center; }
        .hero-left { max-width:560px; }
        .hero-right { display:flex; flex-direction:column; align-items:flex-end; position:relative; }
        .hero-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:18px; }
        .hero-h1 { font-family:var(--serif); font-size:clamp(48px,7vw,96px); font-weight:300; font-style:italic; line-height:0.88; letter-spacing:-0.04em; color:var(--cream); margin-bottom:18px; text-shadow:0 20px 60px rgba(0,0,0,0.6); }
        .hero-sub { font-size:14px; font-weight:300; color:rgba(237,229,212,0.6); max-width:460px; line-height:1.75; margin-bottom:0; margin-top:16px; }

        /* SEARCH BAR */
        .search-bar { display:inline-flex; align-items:center; gap:0; background:rgba(237,229,212,0.07); backdrop-filter:blur(24px); border:1px solid rgba(237,229,212,0.18); border-radius:16px; overflow:visible; min-width:480px; }
        .search-field { position:relative; padding:16px 24px; min-width:220px; flex:1; cursor:pointer; transition:background .2s; border-radius:14px; }
        .search-field:hover { background:rgba(237,229,212,0.06); }
        .search-field.open { background:rgba(237,229,212,0.1); }
        .search-field-label { font-size:9px; font-weight:800; letter-spacing:0.3em; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
        .search-field-value { font-size:13px; font-weight:500; color:var(--cream); display:flex; align-items:center; gap:8px; justify-content:space-between; }
        .search-field-value span { color:var(--muted); font-size:9px; transition:transform .2s; }
        .search-field-value span.flipped { transform:rotate(180deg); }
        .search-divider { width:1px; height:32px; background:rgba(237,229,212,0.12); flex-shrink:0; }
        .search-btn { margin:6px; padding:14px 26px; background:var(--gold); color:var(--bg); border-radius:12px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:all .25s; white-space:nowrap; box-shadow:0 8px 24px rgba(201,168,106,0.25); }
        .search-btn:hover { background:#d8b978; transform:translateY(-1px); }

        /* DROPDOWN */
        .search-dropdown { position:absolute; top:calc(100% + 8px); left:0; right:0; min-width:220px; z-index:9999; background:rgba(14,13,10,0.99); border:1px solid rgba(237,229,212,0.2); border-radius:14px; overflow:hidden; box-shadow:0 28px 70px rgba(0,0,0,0.75); }
        .search-dropdown-item { padding:12px 20px; font-size:13px; color:var(--muted); cursor:pointer; transition:background .15s,color .15s; border-bottom:1px solid rgba(237,229,212,0.06); }
        .search-dropdown-item:last-child { border-bottom:none; }
        .search-dropdown-item:hover { background:rgba(237,229,212,0.06); color:var(--cream); }
        .search-dropdown-scroll { max-height:220px; overflow-y:auto; }
        .search-dropdown-scroll::-webkit-scrollbar { width:4px; }
        .search-dropdown-scroll::-webkit-scrollbar-track { background:transparent; }
        .search-dropdown-scroll::-webkit-scrollbar-thumb { background:rgba(237,229,212,0.15); border-radius:2px; }

        /* CONTENT */
        .content { padding:0 clamp(20px,4vw,60px) clamp(60px,8vw,100px); max-width:1440px; margin:0 auto; }

        /* TOOLBAR */
        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:32px 0 24px; border-bottom:1px solid var(--border); margin-bottom:32px; }
        .results-count { font-size:12px; color:var(--dim); font-weight:500; letter-spacing:0.06em; }
        .results-count strong { color:var(--cream); font-weight:700; }
        .filter-btn { display:flex; align-items:center; gap:8px; padding:10px 18px; border:1px solid var(--border); border-radius:999px; background:rgba(237,229,212,0.04); font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:all .25s; }
        .filter-btn:hover { border-color:rgba(201,168,106,0.4); color:var(--cream); background:rgba(201,168,106,0.06); }
        .filter-count { width:18px; height:18px; border-radius:50%; background:var(--gold); color:var(--bg); font-size:9px; font-weight:800; display:flex; align-items:center; justify-content:center; }

        /* ACTIVE TAGS */
        .active-tags { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; }
        .active-tag { display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:rgba(201,168,106,0.12); border:1px solid rgba(201,168,106,0.28); font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); }
        .active-tag button { color:rgba(237,229,212,0.5); font-size:14px; line-height:1; transition:color .15s; padding:0; background:none; }
        .active-tag button:hover { color:#E08080; }
        .clear-all-btn { padding:7px 12px; border-radius:999px; border:1px solid var(--border); font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--dim); background:none; transition:all .2s; }
        .clear-all-btn:hover { color:#E08080; border-color:rgba(224,128,128,0.3); }

        /* ROUTE GRID */
        .route-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }

        /* ROUTE CARD */
        .route-card { position:relative; border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); transition:transform .4s cubic-bezier(.25,.46,.45,.94),box-shadow .4s,border-color .4s; cursor:pointer; }
        .route-card:hover { transform:translateY(-6px); box-shadow:0 32px 80px rgba(0,0,0,0.5); border-color:rgba(201,168,106,0.22); }
        .route-card-img { position:relative; height:240px; overflow:hidden; }
        .route-card-img img { width:100%; height:100%; object-fit:cover; transition:transform .7s ease; filter:brightness(0.88); }
        .route-card:hover .route-card-img img { transform:scale(1.07); }
        .route-card-img::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6) 100%); }
        .save-btn { position:absolute; top:12px; right:12px; z-index:5; width:36px; height:36px; border-radius:50%; background:rgba(12,11,9,0.55); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.18); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .25s,background .25s; }
        .route-card:hover .save-btn { opacity:1; }
        .save-btn:hover { background:rgba(12,11,9,0.85); }
        .save-btn svg { width:16px; height:16px; }
        .route-card-type { position:absolute; bottom:12px; left:12px; z-index:5; padding:5px 10px; border-radius:999px; background:rgba(12,11,9,0.65); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.16); font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:rgba(237,229,212,0.8); }
        .route-card-body { padding:18px 18px 20px; }
        .route-card-country { font-size:9px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
        .route-card-title { font-family:var(--serif); font-size:22px; font-weight:400; color:var(--cream); line-height:1.05; letter-spacing:-0.02em; margin-bottom:8px; }
        .route-card-desc { font-size:12px; color:var(--dim); line-height:1.65; font-weight:300; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .route-card-meta { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .route-card-meta-item { display:flex; align-items:center; gap:5px; font-size:10px; color:rgba(237,229,212,0.45); font-weight:500; }
        .route-card-meta-item svg { opacity:0.55; flex-shrink:0; }
        .route-card-footer { display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--border); }
        .route-card-rating { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--gold); font-weight:700; }
        .view-route-btn { font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold); transition:color .2s; display:flex; align-items:center; gap:6px; }
        .view-route-btn:hover { color:var(--cream); }

        /* LOADING */
        .loading-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .skeleton { border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); }
        .skeleton-img { height:240px; background:linear-gradient(90deg,rgba(237,229,212,0.04) 0%,rgba(237,229,212,0.08) 50%,rgba(237,229,212,0.04) 100%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
        .skeleton-body { padding:18px; display:flex; flex-direction:column; gap:10px; }
        .skeleton-line { height:10px; border-radius:6px; background:linear-gradient(90deg,rgba(237,229,212,0.04) 0%,rgba(237,229,212,0.08) 50%,rgba(237,229,212,0.04) 100%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* FILTER PANEL */
        .filter-overlay { position:fixed; inset:0; z-index:299; }
        .filter-panel { position:absolute; right:0; top:calc(100% + 10px); width:320px; background:rgba(18,16,11,0.98); border:1px solid var(--border); border-radius:20px; padding:24px; box-shadow:0 28px 80px rgba(0,0,0,0.55); z-index:300; backdrop-filter:blur(20px); }
        .filter-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .filter-panel-title { font-size:10px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; color:var(--cream); }
        .filter-reset { font-size:10px; font-weight:600; letter-spacing:0.12em; color:var(--dim); background:none; transition:color .2s; }
        .filter-reset:hover { color:#E08080; }
        .filter-section { margin-bottom:22px; }
        .filter-section-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:12px; }
        .filter-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .filter-chip { padding:8px 14px; border-radius:999px; border:1px solid rgba(237,229,212,0.14); background:rgba(237,229,212,0.04); font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:rgba(237,229,212,0.65); transition:all .2s; }
        .filter-chip:hover { border-color:rgba(201,168,106,0.4); color:var(--cream); }
        .filter-chip.active { border-color:rgba(201,168,106,0.7); background:rgba(201,168,106,0.14); color:var(--cream); }
        .filter-radio { display:flex; flex-direction:column; gap:10px; }
        .filter-radio-item { display:flex; align-items:center; gap:10px; cursor:pointer; }
        .filter-radio-item input { accent-color:var(--gold); }
        .filter-radio-item span { font-size:13px; color:var(--muted); }
        .filter-stars { display:flex; gap:4px; }
        .filter-star { font-size:22px; color:rgba(237,229,212,0.2); transition:color .15s; background:none; }
        .filter-star.active { color:var(--gold); }
        .filter-country-list { display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; }
        .filter-country-list::-webkit-scrollbar { width:3px; }
        .filter-country-list::-webkit-scrollbar-thumb { background:rgba(237,229,212,0.15); border-radius:2px; }
        .filter-country-item { display:flex; align-items:center; gap:10px; cursor:pointer; }
        .filter-country-item input { accent-color:var(--gold); }
        .filter-country-item span { font-size:13px; color:var(--muted); }
        .filter-apply-btn { width:100%; padding:14px; background:var(--gold); color:var(--bg); border-radius:12px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:background .2s; margin-top:4px; }
        .filter-apply-btn:hover { background:#d8b978; }

        /* EMPTY */
        .empty-state { text-align:center; padding:80px 20px; }
        .empty-state h3 { font-family:var(--serif); font-size:40px; font-weight:300; font-style:italic; color:var(--cream); margin-bottom:12px; }
        .empty-state p { font-size:14px; color:var(--dim); font-weight:300; margin-bottom:28px; }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:52px clamp(20px,4vw,60px) 28px; }
        .footer-inner { max-width:1380px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1.5fr; gap:40px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand { font-size:14px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); line-height:1.1; margin-bottom:12px; }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-socials { display:flex; gap:8px; }
        .footer-social { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--dim); transition:all .2s; }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col a { display:block; font-size:12px; color:rgba(237,229,212,0.35); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-nl-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:10px; }
        .footer-nl-sub { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:14px; font-weight:300; }
        .footer-nl-form { display:flex; }
        .footer-nl-input { flex:1; padding:11px 15px; border:1px solid var(--border); border-right:none; border-radius:999px 0 0 999px; background:rgba(237,229,212,0.04); color:var(--cream); font-size:13px; outline:none; }
        .footer-nl-input::placeholder { color:var(--dim); }
        .footer-nl-btn { width:46px; background:var(--gold); border:1px solid var(--gold); border-radius:0 999px 999px 0; color:var(--bg); font-size:15px; font-weight:800; transition:background .2s; }
        .footer-nl-btn:hover { background:#d8b978; }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; }
        .footer-legal { display:flex; gap:22px; }
        .footer-legal a { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        @media (max-width:1100px) {
          .route-grid, .loading-grid { grid-template-columns:repeat(3,1fr); }
          .footer-top { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:760px) {
          .nav-links { display:none; }
          .hero-h1 { font-size:clamp(38px,12vw,60px); }
          .hero-inner { grid-template-columns:1fr; gap:32px; padding-top:100px; }
          .hero-right { align-items:flex-start; width:100%; }
          .search-bar { min-width:0; width:100%; }
          .search-bar { flex-direction:column; border-radius:16px; }
          .search-divider { width:100%; height:1px; }
          .search-field { width:100%; }
          .route-grid, .loading-grid { grid-template-columns:1fr 1fr; }
          .toolbar { flex-direction:column; align-items:flex-start; gap:12px; }
          .footer-top { grid-template-columns:1fr; }
          .footer-bottom { flex-direction:column; align-items:flex-start; }
        }
        @media (max-width:480px) {
          .route-grid, .loading-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="page">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo"><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[['Explore Routes','/explore'],['About','/about']].map(([l,h])=>(
              <Link key={l} href={h} className="nav-link">{l}</Link>
            ))}
            {user && <Link href="/my-trips" className="nav-link" style={{color:'var(--gold)'}}>My Trips</Link>}
          </div>
          <div className="nav-right">
            {user ? (
              <div style={{position:'relative'}}>
                <button className="user-avatar" onClick={()=>setShowUserMenu(p=>!p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : user.email?.[0]?.toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-email">{user.email}</div>
                    <Link href="/profile" onClick={()=>setShowUserMenu(false)}>Profile</Link>
                    <button onClick={handleLogout}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="login-btn" onClick={()=>setIsAuthOpen(true)}>Login</button>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg">
            <img src="/iceland.jpg" alt="Scenic roads" onError={e=>{e.currentTarget.src='/iceland.jpg';}}/>
          </div>
          <div className="hero-inner">
            <div className="hero-left">
              <p className="hero-eyebrow">Discover · Explore · Drive</p>
              <h1 className="hero-h1">Find your<br/>perfect route.</h1>
              <p className="hero-sub">Search through hundreds of handpicked scenic drives — filtered by country, duration, terrain and mood.</p>
            </div>

            {/* SEARCH BAR */}
            <div className="hero-right">
            <div className="search-bar">
              {/* Country */}
              <div className="search-field" style={{position:'relative'}} onClick={()=>{setIsOpen(p=>!p); setIsOpenDate(false);}}>
                <div className="search-field-label">Country</div>
                <div className="search-field-value">
                  <span style={{color: selected ? 'var(--cream)' : 'var(--muted)'}}>{selected || 'Choose destination'}</span>
                  <span className={isOpen ? 'flipped' : ''}>▼</span>
                </div>
                {isOpen && (
                  <div className="search-dropdown">
                    <div className="search-dropdown-scroll">
                      <div className="search-dropdown-item" onClick={e=>{e.stopPropagation();setSelected('');setIsOpen(false);}}>All countries</div>
                      {countries.map(c=>(
                        <div key={c} className="search-dropdown-item" onClick={e=>{e.stopPropagation();setSelected(c);setIsOpen(false);}}>{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="search-divider"/>

              {/* Duration */}
              <div className="search-field" style={{position:'relative'}} onClick={()=>{setIsOpenDate(p=>!p); setIsOpen(false);}}>
                <div className="search-field-label">Duration</div>
                <div className="search-field-value">
                  <span style={{color: selectedDate ? 'var(--cream)' : 'var(--muted)'}}>{selectedDate || 'Choose duration'}</span>
                  <span className={isOpenDate ? 'flipped' : ''}>▼</span>
                </div>
                {isOpenDate && (
                  <div className="search-dropdown">
                    <div className="search-dropdown-scroll">
                      <div className="search-dropdown-item" onClick={e=>{e.stopPropagation();setSelectedDate('');setIsOpenDate(false);}}>Any duration</div>
                      {durations.map(d=>(
                        <div key={d} className="search-dropdown-item" onClick={e=>{e.stopPropagation();setSelectedDate(d);setIsOpenDate(false);}}>{d}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button className="search-btn" onClick={fetchRoutes}>Find Route →</button>
            </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <div className="content">

          {/* TOOLBAR */}
          <div className="toolbar">
            <p className="results-count">
              {loading ? 'Loading routes…' : <><strong>{routes.length}</strong> routes found</>}
            </p>
            <div style={{position:'relative'}}>
              <button className="filter-btn" onClick={()=>setShowFilters(p=>!p)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="12" y2="18"/>
                </svg>
                Filters
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>

              {showFilters && (
                <>
                  <div className="filter-overlay" onClick={()=>setShowFilters(false)}/>
                  <div className="filter-panel">
                    <div className="filter-panel-header">
                      <span className="filter-panel-title">Filters</span>
                      <button className="filter-reset" onClick={()=>setFilters({difficulty:[],duration:'any',minRating:0,countries:[]})}>Reset all</button>
                    </div>

                    <div className="filter-section">
                      <p className="filter-section-title">Terrain</p>
                      <div className="filter-chips">
                        {['Forest','Deserts','Coastal','Mountains'].map(t=>(
                          <button key={t} className={`filter-chip ${filters.difficulty.includes(t)?'active':''}`} onClick={()=>toggleFilter('difficulty',t)}>{t}</button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <p className="filter-section-title">Duration</p>
                      <div className="filter-radio">
                        {[{v:'any',l:'Any duration'},{v:'half',l:'Half day (< 4h)'},{v:'full',l:'Full day (4–8h)'},{v:'weekend',l:'Weekend trip'},{v:'multiday',l:'Multi-day journey'}].map(({v,l})=>(
                          <label key={v} className="filter-radio-item">
                            <input type="radio" name="duration" checked={filters.duration===v} onChange={()=>setFilters(p=>({...p,duration:v}))}/>
                            <span>{l}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <p className="filter-section-title">Minimum Rating</p>
                      <div className="filter-stars">
                        {[1,2,3,4,5].map(s=>(
                          <button key={s} className={`filter-star ${s<=filters.minRating?'active':''}`} onClick={()=>setFilters(p=>({...p,minRating:p.minRating===s?0:s}))}>★</button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <p className="filter-section-title">Country</p>
                      <div className="filter-country-list">
                        {countries.map(c=>(
                          <label key={c} className="filter-country-item">
                            <input type="checkbox" checked={filters.countries.includes(c)} onChange={()=>toggleFilter('countries',c)}/>
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button className="filter-apply-btn" onClick={()=>setShowFilters(false)}>Apply Filters</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ACTIVE TAGS */}
          {(activeFilterCount > 0 || selected || selectedDate) && (
            <div className="active-tags">
              {filters.difficulty.map(t=>(
                <span key={t} className="active-tag">{t}<button onClick={()=>toggleFilter('difficulty',t)}>×</button></span>
              ))}
              {filters.countries.map(c=>(
                <span key={c} className="active-tag">{c}<button onClick={()=>toggleFilter('countries',c)}>×</button></span>
              ))}
              {selected && <span className="active-tag">{selected}<button onClick={()=>setSelected('')}>×</button></span>}
              {selectedDate && <span className="active-tag">{selectedDate}<button onClick={()=>setSelectedDate('')}>×</button></span>}
              <button className="clear-all-btn" onClick={clearAllFilters}>Clear all</button>
            </div>
          )}

          {/* GRID */}
          {loading ? (
            <div className="loading-grid">
              {Array.from({length:8}).map((_,i)=>(
                <div key={i} className="skeleton">
                  <div className="skeleton-img"/>
                  <div className="skeleton-body">
                    <div className="skeleton-line" style={{width:'40%'}}/>
                    <div className="skeleton-line" style={{width:'75%',height:14}}/>
                    <div className="skeleton-line" style={{width:'60%'}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="empty-state">
              <h3>No routes found.</h3>
              <p>Try adjusting your filters or search for a different destination.</p>
              <button className="filter-apply-btn" style={{width:'auto',padding:'14px 28px',borderRadius:999,display:'inline-flex'}} onClick={clearAllFilters}>Clear Filters</button>
            </div>
          ) : (
            <div className="route-grid">
              {routes.map(route=>(
                <div key={route.id} className="route-card">
                  <div className="route-card-img">
                    <Link href={`/routedetail/${route.id}`}>
                      <img src={route.image_url||'/iceland.jpg'} alt={route.title} onError={e=>{e.currentTarget.src='/iceland.jpg';}}/>
                    </Link>
                    <button className="save-btn" onClick={e=>{e.preventDefault();toggleSave(route.id);}}>
                      <svg viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        style={{fill: savedRoutes.includes(route.id)?'#ef4444':'transparent', stroke: savedRoutes.includes(route.id)?'#ef4444':'rgba(237,229,212,0.8)'}}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    {(route.terrain || route.type) && (
                      <div className="route-card-type">{route.terrain || route.type}</div>
                    )}
                  </div>

                  <div className="route-card-body">
                    <div className="route-card-country">{route.country}</div>
                    <Link href={`/routedetail/${route.id}`}>
                      <div className="route-card-title">{route.title}</div>
                    </Link>
                    {route.description && (
                      <p className="route-card-desc">{route.description}</p>
                    )}

                    <div className="route-card-meta">
                      {route.duration && (
                        <div className="route-card-meta-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {route.duration}
                        </div>
                      )}
                      {route.distance_km && (
                        <div className="route-card-meta-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                          {fmtKm(route.distance_km)}
                        </div>
                      )}
                    </div>

                    <div className="route-card-footer">
                      <div className="route-card-rating">
                        ★ {route.rating ? route.rating.toFixed(1) : '—'}
                      </div>
                      <Link href={`/routedetail/${route.id}`} className="view-route-btn">
                        View Route →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand">SCENIC<br/>ROUTES</div>
                <p className="footer-tagline">Extraordinary roads.<br/>Timeless memories.</p>
                <div className="footer-socials">
                  {['IG','FB','YT'].map(s=><a key={s} href="#" className="footer-social">{s[0]}</a>)}
                </div>
              </div>
              {[['Explore',['All Routes','Mountain Passes','Coastal Roads','Hidden Gems']],['Discover',['Weekend Escapes','Photo Spots','Driving Roads','About Us']],['Support',['FAQ','Contact Us','Privacy Policy','Terms']]].map(([h,links])=>(
                <div key={h as string} className="footer-col">
                  <p className="footer-col-title">{h}</p>
                  {(links as string[]).map(l=><a href="#" key={l}>{l}</a>)}
                </div>
              ))}
              <div>
                <p className="footer-nl-title">Stay Inspired</p>
                <p className="footer-nl-sub">Get the best scenic routes and travel stories in your inbox.</p>
                <div className="footer-nl-form">
                  <input type="email" className="footer-nl-input" placeholder="your@email.com"/>
                  <button className="footer-nl-btn">→</button>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="footer-copy">© {new Date().getFullYear()} Scenic Routes. All Rights Reserved.</p>
              <div className="footer-legal">
                <a href="#">Terms & Conditions</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
      <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)}/>
    </>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { supabase, supabasePublic, safeQuery, withTimeout } from '@/lib/supabase';
import { useAuth, signOutSafe } from '@/lib/useAuth';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import {
    Clock, MapPin, Navigation, Star, ChevronDown, ChevronRight,
    Heart, ArrowLeft, User, ArrowRight, Send, Globe,
    Map as MapIcon, Compass, LogOut, Menu, X,
    Route as RouteIcon, Mountain, Waves, Droplets, Ticket, Car,
    CloudRain, Fuel, Users, Sun, ExternalLink, Bookmark, Gauge, TreePine
} from 'lucide-react';
import Link from 'next/link';
import { ThemeSwitch } from '@/app/components/ThemeSwitch';
import GoogleMapsGate from '@/app/components/GoogleMapsGate';
import { useTheme } from 'next-themes';
import { useUnit } from '@/app/UnitContext';
import { useLanguage } from '@/app/LanguageContext';
import { formatDistance } from '@/lib/formatDistance';

// Diese Seite ist die einzige dynamisch gerenderte Route der App (Cloudflare Pages
// verlangt dafuer die Edge-Runtime). Sie wird nicht vorgerendert, es existiert also
// kein Prefetch-Payload -> Links hierher werden mit prefetch={false} gesetzt.
// Hintergrund: ROUTING.md
export const runtime = 'edge';


interface Route {
    id: string;
    title: string;
    description: string;
    image_url: string;
    duration: string;
    distance_km: number;
    country: string;
    'start_point'?: string;
    'end_point'?: string;
    'route_highlights'?: string;
    'maps_URL'?: string;
    'google_maps'?: string;
    'title_en'?: string;
    'title_de'?: string;
    'description_en'?: string;
    'description_de'?: string;
    'long_description_en'?: string;
    'long_description_de'?: string;
    'route_highlights_en'?: string;
    'route_highlights_de'?: string;
    'chapter1_en'?: string;
    'chapter1_de'?: string;
    'chapter2_en'?: string;
    'chapter2_de'?: string;
    'chapter3_en'?: string;
    'chapter3_de'?: string;
    'chapter4_en'?: string;
    'chapter4_de'?: string;
    'chapter5_en'?: string;
    'chapter5_de'?: string;
    'scenic_score'?: number;
    'elevation_gain_m'?: number;
    'road_surface'?: string;
    'road_surface_en'?: string;
    'road_surface_de'?: string;
    'traffic_level'?: string;
    'traffic_level_en'?: string;
    'traffic_level_de'?: string;
    'best_time_of_day'?: string;
    'route_notes'?: string;
    'best_season'?: string;
    'must_see_stops'?: string;
    'access_fees'?: string;
    'season_timing'?: string;
    'practical_notes'?: string;
    'start_elevation_m'?: number;
    'end_elevation_m'?: number;
    'toll_fee'?: string;
    'toll_fee_en'?: string;
    'toll_fee_de'?: string;
    'access_season'?: string;
    'opening_access'?: string;
    'opening_access_en'?: string;
    'opening_access_de'?: string;
    'vehicle_restrictions'?: string;
    'vehicle_restrictions_en'?: string;
    'vehicle_restrictions_de'?: string;
    'closure_period'?: string;
    'closure_period_en'?: string;
    'closure_period_de'?: string;
    'difficulty'?: string;
    'difficulty_en'?: string;
    'difficulty_de'?: string;
    'fuel_services'?: string;
    'fuel_services_en'?: string;
    'fuel_services_de'?: string;
    'weather_advice'?: string;
    'weather_advice_en'?: string;
    'weather_advice_de'?: string;
    [key: string]: unknown;
}

function localizedRouteText(route: Route | null, field: string, lang: string): string {
    if (!route) return '';
    const specific = route[`${field}_${lang}`];
    const en = route[`${field}_en`];
    const de = route[`${field}_de`];
    const legacy = route[field];
    const value = specific || en || de || legacy;
    return typeof value === 'string' ? value : '';
}

const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "ru", label: "Русский" },
] as const;

// Footer-Linkdaten (analog zu Homepage/Explore/About/My Trips): pro Link-Key
// hinterlegt, wohin er führt. "protected" = braucht Login (sonst Redirect zu
// /login mit redirect-Param). "loggedInHref" = eingeloggte User werden auf
// ein alternatives Ziel geleitet (z.B. Support-Tab im Profil statt der
// öffentlichen /support-Seite), ohne dass dafür ein Login erzwungen wird.
const FOOTER_LINK_META: Record<string, { href: string; protected?: boolean; loggedInHref?: string }> = {
    "footer.link.allRoutes": { href: "/explore" },
    "footer.link.myTrips": { href: "/my-trips", protected: true },
    "footer.link.profile": { href: "/profile", protected: true },
    // Traveller Pass ist kein eigener Pfad, sondern ein Tab auf der Profile-Page
    // (subTab="pass"). Die Profile-Page liest ?tab=pass beim Laden aus.
    "footer.link.travellerPass": { href: "/profile?tab=pass", protected: true },
    "footer.link.about": { href: "/about" },
    // Our Team ist ein Anchor-Abschnitt auf der About-Page (id="team")
    "footer.link.ourTeam": { href: "/about#team" },
    // FAQ, Contact und Send Feedback führen nicht eingeloggte User zur
    // öffentlichen /support-Seite. Eingeloggte User werden stattdessen direkt
    // zum "support"-Subtab im Profil weitergeleitet.
    "footer.link.faq": { href: "/support", loggedInHref: "/profile?tab=support" },
    "footer.link.contact": { href: "/support", loggedInHref: "/profile?tab=support" },
    "footer.link.sendFeedback": { href: "/support", loggedInHref: "/profile?tab=support" },
    "footer.link.termsOfUse": { href: "/legal/terms" },
    "footer.link.privacyPolicy": { href: "/legal/privacy" },
    "footer.link.imprint": { href: "/legal/imprint" },
};

function getFooterHref(linkKey: string, user: any): string {
    const meta = FOOTER_LINK_META[linkKey];
    if (!meta) return "#";
    if (meta.protected && !user) {
        return `/login?redirect=${encodeURIComponent(meta.href)}`;
    }
    if (user && meta.loggedInHref) {
        return meta.loggedInHref;
    }
    return meta.href;
}

/** Titel im Magazin-Stil: letztes Wort (bzw. Klammerteil) kursiv in Gold. */
function EditorialTitle({ title }: { title: string }) {
    if (!title) return null;
    if (title.includes('(')) {
        const [main, rest] = title.split('(');
        return (
            <>
                {main.trim()} <em>({rest}</em>
            </>
        );
    }
    const words = title.trim().split(/\s+/);
    if (words.length === 1) return <>{title}</>;
    return (
        <>
            {words.slice(0, -1).join(' ')} <em>{words[words.length - 1]}</em>
        </>
    );
}

/* Texte, die es (noch) nicht in den Übersetzungsdateien gibt */
const RA_TEXT = {
    en: {
        factSheet: 'Route fact sheet', atAGlance: 'At a glance', topRoute: 'One of our top routes', outOf10: 'out of 10',
        whenToGo: 'When to go', inOneLine: 'The route in one line', closed: 'Closed',
        stopsHead: ['Places', 'to pull over'], roadHead: ['The', 'road'],
        startEnd: 'Start → end elevation',
        months: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
    de: {
        factSheet: 'Steckbrief', atAGlance: 'Auf einen Blick', topRoute: 'Eine unserer Top-Routen', outOf10: 'von 10',
        whenToGo: 'Beste Reisezeit', inOneLine: 'Die Route in einem Satz', closed: 'Gesperrt',
        stopsHead: ['Orte', 'zum Anhalten'], roadHead: ['Die', 'Strecke'],
        startEnd: 'Höhe Start → Ziel',
        months: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        monthsLong: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    },
    ru: {
        factSheet: 'Паспорт маршрута', atAGlance: 'Коротко', topRoute: 'Один из лучших маршрутов', outOf10: 'из 10',
        whenToGo: 'Когда ехать', inOneLine: 'Маршрут в одной фразе', closed: 'Закрыто',
        stopsHead: ['Места', 'для остановки'], roadHead: ['', 'Дорога'],
        startEnd: 'Высота старт → финиш',
        months: ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'],
        monthsLong: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    },
} as const;

/* Monate aus Texten wie "June–October", "Jun – Oct", "Mai bis Oktober", "year-round" lesen */
const MONTH_WORDS: [RegExp, number][] = [
    [/\b(jan|januar|january|янв)/i, 0], [/\b(feb|februar|february|фев)/i, 1], [/\b(mar|mär|märz|march|мар)/i, 2],
    [/\b(apr|april|апр)/i, 3], [/\b(may|mai|ма[йя])/i, 4], [/\b(jun|juni|june|июн)/i, 5], [/\b(jul|juli|july|июл)/i, 6],
    [/\b(aug|august|авг)/i, 7], [/\b(sep|sept|september|сен)/i, 8], [/\b(oct|okt|oktober|october|окт)/i, 9],
    [/\b(nov|november|ноя)/i, 10], [/\b(dec|dez|dezember|december|дек)/i, 11],
];
function parseOpenMonths(text: string): Set<number> | null {
    if (!text) return null;
    if (/year[- ]?round|all year|ganzjährig|ganzes jahr|круглый год|24\/7/i.test(text)) return new Set(Array.from({ length: 12 }, (_, i) => i));
    const found: { idx: number; pos: number }[] = [];
    // Nur an Nicht-Buchstaben trennen (sonst würde z. B. "to" in "October" das Wort zerlegen)
    for (const token of text.split(/[^A-Za-zÀ-ɏЀ-ӿ]+/)) {
        if (!token) continue;
        for (const [re, idx] of MONTH_WORDS) {
            if (re.test(token)) {
                found.push({ idx, pos: found.length });
                break;
            }
        }
    }
    if (found.length === 0) return null;
    if (found.length === 1) return new Set([found[0].idx]);
    const from = found[0].idx;
    const to = found[found.length - 1].idx;
    const set = new Set<number>();
    for (let m = from; ; m = (m + 1) % 12) {
        set.add(m);
        if (m === to || set.size >= 12) break;
    }
    return set;
}

function routeText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toUpperCase() === 'NULL') return fallback;
    return trimmed;
}

function routeNum(value: unknown, fallback: number): number {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed.toUpperCase() === 'NULL') return fallback;
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
}

export default function RouteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    // GEÄNDERT: Query (z.B. ?from=/plan…) beim Login-Rücksprung mitnehmen,
    // sonst wüsste "Go back" nach dem Einloggen nicht mehr, woher man kam.
    const [currentSearch, setCurrentSearch] = useState('');
    useEffect(() => {
        setCurrentSearch(window.location.search);
    }, []);
    const loginHref = `/login?redirect=${encodeURIComponent(pathname + currentSearch)}`;

    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    // GEÄNDERT: zentraler Auth-State statt supabase.auth.getUser() (das ist ein
    // Netzwerk-Call, der bei kaputtem Token hängen bleiben kann).
    const { user } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [username, setUsername] = useState('');
    const [openStopIndex, setOpenStopIndex] = useState<number | null>(null);
    const { lang: currentLang, setLang, t } = useLanguage();
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileNavScrolled, setMobileNavScrolled] = useState(false);
    const [mobileFooterOpen, setMobileFooterOpen] = useState<'explore' | 'about' | 'support' | 'legal' | null>(null);

    const { theme } = useTheme();
    const { unit } = useUnit();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isLight = mounted && theme === 'light';

    // Kartenhöhe passend zur Bildschirmbreite
    const [mapHeight, setMapHeight] = useState(560);
    useEffect(() => {
        const update = () =>
            // Überschrift + Karte + Leiste sollen zusammen auf den Bildschirm passen (Menüleiste oben abgezogen)
            setMapHeight(window.innerWidth < 760 ? 320 : Math.round(Math.min(620, Math.max(420, window.innerHeight - 400))));
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const routeTitle = localizedRouteText(route, 'title', currentLang);
    const routeDescription = localizedRouteText(route, 'description', currentLang);
    const routeHighlightsText = localizedRouteText(route, 'route_highlights', currentLang);

    const aboutHeading = routeTitle
        ? t('routeDetail.aboutHeadingWithName').replace('{route}', routeTitle)
        : t('routeDetail.aboutHeadingNoName');

    // GEÄNDERT: Bringt der Link ein ?from= mit (z.B. vom Route Planner), führt
    // "Go back" gezielt dorthin — der Browserverlauf ist nach Weiterleitungen
    // unzuverlässig. Nur Adressen der eigenen Seite ("/…", nicht "//…"), damit
    // ein manipulierter Link nicht auf fremde Seiten umleiten kann.
    const handleBack = () => {
        if (typeof window === 'undefined') return;

        const from = new URLSearchParams(window.location.search).get('from');
        if (from && from.startsWith('/') && !from.startsWith('//')) {
            router.push(from);
            return;
        }

        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/explore');
        }
    };

    const { scrollY } = useScroll();

    const navOpacity = useTransform(scrollY, [250, 450], [0, 1]);
    const navY = useTransform(scrollY, [250, 450], [-20, 0]);
    const scrolledBgColor = isLight ? 'rgba(244,240,232,0.85)' : 'rgba(12,11,9,0.85)';
    const navBg = useTransform(scrollY, [250, 450], ['rgba(0,0,0,0)', scrolledBgColor]);
    const navBlur = useTransform(scrollY, [250, 450], ['blur(0px)', 'blur(20px)']);
    const heroY = useTransform(scrollY, [0, 1000], [0, 160]);

    const [navInteractive, setNavInteractive] = useState(false);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setNavInteractive(latest > 350);
    });

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setMobileNavScrolled(latest > 40);
    });

    useEffect(() => {
        if (!user) {
            setIsSaved(false);
            setAvatarUrl('');
            setUsername('');
            return;
        }

        // Beide Queries laufen jetzt außerhalb des Auth-Callbacks — Supabase
        // hält dort den Auth-Lock, Queries darin können die App verklemmen.
        checkIfSaved(user.id);
        fetchProfile(user.id);
    }, [user, params.id]);

    useEffect(() => {
        if (!showUserMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (!target.closest('.route-user-menu-wrap')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    useEffect(() => {
        if (!showLangMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (!target.closest('.route-lang-wrap')) {
                setShowLangMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLangMenu]);

    async function fetchProfile(userId: string) {
        const data = await safeQuery<{ avatar_url: string | null; username: string | null }>(
            supabase.from('profiles').select('avatar_url, username').eq('id', userId).single(),
            'fetchProfile'
        );
        if (data) {
            setAvatarUrl(data.avatar_url || '');
            setUsername(data.username || '');
        }
    }

    useEffect(() => {
        async function loadRoute() {
            setLoading(true);
            // GEÄNDERT: öffentlicher Client + Timeout — die Route ist öffentlich
            // lesbar und darf nicht auf den Auth-State warten müssen.
            const data = await safeQuery<Route>(
                supabasePublic
                    .from('routes')
                    .select('*')
                    .eq('id', params.id)
                    .single(),
                'loadRoute',
                10000
            );
            if (data) setRoute(data);
            setLoading(false);
        }
        loadRoute();
    }, [params.id]);

    const checkIfSaved = async (userId: string) => {
        const data = await safeQuery<{ id: string }>(
            supabase
                .from('saved_routes')
                .select('id')
                .eq('user_id', userId)
                .eq('route_id', params.id)
                .maybeSingle(),
            'checkIfSaved'
        );
        setIsSaved(!!data);
    };

    const handleSaveToggle = async () => {
        if (!user) {
            router.push(loginHref);
            return;
        }

        try {
            if (isSaved) {
                await withTimeout(
                    supabase
                        .from('saved_routes')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('route_id', params.id)
                );
                setIsSaved(false);
            } else {
                await withTimeout(
                    supabase
                        .from('saved_routes')
                        .insert([{ user_id: user.id, route_id: params.id }])
                );
                setIsSaved(true);
            }
        } catch (err) {
            console.error('handleSaveToggle failed:', err);
        }
    };

    const chapters = [1, 2, 3, 4, 5]
        .map((n) => ({ n, value: localizedRouteText(route, `chapter${n}`, currentLang) }))
        .filter((c) => c.value.trim() !== '')
        .map(({ n, value }) => {
            const lines = value.split('\n');
            const title = lines[0] ?? '';
            const rest = lines.slice(1).join('\n');
            const short = lines.length >= 3 ? (lines[1] ?? '') : rest;
            const full = lines.length >= 3 ? lines.slice(2).join('\n') : rest;
            return { key: `chapter${n}`, title, short, body: full };
        });

    const highlights: string[] = routeHighlightsText
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);


    // ------------------------------------------------------------ NEU: Daten für das Magazin-Layout
    const RA = RA_TEXT[(currentLang in RA_TEXT ? currentLang : 'en') as keyof typeof RA_TEXT];
    const txt = (field: string) => routeText(localizedRouteText(route, field, currentLang), '');
    const startPoint = routeText(route?.['start_point'], '');
    const endPoint = routeText(route?.['end_point'], '');
    const routeRegion = routeText(route?.['region'], '');
    const scoreRaw = routeNum(route?.['scenic_score'], NaN);
    const scenicScore = Number.isFinite(scoreRaw) ? Math.round(scoreRaw * 10) / 10 : null;

    // Einleitung nur aus der kurzen Beschreibung (die lange Beschreibung wird bewusst nicht genutzt):
    // erster Satz = großer Lead mit Initiale, der Rest = normaler Text darunter.
    const descClean = routeDescription.trim();
    let leadText = descClean;
    let bodyText = '';
    if (descClean) {
        const m = descClean.match(/^([\s\S]{40,260}?[.!?])\s+([\s\S]+)$/);
        if (m) {
            leadText = m[1];
            bodyText = m[2];
        } else {
            // nur ein Satz (oder sehr kurz) -> komplett als Lead
            leadText = descClean;
            bodyText = '';
        }
    }

    // Saison: erste gepflegte Angabe nehmen
    const seasonSource = [txt('access_season'), routeText(route?.['season'], ''), txt('season_timing'), routeText(route?.['best_season'], '')].find(Boolean) ?? '';
    const openMonths = parseOpenMonths(seasonSource);
    const seasonLabel = seasonSource && seasonSource.length <= 22 ? seasonSource : '';
    const closure = txt('closure_period');
    const seasonNote = [seasonSource, closure ? `${RA.closed}: ${closure}` : ''].filter(Boolean).join(' · ');

    const elevGain = routeNum(route?.['elevation_gain_m'], NaN);
    const startElev = routeNum(route?.['start_elevation_m'], NaN);
    const endElev = routeNum(route?.['end_elevation_m'], NaN);
    const factRows = [
        { label: t('routeDetail.driveTime'), value: routeText(route?.duration, '') },
        { label: t('routeDetail.distance'), value: route?.distance_km ? formatDistance(route.distance_km, unit) : '' },
        { label: t('routeDetail.elevationGainLabel'), value: Number.isFinite(elevGain) ? `${elevGain.toLocaleString()} m` : '' },
        { label: RA.startEnd, value: Number.isFinite(startElev) && Number.isFinite(endElev) ? `${startElev} → ${endElev} m` : '' },
        { label: t('routeDetail.difficultyLabel'), value: txt('difficulty') },
        { label: t('routeDetail.roadSurfaceLabel'), value: txt('road_surface') },
        { label: t('routeDetail.trafficLabel'), value: txt('traffic_level') },
        { label: t('routeDetail.tollFeeLabel'), value: txt('toll_fee') },
        { label: t('routeDetail.openingAccessLabel'), value: txt('opening_access') },
        { label: t('routeDetail.vehicleRestrictionsLabel'), value: txt('vehicle_restrictions') },
        { label: t('routeDetail.fuelServicesLabel'), value: txt('fuel_services') },
        { label: t('routeDetail.weatherAdviceLabel'), value: txt('weather_advice') },
    ].filter((r) => r.value);

    // Stopps aus chapter1–5 (+ optional chapterN_km / chapterN_elevation_m)
    const stops = chapters.map((c) => {
        const n = c.key.replace('chapter', '');
        const km = routeNum(route?.[`chapter${n}_km`], NaN);
        const elev = routeNum(route?.[`chapter${n}_elevation_m`], NaN);
        const meta = [Number.isFinite(km) ? `KM ${km}` : '', Number.isFinite(elev) ? `${elev} M` : ''].filter(Boolean).join(' · ');
        return { title: c.title, short: c.short, full: c.body || c.short, meta };
    });

    if (loading) {
        return (
            <div className="h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="w-12 h-12 border-[3px] border-[#C9A86A]/20 border-t-[#C9A86A] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

                :root {
                    --gold:  #C9A86A;
                    --serif: 'Cormorant Garamond', Georgia, serif;
                    --sans:  'Inter', system-ui, sans-serif;
                }

                .dark {
                    --bg:    #0c0b09;
                    --bg2:   #111009;
                    --bg3:   #181510;
                    --cream: #EDE5D4;
                    --muted: rgba(237,229,212,0.56);
                    --dim:   rgba(237,229,212,0.32);
                    --border:rgba(237,229,212,0.10);
                    --nav-scrolled-bg: rgba(12,11,9,0.85);
                }

                .light {
                    --bg:    #F4F0E8;
                    --bg2:   #EDE8DC;
                    --bg3:   #E5DFD0;
                    --cream: #2B2620;
                    --muted: rgba(43,38,32,0.62);
                    --dim:   rgba(43,38,32,0.38);
                    --border:rgba(43,38,32,0.12);
                    --nav-scrolled-bg: rgba(244,240,232,0.85);
                }

                .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border); box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
                .theme-switch:hover { border-color: var(--gold); }
                .theme-switch-knob { position:absolute; top:4.5px; left:2.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
                .theme-switch-knob.is-light { transform:translateX(37px); }
                .theme-switch-icon { width:14px; height:14px; }
                .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

                .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
                .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
                .nav-link:hover { color:var(--cream); }
                .nav-link:hover::after { width:100%; }
                .nav-link-active { color:var(--cream) !important; font-weight:700; }
                .light .nav-link-active { color:#2B2620 !important; text-shadow:0 1px 10px rgba(244,240,232,0.9); }

                /* ============================================================ NEU: Variante A — Editorial-Magazin */
                .ra-ey { font-size:11px; font-weight:700; letter-spacing:.38em; text-transform:uppercase; color:#A8823E; }
                .dark .ra-ey { color:var(--gold); }
                .ra-ey-light { color:#E8C987 !important; }

                .ra-hero { position:relative; width:100%; height:100vh; height:100dvh; min-height:560px; overflow:hidden; background:#14110c; }
                .ra-hero-img { position:absolute; inset:-2% 0 0; width:100%; height:104%; object-fit:cover; object-position:center 62%; }
                .ra-hero-shade { position:absolute; inset:0; background:linear-gradient(180deg, rgba(12,10,7,.45) 0%, rgba(12,10,7,0) 28%, rgba(12,10,7,0) 48%, rgba(12,10,7,.85) 100%); }
                .ra-hero-in { position:absolute; left:clamp(20px,8vw,120px); right:clamp(20px,12vw,170px); bottom:clamp(64px,9vh,96px); z-index:2; display:flex; align-items:flex-end; justify-content:space-between; gap:24px; color:#F4F0E8; }
                .ra-h1 { margin-top:14px; font-family:var(--serif); font-weight:300; font-size:clamp(54px,9.5vw,140px); line-height:.86; letter-spacing:-.03em; color:#F4F0E8; text-shadow:0 20px 60px rgba(0,0,0,.45); }
                .ra-h1 em { font-style:italic; color:#E8C987; }
                .ra-hero-sub { margin-top:18px; font-size:clamp(14px,1.2vw,16px); color:rgba(244,240,232,.82); }
                .ra-chips { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; margin-bottom:10px; }
                .ra-chips span { padding:9px 14px; border-radius:999px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.26); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); font-size:12.5px; font-weight:500; white-space:nowrap; color:#F4F0E8; }
                .ra-scroll { position:absolute; left:50%; bottom:20px; transform:translateX(-50%); z-index:2; display:flex; flex-direction:column; align-items:center; gap:10px; color:rgba(244,240,232,.8); transition:color .4s ease; }
                .ra-scroll:hover { color:#E8C987; }
                .ra-scroll-label { font-size:10px; font-weight:700; letter-spacing:.32em; text-transform:uppercase; padding-left:.32em; }
                /* Linie mit weich fließendem Lichtschweif + Pfeil, beide im selben Takt */
                .ra-scroll-track { position:relative; width:2px; height:46px; border-radius:2px; overflow:hidden; background:rgba(244,240,232,.18); }
                .ra-scroll-track i { position:absolute; left:0; top:0; width:100%; height:22px; border-radius:2px; background:linear-gradient(to bottom, rgba(232,201,135,0), #E8C987 70%, #F6E2B3); will-change:transform; animation:raScrollFlow 2.6s cubic-bezier(.45,.05,.55,.95) infinite; }
                @keyframes raScrollFlow { 0% { transform:translate3d(0,-24px,0); } 100% { transform:translate3d(0,48px,0); } }
                .ra-scroll-chev { margin-top:-6px; will-change:transform, opacity; animation:raScrollChev 2.6s cubic-bezier(.45,.05,.55,.95) infinite; }
                @keyframes raScrollChev { 0% { transform:translate3d(0,-3px,0); opacity:.35; } 55% { transform:translate3d(0,4px,0); opacity:1; } 100% { transform:translate3d(0,-3px,0); opacity:.35; } }

                .ra-back { position:relative; display:flex; align-items:center; height:64px; padding:0; background:none; border:0; cursor:pointer; }
                .ra-back-circle { position:relative; z-index:1; width:64px; height:64px; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.26); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:0 8px 32px rgba(0,0,0,.32); color:#fff; transform:translateZ(0); transition:transform .55s cubic-bezier(.22,1,.36,1), background-color .4s ease, border-color .4s ease, box-shadow .5s ease; }
                .ra-back-arrow { transition:transform .55s cubic-bezier(.22,1,.36,1), color .4s ease; }
                .ra-back-label { margin-left:12px; padding:9px 16px; border-radius:999px; background:rgba(20,18,14,.45); border:1px solid rgba(255,255,255,.2); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; font-size:10px; font-weight:800; letter-spacing:.4em; text-transform:uppercase; white-space:nowrap; pointer-events:none; opacity:0; transform:translate3d(-10px,0,0); transition:opacity .45s ease, transform .55s cubic-bezier(.22,1,.36,1); }
                .ra-back:hover .ra-back-circle { transform:scale(1.06); background-color:rgba(255,255,255,.2); border-color:rgba(232,201,135,.55); box-shadow:0 12px 36px rgba(0,0,0,.38); }
                .ra-back:hover .ra-back-arrow { transform:translate3d(-4px,0,0); color:#E8C987; }
                .ra-back:hover .ra-back-label { opacity:1; transform:translate3d(0,0,0); }
                .ra-back:active .ra-back-circle { transform:scale(.97); transition-duration:.15s; }
                .ra-back:focus-visible .ra-back-circle { outline:2px solid #E8C987; outline-offset:3px; }

                .ra-wrap { max-width:1200px; margin:0 auto; padding:clamp(64px,8vw,100px) clamp(20px,5vw,48px) 0; scroll-margin-top:90px; }
                .ra-main { max-width:820px; margin:0 auto; text-align:center; }
                .ra-lead { margin-top:22px; font-family:var(--serif); font-weight:400; font-size:clamp(25px,2.5vw,34px); line-height:1.32; color:var(--cream); }
                .ra-lead::first-letter { color:#B8914A; }
                .ra-body { margin:24px auto 0; font-size:16px; line-height:1.85; color:var(--muted); white-space:pre-line; max-width:680px; }
                .ra-quote { margin:56px 0 0; padding:34px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); text-align:center; font-family:var(--serif); font-style:italic; font-size:clamp(26px,3vw,40px); line-height:1.2; color:var(--cream); }
                .ra-quote small { display:block; margin-top:12px; font-family:var(--sans); font-style:normal; font-size:11px; letter-spacing:.3em; text-transform:uppercase; color:#B8914A; }
                .ra-season { margin-top:56px; }
                .ra-months { display:grid; grid-template-columns:repeat(12,1fr); gap:4px; margin:16px auto 0; max-width:640px; }
                .ra-months span { height:32px; border-radius:8px; display:grid; place-items:center; font-size:11px; font-weight:600; background:color-mix(in srgb, var(--cream) 6%, transparent); color:var(--dim); }
                .ra-months span.on { background:#C9A86A; color:#1A150C; }
                .ra-season-note { margin-top:12px; font-size:13.5px; color:var(--muted); }

                .ra-side { margin-top:clamp(56px,6vw,80px); }
                .ra-sheet { display:grid; grid-template-columns:300px minmax(0,1fr); gap:clamp(28px,4vw,56px); border-radius:28px; padding:clamp(26px,3vw,40px); background:#FBF8F2; border:1px solid var(--border); box-shadow:0 30px 60px rgba(60,45,20,.12); }
                .dark .ra-sheet { background:#15130e; box-shadow:0 30px 60px rgba(0,0,0,.45); }
                .ra-sheet h3 { margin:8px 0 18px; font-family:var(--serif); font-weight:400; font-size:30px; color:var(--cream); }
                .ra-score { display:flex; align-items:center; gap:16px; margin:4px 0 18px; }
                .ra-ring { --p:90%; width:74px; height:74px; flex:none; border-radius:50%; background:conic-gradient(#B8914A 0 var(--p), color-mix(in srgb, var(--cream) 9%, transparent) 0); display:grid; place-items:center; }
                .ra-ring i { width:60px; height:60px; border-radius:50%; background:#FBF8F2; display:grid; place-items:center; font-style:normal; font-family:var(--serif); font-size:26px; color:var(--cream); }
                .dark .ra-ring i { background:#15130e; }
                .ra-score b { display:block; font-size:15px; font-weight:600; color:var(--cream); }
                .ra-score span { display:block; margin-top:3px; font-size:13px; color:var(--muted); }
                .ra-sheet-head { display:flex; flex-direction:column; }
                .ra-sheet-head .ra-sheet-actions { margin-top:auto; padding-top:22px; }
                .ra-facts { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); column-gap:28px; align-content:start; }
                .ra-fact { padding:16px 0; border-top:1px solid var(--border); }
                .ra-fact span { display:block; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
                .ra-fact b { display:block; margin-top:6px; font-size:14.5px; font-weight:600; line-height:1.35; color:var(--cream); }
                .ra-sheet-actions { display:flex; gap:10px; }
                .ra-btn { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:9px; height:52px; padding:0 24px; border-radius:999px; background:#1F1A13; color:#F4F0E8 !important; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; transition:transform .25s, box-shadow .25s; }
                .ra-btn:hover { transform:translateY(-2px); box-shadow:0 14px 30px rgba(31,26,19,.25); }
                .dark .ra-btn { background:#EDE5D4; color:#1F1A13 !important; }
                .ra-btn-inline { flex:none; }
                .ra-save { width:52px; height:52px; flex:none; border-radius:50%; display:grid; place-items:center; border:1px solid var(--border); color:var(--cream); transition:border-color .2s, color .2s; }
                .ra-save:hover { border-color:#C9A86A; }
                .ra-save.is-saved { color:#e25555; border-color:rgba(226,85,85,.4); }

                .ra-sec { max-width:1200px; margin:0 auto; padding:clamp(80px,9vw,110px) clamp(20px,5vw,48px) 0; scroll-margin-top:90px; }
                .ra-sec-last { padding-bottom:clamp(80px,9vw,120px); }
                .ra-h2 { margin-top:12px; font-family:var(--serif); font-weight:300; font-size:clamp(38px,4.5vw,56px); line-height:1; letter-spacing:-.02em; color:var(--cream); }
                .ra-h2 em { font-style:italic; color:#A8823E; }
                .dark .ra-h2 em { color:#D9BE86; }
                .ra-stops { position:relative; margin-top:40px; padding-left:70px; }
                .ra-stops::before { content:""; position:absolute; left:24px; top:24px; bottom:24px; border-left:2px dashed #C9A86A; }
                .ra-stop { position:relative; border-bottom:1px solid var(--border); }
                .ra-stop-n { position:absolute; left:-70px; top:20px; width:50px; height:50px; border-radius:50%; display:grid; place-items:center; background:#1F1A13; color:#F4F0E8; font-family:var(--sans); font-size:16px; font-weight:700; z-index:1; transition:background .25s, color .25s; }
                .dark .ra-stop-n { background:#EDE5D4; color:#1F1A13; }
                .ra-stop.open .ra-stop-n { background:#C9A86A; color:#1A150C; }
                .ra-stop-head { width:100%; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 0 24px; text-align:left; }
                .ra-stop-head h4 { font-family:var(--serif); font-weight:400; font-size:clamp(24px,2.4vw,32px); line-height:1.1; color:var(--cream); }
                .ra-stop-head p { margin-top:5px; font-size:15px; color:var(--muted); }
                .ra-stop-meta { display:flex; align-items:center; gap:14px; flex:none; }
                .ra-stop-meta span { font-size:12px; font-weight:700; letter-spacing:.2em; color:#B8914A; }
                .ra-chev { color:var(--dim); transition:transform .3s; }
                .ra-stop.open .ra-chev { transform:rotate(180deg); color:#B8914A; }
                .ra-stop-full { padding:0 0 26px; max-width:760px; font-size:15px; line-height:1.8; color:var(--muted); white-space:pre-line; }

                .ra-mapc { position:relative; margin-top:28px; border-radius:28px; overflow:hidden; border:1px solid var(--border); box-shadow:0 30px 60px rgba(60,45,20,.15); }
                .dark .ra-mapc { box-shadow:0 30px 80px rgba(0,0,0,.6); }
                .ra-map { position:relative; width:100%; background:var(--bg3); }
                .ra-map iframe { display:block; }
                .ra-sec-wide { max-width:1320px; }
                .ra-sec-wide > .ra-ey, .ra-sec-wide > .ra-h2 { max-width:1104px; margin-left:auto; margin-right:auto; }
                .ra-mapbar { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:20px 24px 20px 30px; background:#FBF8F2; border-top:1px solid var(--border); }
                .dark .ra-mapbar { background:#15130e; }
                .ra-mapbar b { display:block; font-family:var(--serif); font-weight:400; font-size:26px; line-height:1.1; color:var(--cream); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .ra-mapbar span { display:block; margin-top:3px; font-size:13px; color:var(--muted); }

                @media (max-width:1023px) {
                    .ra-sheet { grid-template-columns:1fr; }
                    .ra-facts { grid-template-columns:repeat(2,minmax(0,1fr)); }
                }
                @media (max-width:520px) {
                    .ra-facts { grid-template-columns:1fr; }
                    .ra-fact { display:flex; justify-content:space-between; gap:16px; padding:13px 0; }
                    .ra-fact b { margin-top:0; text-align:right; }
                    .ra-fact span { flex:none; }
                }
                @media (max-width:760px) {
                    .ra-hero { height:100svh; min-height:520px; }
                    .ra-hero-in { flex-direction:column; align-items:flex-start; bottom:70px; }
                    .ra-chips { justify-content:flex-start; margin-bottom:0; }
                    .ra-body { columns:1; font-size:15px; }
                    .ra-sheet { padding:24px 22px 22px; border-radius:22px; gap:20px; }
                    .ra-stops { padding-left:56px; }
                    .ra-stops::before { left:18px; }
                    .ra-stop-n { left:-56px; width:38px; height:38px; font-size:14px; top:22px; }
                    .ra-stop-meta span { display:none; }
                    .ra-mapc { border-radius:22px; }
                    .ra-mapbar { flex-direction:column; align-items:stretch; padding:18px; }
                    .ra-mapbar b { font-size:22px; white-space:normal; }
                }
                @media (prefers-reduced-motion: reduce) { .ra-btn, .ra-chev, .ra-stop-n { transition:none; } .ra-scroll-track i, .ra-scroll-chev { animation:none; } .ra-back-circle, .ra-back-arrow, .ra-back-label { transition:none; } }
            `}</style>

            <div className="bg-[var(--bg)] text-[var(--cream)] font-sans selection:bg-[#C9A86A]/30 overflow-x-hidden">

                <div
                    className={`lg:hidden fixed top-0 left-0 w-full z-[70] flex items-start justify-between gap-2 px-4 h-[68px] pt-5 transition-all duration-300 ${mobileNavScrolled
                        ? 'bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-xl border-b border-[var(--border)]'
                        : 'bg-transparent border-b border-transparent'
                        }`}
                >
                    <button
                        onClick={handleBack}
                        aria-label="Zurück"
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 ${mobileNavScrolled
                            ? 'bg-[color-mix(in_srgb,var(--border)_40%,transparent)] border border-[var(--border)]'
                            : 'bg-black/35 backdrop-blur-md border border-white/20'
                            }`}
                    >
                        <ArrowLeft size={17} className={mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white'} />
                    </button>

                    <Link href="/" className="flex flex-col items-center leading-[1.15]">
                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.22em] transition-colors duration-300 ${mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>EXPLORE</span>
                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.22em] transition-colors duration-300 ${mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>SCENIC</span>
                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.22em] transition-colors duration-300 ${mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>ROUTES</span>
                    </Link>

                    <button
                        onClick={() => setShowMobileMenu(true)}
                        aria-label="Menü öffnen"
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 ${mobileNavScrolled
                            ? 'bg-[color-mix(in_srgb,var(--border)_40%,transparent)] border border-[var(--border)]'
                            : 'bg-black/35 backdrop-blur-md border border-white/20'
                            }`}
                    >
                        <Menu size={18} strokeWidth={1.8} className={mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white'} />
                    </button>
                </div>

                <div
                    className={`lg:hidden fixed inset-0 z-[400] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setShowMobileMenu(false)}
                />

                <div
                    className={`lg:hidden fixed top-1/2 left-1/2 z-[401] w-[88vw] max-w-[380px] max-h-[85vh] overflow-y-auto bg-[var(--bg)] border border-[var(--border)] rounded-[26px] shadow-[0_50px_120px_rgba(0,0,0,0.55)] p-[22px] transition-all duration-300 ${showMobileMenu ? 'opacity-100 pointer-events-auto -translate-x-1/2 -translate-y-1/2 scale-100' : 'opacity-0 pointer-events-none -translate-x-1/2 -translate-y-1/2 scale-95'
                        }`}
                >
                    <div className="flex items-center justify-between mb-[22px]">
                        <span className="text-[12px] font-extrabold tracking-[0.18em] text-[var(--cream)]">Explore SCENIC ROUTES</span>
                        <button
                            onClick={() => setShowMobileMenu(false)}
                            aria-label="Menü schließen"
                            className="w-[38px] h-[38px] rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--cream)]"
                        >
                            <X size={18} strokeWidth={1.8} />
                        </button>
                    </div>

                    {user ? (
                        <div className="border border-[var(--border)] rounded-[20px] bg-[color-mix(in_srgb,var(--bg2)_80%,transparent)] overflow-hidden">
                            <div className="px-[18px] py-5 border-b border-[var(--border)] flex items-center gap-3.5">
                                <div className="w-[46px] h-[46px] rounded-[11px] border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center overflow-hidden shrink-0">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span style={{ fontFamily: 'var(--serif)' }} className="text-[22px] font-bold text-[var(--cream)]">
                                            {username?.[0]?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p style={{ fontFamily: 'var(--serif)' }} className="text-[18px] font-light text-[var(--cream)] leading-tight truncate">
                                        {username || user.email?.split('@')[0]}
                                    </p>
                                    <p className="text-[10px] text-[var(--dim)] mt-1 truncate max-w-[180px]">{user.email}</p>
                                    <p className="text-[8px] font-extrabold tracking-[0.18em] uppercase text-[var(--gold)] mt-1 opacity-70">{t("common.roleExplorer")}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[var(--border)]">
                                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted)]">{t("common.theme")}</span>
                                <ThemeSwitch />
                            </div>

                            <div className="p-2">
                                <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[var(--dim)] px-3 pt-3.5 pb-1.5">Navigate</p>
                                <Link href="/explore" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                    {t("nav.explore")}
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>
                                <Link href="/about" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                    {t("nav.about")}
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>

                                <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[var(--dim)] px-3 pt-2.5 pb-1.5">Account</p>
                                <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><User size={14} strokeWidth={1.8} /></span>
                                    {t("nav.profile")}
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>
                                <Link href="/my-trips" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><MapIcon size={14} strokeWidth={1.8} /></span>
                                    {t("nav.myTrips")}
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>

                                <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                <button
                                    onClick={async () => {
                                        await signOutSafe();
                                        setShowMobileMenu(false);
                                        router.push('/');
                                    }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[rgba(224,128,128,0.55)]"
                                >
                                    <span className="text-[#e08080] w-[18px] flex items-center justify-center shrink-0"><LogOut size={14} strokeWidth={1.8} /></span>
                                    {t("nav.signOut")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1 mb-0">
                                {[[t("nav.explore"), '/explore'], [t("nav.planTrip"), '/plan'], [t("nav.about"), '/about']].map(([label, href]) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        onClick={() => setShowMobileMenu(false)}
                                        style={{ fontFamily: 'var(--serif)' }}
                                        className="px-1.5 py-4 text-[26px] font-light text-[var(--cream)] border-b border-[var(--border)]"
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[var(--border)]">
                                <Link
                                    href={loginHref}
                                    onClick={() => setShowMobileMenu(false)}
                                    className="px-6 py-3 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_40%,transparent)] text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--cream)]"
                                >
                                    {t("nav.login")}
                                </Link>
                                <ThemeSwitch />
                            </div>
                        </>
                    )}
                </div>

                <div className="hidden lg:block fixed top-6 left-10 z-[60]">
                    {/* NEU: sanfter Zurück-Button — nur transform/opacity werden animiert (läuft flüssig) */}
                    <button onClick={handleBack} className="ra-back" aria-label="Go back">
                        <span className="ra-back-circle">
                            <ArrowLeft size={22} strokeWidth={1.8} className="ra-back-arrow" />
                        </span>
                        <span className="ra-back-label">{t("routeDetail.back")}</span>
                    </button>
                </div>

                <motion.nav
                    style={{
                        opacity: navOpacity,
                        y: navY,
                        backgroundColor: navBg,
                        backdropFilter: navBlur,
                        fontFamily: 'var(--sans)',
                        pointerEvents: navInteractive ? 'auto' : 'none',
                    }}
                    className="hidden lg:block fixed top-0 left-0 w-full z-50 border-b border-[var(--border)]"
                >
                    <div className="max-w-screen-2xl mx-auto px-12 h-28 flex items-center justify-between">
                        <Link href="/" className="flex flex-col leading-none pl-14">
                            <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-[var(--cream)] not-italic">EXPLORE</span>
                            <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-[var(--cream)] not-italic">SCENIC</span>
                            <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-[var(--cream)] not-italic">ROUTES</span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-9">
                            <Link href="/explore" className="nav-link">{t("nav.explore")}</Link>
                            <Link href="/plan" className="nav-link">{t("nav.planTrip")}</Link>
                            <Link href="/about" className="nav-link">{t("nav.about")}</Link>
                            {user && (
                                <Link href="/my-trips" className="nav-link">
                                    {t("nav.myTrips")}
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-5">
                            {!user && <ThemeSwitch />}

                            <div className="relative route-user-menu-wrap">
                                <button
                                    onClick={() => {
                                        if (user) {
                                            setShowUserMenu((prev) => !prev);
                                        } else {
                                            router.push(loginHref);
                                        }
                                    }}
                                    aria-label="Account"
                                    className="w-12 h-12 rounded-full border-[1.5px] border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center hover:border-[var(--gold)] hover:-translate-y-0.5 transition-all duration-300 shadow-2xl overflow-hidden"
                                >
                                    {user ? (
                                        avatarUrl ? (
                                            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span
                                                style={{ fontFamily: 'var(--serif)' }}
                                                className={`text-xl font-bold ${isLight ? 'text-black' : 'text-[var(--cream)]'}`}
                                            >
                                                {username?.[0]?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )
                                    ) : (
                                        <User size={18} />
                                    )}
                                </button>

                                {showUserMenu && user && (
                                    <div className="absolute right-0 top-16 w-[290px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-[20px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.65)] backdrop-blur-[28px] z-50">
                                        <div className="p-5 border-b border-[var(--border)] flex items-center gap-4">
                                            <div className="w-[46px] h-[46px] rounded-[11px] border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center font-serif text-[22px] font-light text-[var(--cream)] overflow-hidden shrink-0">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.email?.charAt(0).toUpperCase()
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="font-serif text-[18px] font-light text-[var(--cream)] leading-tight truncate">
                                                    {username || user.email?.split('@')[0]}
                                                </p>
                                                <p className="text-[10px] text-[var(--dim)] mt-1 truncate max-w-[180px]">
                                                    {user.email}
                                                </p>
                                                <p className="text-[8px] font-extrabold tracking-[0.18em] uppercase text-[var(--gold)] mt-1 opacity-70">
                                                    {t("common.roleExplorer")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                                            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted)]">{t("common.theme")}</span>
                                            <ThemeSwitch />
                                        </div>

                                        <div className="p-2">
                                            <Link
                                                href="/profile"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><User size={14} strokeWidth={1.8} /></span>
                                                {t("nav.profile")}
                                            </Link>

                                            <Link
                                                href="/my-trips"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><MapIcon size={14} strokeWidth={1.8} /></span>
                                                {t("nav.myTrips")}
                                            </Link>

                                            <Link
                                                href="/explore"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                                {t("nav.explore")}
                                            </Link>

                                            <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                            <button
                                                onClick={async () => {
                                                    await signOutSafe();
                                                    setShowUserMenu(false);
                                                    router.push('/');
                                                }}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[rgba(224,128,128,0.55)] hover:bg-[rgba(224,128,128,0.07)] hover:text-[#e08080] transition-all"
                                            >
                                                <span className="text-[#e08080] w-[18px] flex items-center justify-center shrink-0"><LogOut size={14} strokeWidth={1.8} /></span>
                                                {t("nav.signOut")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.nav>

                {/* ============================================================ NEU: Variante A — Editorial-Magazin */}
                <section className="ra-hero">
                    <motion.img
                        src={route?.image_url}
                        alt={routeTitle}
                        className="ra-hero-img"
                        style={{ y: heroY }}
                    />
                    <div className="ra-hero-shade" />
                    <div className="ra-hero-in">
                        <div>
                            <p className="ra-ey ra-ey-light">
                                {route?.country}
                                {routeRegion ? ` · ${routeRegion}` : ''}
                            </p>
                            <h1 className="ra-h1">
                                <EditorialTitle title={routeTitle} />
                            </h1>
                            {(startPoint || endPoint) && (
                                <p className="ra-hero-sub">
                                    {startPoint}
                                    {startPoint && endPoint ? ' → ' : ''}
                                    {endPoint}
                                    {route?.distance_km ? ` · ${formatDistance(route.distance_km, unit)}` : ''}
                                </p>
                            )}
                        </div>
                        <div className="ra-chips">
                            {scenicScore !== null && <span>★ {scenicScore} / 10</span>}
                            {seasonLabel && <span>{seasonLabel}</span>}
                            {route?.duration && <span>{route.duration}</span>}
                        </div>
                    </div>
                    <a
                        href="#ra-story"
                        className="ra-scroll"
                        aria-label={t('routeDetail.scroll')}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('ra-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        <span className="ra-scroll-label">{t('routeDetail.scroll')}</span>
                        <span className="ra-scroll-track" aria-hidden="true">
                            <i />
                        </span>
                        <ChevronDown size={16} strokeWidth={1.6} className="ra-scroll-chev" aria-hidden="true" />
                    </a>
                </section>

                <section id="ra-story" className="ra-wrap">
                    <div className="ra-main">
                        <p className="ra-ey">{t('routeDetail.aboutRoute')}</p>
                        {leadText && <p className="ra-lead">{leadText}</p>}
                        {bodyText && <div className="ra-body">{bodyText}</div>}

                        {highlights[0] && highlights[0].length > 40 && (
                            <div className="ra-quote">
                                “{highlights[0]}”
                                <small>{RA.inOneLine}</small>
                            </div>
                        )}

                        {openMonths && (
                            <div className="ra-season">
                                <p className="ra-ey">{RA.whenToGo}</p>
                                <div className="ra-months">
                                    {RA.months.map((m, i) => (
                                        <span key={i} className={openMonths.has(i) ? 'on' : ''} title={RA.monthsLong[i]}>
                                            {m}
                                        </span>
                                    ))}
                                </div>
                                {seasonNote && <p className="ra-season-note">{seasonNote}</p>}
                            </div>
                        )}
                    </div>

                    <aside className="ra-side">
                        <div className="ra-sheet">
                            {/* links: Titel, Score, Aktionen */}
                            <div className="ra-sheet-head">
                                <p className="ra-ey">{RA.factSheet}</p>
                                <h3>{RA.atAGlance}</h3>
                                {scenicScore !== null && (
                                    <div className="ra-score">
                                        <div className="ra-ring" style={{ ['--p' as string]: `${Math.min(100, scenicScore * 10)}%` } as React.CSSProperties}>
                                            <i>{scenicScore}</i>
                                        </div>
                                        <div>
                                            <b>{t('routeDetail.scenicScore')}</b>
                                            <span>{scenicScore >= 9 ? RA.topRoute : RA.outOf10}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="ra-sheet-actions">
                                    <a href="#ra-map" className="ra-btn">
                                        <MapIcon size={15} strokeWidth={1.8} /> {t('routeDetail.viewMap')}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleSaveToggle}
                                        className={`ra-save ${isSaved ? 'is-saved' : ''}`}
                                        aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                                    >
                                        <Heart size={18} className={isSaved ? 'fill-current' : ''} />
                                    </button>
                                </div>
                            </div>
                            {/* rechts: alle Fakten als Raster nebeneinander */}
                            <div className="ra-facts">
                                {factRows.map((row) => (
                                    <div key={row.label} className="ra-fact">
                                        <span>{row.label}</span>
                                        <b>{row.value}</b>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>

                {stops.length > 0 && (
                    <section className="ra-sec">
                        <p className="ra-ey">{t('routeDetail.mustSeeStops')}</p>
                        <h2 className="ra-h2">
                            {RA.stopsHead[0]} <em>{RA.stopsHead[1]}</em>
                        </h2>
                        <div className="ra-stops">
                            {stops.map((stop, i) => {
                                const isOpen = openStopIndex === i;
                                const canOpen = Boolean(stop.full && stop.full !== stop.short);
                                return (
                                    <div key={stop.title + i} className={`ra-stop ${isOpen ? 'open' : ''}`}>
                                        <span className="ra-stop-n">{i + 1}</span>
                                        <button
                                            type="button"
                                            className="ra-stop-head"
                                            onClick={() => canOpen && setOpenStopIndex(isOpen ? null : i)}
                                            aria-expanded={canOpen ? isOpen : undefined}
                                            style={{ cursor: canOpen ? 'pointer' : 'default' }}
                                        >
                                            <div>
                                                <h4>{stop.title}</h4>
                                                {stop.short && <p>{stop.short}</p>}
                                            </div>
                                            <div className="ra-stop-meta">
                                                {stop.meta && <span>{stop.meta}</span>}
                                                {canOpen && <ChevronDown size={16} className="ra-chev" />}
                                            </div>
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="ra-stop-full">{stop.full}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section id="ra-map" className="ra-sec ra-sec-last ra-sec-wide">
                    <p className="ra-ey">
                        {t('routeDetail.routeWord')} {t('routeDetail.overviewWord')}
                    </p>
                    <h2 className="ra-h2">
                        {RA.roadHead[0]} <em>{RA.roadHead[1]}</em>
                    </h2>
                    <div className="ra-mapc">
                        <GoogleMapsGate height={mapHeight}>
                            <div className="ra-map" style={{ height: mapHeight }}>
                                {route?.['google_maps'] && (
                                    <iframe
                                        src={route['google_maps']}
                                        width="100%"
                                        height="100%"
                                        style={{
                                            border: 0,
                                            filter: isLight ? 'none' : 'invert(92%) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(1.4)',
                                        }}
                                        allowFullScreen
                                        loading="lazy"
                                        title="Route Map"
                                    />
                                )}
                            </div>
                        </GoogleMapsGate>
                        <div className="ra-mapbar">
                            <div className="min-w-0">
                                <b>
                                    {startPoint}
                                    {startPoint && endPoint ? ' → ' : ''}
                                    {endPoint}
                                </b>
                                <span>
                                    {t('routeDetail.oneWay')}
                                    {route?.distance_km ? ` · ${formatDistance(route.distance_km, unit)}` : ''}
                                    {route?.duration ? ` · ${route.duration}` : ''}
                                </span>
                            </div>
                            {route?.['maps_URL'] && (
                                <a href={route['maps_URL']} target="_blank" rel="noopener noreferrer" className="ra-btn ra-btn-inline">
                                    <Navigation size={14} /> {t('routeDetail.viewRoute')}
                                </a>
                            )}
                        </div>
                    </div>
                </section>

                <footer className="lg:hidden relative bg-[var(--bg)] border-t border-[var(--border)] px-5 pt-12 pb-28">
                    <div className="flex flex-col items-center text-center">
                        <img
                            src="/logodark.png"
                            alt="Scenic Routes"
                            style={{
                                width: '150px',
                                height: 'auto',
                                display: 'block',
                                filter: isLight ? 'none' : 'invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%)',
                            }}
                        />

                        <p className="text-[var(--dim)] text-[13px] leading-relaxed font-light max-w-[280px] mt-2">
                            {t("home.footer.tagline")}
                        </p>
                    </div>

                    <div className="mt-10">
                        {([
                            { key: 'explore' as const, headingKey: 'footer.col.explore' as const, linkKeys: ['footer.link.allRoutes', 'footer.link.myTrips', 'footer.link.profile'] as const },
                            { key: 'about' as const, headingKey: 'footer.col.about' as const, linkKeys: ['footer.link.travellerPass', 'footer.link.about', 'footer.link.ourTeam'] as const },
                            { key: 'support' as const, headingKey: 'footer.col.support' as const, linkKeys: ['footer.link.faq', 'footer.link.contact', 'footer.link.sendFeedback'] as const },
                            { key: 'legal' as const, headingKey: 'footer.col.legal' as const, linkKeys: ['footer.link.termsOfUse', 'footer.link.privacyPolicy', 'footer.link.imprint'] as const },
                        ]).map(({ key, headingKey, linkKeys }) => (
                            <div key={key} className="border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setMobileFooterOpen(mobileFooterOpen === key ? null : key)}
                                    className="w-full flex items-center justify-between py-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[var(--dim)]"
                                >
                                    {t(headingKey)}
                                    <ChevronDown
                                        size={14}
                                        className={`text-[var(--dim)] transition-transform duration-300 ${mobileFooterOpen === key ? 'rotate-180 text-[var(--gold)]' : ''}`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {mobileFooterOpen === key && (
                                        <motion.ul
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden space-y-3 pb-4"
                                        >
                                            {linkKeys.map(linkKey => (
                                                <li key={linkKey}>
                                                    <Link href={getFooterHref(linkKey, user)} className="text-sm text-[var(--dim)]">{t(linkKey)}</Link>
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[var(--border)] mt-2 pt-6 text-center">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--dim)]">
                            © {new Date().getFullYear()} Explore Scenic Routes. {t("home.footer.rights")}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-5">
                        <div className="relative route-lang-wrap">
                            <button
                                onClick={() => setShowLangMenu((p) => !p)}
                                className="flex items-center gap-1 h-[38px] px-3 rounded-full border-none bg-transparent text-[14px] font-normal uppercase tracking-wider text-[var(--muted)]"
                            >
                                <Globe size={17} /> {currentLang.toUpperCase()}
                            </button>

                            {showLangMenu && (
                                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 min-w-[140px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLang(lang.code);
                                                setShowLangMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2.5 text-xs font-medium ${lang.code === currentLang ? 'text-[var(--gold)] font-bold' : 'text-[var(--muted)]'
                                                }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ThemeSwitch />
                    </div>
                </footer>

                <footer className="hidden lg:block relative bg-gradient-to-b from-[var(--bg)] via-[var(--bg2)] to-[var(--bg)] border-t border-[var(--border)] overflow-hidden">
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(201,168,106,0.18) 1px, transparent 0)',
                        backgroundSize: '40px 40px',
                    }} />

                    <div className="relative max-w-7xl mx-auto px-12 pt-32 pb-16">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 pb-20 border-b border-[var(--border)]">
                            <div className="lg:col-span-4 space-y-8">

                                <Link href="/" className="flex items-center w-fit">
                                    <div style={{ width: '220px', height: '147px', display: 'flex', alignItems: 'center' }}>
                                        <img
                                            src="/logodark.png"
                                            alt="Scenic Routes"
                                            style={{
                                                width: '220px',
                                                height: 'auto',
                                                display: 'block',
                                                filter: isLight ? 'none' : 'invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
                                            }}
                                        />
                                    </div>
                                </Link>

                                <p className="text-[var(--dim)] text-sm leading-relaxed max-w-xs font-light">
                                    Curating the world's most breathtaking driving routes for those who seek the road less travelled.
                                </p>
                                <div className="flex gap-4">
                                    {['IG'].map(social => (
                                        <a key={social} href="#" aria-label={social}
                                            className="w-11 h-11 rounded-xl bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--dim)] hover:text-[var(--cream)] hover:bg-[#C9A86A]/10 hover:border-[#C9A86A]/30 transition-all duration-500 hover:scale-110">
                                            {social}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-12">
                                {[
                                    { headingKey: 'footer.col.explore' as const, linkKeys: ['footer.link.allRoutes', 'footer.link.myTrips', 'footer.link.profile'] as const },
                                    { headingKey: 'footer.col.about' as const, linkKeys: ['footer.link.travellerPass', 'footer.link.about', 'footer.link.ourTeam'] as const },
                                    { headingKey: 'footer.col.support' as const, linkKeys: ['footer.link.faq', 'footer.link.contact', 'footer.link.sendFeedback'] as const },
                                    { headingKey: 'footer.col.legal' as const, linkKeys: ['footer.link.termsOfUse', 'footer.link.privacyPolicy', 'footer.link.imprint'] as const },
                                ].map(({ headingKey, linkKeys }) => (
                                    <div key={headingKey} className="space-y-6">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">{t(headingKey)}</h4>
                                        <ul className="space-y-4">
                                            {linkKeys.map(linkKey => (
                                                <li key={linkKey}>
                                                    <Link href={getFooterHref(linkKey, user)} className="text-sm text-[var(--dim)] hover:text-[var(--cream)] hover:translate-x-1 inline-block transition-all duration-300">{t(linkKey)}</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>


                        </div>

                        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[var(--dim)]">
                            <p>© {new Date().getFullYear()} Explore Scenic Routes. {t("home.footer.rights")}</p>

                            <div className="flex items-center gap-6 flex-wrap justify-center">
                                <div className="relative route-lang-wrap">
                                    <button
                                        onClick={() => setShowLangMenu((p) => !p)}
                                        className="flex items-center gap-1.5 px-6.5 py-2 rounded-full border-none bg-transparent text-base font-normal uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--cream)] transition-colors duration-200"
                                    >
                                        <Globe size={12} strokeWidth={2} /> {currentLang.toUpperCase()}
                                    </button>

                                    {showLangMenu && (
                                        <div className="absolute bottom-[calc(100%+10px)] right-0 min-w-[150px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                                            {LANGUAGES.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => {
                                                        setLang(lang.code);
                                                        setShowLangMenu(false);
                                                    }}
                                                    className={`block w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-200 ${lang.code === currentLang
                                                        ? 'text-[var(--gold)] font-bold'
                                                        : 'text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)]'
                                                        }`}
                                                >
                                                    {lang.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <ThemeSwitch />
                            </div>
                        </div>
                        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-[#C9A86A]/25 to-transparent" />
                    </div>
                </footer>

                <div className="hidden lg:block fixed bottom-16 right-16 z-50">
                    <motion.button
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={handleSaveToggle}
                        aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                        className="p-5 bg-[var(--bg2)] border border-[var(--border)] rounded-full shadow-2xl"
                    >
                        <motion.div
                            animate={{ scale: isSaved ? [1, 1.35, 1] : 1 }}
                            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                            <Heart className={`w-8 h-8 transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-[var(--cream)]'}`} />
                        </motion.div>
                    </motion.button>
                </div>
            </div>
        </>
    );
}
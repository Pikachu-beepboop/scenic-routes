"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

function HighlightedTitle({ title }: { title: string }) {
    if (!title) return null;

    if (title.includes('(')) {
        const [main, rest] = title.split('(');
        return (
            <>
                {main}
                <span className="text-emerald-500 whitespace-nowrap ml-4">({rest}</span>
            </>
        );
    }

    const words = title.split(' ');
    const isLastWordNumber = !isNaN(Number(words[words.length - 1]));

    if (isLastWordNumber && words.length > 1) {
        const main = words.slice(0, -2).join(' ');
        const highlight = words.slice(-2).join(' ');
        return (
            <>
                {main} <span className="text-emerald-500 whitespace-nowrap">{highlight}</span>
            </>
        );
    }

    return (
        <>
            {words.slice(0, -1).join(' ')}{' '}
            <span className="text-emerald-500">{words[words.length - 1]}</span>
        </>
    );
}

function ImpressionSlideshow({
    images,
    intervalMs = 4000,
    compact = false,
}: {
    images: string[];
    intervalMs?: number;
    compact?: boolean;
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;

        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % images.length);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [images, intervalMs]);

    if (images.length === 0) return null;

    return (
        <div className={`relative w-full overflow-hidden border border-[var(--border)] shadow-2xl group ${compact ? 'h-[380px] rounded-[1.5rem]' : 'h-[600px] md:h-[680px] rounded-[2rem]'}`}>
            <AnimatePresence mode="sync">
                <motion.img
                    key={`${images[activeIndex]}-${activeIndex}`}
                    src={images[activeIndex]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Impression"
                />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {images.length > 1 && (
                <div className="absolute bottom-6 right-6 flex gap-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Bild ${i + 1} anzeigen`}
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === activeIndex ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

const DUMMY = {
    scenicScore: 9.7,
    elevationGain: 1220,
    roadSurface: 'Well Sealed',
    trafficLevel: 'Low',
    bestTimeOfDay: 'Morning',
    bestSeason: 'Nov – Apr',
    routeNotes: 'Weather can change rapidly. Allow extra time and check conditions before you go.',
    mustSeeStops: [
        { title: 'Eglinton Valley Viewpoint', desc: 'Sweeping views across the glacier-carved Eglinton Valley.' },
        { title: 'Mirror Lakes', desc: 'Short walk to serene lakes that mirror the surrounding peaks.' },
        { title: 'The Chasm', desc: 'Powerful waterfalls and dramatic rock formations.' },
        { title: 'Homer Tunnel', desc: '1.2 km tunnel carved through solid rock.' },
        { title: 'Milford Sound', desc: 'The grand finale – towering cliffs and cascading waterfalls.' },
    ],
    startElevation: 210,
    endElevation: 10,
    tollFee: 'NZD $95 per vehicle',
    accessSeason: 'Year-round',
    openingAccess: '24 hours',
    vehicleRestrictions: 'No trailers over 7.5m, no caravans',
    closurePeriod: 'Road closed in severe weather conditions',
    difficulty: 'Moderate',
    fuelServices: 'No fuel along route. Fill up in the nearest town.',
    weatherAdvice: 'Check conditions – expect rain in all seasons',
};

const HIGHLIGHT_ICONS: { match: RegExp; icon: React.ReactNode }[] = [
    { match: /alpine|mountain|scenery/i, icon: <Mountain size={22} strokeWidth={1.4} /> },
    { match: /lake|mirror/i, icon: <TreePine size={22} strokeWidth={1.4} /> },
    { match: /valley|drive|winding|road/i, icon: <RouteIcon size={22} strokeWidth={1.4} /> },
    { match: /waterfall|chasm/i, icon: <Droplets size={22} strokeWidth={1.4} /> },
    { match: /tunnel/i, icon: <Compass size={22} strokeWidth={1.4} /> },
];
function highlightIcon(label: string) {
    return HIGHLIGHT_ICONS.find((h) => h.match.test(label))?.icon ?? <Mountain size={22} strokeWidth={1.4} />;
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

function seededRng(seedStr: string) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let seed = h >>> 0;
    return function rng() {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generateProfileFractions(rng: () => number, steps: number, rising: boolean) {
    const amplitude = 0.12 + rng() * 0.14;
    const freq = 2 + rng() * 2.5;
    const phase = rng() * Math.PI * 2;

    const raw = Array.from({ length: steps }, (_, i) => {
        const base = i / (steps - 1);
        const wiggle = Math.sin(base * Math.PI * freq + phase) * amplitude * Math.sin(base * Math.PI);
        return base + wiggle;
    });

    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const norm = raw.map((v) => (v - min) / (max - min || 1));

    return rising ? norm : norm.map((v) => 1 - v);
}

function ElevationProfile({ startLabel, endLabel, startElevation, endElevation, elevationGain, waypoints, waypointElevations, seedKey, isLight }: {
    startLabel?: string; endLabel?: string; startElevation: number; endElevation: number; elevationGain: number;
    waypoints: string[]; waypointElevations: (number | undefined)[]; seedKey: string; isLight: boolean;
}) {
    const width = 400;
    const height = 90;
    const topPad = 12;
    const bottomPad = 12;

    const peakElevation = startElevation + elevationGain;
    const climbFractions = [0, 0.04, 0.14, 0.10, 0.24, 0.19, 0.36, 0.30, 0.50, 0.44, 0.63, 0.56, 0.78, 0.70, 0.90, 0.82, 1];
    const descentFractions = [1, 0.84, 0.92, 0.60, 0.68, 0.34, 0.42, 0.16, 0.06, 0];
    const climbElevations = climbFractions.map((f) => startElevation + f * elevationGain);
    const descentElevations = descentFractions.map((f) => endElevation + f * (peakElevation - endElevation));
    const elevations = [...climbElevations, ...descentElevations.slice(1)];

    const minE = Math.min(...elevations);
    const maxE = Math.max(...elevations);
    const range = maxE - minE || 1;
    const stepX = width / (elevations.length - 1);

    const points = elevations.map((e, i) => ({
        x: i * stepX,
        y: height - bottomPad - ((e - minE) / range) * (height - topPad - bottomPad),
    }));

    const smoothPath = (() => {
        let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] ?? points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] ?? p2;
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return d;
    })();

    const midIndex = Math.round(points.length * 0.42);
    const midPoint = points[midIndex];

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] px-8 py-6">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--dim)] mb-1">
                <div>
                    <p>Start</p>
                    <p className="text-[var(--cream)] text-xs font-bold mt-0.5">{startLabel}</p>
                    <p className="text-[var(--dim)] font-semibold">{startElevation} m</p>
                </div>
                <div className="text-right">
                    <p>End</p>
                    <p className="text-[var(--cream)] text-xs font-bold mt-0.5">{endLabel}</p>
                    <p className="text-[var(--dim)] font-semibold">{endElevation} m</p>
                </div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20 mt-3" preserveAspectRatio="none">
                <path d={smoothPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={points[0].x} cy={points[0].y} r="3.5" fill={isLight ? '#2B2620' : '#EDE5D4'} />
                {midPoint && (
                    <circle cx={midPoint.x} cy={midPoint.y} r="3.5" fill={isLight ? '#F4F0E8' : '#111009'} stroke="#10b981" strokeWidth="1.5" />
                )}
                <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={isLight ? '#2B2620' : '#EDE5D4'} />
            </svg>

            {waypoints.length > 0 && (
                <div className="flex justify-between mt-2 px-1">
                    {waypoints.map((w) => (
                        <span
                            key={w}
                            className="text-[10px] text-[var(--dim)] text-center px-1"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                            {w}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function RouteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [username, setUsername] = useState('');
    const [activeChapter, setActiveChapter] = useState(0);
    const [openStopIndex, setOpenStopIndex] = useState<number | null>(null);
    const { lang: currentLang, setLang, t } = useLanguage();
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileNavScrolled, setMobileNavScrolled] = useState(false);
    const [mobileFooterOpen, setMobileFooterOpen] = useState<'explore' | 'about' | 'support' | 'legal' | null>(null);
    const [mobileInfoOpen, setMobileInfoOpen] = useState<'access' | 'driving' | 'insights' | null>(null);
    const [mobileSlideIndex, setMobileSlideIndex] = useState(0);

    const { theme } = useTheme();
    const { unit } = useUnit();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isLight = mounted && theme === 'light';

    const routeTitle = localizedRouteText(route, 'title', currentLang);
    const routeDescription = localizedRouteText(route, 'description', currentLang);
    const routeHighlightsText = localizedRouteText(route, 'route_highlights', currentLang);

    const aboutHeading = routeTitle
        ? t('routeDetail.aboutHeadingWithName').replace('{route}', routeTitle)
        : t('routeDetail.aboutHeadingNoName');

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
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
    const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
    const heroOpacity = useTransform(scrollY, [0, 800], [1, 0.2]);

    const [navInteractive, setNavInteractive] = useState(false);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setNavInteractive(latest > 350);
    });

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setMobileNavScrolled(latest > 40);
    });

    useEffect(() => {
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
            if (currentUser) {
                checkIfSaved(currentUser.id);
                fetchProfile(currentUser.id);
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                checkIfSaved(currentUser.id);
                fetchProfile(currentUser.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [params.id]);

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
        const { data } = await supabase.from('profiles').select('avatar_url, username').eq('id', userId).single();
        if (data) {
            setAvatarUrl(data.avatar_url || '');
            setUsername(data.username || '');
        }
    }

    useEffect(() => {
        async function loadRoute() {
            setLoading(true);
            const { data } = await supabase
                .from('routes')
                .select('*')
                .eq('id', params.id)
                .single();
            if (data) setRoute(data as Route);
            setLoading(false);
            setActiveChapter(0);
        }
        loadRoute();
    }, [params.id]);

    const checkIfSaved = async (userId: string) => {
        const { data } = await supabase
            .from('saved_routes')
            .select('id')
            .eq('user_id', userId)
            .eq('route_id', params.id)
            .maybeSingle();
        setIsSaved(!!data);
    };

    const handleSaveToggle = async () => {
        if (!user) {
            router.push(loginHref);
            return;
        }

        if (isSaved) {
            await supabase
                .from('saved_routes')
                .delete()
                .eq('user_id', user.id)
                .eq('route_id', params.id);
            setIsSaved(false);
        } else {
            await supabase
                .from('saved_routes')
                .insert([{ user_id: user.id, route_id: params.id }]);
            setIsSaved(true);
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

    const impressionImages: string[] = (() => {
        if (!route) return [];

        const numbered = Object.entries(route)
            .filter(([key, value]) => /^image\d+$/.test(key) && typeof value === 'string' && (value as string).trim() !== '')
            .sort(([a], [b]) => {
                const numA = parseInt(a.replace('image', ''), 10);
                const numB = parseInt(b.replace('image', ''), 10);
                return numA - numB;
            })
            .map(([, value]) => value as string);

        if (numbered.length > 0) return numbered;
        if (route.image_url) return [route.image_url];

        return [];
    })();

    if (loading) {
        return (
            <div className="h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="w-12 h-12 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
            `}</style>

            <div className="bg-[var(--bg)] text-[var(--cream)] font-sans selection:bg-emerald-500/30 overflow-x-hidden">

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
                                        await supabase.auth.signOut();
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
                                {[[t("nav.explore"), '/explore'], [t("nav.about"), '/about']].map(([label, href]) => (
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
                    <button
                        onClick={handleBack}
                        className="group relative flex items-center justify-center w-16 h-16 transition-all duration-500"
                        aria-label="Go back"
                    >
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-700 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-emerald-400/50" />
                        <ArrowLeft
                            size={24}
                            className="relative text-white group-hover:text-emerald-400 group-hover:-translate-x-1.5 transition-all duration-500 ease-out"
                        />
                        <span className="absolute left-20 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none whitespace-nowrap bg-black/40 text-white backdrop-blur-md px-4 py-2 rounded-full border border-white/25">
                            {t("routeDetail.back")}
                        </span>
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
                                                    await supabase.auth.signOut();
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

                <section className="lg:hidden">
                    <div className="relative w-full h-[560px] overflow-hidden">
                        <img
                            src={route?.image_url}
                            alt={routeTitle}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />
                    </div>

                    <div className="px-5 pt-5 pb-6 space-y-5">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-[var(--cream)]">
                                <HighlightedTitle title={routeTitle} />
                            </h1>
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                                <MapPin size={12} /> {route?.country}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl px-5 py-5">
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <Clock size={16} className="text-[var(--dim)]" /> {route?.duration}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <RouteIcon size={16} className="text-[var(--dim)]" /> {formatDistance(route?.distance_km, unit)}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)] truncate">
                                <MapPin size={16} className="text-[var(--dim)]" /> {route?.country}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <Star size={14} className="fill-emerald-500 text-emerald-500" /> 4.8 {t("routeDetail.rating")}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href="#route-map-mobile"
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[13px] font-bold uppercase tracking-[0.1em] active:scale-[0.98] transition-transform"
                            >
                                <MapIcon size={15} strokeWidth={1.8} /> {t("routeDetail.viewMap")}
                            </a>

                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={handleSaveToggle}
                                aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                                className="w-[52px] h-[52px] shrink-0 rounded-full border border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Heart className={`w-5 h-5 transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-emerald-400'}`} />
                            </motion.button>
                        </div>
                    </div>
                </section>

                <section className="hidden lg:block relative h-screen w-full overflow-hidden">
                    <img
                        src={route?.image_url}
                        alt={routeTitle}
                        className="w-full h-full object-cover object-[center_75%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                    <div className="absolute bottom-24 left-0 w-full pl-16 pr-12">
                        <div className="flex items-end justify-between">
                            <div>
                                <h1 className="text-7xl lg:text-8xl font-black italic uppercase leading-[0.9] tracking-tighter text-white drop-shadow-2xl">
                                    <HighlightedTitle title={routeTitle} />
                                </h1>
                                <div className="mt-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                                        {t("routeDetail.scroll")}
                                    </span>
                                    <motion.div
                                        animate={{ y: [0, 4, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                                    >
                                        <ChevronDown size={14} className="text-white/70" />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="hidden lg:block w-full bg-[var(--bg)] border-b border-[var(--border)]">
                    <div className="max-w-7xl mx-auto px-12 py-8 flex items-center justify-between gap-8">
                        <div className="grid grid-cols-5 gap-8 flex-1">
                            {[
                                { icon: <Clock size={18} strokeWidth={1.4} />, label: t("routeDetail.driveTime"), value: route?.duration },
                                { icon: <Navigation size={18} strokeWidth={1.4} />, label: t("routeDetail.distance"), value: formatDistance(route?.distance_km, unit) },
                                { icon: <Globe size={18} strokeWidth={1.4} />, label: t("routeDetail.country"), value: route?.country },
                                { icon: <MapPin size={18} strokeWidth={1.4} />, label: t("routeDetail.bestSeason"), value: routeText(route?.['season'], DUMMY.bestSeason) },
                                { icon: <Star size={18} strokeWidth={1.4} />, label: t("routeDetail.scenicScore"), value: `${routeNum(route?.['scenic_score'], DUMMY.scenicScore)} / 10`, accent: true },
                            ].map(({ icon, label, value, accent }, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="text-[var(--dim)] mt-0.5">{icon}</span>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--dim)]">{label}</p>
                                        <p className={`text-lg font-bold mt-0.5 ${accent ? 'text-emerald-500' : 'text-[var(--cream)]'}`}>{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <a
                            href="#route-map-desktop"
                            className="shrink-0 flex items-center gap-2 border border-emerald-500/50 text-emerald-500 font-bold text-[11px] uppercase tracking-[0.12em] px-6 py-3 rounded-full hover:bg-emerald-500 hover:text-black transition-colors"
                        >
                            <MapIcon size={15} strokeWidth={1.8} /> {t("routeDetail.viewMap")}
                        </a>
                    </div>
                </div>

                <section className="hidden lg:block max-w-7xl mx-auto px-12 py-24">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-500">{t("routeDetail.aboutRoute")}</p>
                                <div className="h-px w-10 bg-emerald-500/50" />
                            </div>
                            <h2 className="text-5xl font-serif text-[var(--cream)] leading-tight">
                                {aboutHeading}
                            </h2>
                        </div>
                        <p className="text-lg leading-relaxed text-[var(--muted)] font-light max-w-3xl">
                            {routeDescription}
                        </p>

                        <div className="grid grid-cols-3 gap-8 pt-4">
                            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg2)] p-7 flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                        <Ticket size={20} strokeWidth={1.4} />
                                    </span>
                                    <h3 className="font-serif text-xl text-[var(--cream)]">{t("routeDetail.accessFeesTitle")}</h3>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {[
                                        { icon: <Ticket size={15} strokeWidth={1.6} />, label: t("routeDetail.tollFeeLabel"), value: routeText(localizedRouteText(route, 'toll_fee', currentLang), DUMMY.tollFee) },
                                        { icon: <Sun size={15} strokeWidth={1.6} />, label: t("routeDetail.accessSeasonLabel"), value: routeText(route?.['access_season'], DUMMY.accessSeason) },
                                        { icon: <Clock size={15} strokeWidth={1.6} />, label: t("routeDetail.openingAccessLabel"), value: routeText(localizedRouteText(route, 'opening_access', currentLang), DUMMY.openingAccess) },
                                        { icon: <Car size={15} strokeWidth={1.6} />, label: t("routeDetail.vehicleRestrictionsLabel"), value: routeText(localizedRouteText(route, 'vehicle_restrictions', currentLang), DUMMY.vehicleRestrictions) },
                                        { icon: <Clock size={15} strokeWidth={1.6} />, label: t("routeDetail.closurePeriodLabel"), value: routeText(localizedRouteText(route, 'closure_period', currentLang), DUMMY.closurePeriod) },
                                    ].map(({ icon, label, value }) => (
                                        <div key={label} className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                                            <span className="text-[var(--dim)] mt-0.5 shrink-0">{icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-[var(--dim)]">{label}</p>
                                                <p className="text-sm font-semibold text-[var(--cream)] mt-0.5">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg2)] p-7 flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                        <Car size={20} strokeWidth={1.4} />
                                    </span>
                                    <h3 className="font-serif text-xl text-[var(--cream)]">{t("routeDetail.drivingNotesTitle")}</h3>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {[
                                        { icon: <RouteIcon size={15} strokeWidth={1.6} />, label: t("routeDetail.roadSurfaceLabel"), value: routeText(localizedRouteText(route, 'road_surface', currentLang), DUMMY.roadSurface) },
                                        { icon: <Gauge size={15} strokeWidth={1.6} />, label: t("routeDetail.difficultyLabel"), value: routeText(localizedRouteText(route, 'difficulty', currentLang), DUMMY.difficulty) },
                                        { icon: <Users size={15} strokeWidth={1.6} />, label: t("routeDetail.trafficLabel"), value: routeText(localizedRouteText(route, 'traffic_level', currentLang), DUMMY.trafficLevel) },
                                        { icon: <Fuel size={15} strokeWidth={1.6} />, label: t("routeDetail.fuelServicesLabel"), value: routeText(localizedRouteText(route, 'fuel_services', currentLang), DUMMY.fuelServices) },
                                    ].map(({ icon, label, value }) => (
                                        <div key={label} className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                                            <span className="text-[var(--dim)] mt-0.5 shrink-0">{icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-[var(--dim)]">{label}</p>
                                                <p className="text-sm font-semibold text-[var(--cream)] mt-0.5">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg2)] overflow-hidden flex flex-col">
                                <div className="p-7 relative">
                                    <span className="absolute top-0 right-6 w-8 h-10 bg-emerald-500 flex items-start justify-center pt-2" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}>
                                        <Star size={13} className="text-black fill-black" />
                                    </span>

                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                            <Mountain size={20} strokeWidth={1.4} />
                                        </span>
                                        <div>
                                            <h3 className="font-serif text-xl text-[var(--cream)] leading-tight">{t("routeDetail.routeInsightsTitle")}</h3>
                                            <p className="text-xs text-[var(--dim)] mt-0.5">{routeTitle}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                                            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                                <Star size={14} strokeWidth={1.6} className="text-[var(--dim)]" /> {t("routeDetail.scenicScore")}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={12}
                                                        className={i < Math.round((routeNum(route?.['scenic_score'], DUMMY.scenicScore)) / 2) ? 'fill-emerald-500 text-emerald-500' : 'text-[var(--border)]'}
                                                    />
                                                ))}
                                                <span className="text-xs font-bold text-[var(--cream)] ml-1">
                                                    {((routeNum(route?.['scenic_score'], DUMMY.scenicScore)) / 2).toFixed(1)} / 5
                                                </span>
                                            </span>
                                        </div>
                                        {[
                                            { icon: <Mountain size={14} strokeWidth={1.6} />, label: t("routeDetail.elevationGainLabel"), value: `${routeNum(route?.['elevation_gain_m'], DUMMY.elevationGain)} m` },
                                            { icon: <RouteIcon size={14} strokeWidth={1.6} />, label: t("routeDetail.roadSurfaceLabel"), value: routeText(localizedRouteText(route, 'road_surface', currentLang), DUMMY.roadSurface) },
                                            { icon: <Users size={14} strokeWidth={1.6} />, label: t("routeDetail.trafficLabel"), value: routeText(localizedRouteText(route, 'traffic_level', currentLang), DUMMY.trafficLevel) },
                                            { icon: <CloudRain size={14} strokeWidth={1.6} />, label: t("routeDetail.weatherAdviceLabel"), value: routeText(localizedRouteText(route, 'weather_advice', currentLang), DUMMY.weatherAdvice) },
                                        ].map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-center justify-between text-sm border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                                                <span className="flex items-center gap-2 text-[var(--muted)]">
                                                    <span className="text-[var(--dim)]">{icon}</span> {label}
                                                </span>
                                                <span className="font-bold text-[var(--cream)]">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="route-map-desktop" className="hidden lg:block max-w-7xl mx-auto px-12 pb-24 scroll-mt-32">
                    <div className="space-y-4 mb-8">
                        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--dim)]">
                            {t("routeDetail.routeWord")} {t("routeDetail.overviewWord")}
                        </p>
                        <h2 className="text-5xl font-serif italic text-[var(--cream)] leading-tight">
                            {t("routeDetail.routeWord")} <span className="text-emerald-500">{t("routeDetail.overviewWord")}</span>
                        </h2>
                    </div>

                    <div className={`rounded-[2rem] overflow-hidden ${isLight ? 'border border-[var(--border)] shadow-[0_20px_60px_rgba(43,38,32,0.12)]' : 'shadow-[0_30px_100px_rgba(0,0,0,0.8)]'}`}>
                        <GoogleMapsGate height={620}>
                            <div className={`relative h-[620px] w-full overflow-hidden ${isLight ? 'bg-[#e8e8e3]' : 'bg-[#0b1220]'}`}>
                                {route?.['google_maps'] && (
                                    <iframe
                                        src={route['google_maps']}
                                        width="100%"
                                        height="100%"
                                        style={{
                                            border: 0,
                                            filter: isLight
                                                ? 'none'
                                                : 'invert(92%) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(1.4)',
                                        }}
                                        allowFullScreen
                                        loading="lazy"
                                        title="Route Map"
                                        className="w-full h-full outline-none border-none"
                                    />
                                )}

                                {!isLight && (
                                    <>
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b1220]/50 via-transparent to-[#0b1220]/40" />
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0b1220]/30 via-transparent to-[#0b1220]/30" />
                                    </>
                                )}
                            </div>
                        </GoogleMapsGate>

                        <div className={`flex items-center justify-between gap-6 px-8 py-7 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0d1626]'}`}>
                            <div className="space-y-1.5 min-w-0">
                                <p className={`font-bold text-lg md:text-xl truncate ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
                                    {route?.['start_point']}
                                    <span className="text-emerald-500 mx-2">→</span>
                                    {route?.['end_point']}
                                </p>
                                <p className={`text-xs md:text-sm flex items-center gap-2 flex-wrap ${isLight ? 'text-[#6b6b6b]' : 'text-zinc-400'}`}>
                                    <span className="text-emerald-500">{t("routeDetail.oneWay")}</span>
                                    <span className="opacity-40">·</span>
                                    <span>{formatDistance(route?.distance_km, unit)}</span>
                                </p>
                            </div>

                            <a
                                href={route?.['maps_URL']}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`shrink-0 flex items-center gap-2 font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-lg hover:bg-emerald-400 hover:text-black ${isLight ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                            >
                                <Navigation size={14} />
                                {t("routeDetail.viewRoute")}
                            </a>
                        </div>
                    </div>
                </section>

                <section className="hidden lg:block max-w-7xl mx-auto px-12 pb-24">
                    <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--dim)] mb-8">{t("routeDetail.mustSeeStops")}</p>
                    <div className="border border-[var(--border)] rounded-[1.5rem] overflow-hidden">
                        {(chapters.length > 0
                            ? chapters.map((c) => ({ title: c.title, short: c.short, full: c.body || c.short }))
                            : DUMMY.mustSeeStops.map((s) => ({ title: s.title, short: s.desc, full: s.desc }))
                        ).map((stop, i) => {
                            const isOpen = openStopIndex === i;
                            return (
                                <div key={stop.title + i} className={i !== 0 ? 'border-t border-[var(--border)]' : ''}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenStopIndex(isOpen ? null : i)}
                                        className="w-full flex items-center gap-6 px-8 py-5 text-left"
                                    >
                                        <span className="text-emerald-500 font-bold text-sm w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <span className="font-bold text-[var(--cream)] w-56 shrink-0">{stop.title}</span>
                                        <span className="text-sm text-[var(--muted)] font-light flex-1 truncate">{stop.short}</span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-[var(--dim)] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="px-8 pb-6 pl-[104px] text-sm text-[var(--muted)] font-light leading-relaxed whitespace-pre-line">
                                                    {stop.full}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="lg:hidden px-5 pt-10 pb-8 space-y-8">
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-500">{t("routeDetail.aboutRoute")}</p>
                            <div className="h-px w-8 bg-emerald-500/50" />
                        </div>
                        <h2 className="text-[26px] leading-[1.1] font-serif text-[var(--cream)]">
                            {aboutHeading}
                        </h2>
                    </div>

                    <p className="text-[13px] leading-relaxed text-[var(--muted)] font-light">
                        {routeDescription}
                    </p>
                </section>

                <section className="lg:hidden px-5 pb-10 space-y-5">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
                        <button
                            type="button"
                            onClick={() => setMobileInfoOpen(mobileInfoOpen === 'access' ? null : 'access')}
                            className="w-full flex items-center gap-3"
                        >
                            <span className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                <Ticket size={17} strokeWidth={1.4} />
                            </span>
                            <h3 className="font-serif text-lg text-[var(--cream)] flex-1 text-left">{t("routeDetail.accessFeesTitle")}</h3>
                            <ChevronDown
                                size={17}
                                className={`text-[var(--dim)] shrink-0 transition-transform duration-300 ${mobileInfoOpen === 'access' ? 'rotate-180 text-emerald-500' : ''}`}
                            />
                        </button>
                        <AnimatePresence>
                            {mobileInfoOpen === 'access' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 pt-4">
                                        {[
                                            { icon: <Ticket size={13} strokeWidth={1.6} />, label: t("routeDetail.tollFeeLabel"), value: routeText(localizedRouteText(route, 'toll_fee', currentLang), DUMMY.tollFee) },
                                            { icon: <Sun size={13} strokeWidth={1.6} />, label: t("routeDetail.accessSeasonLabel"), value: routeText(route?.['access_season'], DUMMY.accessSeason) },
                                            { icon: <Clock size={13} strokeWidth={1.6} />, label: t("routeDetail.openingAccessLabel"), value: routeText(localizedRouteText(route, 'opening_access', currentLang), DUMMY.openingAccess) },
                                            { icon: <Car size={13} strokeWidth={1.6} />, label: t("routeDetail.vehicleRestrictionsLabel"), value: routeText(localizedRouteText(route, 'vehicle_restrictions', currentLang), DUMMY.vehicleRestrictions) },
                                            { icon: <Clock size={13} strokeWidth={1.6} />, label: t("routeDetail.closurePeriodLabel"), value: routeText(localizedRouteText(route, 'closure_period', currentLang), DUMMY.closurePeriod) },
                                        ].map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-start gap-2.5 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
                                                <span className="text-[var(--dim)] mt-0.5 shrink-0">{icon}</span>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-[var(--dim)]">{label}</p>
                                                    <p className="text-[12.5px] font-semibold text-[var(--cream)] mt-0.5">{value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
                        <button
                            type="button"
                            onClick={() => setMobileInfoOpen(mobileInfoOpen === 'driving' ? null : 'driving')}
                            className="w-full flex items-center gap-3"
                        >
                            <span className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                <Car size={17} strokeWidth={1.4} />
                            </span>
                            <h3 className="font-serif text-lg text-[var(--cream)] flex-1 text-left">{t("routeDetail.drivingNotesTitle")}</h3>
                            <ChevronDown
                                size={17}
                                className={`text-[var(--dim)] shrink-0 transition-transform duration-300 ${mobileInfoOpen === 'driving' ? 'rotate-180 text-emerald-500' : ''}`}
                            />
                        </button>
                        <AnimatePresence>
                            {mobileInfoOpen === 'driving' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 pt-4">
                                        {[
                                            { icon: <RouteIcon size={13} strokeWidth={1.6} />, label: t("routeDetail.roadSurfaceLabel"), value: routeText(localizedRouteText(route, 'road_surface', currentLang), DUMMY.roadSurface) },
                                            { icon: <Gauge size={13} strokeWidth={1.6} />, label: t("routeDetail.difficultyLabel"), value: routeText(localizedRouteText(route, 'difficulty', currentLang), DUMMY.difficulty) },
                                            { icon: <Users size={13} strokeWidth={1.6} />, label: t("routeDetail.trafficLabel"), value: routeText(localizedRouteText(route, 'traffic_level', currentLang), DUMMY.trafficLevel) },
                                            { icon: <Fuel size={13} strokeWidth={1.6} />, label: t("routeDetail.fuelServicesLabel"), value: routeText(localizedRouteText(route, 'fuel_services', currentLang), DUMMY.fuelServices) },
                                        ].map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-start gap-2.5 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
                                                <span className="text-[var(--dim)] mt-0.5 shrink-0">{icon}</span>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-[var(--dim)]">{label}</p>
                                                    <p className="text-[12.5px] font-semibold text-[var(--cream)] mt-0.5">{value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5 relative">
                        <span className="absolute top-0 right-5 w-7 h-9 bg-emerald-500 flex items-start justify-center pt-1.5" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}>
                            <Star size={11} className="text-black fill-black" />
                        </span>

                        <button
                            type="button"
                            onClick={() => setMobileInfoOpen(mobileInfoOpen === 'insights' ? null : 'insights')}
                            className="w-full flex items-center gap-3"
                        >
                            <span className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)] flex items-center justify-center text-[var(--cream)] shrink-0">
                                <Mountain size={17} strokeWidth={1.4} />
                            </span>
                            <div className="flex-1 text-left">
                                <h3 className="font-serif text-lg text-[var(--cream)] leading-tight">{t("routeDetail.routeInsightsTitle")}</h3>
                                <p className="text-[11px] text-[var(--dim)] mt-0.5">{routeTitle}</p>
                            </div>
                            <ChevronDown
                                size={17}
                                className={`text-[var(--dim)] shrink-0 transition-transform duration-300 ${mobileInfoOpen === 'insights' ? 'rotate-180 text-emerald-500' : ''}`}
                            />
                        </button>

                        <AnimatePresence>
                            {mobileInfoOpen === 'insights' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 pt-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                            <span className="flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                                                <Star size={13} strokeWidth={1.6} className="text-[var(--dim)]" /> {t("routeDetail.scenicScore")}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={11}
                                                        className={i < Math.round((routeNum(route?.['scenic_score'], DUMMY.scenicScore)) / 2) ? 'fill-emerald-500 text-emerald-500' : 'text-[var(--border)]'}
                                                    />
                                                ))}
                                                <span className="text-[11px] font-bold text-[var(--cream)] ml-1">
                                                    {((routeNum(route?.['scenic_score'], DUMMY.scenicScore)) / 2).toFixed(1)} / 5
                                                </span>
                                            </span>
                                        </div>
                                        {[
                                            { icon: <Mountain size={13} strokeWidth={1.6} />, label: t("routeDetail.elevationGainLabel"), value: `${routeNum(route?.['elevation_gain_m'], DUMMY.elevationGain)} m` },
                                            { icon: <RouteIcon size={13} strokeWidth={1.6} />, label: t("routeDetail.roadSurfaceLabel"), value: routeText(localizedRouteText(route, 'road_surface', currentLang), DUMMY.roadSurface) },
                                            { icon: <Users size={13} strokeWidth={1.6} />, label: t("routeDetail.trafficLabel"), value: routeText(localizedRouteText(route, 'traffic_level', currentLang), DUMMY.trafficLevel) },
                                            { icon: <CloudRain size={13} strokeWidth={1.6} />, label: t("routeDetail.weatherAdviceLabel"), value: routeText(localizedRouteText(route, 'weather_advice', currentLang), DUMMY.weatherAdvice) },
                                        ].map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-center justify-between text-[12.5px] border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                                                <span className="flex items-center gap-2 text-[var(--muted)]">
                                                    <span className="text-[var(--dim)]">{icon}</span> {label}
                                                </span>
                                                <span className="font-bold text-[var(--cream)]">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <section id="route-map-mobile" className="lg:hidden px-5 pt-4 pb-10 scroll-mt-20">
                    <div className="space-y-3 mb-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--dim)]">{t("routeDetail.navigationLabel")}</p>
                        <h2 className="text-[26px] font-serif italic text-[var(--cream)] leading-tight">
                            {t("routeDetail.routeWord")} <span className="text-emerald-500">{t("routeDetail.overviewWord")}</span>
                        </h2>
                        <div className="h-px w-14 bg-emerald-500/40" />
                    </div>

                    <div className={`rounded-2xl overflow-hidden ${isLight ? 'border border-[var(--border)] shadow-[0_16px_40px_rgba(43,38,32,0.10)]' : 'shadow-[0_20px_60px_rgba(0,0,0,0.7)]'}`}>
                        <GoogleMapsGate height={230}>
                            <div className={`relative h-[230px] w-full overflow-hidden ${isLight ? 'bg-[#e8e8e3]' : 'bg-[#0b1220]'}`}>
                                {route?.['google_maps'] && (
                                    <iframe
                                        src={route['google_maps']}
                                        width="100%"
                                        height="100%"
                                        style={{
                                            border: 0,
                                            filter: isLight
                                                ? 'none'
                                                : 'invert(92%) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(1.4)',
                                        }}
                                        allowFullScreen
                                        loading="lazy"
                                        title="Route Map"
                                        className="w-full h-full outline-none border-none"
                                    />
                                )}

                                {!isLight && (
                                    <>
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b1220]/50 via-transparent to-[#0b1220]/40" />
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0b1220]/30 via-transparent to-[#0b1220]/30" />
                                    </>
                                )}
                            </div>
                        </GoogleMapsGate>

                        <div className={`flex items-center justify-between gap-3 px-4 py-4 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0d1626]'}`}>
                            <div className="space-y-1 min-w-0">
                                <p className={`font-bold text-sm truncate ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
                                    {route?.['start_point']}
                                    <span className="text-emerald-500 mx-1.5">→</span>
                                    {route?.['end_point']}
                                </p>
                                <p className={`text-[11px] flex items-center gap-1.5 flex-wrap ${isLight ? 'text-[#6b6b6b]' : 'text-zinc-400'}`}>
                                    <span className="text-emerald-500">{formatDistance(route?.distance_km, unit)}</span>
                                    <span className="opacity-40">·</span>
                                    <span>{route?.duration}</span>
                                </p>
                            </div>

                            <a
                                href={route?.['maps_URL']}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`shrink-0 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-full active:scale-95 transition-transform ${isLight ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                            >
                                <ArrowRight size={13} />
                                {t("routeDetail.routeWord")}
                            </a>
                        </div>
                    </div>
                </section>

                <section className="lg:hidden px-5 pt-8 pb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--dim)] mb-4">{t("routeDetail.mustSeeStops")}</p>
                    <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
                        {(chapters.length > 0
                            ? chapters.map((c) => ({ title: c.title, short: c.short, full: c.body || c.short }))
                            : DUMMY.mustSeeStops.map((s) => ({ title: s.title, short: s.desc, full: s.desc }))
                        ).map((stop, i) => {
                            const isOpen = openStopIndex === i;
                            return (
                                <div key={stop.title + i} className={i !== 0 ? 'border-t border-[var(--border)]' : ''}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenStopIndex(isOpen ? null : i)}
                                        className="w-full flex items-start gap-3 px-4 py-4 text-left"
                                    >
                                        <span className="text-emerald-500 font-bold text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-[var(--cream)] text-[13px]">{stop.title}</p>
                                            <p className="text-[12px] text-[var(--muted)] font-light truncate">{stop.short}</p>
                                        </div>
                                        <ChevronDown
                                            size={15}
                                            className={`text-[var(--dim)] shrink-0 mt-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="px-4 pb-4 pl-[38px] text-[12.5px] text-[var(--muted)] font-light leading-relaxed whitespace-pre-line">
                                                    {stop.full}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
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
                                            className={`block w-full text-left px-4 py-2.5 text-xs font-medium ${lang.code === currentLang ? 'text-emerald-500 font-bold' : 'text-[var(--muted)]'
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
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(16,185,129,0.15) 1px, transparent 0)',
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
                                            className="w-11 h-11 rounded-xl bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--dim)] hover:text-[var(--cream)] hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 hover:scale-110">
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
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">{t(headingKey)}</h4>
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
                                                        ? 'text-emerald-500 font-bold'
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
                        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
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
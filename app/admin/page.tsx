"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

// ---------- Auth ----------

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// ---------- Types ----------

type ExistingRoute = { id: string; title_en: string | null; title: string | null; country: string };
type UpdateResultItem = { title: string; country: string };
type NewRouteItem = { row: any; include: boolean };

type RouteListItem = {
  id: string;
  title_en: string;
  title_de: string | null;
  title_ru: string | null;
  country: string;
  distance_km: number | null;
  season: string | null;
  featured: boolean | null;
  featured_order: number | null;
};

type RouteForm = {
  title_en: string;
  title_de: string;
  title_ru: string;
  country: string;
  description_en: string;
  description_de: string;
  description_ru: string;
  long_description_en: string;
  long_description_de: string;
  long_description_ru: string;
  duration: string;
  distance_km: string;
  image_url: string;
  season: string;
  start_point: string;
  end_point: string;
  route_highlights_en: string;
  route_highlights_de: string;
  route_highlights_ru: string;
  maps_URL: string;
  chapter1_en: string;
  chapter1_de: string;
  chapter1_ru: string;
  chapter2_en: string;
  chapter2_de: string;
  chapter2_ru: string;
  chapter3_en: string;
  chapter3_de: string;
  chapter3_ru: string;
  chapter4_en: string;
  chapter4_de: string;
  chapter4_ru: string;
  chapter5_en: string;
  chapter5_de: string;
  chapter5_ru: string;
  google_maps: string;
  image1: string;
  image2: string;
  image3: string;
  image4: string;
  image5: string;
  toll_fee_en: string;
  toll_fee_de: string;
  toll_fee_ru: string;
  access_season: string;
  opening_access_en: string;
  opening_access_de: string;
  opening_access_ru: string;
  vehicle_restrictions_en: string;
  vehicle_restrictions_de: string;
  vehicle_restrictions_ru: string;
  closure_period_en: string;
  closure_period_de: string;
  closure_period_ru: string;
  road_surface_en: string;
  road_surface_de: string;
  road_surface_ru: string;
  difficulty_en: string;
  difficulty_de: string;
  difficulty_ru: string;
  traffic_level_en: string;
  traffic_level_de: string;
  traffic_level_ru: string;
  fuel_services_en: string;
  fuel_services_de: string;
  fuel_services_ru: string;
  weather_advice_en: string;
  weather_advice_de: string;
  weather_advice_ru: string;
  scenic_score: string;
  elevation_gain_m: string;
};

const emptyForm: RouteForm = {
  title_en: '', title_de: '', title_ru: '', country: '',
  description_en: '', description_de: '', description_ru: '',
  long_description_en: '', long_description_de: '', long_description_ru: '',
  duration: '', distance_km: '', image_url: '', season: '', start_point: '', end_point: '',
  route_highlights_en: '', route_highlights_de: '', route_highlights_ru: '', maps_URL: '',
  chapter1_en: '', chapter1_de: '', chapter1_ru: '',
  chapter2_en: '', chapter2_de: '', chapter2_ru: '',
  chapter3_en: '', chapter3_de: '', chapter3_ru: '',
  chapter4_en: '', chapter4_de: '', chapter4_ru: '',
  chapter5_en: '', chapter5_de: '', chapter5_ru: '',
  google_maps: '', image1: '', image2: '', image3: '',
  image4: '', image5: '',
  toll_fee_en: '', toll_fee_de: '', toll_fee_ru: '', access_season: '',
  opening_access_en: '', opening_access_de: '', opening_access_ru: '',
  vehicle_restrictions_en: '', vehicle_restrictions_de: '', vehicle_restrictions_ru: '',
  closure_period_en: '', closure_period_de: '', closure_period_ru: '',
  road_surface_en: '', road_surface_de: '', road_surface_ru: '',
  difficulty_en: '', difficulty_de: '', difficulty_ru: '',
  traffic_level_en: '', traffic_level_de: '', traffic_level_ru: '',
  fuel_services_en: '', fuel_services_de: '', fuel_services_ru: '',
  weather_advice_en: '', weather_advice_de: '', weather_advice_ru: '',
  scenic_score: '', elevation_gain_m: '',
};

// Bilingual/Trilingual: title_en/title_de/title_ru bleiben oben im Formular als eigenes
// Feldtrio, werden separat gerendert statt über shortFields/longFields (siehe JSX weiter unten).
const shortFields: (keyof RouteForm)[] = [
  'duration', 'distance_km', 'image_url', 'season',
  'start_point', 'end_point', 'maps_URL', 'google_maps',
  'image1', 'image2', 'image3', 'image4', 'image5',
  'access_season',
  'scenic_score', 'elevation_gain_m',
];

// Trilingual: jedes übersetzbare Feld als EN/DE/RU-Trio, damit man alle drei Sprachen
// nebeneinander sieht und pflegen kann.
const longFieldPairs: { en: keyof RouteForm; de: keyof RouteForm; ru: keyof RouteForm; label: string }[] = [
  { en: 'description_en', de: 'description_de', ru: 'description_ru', label: 'Description' },
  { en: 'long_description_en', de: 'long_description_de', ru: 'long_description_ru', label: 'Long description' },
  { en: 'route_highlights_en', de: 'route_highlights_de', ru: 'route_highlights_ru', label: 'Route highlights' },
  { en: 'chapter1_en', de: 'chapter1_de', ru: 'chapter1_ru', label: 'Chapter 1' },
  { en: 'chapter2_en', de: 'chapter2_de', ru: 'chapter2_ru', label: 'Chapter 2' },
  { en: 'chapter3_en', de: 'chapter3_de', ru: 'chapter3_ru', label: 'Chapter 3' },
  { en: 'chapter4_en', de: 'chapter4_de', ru: 'chapter4_ru', label: 'Chapter 4' },
  { en: 'chapter5_en', de: 'chapter5_de', ru: 'chapter5_ru', label: 'Chapter 5' },
];

// Trilingual: kurze Praxisfelder, die trotzdem pro Sprache unterschiedlichen Text
// enthalten — als EN/DE/RU-Trio mit <input> statt <textarea>, weil die Texte meist nur
// ein paar Wörter lang sind. toll_fee/opening_access/road_surface/difficulty/traffic_level
// sind zwar kategorial (wenig eindeutige Werte), aber trotzdem pro Route gepflegt.
const shortFieldPairs: { en: keyof RouteForm; de: keyof RouteForm; ru: keyof RouteForm; label: string }[] = [
  { en: 'toll_fee_en', de: 'toll_fee_de', ru: 'toll_fee_ru', label: 'Toll / Fee' },
  { en: 'opening_access_en', de: 'opening_access_de', ru: 'opening_access_ru', label: 'Opening / Access' },
  { en: 'vehicle_restrictions_en', de: 'vehicle_restrictions_de', ru: 'vehicle_restrictions_ru', label: 'Vehicle restrictions' },
  { en: 'closure_period_en', de: 'closure_period_de', ru: 'closure_period_ru', label: 'Closure period' },
  { en: 'road_surface_en', de: 'road_surface_de', ru: 'road_surface_ru', label: 'Road surface' },
  { en: 'difficulty_en', de: 'difficulty_de', ru: 'difficulty_ru', label: 'Difficulty' },
  { en: 'traffic_level_en', de: 'traffic_level_de', ru: 'traffic_level_ru', label: 'Traffic level' },
  { en: 'fuel_services_en', de: 'fuel_services_de', ru: 'fuel_services_ru', label: 'Fuel / Services' },
  { en: 'weather_advice_en', de: 'weather_advice_de', ru: 'weather_advice_ru', label: 'Weather advice' },
];

const fieldLabels: Record<keyof RouteForm, string> = {
  title_en: 'Title (EN)', title_de: 'Title (DE)', title_ru: 'Title (RU)', country: 'Country',
  description_en: 'Description (EN)', description_de: 'Description (DE)', description_ru: 'Description (RU)',
  long_description_en: 'Long description (EN)', long_description_de: 'Long description (DE)', long_description_ru: 'Long description (RU)',
  duration: 'Duration',
  distance_km: 'Distance (km)', image_url: 'Main image URL', season: 'Season',
  start_point: 'Start point', end_point: 'End point',
  route_highlights_en: 'Route highlights (EN)', route_highlights_de: 'Route highlights (DE)', route_highlights_ru: 'Route highlights (RU)',
  maps_URL: 'Maps URL',
  chapter1_en: 'Chapter 1 (EN)', chapter1_de: 'Chapter 1 (DE)', chapter1_ru: 'Chapter 1 (RU)',
  chapter2_en: 'Chapter 2 (EN)', chapter2_de: 'Chapter 2 (DE)', chapter2_ru: 'Chapter 2 (RU)',
  chapter3_en: 'Chapter 3 (EN)', chapter3_de: 'Chapter 3 (DE)', chapter3_ru: 'Chapter 3 (RU)',
  chapter4_en: 'Chapter 4 (EN)', chapter4_de: 'Chapter 4 (DE)', chapter4_ru: 'Chapter 4 (RU)',
  chapter5_en: 'Chapter 5 (EN)', chapter5_de: 'Chapter 5 (DE)', chapter5_ru: 'Chapter 5 (RU)',
  google_maps: 'Google Maps link',
  image1: 'Image 1', image2: 'Image 2', image3: 'Image 3',
  image4: 'Image 4', image5: 'Image 5',
  toll_fee_en: 'Toll / Fee (EN)', toll_fee_de: 'Toll / Fee (DE)', toll_fee_ru: 'Toll / Fee (RU)',
  access_season: 'Access season',
  opening_access_en: 'Opening / Access (EN)', opening_access_de: 'Opening / Access (DE)', opening_access_ru: 'Opening / Access (RU)',
  vehicle_restrictions_en: 'Vehicle restrictions (EN)', vehicle_restrictions_de: 'Vehicle restrictions (DE)', vehicle_restrictions_ru: 'Vehicle restrictions (RU)',
  closure_period_en: 'Closure period (EN)', closure_period_de: 'Closure period (DE)', closure_period_ru: 'Closure period (RU)',
  road_surface_en: 'Road surface (EN)', road_surface_de: 'Road surface (DE)', road_surface_ru: 'Road surface (RU)',
  difficulty_en: 'Difficulty (EN)', difficulty_de: 'Difficulty (DE)', difficulty_ru: 'Difficulty (RU)',
  traffic_level_en: 'Traffic level (EN)', traffic_level_de: 'Traffic level (DE)', traffic_level_ru: 'Traffic level (RU)',
  fuel_services_en: 'Fuel / Services (EN)', fuel_services_de: 'Fuel / Services (DE)', fuel_services_ru: 'Fuel / Services (RU)',
  weather_advice_en: 'Weather advice (EN)', weather_advice_de: 'Weather advice (DE)', weather_advice_ru: 'Weather advice (RU)',
  scenic_score: 'Scenic score (0–10)', elevation_gain_m: 'Elevation gain (m)',
};

type ProfileRow = {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

type Tab = 'import' | 'routes' | 'featured' | 'users' | 'stats';

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('import');

  // ---------- Import state ----------
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState<{ updated: UpdateResultItem[]; added: number; errors: string[] } | null>(null);
  const [newRoutes, setNewRoutes] = useState<NewRouteItem[] | null>(null);

  // ---------- Routes list state ----------
  const [routesList, setRoutesList] = useState<RouteListItem[] | null>(null);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---------- Edit / create form state ----------
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null); // null = list view, 'new' or an id = form view
  const [form, setForm] = useState<RouteForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaved, setFormSaved] = useState(false);

  // ---------- Users state ----------
  const [usersList, setUsersList] = useState<ProfileRow[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);

  // ---------- Auth guard ----------
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      const email = session?.user?.email?.toLowerCase();
      const allowed = !!email && ADMIN_EMAILS.includes(email);

      setIsAuthorized(allowed);
      setAuthChecked(true);

      if (!allowed) {
        router.push('/login?redirect=/admin');
      }
    }

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase();
      const allowed = !!email && ADMIN_EMAILS.includes(email);
      setIsAuthorized(allowed);
      if (!allowed) {
        router.push('/login?redirect=/admin');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
  if (!isAuthorized) return;

  const channel = supabase.channel('admin-presence', {
    config: { presence: { key: crypto.randomUUID() } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ email: string }>();
      const emails = Object.values(state)
        .flat()
        .map(p => p.email)
        .filter((v, i, arr) => arr.indexOf(v) === i);
      setOnlineAdmins(emails);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { session } } = await supabase.auth.getSession();
        await channel.track({ email: session?.user?.email || 'unknown' });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [isAuthorized]);

  // ---------- Load routes list when Routes or Featured tab opens ----------
  async function loadRoutesList() {
    setRoutesError(null);
    const { data, error } = await supabase
      .from('routes')
      .select('id, title_en, title_de, title_ru, country, distance_km, season, featured, featured_order')
      .order('title_en', { ascending: true });

    if (error) {
      setRoutesError(error.message);
      return;
    }
    setRoutesList(data || []);
  }

  useEffect(() => {
    if ((activeTab === 'routes' || activeTab === 'featured' || activeTab === 'stats') && routesList === null) {
      loadRoutesList();
    }
  }, [activeTab]);

  // ---------- Load users when Users tab opens ----------
  async function loadUsers() {
    setUsersError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      setUsersError(error.message);
      return;
    }
    setUsersList(data || []);
  }

  useEffect(() => {
    if (activeTab === 'users' && usersList === null) {
      loadUsers();
    }
  }, [activeTab]);

  // ---------- Import helpers ----------
  function normalizeTitle(title: string): string {
    return title.trim().toLowerCase();
  }

  // Excel-Zellen liefern manchmal den literalen Text "NULL" statt eines echten leeren Werts
  // (z. B. bei elevation_gain_m in der aktuellen Tabelle) — das würde sonst wortwörtlich als
  // "NULL" in der Datenbank landen. Diese beiden Helfer fangen das ab.
  function cleanText(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (str === '' || str.toUpperCase() === 'NULL') return null;
    return str;
  }

  function cleanNumber(value: any): number | null {
    const text = cleanText(value);
    if (text === null) return null;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Trilingual: liest jetzt die _en/_de/_ru-Spaltentripel aus der Excel-Tabelle
  // (title_en/_de/_ru, description_en/_de/_ru, long_description_en/_de/_ru,
  // route_highlights_en/_de/_ru, chapter1-5_en/_de/_ru) und schreibt sie 1:1 in die
  // entsprechenden Supabase-Spalten. Alle praktischen/kategorialen Felder (country,
  // duration, difficulty usw.) bleiben unverändert einsprachig, außer sie sind ebenfalls
  // als _en/_de/_ru angelegt (z. B. difficulty, toll_fee, ...).
  //
  // WICHTIG (Übergangsphase): Die ALTEN Spalten (title, description, long_description,
  // route_highlights, chapter1-5) werden hier bewusst noch mitgeschrieben — als Spiegel
  // aus den neuen Feldern. Grund: solange nicht ALLE Frontend-Seiten (Home, Explore,
  // Route Detail, ...) auf die neuen Sprachfelder umgestellt sind, würden sie sonst
  // leere Inhalte anzeigen bzw. bricht der NOT-NULL-Constraint auf der alten
  // "title"-Spalte den Import. Sobald überall umgestellt ist, können diese Zeilen UND
  // die alten Spalten in Supabase entfernt werden.
  function buildRoute(row: any) {
    const titleEn = row.title_en ?? row.title;
    const descriptionEn = cleanText(row.description_en ?? row.description);
    const longDescriptionEn = cleanText(row.long_description_en ?? row.long_description);
    const highlightsEn = cleanText(row.route_highlights_en ?? row.route_highlights);
    const chapter1De = cleanText(row.chapter1_de ?? row.chapter1);
    const chapter2De = cleanText(row.chapter2_de ?? row.chapter2);
    const chapter3De = cleanText(row.chapter3_de ?? row.chapter3);
    const chapter4De = cleanText(row.chapter4_de ?? row.chapter4);
    const chapter5De = cleanText(row.chapter5_de ?? row.chapter5);
    // vehicle_restrictions/closure_period/fuel_services/weather_advice/toll_fee/
    // opening_access/road_surface/difficulty/traffic_level waren im alten Format immer
    // Englisch -> Spiegelung in die Legacy-Spalte kommt hier aus _en, nicht _de/_ru.
    const vehicleRestrictionsEn = cleanText(row.vehicle_restrictions_en ?? row.vehicle_restrictions);
    const closurePeriodEn = cleanText(row.closure_period_en ?? row.closure_period);
    const fuelServicesEn = cleanText(row.fuel_services_en ?? row.fuel_services);
    const weatherAdviceEn = cleanText(row.weather_advice_en ?? row.weather_advice);
    const tollFeeEn = cleanText(row.toll_fee_en ?? row.toll_fee);
    const openingAccessEn = cleanText(row.opening_access_en ?? row.opening_access);
    const roadSurfaceEn = cleanText(row.road_surface_en ?? row.road_surface);
    const difficultyEn = cleanText(row.difficulty_en ?? row.difficulty);
    const trafficLevelEn = cleanText(row.traffic_level_en ?? row.traffic_level);

    return {
      title_en: titleEn,
      title_de: cleanText(row.title_de),
      title_ru: cleanText(row.title_ru),
      country: row.country,
      description_en: descriptionEn,
      description_de: cleanText(row.description_de),
      description_ru: cleanText(row.description_ru),
      long_description_en: longDescriptionEn,
      long_description_de: cleanText(row.long_description_de),
      long_description_ru: cleanText(row.long_description_ru),
      duration: cleanText(row.duration),
      distance_km: cleanNumber(row.distance_km),
      image_url: cleanText(row.image_url),
      season: cleanText(row.season),
      start_point: cleanText(row.start_point),
      end_point: cleanText(row.end_point),
      route_highlights_en: highlightsEn,
      route_highlights_de: cleanText(row.route_highlights_de),
      route_highlights_ru: cleanText(row.route_highlights_ru),
      maps_URL: cleanText(row.maps_URL),
      chapter1_en: cleanText(row.chapter1_en),
      chapter1_de: chapter1De,
      chapter1_ru: cleanText(row.chapter1_ru),
      chapter2_en: cleanText(row.chapter2_en),
      chapter2_de: chapter2De,
      chapter2_ru: cleanText(row.chapter2_ru),
      chapter3_en: cleanText(row.chapter3_en),
      chapter3_de: chapter3De,
      chapter3_ru: cleanText(row.chapter3_ru),
      chapter4_en: cleanText(row.chapter4_en),
      chapter4_de: chapter4De,
      chapter4_ru: cleanText(row.chapter4_ru),
      chapter5_en: cleanText(row.chapter5_en),
      chapter5_de: chapter5De,
      chapter5_ru: cleanText(row.chapter5_ru),
      google_maps: cleanText(row.google_maps),
      image1: cleanText(row.image1),
      image2: cleanText(row.image2),
      image3: cleanText(row.image3),
      image4: cleanText(row.image4),
      image5: cleanText(row.image5),
      toll_fee_en: tollFeeEn,
      toll_fee_de: cleanText(row.toll_fee_de),
      toll_fee_ru: cleanText(row.toll_fee_ru),
      access_season: cleanText(row.access_season),
      opening_access_en: openingAccessEn,
      opening_access_de: cleanText(row.opening_access_de),
      opening_access_ru: cleanText(row.opening_access_ru),
      vehicle_restrictions_en: vehicleRestrictionsEn,
      vehicle_restrictions_de: cleanText(row.vehicle_restrictions_de),
      vehicle_restrictions_ru: cleanText(row.vehicle_restrictions_ru),
      closure_period_en: closurePeriodEn,
      closure_period_de: cleanText(row.closure_period_de),
      closure_period_ru: cleanText(row.closure_period_ru),
      road_surface_en: roadSurfaceEn,
      road_surface_de: cleanText(row.road_surface_de),
      road_surface_ru: cleanText(row.road_surface_ru),
      difficulty_en: difficultyEn,
      difficulty_de: cleanText(row.difficulty_de),
      difficulty_ru: cleanText(row.difficulty_ru),
      traffic_level_en: trafficLevelEn,
      traffic_level_de: cleanText(row.traffic_level_de),
      traffic_level_ru: cleanText(row.traffic_level_ru),
      fuel_services_en: fuelServicesEn,
      fuel_services_de: cleanText(row.fuel_services_de),
      fuel_services_ru: cleanText(row.fuel_services_ru),
      weather_advice_en: weatherAdviceEn,
      weather_advice_de: cleanText(row.weather_advice_de),
      weather_advice_ru: cleanText(row.weather_advice_ru),
      scenic_score: cleanNumber(row.scenic_score),
      elevation_gain_m: cleanNumber(row.elevation_gain_m),
      // Übergangs-Spiegelung in die alten Spalten (siehe Kommentar oben):
      title: titleEn,
      description: descriptionEn,
      long_description: longDescriptionEn,
      route_highlights: highlightsEn,
      chapter1: chapter1De,
      chapter2: chapter2De,
      chapter3: chapter3De,
      chapter4: chapter4De,
      chapter5: chapter5De,
      vehicle_restrictions: vehicleRestrictionsEn,
      closure_period: closurePeriodEn,
      fuel_services: fuelServicesEn,
      weather_advice: weatherAdviceEn,
      toll_fee: tollFeeEn,
      opening_access: openingAccessEn,
      road_surface: roadSurfaceEn,
      difficulty: difficultyEn,
      traffic_level: trafficLevelEn,
    };
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setLoading(true);
    setLoadingMessage('Читаем файл...');
    setResult(null);
    setNewRoutes(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        setLoadingMessage('Сверяем с базой...');

        const { data: existingRoutes, error: fetchError } = await supabase
          .from('routes')
          .select('id, title_en, title, country') as { data: ExistingRoute[] | null; error: any };

        if (fetchError) {
          setResult({ updated: [], added: 0, errors: [`Не удалось загрузить существующие маршруты: ${fetchError.message}`] });
          setLoading(false);
          return;
        }

        const existingByTitle = new Map<string, ExistingRoute>();
        (existingRoutes || []).forEach(r => {
          // Übergang: solange title_en bei einer Bestandsroute noch nicht befüllt ist
          // (erster Import nach der Migration), auf die alte "title"-Spalte zurückfallen —
          // sonst wird jede Route fälschlich als "neu" erkannt und kollidiert beim Insert
          // mit der bereits vorhandenen Zeile (unique constraint auf title+country).
          const key = normalizeTitle(r.title_en || r.title || '');
          if (!key) return;
          existingByTitle.set(`${key}|${r.country.trim().toLowerCase()}`, r);
        });

        // Abgleich läuft weiterhin über title_en (fällt auf die alte "title"-Spalte
        // zurück, falls mal eine Excel-Datei im alten Format importiert wird). Die
        // russische Übersetzung (title_ru) wird nur inhaltlich importiert/gespeichert,
        // spielt aber für den Abgleich neu vs. bestehend keine Rolle.
        const toUpdate: { id: string; row: any }[] = [];
        const toConfirm: NewRouteItem[] = [];

        for (const row of rows) {
          const rowTitle = row.title_en ?? row.title;
          if (!rowTitle || !row.country) continue;
          const match = existingByTitle.get(`${normalizeTitle(rowTitle)}|${String(row.country).trim().toLowerCase()}`);
          if (match) {
            toUpdate.push({ id: match.id, row });
          } else {
            toConfirm.push({ row, include: true });
          }
        }

        setLoadingMessage('Обновляем существующие маршруты...');
        const updated: UpdateResultItem[] = [];
        const errors: string[] = [];

        for (const { id, row } of toUpdate) {
          const route = buildRoute(row);
          const rowTitle = row.title_en ?? row.title;
          const { error } = await supabase.from('routes').update(route).eq('id', id);
          if (error) errors.push(`${rowTitle}: ${error.message}`);
          else updated.push({ title: rowTitle, country: row.country });
        }

        setResult({ updated, added: 0, errors });
        setLoading(false);

        if (toConfirm.length > 0) {
          setNewRoutes(toConfirm);
        }

        // Обновим список маршрутов, если он уже был загружен
        setRoutesList(null);
      } catch (err: any) {
        setResult({ updated: [], added: 0, errors: [`Ошибка чтения файла: ${err.message}`] });
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function toggleNewRoute(idx: number) {
    setNewRoutes(prev => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], include: !copy[idx].include };
      return copy;
    });
  }

  function toggleAllNewRoutes(include: boolean) {
    setNewRoutes(prev => prev ? prev.map(item => ({ ...item, include })) : prev);
  }

  async function handleAddNewRoutes() {
    if (!newRoutes) return;
    const selected = newRoutes.filter(item => item.include);
    if (selected.length === 0) {
      setNewRoutes(null);
      return;
    }

    setLoading(true);
    setLoadingMessage('Добавляем новые маршруты...');

    let added = 0;
    const errors: string[] = [];

    for (const { row } of selected) {
      const route = buildRoute(row);
      const rowTitle = row.title_en ?? row.title;
      const { error } = await supabase.from('routes').insert(route);
      if (error) errors.push(`${rowTitle}: ${error.message}`);
      else added++;
    }

    setResult(prev => ({
      updated: prev?.updated || [],
      added: (prev?.added || 0) + added,
      errors: [...(prev?.errors || []), ...errors],
    }));
    setNewRoutes(null);
    setLoading(false);
    setRoutesList(null);
  }

  // ---------- Routes list: search/filter ----------
  const filteredRoutes = useMemo(() => {
    if (!routesList) return [];
    return routesList.filter(r => (r.title_en || '').toLowerCase().includes(routeSearch.toLowerCase()));
  }, [routesList, routeSearch]);

  async function handleDeleteRoute(id: string, title: string) {
    const confirmed = window.confirm(`Удалить маршрут "${title}"? Это нельзя отменить.`);
    if (!confirmed) return;

    setDeletingId(id);
    const { error } = await supabase.from('routes').delete().eq('id', id);
    setDeletingId(null);

    if (error) {
      alert(`Не удалось удалить: ${error.message}`);
      return;
    }

    setRoutesList(prev => prev ? prev.filter(r => r.id !== id) : prev);
  }

  // ---------- Edit / create form ----------
  function openNewRouteForm() {
    setForm(emptyForm);
    setFormError(null);
    setFormSaved(false);
    setEditingRouteId('new');
  }

  async function openEditRouteForm(id: string) {
    setEditingRouteId(id);
    setFormLoading(true);
    setFormError(null);
    setFormSaved(false);

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      setFormError(error.message);
      setFormLoading(false);
      return;
    }

    const loaded: RouteForm = { ...emptyForm };
    (Object.keys(emptyForm) as (keyof RouteForm)[]).forEach(key => {
      const value = (data as any)?.[key];
      loaded[key] = value === null || value === undefined ? '' : String(value);
    });

    setForm(loaded);
    setFormLoading(false);
  }

  function closeForm() {
    setEditingRouteId(null);
    setForm(emptyForm);
    setFormError(null);
    setFormSaved(false);
  }

  function updateFormField(key: keyof RouteForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormSaved(false);
  }

  async function handleSaveForm() {
    if (!form.title_en.trim() || !form.country.trim()) {
      setFormError('Title (EN) и Country обязательны');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    const payload = {
      title_en: form.title_en,
      title_de: form.title_de || null,
      title_ru: form.title_ru || null,
      country: form.country,
      description_en: form.description_en || null,
      description_de: form.description_de || null,
      description_ru: form.description_ru || null,
      long_description_en: form.long_description_en || null,
      long_description_de: form.long_description_de || null,
      long_description_ru: form.long_description_ru || null,
      duration: form.duration || null,
      distance_km: cleanNumber(form.distance_km),
      image_url: form.image_url || null,
      season: form.season || null,
      start_point: form.start_point || null,
      end_point: form.end_point || null,
      route_highlights_en: form.route_highlights_en || null,
      route_highlights_de: form.route_highlights_de || null,
      route_highlights_ru: form.route_highlights_ru || null,
      maps_URL: form.maps_URL || null,
      chapter1_en: form.chapter1_en || null,
      chapter1_de: form.chapter1_de || null,
      chapter1_ru: form.chapter1_ru || null,
      chapter2_en: form.chapter2_en || null,
      chapter2_de: form.chapter2_de || null,
      chapter2_ru: form.chapter2_ru || null,
      chapter3_en: form.chapter3_en || null,
      chapter3_de: form.chapter3_de || null,
      chapter3_ru: form.chapter3_ru || null,
      chapter4_en: form.chapter4_en || null,
      chapter4_de: form.chapter4_de || null,
      chapter4_ru: form.chapter4_ru || null,
      chapter5_en: form.chapter5_en || null,
      chapter5_de: form.chapter5_de || null,
      chapter5_ru: form.chapter5_ru || null,
      google_maps: form.google_maps || null,
      // Übergangs-Spiegelung in die alten Spalten, siehe Kommentar bei buildRoute():
      title: form.title_en,
      description: form.description_en || null,
      long_description: form.long_description_en || null,
      route_highlights: form.route_highlights_en || null,
      chapter1: form.chapter1_de || null,
      chapter2: form.chapter2_de || null,
      chapter3: form.chapter3_de || null,
      chapter4: form.chapter4_de || null,
      chapter5: form.chapter5_de || null,
      image1: form.image1 || null,
      image2: form.image2 || null,
      image3: form.image3 || null,
      image4: form.image4 || null,
      image5: form.image5 || null,
      toll_fee_en: form.toll_fee_en || null,
      toll_fee_de: form.toll_fee_de || null,
      toll_fee_ru: form.toll_fee_ru || null,
      access_season: form.access_season || null,
      opening_access_en: form.opening_access_en || null,
      opening_access_de: form.opening_access_de || null,
      opening_access_ru: form.opening_access_ru || null,
      vehicle_restrictions_en: form.vehicle_restrictions_en || null,
      vehicle_restrictions_de: form.vehicle_restrictions_de || null,
      vehicle_restrictions_ru: form.vehicle_restrictions_ru || null,
      closure_period_en: form.closure_period_en || null,
      closure_period_de: form.closure_period_de || null,
      closure_period_ru: form.closure_period_ru || null,
      road_surface_en: form.road_surface_en || null,
      road_surface_de: form.road_surface_de || null,
      road_surface_ru: form.road_surface_ru || null,
      difficulty_en: form.difficulty_en || null,
      difficulty_de: form.difficulty_de || null,
      difficulty_ru: form.difficulty_ru || null,
      traffic_level_en: form.traffic_level_en || null,
      traffic_level_de: form.traffic_level_de || null,
      traffic_level_ru: form.traffic_level_ru || null,
      fuel_services_en: form.fuel_services_en || null,
      fuel_services_de: form.fuel_services_de || null,
      fuel_services_ru: form.fuel_services_ru || null,
      weather_advice_en: form.weather_advice_en || null,
      weather_advice_de: form.weather_advice_de || null,
      weather_advice_ru: form.weather_advice_ru || null,
      scenic_score: cleanNumber(form.scenic_score),
      elevation_gain_m: cleanNumber(form.elevation_gain_m),
      // Übergangs-Spiegelung in die alten Spalten (Legacy-Content war Englisch):
      vehicle_restrictions: form.vehicle_restrictions_en || null,
      closure_period: form.closure_period_en || null,
      fuel_services: form.fuel_services_en || null,
      weather_advice: form.weather_advice_en || null,
      toll_fee: form.toll_fee_en || null,
      opening_access: form.opening_access_en || null,
      road_surface: form.road_surface_en || null,
      difficulty: form.difficulty_en || null,
      traffic_level: form.traffic_level_en || null,
    };

    if (editingRouteId === 'new') {
      const { error } = await supabase.from('routes').insert(payload);
      setFormSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      setRoutesList(null);
      closeForm();
      return;
    }

    const { error } = await supabase.from('routes').update(payload).eq('id', editingRouteId as string);
    setFormSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setFormSaved(true);
    setRoutesList(null);
  }

  // ---------- Featured ----------
  const featuredRoutes = useMemo(() => {
    if (!routesList) return [];
    return routesList
      .filter(r => r.featured)
      .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0));
  }, [routesList]);

  async function toggleFeatured(route: RouteListItem) {
    const newFeatured = !route.featured;
    const newOrder = newFeatured ? (featuredRoutes.length + 1) : null;

    const { error } = await supabase
      .from('routes')
      .update({ featured: newFeatured, featured_order: newOrder })
      .eq('id', route.id);

    if (error) {
      alert(`Не удалось обновить: ${error.message}`);
      return;
    }

    setRoutesList(prev => prev
      ? prev.map(r => r.id === route.id ? { ...r, featured: newFeatured, featured_order: newOrder } : r)
      : prev
    );
  }

  async function updateFeaturedOrder(routeId: string, order: number) {
    const { error } = await supabase
      .from('routes')
      .update({ featured_order: order })
      .eq('id', routeId);

    if (error) {
      alert(`Не удалось обновить порядок: ${error.message}`);
      return;
    }

    setRoutesList(prev => prev
      ? prev.map(r => r.id === routeId ? { ...r, featured_order: order } : r)
      : prev
    );
  }

  // ---------- Users search ----------
  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    return usersList.filter(u =>
      (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [usersList, userSearch]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    if (!routesList) return null;

    const byCountry: Record<string, number> = {};
    routesList.forEach(r => {
      byCountry[r.country] = (byCountry[r.country] || 0) + 1;
    });

    const countryEntries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);

    return {
      total: routesList.length,
      featuredCount: routesList.filter(r => r.featured).length,
      countryEntries,
      totalUsers: usersList?.length ?? null,
    };
  }, [routesList, usersList]);

  useEffect(() => {
    if (activeTab === 'stats' && usersList === null) {
      loadUsers();
    }
  }, [activeTab]);

  // ---------- Render guards ----------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
          <span className="text-sm">Checking access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'import', label: 'Import' },
    { key: 'routes', label: 'Routes' },
    { key: 'featured', label: 'Featured' },
    { key: 'users', label: 'Users' },
    { key: 'stats', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <Link href="/">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Admin Panel</span>
        {onlineAdmins.length > 0 && (
  <span className="flex items-center gap-2 text-xs text-gray-400">
    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
    {onlineAdmins.length === 1
      ? `Online: ${onlineAdmins[0]}`
      : `Online (${onlineAdmins.length}): ${onlineAdmins.join(', ')}`}
  </span>
)}
        <div className="flex items-center gap-4">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            Sign out
          </button>
          <Link href="/" className="text-sm text-gray-500 hover:text-black transition">← Back to site</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-8 flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === tab.key
                ? 'bg-[#003e4d] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ IMPORT TAB ============ */}
      {activeTab === 'import' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Import Routes</h1>
          <p className="text-gray-400 mb-10">
            Маршруты с существующим названием обновятся автоматически. Новые — нужно подтвердить.
            Поддерживаются колонки EN / DE / RU для всех переводимых полей.
          </p>

          {!newRoutes && !result && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-emerald-400 transition-colors">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <p className="text-gray-500 mb-2 font-medium">Drop your Excel file here</p>
              <p className="text-gray-400 text-sm mb-6">Supports .xlsx and .xls</p>
              <label className="cursor-pointer bg-[#003e4d] hover:bg-[#004e61] text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all">
                Choose file
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
            </div>
          )}

          {loading && (
            <div className="mt-8 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">{loadingMessage || 'Loading...'}</span>
            </div>
          )}

          {newRoutes && newRoutes.length > 0 && !loading && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">+</div>
                <h2 className="text-xl font-bold text-blue-900">
                  Новых маршрутов: {newRoutes.length}
                </h2>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Этих названий нет в базе. Выбери, какие добавить.
              </p>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => toggleAllNewRoutes(true)}
                  className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:underline"
                >
                  Выбрать все
                </button>
                <button
                  onClick={() => toggleAllNewRoutes(false)}
                  className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:underline"
                >
                  Снять все
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border-t border-blue-200 pt-4">
                {newRoutes.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={() => toggleNewRoute(idx)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>{item.row.title_en ?? item.row.title}</strong> ({item.row.country})
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-blue-200">
                <button
                  onClick={handleAddNewRoutes}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
                >
                  ✓ Добавить выбранные ({newRoutes.filter(r => r.include).length})
                </button>
                <button
                  onClick={() => setNewRoutes(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
                >
                  ✕ Пропустить всё
                </button>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">✓ Импорт завершён</h3>
                <p className="text-sm text-gray-600">
                  Обновлено: <strong>{result.updated.length}</strong> · Добавлено: <strong>{result.added}</strong>
                </p>
              </div>

              {result.updated.length > 0 && (
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
                    Обновлённые маршруты ({result.updated.length}):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.updated.map((u, i) => (
                      <p key={i} className="text-sm text-gray-600">
                        {u.title} <span className="text-gray-400">({u.country})</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-5 border-t border-gray-100 bg-red-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">❌ Ошибки ({result.errors.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-5 border-t border-gray-100">
                <button
                  onClick={() => { setResult(null); setNewRoutes(null); }}
                  className="text-sm text-gray-500 hover:text-black transition"
                >
                  ← Загрузить ещё файл
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ============ ROUTES TAB ============ */}
      {activeTab === 'routes' && editingRouteId === null && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Routes</h1>
              <p className="text-gray-400">
                {routesList ? `${routesList.length} маршрутов всего` : 'Загрузка...'}
              </p>
            </div>
            <button
              onClick={openNewRouteForm}
              className="bg-[#003e4d] hover:bg-[#004e61] text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all whitespace-nowrap"
            >
              + New route
            </button>
          </div>

          <input
            type="text"
            placeholder="Поиск по названию..."
            value={routeSearch}
            onChange={(e) => setRouteSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 mb-6"
          />

          {routesError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6">
              Ошибка загрузки: {routesError}
            </div>
          )}

          {!routesList && !routesError && (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">Loading routes...</span>
            </div>
          )}

          {routesList && filteredRoutes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Ничего не найдено.
            </div>
          )}

          {routesList && filteredRoutes.length > 0 && (
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-5 py-3">Distance</th>
                    <th className="px-5 py-3">Season</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRoutes.map(route => (
                    <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {route.title_en || <span className="text-gray-400 italic">(noch nicht importiert)</span>}
                        {route.title_de && <span className="block text-xs text-gray-400 font-normal">{route.title_de}</span>}
                        {route.title_ru && <span className="block text-xs text-gray-400 font-normal">{route.title_ru}</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{route.country}</td>
                      <td className="px-5 py-3 text-gray-500">{route.distance_km ? `${route.distance_km} km` : '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{route.season || '—'}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEditRouteForm(route.id)}
                          className="text-blue-600 hover:underline mr-4 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id, route.title_en || route.country)}
                          disabled={deletingId === route.id}
                          className="text-red-500 hover:underline font-medium disabled:text-gray-300"
                        >
                          {deletingId === route.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* ============ ROUTE EDIT / CREATE FORM ============ */}
      {activeTab === 'routes' && editingRouteId !== null && (
        <main className="max-w-3xl mx-auto px-6 py-12">
          <button onClick={closeForm} className="text-sm text-gray-400 hover:text-black transition mb-6 inline-block">
            ← Back to routes
          </button>

          {formLoading ? (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">Loading route...</span>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2">
                {editingRouteId === 'new' ? 'New route' : form.title_en || 'Edit route'}
              </h1>
              <p className="text-gray-400 mb-10">
                {editingRouteId === 'new' ? 'Заполни поля и сохрани.' : `ID: ${editingRouteId}`}
              </p>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6">
                  {formError}
                </div>
              )}

              {formSaved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 mb-6">
                  ✓ Сохранено
                </div>
              )}

              {/* Title EN/DE/RU und Country zuerst, prominent und mit Pflichtfeld-Markierung */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    {fieldLabels.title_en}<span className="text-red-400"> *</span>
                  </label>
                  <input
                    type="text"
                    value={form.title_en}
                    onChange={(e) => updateFormField('title_en', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    {fieldLabels.title_de}
                  </label>
                  <input
                    type="text"
                    value={form.title_de}
                    onChange={(e) => updateFormField('title_de', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    {fieldLabels.title_ru}
                  </label>
                  <input
                    type="text"
                    value={form.title_ru}
                    onChange={(e) => updateFormField('title_ru', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Country<span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateFormField('country', e.target.value)}
                  className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {shortFields.map(key => (
                  <div key={key}>
                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                      {fieldLabels[key]}
                    </label>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => updateFormField(key, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                ))}
              </div>

              {/* Kurze Praxisfelder mit echtem Freitext (vehicle_restrictions, closure_period,
                  fuel_services, weather_advice usw.) als EN/DE/RU-Trio, aber mit <input>
                  statt <textarea>, da die Texte meist nur ein paar Wörter lang sind. */}
              <div className="space-y-3 mb-6">
                {shortFieldPairs.map(({ en, de, ru, label }) => (
                  <div key={en} className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (EN)
                      </label>
                      <input
                        type="text"
                        value={form[en]}
                        onChange={(e) => updateFormField(en, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (DE)
                      </label>
                      <input
                        type="text"
                        value={form[de]}
                        onChange={(e) => updateFormField(de, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (RU)
                      </label>
                      <input
                        type="text"
                        value={form[ru]}
                        onChange={(e) => updateFormField(ru, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Jedes lange Textfeld als EN/DE/RU-Trio nebeneinander */}
              <div className="space-y-4 mb-8">
                {longFieldPairs.map(({ en, de, ru, label }) => (
                  <div key={en} className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (EN)
                      </label>
                      <textarea
                        value={form[en]}
                        onChange={(e) => updateFormField(en, e.target.value)}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (DE)
                      </label>
                      <textarea
                        value={form[de]}
                        onChange={(e) => updateFormField(de, e.target.value)}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        {label} (RU)
                      </label>
                      <textarea
                        value={form[ru]}
                        onChange={(e) => updateFormField(ru, e.target.value)}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveForm}
                  disabled={formSaving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all shadow-lg"
                >
                  {formSaving ? 'Saving...' : editingRouteId === 'new' ? '✓ Create route' : '✓ Save changes'}
                </button>
                <button
                  onClick={closeForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </main>
      )}

      {/* ============ FEATURED TAB ============ */}
      {activeTab === 'featured' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Featured routes</h1>
          <p className="text-gray-400 mb-10">
            Маршруты, которые показываются в карусели на главной странице.
          </p>

          {routesError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6">
              Ошибка загрузки: {routesError}
            </div>
          )}

          {!routesList && !routesError && (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">Loading routes...</span>
            </div>
          )}

          {routesList && (
            <>
              <div className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
                  Currently featured ({featuredRoutes.length})
                </h2>
                {featuredRoutes.length === 0 && (
                  <p className="text-sm text-gray-400">Пока ни один маршрут не выбран как featured.</p>
                )}
                <div className="space-y-2">
                  {featuredRoutes.map(route => (
                    <div key={route.id} className="flex items-center gap-4 p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                      <input
                        type="number"
                        value={route.featured_order ?? 0}
                        onChange={(e) => updateFeaturedOrder(route.id, parseInt(e.target.value) || 0)}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {route.title_en || "(noch nicht importiert)"} <span className="text-gray-400">({route.country})</span>
                      </span>
                      <button
                        onClick={() => toggleFeatured(route)}
                        className="text-red-500 hover:underline text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
                  All routes
                </h2>
                <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 mb-4"
                />
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredRoutes.filter(r => !r.featured).map(route => (
                    <div key={route.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <span className="flex-1 text-sm text-gray-700">
                        {route.title_en || "(noch nicht importiert)"} <span className="text-gray-400">({route.country})</span>
                      </span>
                      <button
                        onClick={() => toggleFeatured(route)}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        + Add to featured
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      )}

      {/* ============ USERS TAB ============ */}
      {activeTab === 'users' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Users</h1>
          <p className="text-gray-400 mb-10">
            {usersList ? `${usersList.length} зарегистрированных пользователей` : 'Загрузка...'}
          </p>

          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 mb-6"
          />

          {usersError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6">
              Ошибка загрузки: {usersError}
              <p className="mt-2 text-xs text-red-400">
                Если ошибка про доступ (permission denied) — нужна RLS-политика на SELECT для таблицы profiles.
              </p>
            </div>
          )}

          {!usersList && !usersError && (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">Loading users...</span>
            </div>
          )}

          {usersList && filteredUsers.length > 0 && (
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Last updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{u.username || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{u.email || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* ============ STATS TAB ============ */}
      {activeTab === 'stats' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Stats</h1>
          <p className="text-gray-400 mb-10">Общая статистика по сайту.</p>

          {!stats && (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm">Loading stats...</span>
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="rounded-2xl border border-gray-100 p-6 text-center">
                  <p className="text-4xl font-bold text-emerald-500">{stats.total}</p>
                  <p className="text-sm text-gray-400 mt-1">Всего маршрутов</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-6 text-center">
                  <p className="text-4xl font-bold text-blue-500">{stats.featuredCount}</p>
                  <p className="text-sm text-gray-400 mt-1">Featured маршрутов</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-6 text-center">
                  <p className="text-4xl font-bold text-purple-500">
                    {stats.totalUsers === null ? '…' : stats.totalUsers}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Пользователей</p>
                </div>
              </div>

              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
                Маршруты по странам
              </h2>
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {stats.countryEntries.map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm text-gray-700">{country}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
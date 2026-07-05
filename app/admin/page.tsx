"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

type ExistingRoute = { id: string; title: string; country: string };
type UpdateResultItem = { title: string; country: string };
type NewRouteItem = { row: any; include: boolean };

// Список email, которым разрешён доступ к админке (через запятую в .env.local).
// Это ТОЛЬКО удобство UI — реальная защита данных обеспечивается RLS-политикой в Supabase.
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState<{ updated: UpdateResultItem[]; added: number; errors: string[] } | null>(null);
  const [newRoutes, setNewRoutes] = useState<NewRouteItem[] | null>(null);

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

  function normalizeTitle(title: string): string {
    return title.trim().toLowerCase();
  }

  function buildRoute(row: any) {
    return {
      title: row.title,
      country: row.country,
      description: row.description || null,
      long_description: row.long_description || null,
      duration: row.duration || null,
      distance_km: row.distance_km ? parseInt(row.distance_km) : null,
      image_url: row.image_url || null,
      season: row.season || null,
      start_point: row.start_point || null,
      end_point: row.end_point || null,
      route_highlights: row.route_highlights || null,
      maps_URL: row.maps_URL || null,
      chapter1: row.chapter1 || null,
      chapter2: row.chapter2 || null,
      chapter3: row.chapter3 || null,
      chapter4: row.chapter4 || null,
      chapter5: row.chapter5 || null,
      google_maps: row.google_maps || null,
      image1: row.image1 || null,
      image2: row.image2 || null,
      image3: row.image3 || null,
      image4: row.image4 || null,
      image5: row.image5 || null,
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
          .select('id, title, country') as { data: ExistingRoute[] | null; error: any };

        if (fetchError) {
          setResult({ updated: [], added: 0, errors: [`Не удалось загрузить существующие маршруты: ${fetchError.message}`] });
          setLoading(false);
          return;
        }

        const existingByTitle = new Map<string, ExistingRoute>();
        (existingRoutes || []).forEach(r => {
          existingByTitle.set(normalizeTitle(r.title), r);
        });

        const toUpdate: { id: string; row: any }[] = [];
        const toConfirm: NewRouteItem[] = [];

        for (const row of rows) {
          if (!row.title || !row.country) continue;
          const match = existingByTitle.get(normalizeTitle(row.title));
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
          const { error } = await supabase.from('routes').update(route).eq('id', id);
          if (error) errors.push(`${row.title}: ${error.message}`);
          else updated.push({ title: row.title, country: row.country });
        }

        setResult({ updated, added: 0, errors });
        setLoading(false);

        if (toConfirm.length > 0) {
          setNewRoutes(toConfirm);
        }
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
      const { error } = await supabase.from('routes').insert(route);
      if (error) errors.push(`${row.title}: ${error.message}`);
      else added++;
    }

    setResult(prev => ({
      updated: prev?.updated || [],
      added: (prev?.added || 0) + added,
      errors: [...(prev?.errors || []), ...errors],
    }));
    setNewRoutes(null);
    setLoading(false);
  }

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
    // Пока роутер редиректит на /login, ничего не показываем
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <Link href="/">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Admin Panel</span>
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Import Routes</h1>
        <p className="text-gray-400 mb-10">
          Маршруты с существующим названием обновятся автоматически. Новые — нужно подтвердить.
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
                    <strong>{item.row.title}</strong> ({item.row.country})
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
    </div>
  );
}
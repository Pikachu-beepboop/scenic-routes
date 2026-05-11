"use client";

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number; errors: string[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
  const data = evt.target?.result;
  const workbook = XLSX.read(data, { type: 'binary' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as any[];

  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.title || !row.country) continue;

    const route = {
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
};

    const { data: existing } = await supabase
      .from('routes')
      .select('id')
      .eq('title', route.title)
      .eq('country', route.country)
      .single();

    if (existing) {
      const { error } = await supabase.from('routes').update(route).eq('id', existing.id);
      if (error) errors.push(`${route.title}: ${error.message}`);
      else updated++;
    } else {
      const { error } = await supabase.from('routes').insert(route);
      if (error) errors.push(`${route.title}: ${error.message}`);
      else added++;
    }
  }

  setResult({ added, updated, errors });
  setLoading(false);
};
    reader.readAsBinaryString(file);
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
        <Link href="/" className="text-sm text-gray-500 hover:text-black transition">← Back to site</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Import Routes</h1>
        <p className="text-gray-400 mb-10">Upload an Excel file — existing routes will be updated, new ones added automatically.</p>

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

        <div className="mt-6 p-5 bg-gray-50 rounded-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Excel columns (first row = headers):</p>
          <div className="grid grid-cols-2 gap-2">
            {['title *', 'country *', 'description', 'long_description', 'duration', 'distance_km','image_url', 'season', 'start_point', 'end_poi', 'route_highlights', 'maps_URL', 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'google_maps'].map(col => (
              <div key={col} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.includes('*') ? 'bg-emerald-500' : 'bg-gray-300'}`}/>
                <span className="text-sm text-gray-600 font-mono">{col}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">* required fields</p>
        </div>

        {loading && (
          <div className="mt-8 flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
            <span className="text-sm">Importing routes...</span>
          </div>
        )}

        {result && (
          <div className="mt-8 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="p-6 text-center">
                <p className="text-4xl font-bold text-emerald-500">{result.added}</p>
                <p className="text-sm text-gray-400 mt-1">Routes added</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-4xl font-bold text-blue-500">{result.updated}</p>
                <p className="text-sm text-gray-400 mt-1">Routes updated</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-red-50">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Errors:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
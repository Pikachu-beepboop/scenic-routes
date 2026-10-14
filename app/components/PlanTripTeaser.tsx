"use client";

// Startseite — Block "From A to B — the scenic way" (Route Planner).
// Erklärt den Planer in drei Bildkarten: Start & Ziel → schöne Straßen → speichern & fahren.
// Alle drei Karten zeigen dieselbe illustrierte Atlas-Karte (Beispiel-Trip München → Comer See),
// die sich Schritt für Schritt aufbaut: 1 Start & Ziel · 2 goldene Route mit zwei Foto-Stopps
// (Fotos echter Routen, Favoriten aus FEATURED_ROUTE_IDS) · 3 fertiger Trip mit Tagen und Stopps.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabasePublic, safeQuery } from "../../lib/supabase";
import { useLanguage } from "../LanguageContext";

type Lang = "en" | "de" | "ru";

const TEXT = {
  en: {
    eyebrow: "Route planner",
    head: "From A to B —",
    headEm: "the scenic way",
    sub: "From your front door to the road you’ll remember — in three steps.",
    s1t: "Set start & destination",
    s1p: "Pick any two places — your home, a hotel, a city. Munich to Lake Como? We draw the route and suggest the best stops along the way.",
    s1ui: ["Munich", "Lake Como"],
    s2t: "We find the scenic roads",
    s2p: "Instead of the motorway, we route you over mountain passes, along lakes and past the best viewpoints — handpicked, not generated.",
    s2ui: "on the way",
    s3t: "Plan it day by day",
    s3p: "Split the drive into days, add stops like Garmisch or the Stelvio Pass, save it to My Trips and open it in Google Maps.",
    s3ui: "Saved to My Trips · 2 days · 4 stops",
    cta: "Plan your trip",
    d1: "Day 1",
    d2: "Day 2",
    places: ["Munich", "Garmisch", "Stelvio Pass", "Lake Como"],
  },
  de: {
    eyebrow: "Routenplaner",
    head: "Von A nach B —",
    headEm: "auf der schönen Strecke",
    sub: "Von deiner Haustür bis zur Straße, die du nicht vergisst — in drei Schritten.",
    s1t: "Start & Ziel festlegen",
    s1p: "Wähle zwei beliebige Orte — dein Zuhause, ein Hotel, eine Stadt. München nach Comer See? Wir zeichnen die Route und schlagen die schönsten Stopps vor.",
    s1ui: ["München", "Comer See"],
    s2t: "Wir finden die schönen Straßen",
    s2p: "Statt Autobahn führen wir dich über Pässe, an Seen entlang und zu den besten Aussichtspunkten — handverlesen, nicht generiert.",
    s2ui: "auf dem Weg",
    s3t: "Tag für Tag geplant",
    s3p: "Teile die Fahrt in Tage, füge Stopps wie Garmisch oder das Stilfser Joch hinzu, speichere sie in My Trips und öffne sie in Google Maps.",
    s3ui: "In My Trips gespeichert · 2 Tage · 4 Stopps",
    cta: "Trip planen",
    d1: "Tag 1",
    d2: "Tag 2",
    places: ["München", "Garmisch", "Stilfser Joch", "Comer See"],
  },
  ru: {
    eyebrow: "Планировщик маршрутов",
    head: "Из A в B —",
    headEm: "самой красивой дорогой",
    sub: "От вашего порога до дороги, которую вы запомните, — в три шага.",
    s1t: "Укажите старт и цель",
    s1p: "Выберите любые два места — дом, отель, город. Из Мюнхена к озеру Комо? Мы проложим маршрут и предложим лучшие остановки по пути.",
    s1ui: ["Мюнхен", "Озеро Комо"],
    s2t: "Мы найдём живописные дороги",
    s2p: "Вместо автобана — горные перевалы, берега озёр и лучшие смотровые площадки. Отобрано вручную, а не сгенерировано.",
    s2ui: "по пути",
    s3t: "План по дням",
    s3p: "Разделите поездку на дни, добавьте остановки — Гармиш или перевал Стельвио, сохраните в My Trips и откройте в Google Maps.",
    s3ui: "Сохранено в My Trips · 2 дня · 4 остановки",
    cta: "Спланировать поездку",
    d1: "День 1",
    d2: "День 2",
    places: ["Мюнхен", "Гармиш", "Перевал Стельвио", "Озеро Комо"],
  },
} as const;

type Photo = { src: string; title: string };

/**
 * Deine Lieblings-Routen für diesen Block (IDs aus der Tabelle "routes").
 * Die ersten zwei werden als runde Foto-Stopps auf der Route in Karte 2 gezeigt (Garmisch, Stilfser Joch). Am besten Routen mit starken Fotos: Serpentinen von oben,
 * Küstenstraßen, Pässe mit Bergen. Fehlende Plätze werden zufällig mit anderen Routen aufgefüllt.
 * Beispiel: ["12", "47", "3"]
 */
const FEATURED_ROUTE_IDS: string[] = [];

const FALLBACK_PHOTOS: Photo[] = [
  { src: "/pacific_route_highway.jpg", title: "Pacific Coast Highway" },
  { src: "/amalfi_coast_road.jpg", title: "Amalfi Coast Road" },
  { src: "/toscana.jpg", title: "Tuscany" },
];

function pickTitle(row: Record<string, unknown>, lang: string): string {
  const v = row[`title_${lang}`] ?? row.title_en ?? row.title;
  return typeof v === "string" ? v : "";
}


// ------------------------------------------------------------- Illustrierte Atlas-Karte (Karte 1)
// Beispiel-Trip München → Comer See über 2 Tage. Geometrie vorberechnet (Natural Earth, Mercator),
// damit nichts nachgeladen werden muss und die Karte sofort steht.
const ATLAS_BORDERS = "M354.7,-10L360.7,-4L368.8,6.5L370,7.5M370,96.1L368.8,96.4L364.6,97.8L352.1,105.1L346.4,109.6L342.7,115.1L342.7,118.3L348.9,127.5L356,137.2L356,145.5L352.8,151.8L352.1,154.3L354.3,155.2L358.2,155.5L361.4,156.6L362.9,161L362.4,168.7L361.1,175.9L360.2,178.9L357,179.2L350.8,176.1L346.2,172.4L344.2,170.3L344.2,167.6L345.2,165.9L343.5,162.5L337.6,159.6L331.4,161L326.8,162.9L323.8,162.9L320.6,159.9L315.7,157.6L309.1,156.2L305.2,154.6L304.2,155.5L304.7,161.8L303.5,164.6L271.5,168.3L261.7,171.7L254.8,176.1L249.4,178L248.2,180.8L243.1,184.3L237.2,185.3L235.7,184.3L232,185.9L225.6,187.4L221.5,186.9L219.5,184.1L215.6,179.7L213.8,176.6L214.1,174.6L205,174.3L199.4,171.8L187.3,172.5L184.4,171.5L183.9,172.5L181.9,185L179.7,190.2L175.8,195.5L170.9,198.4L167,199L167.2,195.1L168.2,190.4L165.2,189.4L161.1,188.8L159.1,187.4L159.6,183.9L158.6,181.8L156.9,179.4L152.5,176.2L143.6,171.5L137.5,169L135,171.5L130.6,174.1L123.7,173.2L122,174.3L124,175.5L128.9,180.1L127.9,187.6L122.3,199.8L119.3,209.6L119.1,217.3L119.6,220.7L120.6,220.7L126,221.3L128.7,221.3L137,223.2L143.9,226.1L145.3,229.4L146.1,233.2L154.2,238.4L163.5,241.7L166.7,240.7L178.2,228.4L182.9,230.5L185.6,237L185.4,240.3L182.2,253.3L181.7,260.4L184.4,264.9L184.6,268.5L183.9,271.8L179.2,272.1L173.1,270.2L167.9,264.7L163.8,265.4L160.3,266.8L158.6,272.1L157.1,278.3L157.6,281.9L160.1,284.5L162,290.3L163.3,297.7L164.5,301.1L163.3,302.5L160.1,303.5L157.4,302.6L152.5,293.7L150.3,290.3L146.6,289.8L139.9,291.9L129.9,296.8L125.7,296.8L122.3,295.8L119.1,291.7L116.4,283.6L115.4,278.5L113.4,278.6L107.1,277.1L104.1,279.1L104.1,287.4L103.4,297.9L100.2,304.4L91.1,316L87.9,320.9L86.4,324.5L86.2,327.6L87.7,333L89.4,338.1L87.9,341.2L83.2,342.7L79.8,339.5L78.6,334.1L71.2,326.4L74.4,320.1L73.9,318.4L61.9,315.1L56.7,310.3L49.4,301.8L47.9,298.2L48.4,286.4L47.9,283.4L46.9,282.1L43.5,282.1L38.6,286.2L33.9,292.4L24.6,299.4L23.6,300.8L26.8,307.6L26.5,310.2L19.2,320.9L17.7,324.5L8.1,331.2L3.7,333.7L-9.6,328.8L-10,328.7M-10,168.3L-8.1,167.3L-2.4,169.6L13,170.3L24.6,169L31.7,165.9L40.5,165.9L46.4,167.6L47.4,167.5L49.1,166.9L50.6,165.4L56.2,164.1L57,162.7L56.7,161.3L55.7,160.6L48.9,161.3L46.2,160.3L45.7,157.6L47.9,153.2L52.8,149.7L57.2,148.8L60.2,149.7L67.8,156.4L69.5,156.7L70.7,155.5L72.2,154.8L74.9,156L77.6,160.3L78.1,161L95,159.4L98.7,159.4L110.2,166.8L122,174.3M122.3,199.8L123,201.4L123.3,203.5L124,205.6L124.2,208.4L125.2,211.2L127.2,213.8L127.9,216.2L126.9,219.3L126,221.3M185.4,240.3L187.1,241.4L194,241.5L201.6,242.2L206.2,247.6L210.9,249.3L217.8,249.8L222.2,249.2L224.4,247.3L227.1,241L231.8,233.2L239.4,229.4L252.1,228.5L258.8,227.2L265.4,227.3L270.3,228.5L275.5,228.4L288.7,223L302.5,218.6L304.4,219.3L304.7,220.9L302.2,224L299.8,228.4L301.5,233.4L309.1,243.3L313.3,250.9L317.4,256.6L323.6,259.5L331.7,261.4L338.6,262.1L345.9,264.2L370,269.4M-8.1,167.3L-10,166.5M-10,137.2L-9.6,135.6L-8.6,125.7L-10,120.6M-10,118.2L-8.1,109.9L-2,97.3L2,83.9L4.2,70L7.1,60.7L12.8,54.3L26.5,36.3L27.8,34.8L27.3,25.8L23.6,24.6L18.2,21.9L4.4,18.6L-8.3,16.6L-10,15.9";
const ATLAS_LAKES = "M103.0 309.3 Q104.0 309.3 105.4 315.2 Q106.8 321.1 105.1 326.0 Q103.3 330.9 108.5 335.8 Q113.6 340.7 111.9 343.2 Q110.2 345.6 105.1 338.3 Q99.9 330.9 95.8 337.3 Q91.8 343.6 91.1 341.7 Q90.4 339.7 95.2 331.9 Q99.9 324.0 101.0 316.7 Q102.0 309.3 103.0 309.3Z M211.4 337.8 Q212.5 337.8 213.5 346.6 Q214.5 355.4 209.1 367.5 Q203.6 379.7 197.8 378.8 Q192.0 377.8 191.3 372.4 Q190.6 367.1 196.4 358.8 Q202.2 350.5 206.3 344.1 Q210.4 337.8 211.4 337.8Z M86.3 151.4 Q89.7 146.3 101.6 153.9 Q113.6 161.5 125.5 167.6 Q137.4 173.7 133.0 176.2 Q128.6 178.7 116.0 172.7 Q103.3 166.6 93.1 161.5 Q82.9 156.5 86.3 151.4Z M75.0 308.3 Q76.1 308.3 74.4 317.2 Q72.7 326.0 66.5 333.4 Q60.4 340.7 58.0 346.6 Q55.6 352.4 53.9 351.5 Q52.2 350.5 55.6 343.1 Q59.0 335.8 64.1 326.0 Q69.3 316.2 71.6 312.2 Q74.0 308.3 75.0 308.3Z M316.5 139.7 Q314.8 136.2 319.2 136.7 Q323.6 137.2 324.3 139.7 Q325.0 142.3 321.6 142.8 Q318.2 143.3 316.5 139.7Z M229.5 128.5 Q229.5 123.9 231.2 125.0 Q232.9 126.0 232.9 130.1 Q232.9 134.1 231.2 133.6 Q229.5 133.1 229.5 128.5Z M242.5 134.1 Q243.1 128.0 244.2 129.0 Q245.2 130.1 245.2 136.7 Q245.2 143.3 243.5 141.8 Q241.8 140.2 242.5 134.1Z M157.9 347.1 Q160.0 340.7 161.3 347.1 Q162.7 353.4 160.3 356.8 Q157.9 360.3 156.9 356.8 Q155.9 353.4 157.9 347.1Z";
const ATLAS_DAY1 = "M262.0 112.0L260.2 114.8L258.1 117.5L255.7 120.0L253.6 122.7L252.1 125.7L251.2 128.9L251.0 132.6L251.2 136.4L251.4 140.2L251.1 143.8L250.1 147.0L248.1 149.7L245.4 152.1L242.3 154.3L239.1 156.4L236.3 158.7L234.2 161.4L232.8 164.4L231.9 167.7L231.2 171.1L230.4 174.4L229.2 177.5L228.2 177.9L226.9 177.9L225.6 177.7L224.3 177.8L223.5 178.3L223.1 179.5L223.1 181.2L223.4 183.4L223.7 185.5L223.6 187.2L223.1 188.2L222.0 188.4L220.4 187.9L218.4 187.0L216.5 186.1L214.8 185.5L213.6 185.6L212.8 186.2L212.4 187.4L212.1 188.7L211.7 190.0L211.1 190.8L209.8 193.1L208.1 195.2L206.3 197.3L204.7 199.4L203.6 201.8L203.3 204.5L203.6 207.5L204.4 210.6L205.1 213.7L205.4 216.6L204.8 219.2L203.4 221.5L201.1 223.4L198.4 225.1L195.7 226.8L193.4 228.6L191.7 230.8L190.8 233.2L190.4 235.9L190.3 238.7L190.0 241.4L189.3 243.9";
const ATLAS_DAY2 = "M189.3 243.9L188.7 245.2L187.4 246.4L186.3 247.6L186.1 249.0L187.3 250.5L189.4 252.2L191.8 253.9L193.2 255.5L192.8 256.8L190.6 257.9L187.3 258.8L183.9 259.7L181.7 260.8L181.3 262.1L182.7 263.7L185.1 265.4L187.2 267.1L188.4 268.6L188.2 270.0L187.1 271.2L185.8 272.4L185.2 273.7L183.9 274.9L182.1 275.8L180.5 276.7L179.6 278.2L179.9 280.3L181.1 283.0L182.4 285.7L182.9 288.0L181.9 289.3L179.3 289.7L175.6 289.5L172.0 289.3L169.4 289.7L168.4 291.0L168.9 293.3L170.2 296.0L171.4 298.7L171.7 300.8L170.8 302.3L169.2 303.2L167.4 304.1L166.1 305.3L163.1 305.8L160.0 305.7L156.9 305.8L154.0 306.7L151.6 309.0L149.6 312.2L147.5 315.5L145.2 318.0L142.4 318.7L138.9 317.8L135.1 315.6L131.2 313.5L127.7 312.6L124.9 313.3L122.6 315.8L120.5 319.1L118.5 322.3L116.1 324.6L113.2 325.5L110.1 325.6L107.0 325.5L104.0 326.0";

/**
 * Dieselbe Karte in drei Ausbaustufen:
 * 1 = nur Start & Ziel · 2 = schöne Route mit Foto-Stopps · 3 = fertiger Trip mit Tagen und Stopps.
 */
function AtlasMap({
  stage,
  places,
  d1,
  d2,
  thumbs = [],
}: {
  stage: 1 | 2 | 3;
  places: readonly string[];
  d1: string;
  d2: string;
  thumbs?: string[];
}) {
  const paperId = `pta-paper-${stage}`;
  return (
    <>
      <svg className={`pta s${stage}`} viewBox="0 0 360 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id={paperId} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.09 0" />
          </filter>
        </defs>
        <rect className="pta-bg" width="360" height="450" />
        <rect width="360" height="450" filter={`url(#${paperId})`} />
        <g className="pta-compass" transform="translate(318 392)">
          <circle r="17" />
          <path d="M0 -15L4 0L0 15L-4 0Z" />
          <text y="-21">N</text>
        </g>
        {/* etwas hineingezoomt, damit die Route die Karte füllt */}
        <g transform="translate(197 212) scale(1.1) translate(-183 -219)">
        <path className="pta-border" d={ATLAS_BORDERS} />
        <path className="pta-lake" d={ATLAS_LAKES} />
        <path className="pta-peak" d="M206.9 212.9L215.9 198.9L224.9 212.9Z" /><path className="pta-snow" d="M212.70000000000002 203.8L215.9 198.9L219.1 203.8Z" />
        <path className="pta-peak" d="M258 222.9L267 208.9L276 222.9Z" /><path className="pta-snow" d="M263.8 213.8L267 208.9L270.2 213.8Z" />
        <path className="pta-peak" d="M152.3 237.9L161.3 223.9L170.3 237.9Z" /><path className="pta-snow" d="M158.10000000000002 228.8L161.3 223.9L164.5 228.8Z" />
        <path className="pta-peak" d="M121.6 267.8L130.6 253.8L139.6 267.8Z" /><path className="pta-snow" d="M127.39999999999999 258.7L130.6 253.8L133.79999999999998 258.7Z" />
        <path className="pta-peak" d="M203.5 262.8L212.5 248.8L221.5 262.8Z" /><path className="pta-snow" d="M209.3 253.70000000000002L212.5 248.8L215.7 253.70000000000002Z" />
        <path className="pta-peak" d="M278.5 272.8L287.5 258.8L296.5 272.8Z" /><path className="pta-snow" d="M284.3 263.7L287.5 258.8L290.7 263.7Z" />
        <path className="pta-peak" d="M77.3 287.6L86.3 273.6L95.3 287.6Z" /><path className="pta-snow" d="M83.1 278.5L86.3 273.6L89.5 278.5Z" />
        <path className="pta-peak" d="M241 200.8L250 186.8L259 200.8Z" /><path className="pta-snow" d="M246.8 191.70000000000002L250 186.8L253.2 191.70000000000002Z" />
        <path className="pta-peak" d="M162.5 217.9L171.5 203.9L180.5 217.9Z" /><path className="pta-snow" d="M168.3 208.8L171.5 203.9L174.7 208.8Z" />
        <path className="pta-peak" d="M60.3 252.9L69.3 238.9L78.3 252.9Z" /><path className="pta-snow" d="M66.1 243.8L69.3 238.9L72.5 243.8Z" />
        <path className="pta-peak" d="M292.1 217.9L301.1 203.9L310.1 217.9Z" /><path className="pta-snow" d="M297.90000000000003 208.8L301.1 203.9L304.3 208.8Z" />
        <path className="pta-peak" d="M135.3 302.5L144.3 288.5L153.3 302.5Z" /><path className="pta-snow" d="M141.10000000000002 293.4L144.3 288.5L147.5 293.4Z" />
        <path className="pta-peak" d="M247.8 252.9L256.8 238.9L265.8 252.9Z" /><path className="pta-snow" d="M253.60000000000002 243.8L256.8 238.9L260.0 243.8Z" />
        <path className="pta-peak" d="M309.2 247.9L318.2 233.9L327.2 247.9Z" /><path className="pta-snow" d="M315.0 238.8L318.2 233.9L321.4 238.8Z" />
        <path className="pta-peak" d="M43.2 287.6L52.2 273.6L61.2 287.6Z" /><path className="pta-snow" d="M49.0 278.5L52.2 273.6L55.400000000000006 278.5Z" />
        <path className="pta-peak" d="M145.5 277.7L154.5 263.7L163.5 277.7Z" /><path className="pta-snow" d="M151.3 268.59999999999997L154.5 263.7L157.7 268.59999999999997Z" />
        {stage === 1 && <path className="pta-crow" d="M262 112L104 326" />}
        {stage >= 2 && (
          <>
            {/* pathLength nur in Stufe 2 (fürs Einzeichnen), sonst bleiben die Striche in Stufe 3 normal */}
            <path className="pta-route d1" d={ATLAS_DAY1} pathLength={stage === 2 ? 1 : undefined} />
            <path className="pta-route d2" d={ATLAS_DAY2} pathLength={stage === 2 ? 1 : undefined} />
          </>
        )}
        <text className="pta-label" x="245" y="116.5" textAnchor="end">{places[0]}</text>
        {stage === 3 && (
          <>
            <text className="pta-label" x="248.2" y="182.0">{places[1]}</text>
            <text className="pta-label it" x="204.2" y="278.2">{places[2]}</text>
          </>
        )}
        <text className="pta-label" x="87" y="330.5" textAnchor="end">{places[3]}</text>
        {stage === 3 && (
          <>
        <g className="pta-stop d1" transform="translate(229.2 177.5)">
          <rect x="-15" y="-10" width="30" height="20" rx="10" />
          <text y="3.6">1.1</text>
        </g>
        <g className="pta-stop d1" transform="translate(189.3 243.9)">
          <rect x="-15" y="-10" width="30" height="20" rx="10" />
          <text y="3.6">1.2</text>
        </g>
        <g className="pta-stop d2" transform="translate(185.2 273.7)">
          <rect x="-15" y="-10" width="30" height="20" rx="10" />
          <text y="3.6">2.1</text>
        </g>
        <g className="pta-stop d2" transform="translate(166.1 305.3)">
          <rect x="-15" y="-10" width="30" height="20" rx="10" />
          <text y="3.6">2.2</text>
        </g>
          </>
        )}
        <g className="pta-end a" transform="translate(262 112)">
          <circle r="11" />
          <text y="4">A</text>
        </g>
        <g className="pta-end b" transform="translate(104 326)">
          <circle r="11" />
          <text y="4">B</text>
        </g>
        </g>
      </svg>
      {stage === 3 && (
        <div className="pta-legend">
          <span><i className="d1" />{d1}</span>
          <span><i className="d2" />{d2}</span>
        </div>
      )}
      {stage === 2 &&
        thumbs.slice(0, 2).map((src, i) => (
          // Positionen = Garmisch und Stilfser Joch auf der Route (in % der 4:5-Karte)
          <span key={i} className={`pta-thumb t${i}`} style={{ backgroundImage: `url("${src}")` }} />
        ))}
    </>
  );
}

export default function PlanTripTeaser() {
  const { lang } = useLanguage();
  const tx = TEXT[(lang in TEXT ? lang : "en") as Lang];
  const [photos, setPhotos] = useState<Photo[]>(FALLBACK_PHOTOS);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  // Zwei Routen mit Foto: erst deine Favoriten, dann zufällig aufgefüllt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeQuery<Record<string, unknown>[]>(supabasePublic.from("routes").select("*").limit(200), "planTeaserPhotos");
      if (cancelled || !data) return;
      const withImg = data.filter((r: Record<string, unknown>) => typeof r.image_url === "string" && r.image_url);
      const featured = FEATURED_ROUTE_IDS.map((id) => withImg.find((r: Record<string, unknown>) => String(r.id) === id)).filter(
        (r): r is Record<string, unknown> => Boolean(r),
      );
      const rest = withImg.filter((r: Record<string, unknown>) => !featured.includes(r));
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const picked = [...featured, ...rest].slice(0, 2).map((r: Record<string, unknown>) => ({ src: String(r.image_url), title: pickTitle(r, lang) }));
      if (picked.length === 2) setPhotos(picked);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sanftes Einblenden, sobald der Block ins Bild kommt
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);


  return (
    <section ref={rootRef} className={`ptt ${visible ? "is-in" : ""}`} id="plan-trip">
      <style>{`
        .ptt { position:relative; padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px); background:var(--bg); border-top:1px solid var(--border); text-align:center; overflow:hidden; }
        .ptt-head { max-width:760px; margin:0 auto; }
        .ptt-h2 { margin-top:12px; font-family:var(--serif); font-size:clamp(34px,4.5vw,58px); font-weight:300; line-height:1; letter-spacing:-0.035em; color:var(--cream); }
        .ptt-h2 em { font-style:italic; color:#A8823E; }
        .dark .ptt-h2 em { color:#D9BE86; }
        .ptt-sub { margin-top:16px; font-size:15px; line-height:1.6; color:var(--muted); }

        .ptt-steps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:clamp(18px,2.2vw,32px); max-width:1320px; margin:clamp(40px,5vw,60px) auto 0; text-align:left; }
        .ptt-step { display:block; opacity:0; transform:translateY(22px); transition:opacity .8s ease, transform .8s cubic-bezier(.22,1,.36,1); }
        .ptt.is-in .ptt-step { opacity:1; transform:none; }
        .ptt.is-in .ptt-step:nth-child(2) { transition-delay:.12s; }
        .ptt.is-in .ptt-step:nth-child(3) { transition-delay:.24s; }

        .ptt-media { position:relative; aspect-ratio:4/5; border-radius:26px; overflow:hidden; background:var(--bg3); box-shadow:0 20px 40px rgba(60,45,20,.15); transition:transform .45s cubic-bezier(.22,1,.36,1), box-shadow .45s; }
        .dark .ptt-media { box-shadow:0 20px 44px rgba(0,0,0,.45); }
        .ptt-step:hover .ptt-media { transform:translateY(-4px); box-shadow:0 28px 54px rgba(60,45,20,.22); }
        .ptt-media img { width:100%; height:100%; object-fit:cover; transform-origin:50% 60%; }
        .ptt-media::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg, rgba(12,10,7,.18) 0%, rgba(12,10,7,0) 28%, rgba(12,10,7,0) 55%, rgba(12,10,7,.55) 100%); }
        .ptt-num, .ptt-ui { z-index:2; }
                .ptt-media svg { position:absolute; inset:0; width:100%; height:100%; }

        .ptt-num { position:absolute; left:16px; top:16px; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.94); color:#1F1A13; font-family:var(--sans, 'Inter', system-ui, sans-serif); font-size:15px; font-weight:700; line-height:1; font-variant-numeric:lining-nums tabular-nums; box-shadow:0 6px 16px rgba(0,0,0,.18); }
        .ptt-ui { position:absolute; left:16px; right:16px; bottom:16px; display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,.88); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); color:#2B2620; font-size:12.5px; line-height:1.3; white-space:nowrap; overflow:hidden; }
        .ptt-ui span { overflow:hidden; text-overflow:ellipsis; }
        .dark .ptt-ui { background:rgba(20,18,14,.72); color:#EDE5D4; border:1px solid rgba(237,229,212,.12); }
        .ptt-pin { font-style:normal; flex:none; width:20px; height:20px; border-radius:50%; display:grid; place-items:center; font-size:10px; font-weight:700; background:#1F1A13; color:#fff; }
        .dark .ptt-pin { background:#EDE5D4; color:#1F1A13; }
        .ptt-pin.b { background:#C9A86A !important; color:#1A150C !important; }
        .ptt-ico { font-style:normal; flex:none; color:#B8914A; font-size:13px; }

        .ptt-t { margin-top:20px; font-family:var(--serif); font-size:clamp(24px,2.2vw,29px); font-weight:400; line-height:1.1; letter-spacing:-0.01em; color:var(--cream); }
        .ptt-p { margin-top:6px; font-size:14px; line-height:1.55; color:var(--muted); }

        .ptt-cta { display:inline-flex; align-items:center; gap:10px; margin-top:clamp(40px,4.5vw,52px); height:54px; padding:0 28px; border-radius:999px; background:#1F1A13; color:#F4F0E8 !important; font-size:12px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; transition:transform .25s, box-shadow .25s, background .25s; }
        .ptt-cta:hover { transform:translateY(-2px); box-shadow:0 14px 30px rgba(31,26,19,.25); }
        .dark .ptt-cta { background:#EDE5D4; color:#1F1A13 !important; }
        .dark .ptt-cta:hover { box-shadow:0 14px 30px rgba(0,0,0,.5); }


        /* Karte 1 — illustrierte Atlas-Karte */
        .ptt-media.is-map::after { display:none; }
        .pta { position:absolute; inset:0; width:100%; height:100%; }
        .pta-bg { fill:#F1E8D5; } .dark .pta-bg { fill:#1C1812; }
        .pta-border { fill:none; stroke:#C3AD82; stroke-width:.8; stroke-dasharray:1.2 3; stroke-linecap:round; } .dark .pta-border { stroke:#4A3F2C; }
        .pta-lake { fill:#D3DDD3; stroke:#B3C2B1; stroke-width:.8; } .dark .pta-lake { fill:#1F2A27; stroke:#2F3D39; }
        .pta-peak { fill:#E6D9BD; stroke:#B39F78; stroke-width:.9; stroke-linejoin:round; } .dark .pta-peak { fill:#2A241B; stroke:#56492F; }
        .pta-snow { fill:#FFFDF8; } .dark .pta-snow { fill:#8C7E66; }
        .pta-route { fill:none; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round; }
        .s3 .pta-route { stroke-dasharray:7 5; }
        .s2 .pta-route { stroke:#B8914A !important; stroke-width:3.4; stroke-dasharray:1; stroke-dashoffset:1; }
        .ptt.is-in .s2 .pta-route.d1 { animation:pttDraw 1.3s cubic-bezier(.45,0,.2,1) .5s forwards; }
        .ptt.is-in .s2 .pta-route.d2 { animation:pttDraw 1.3s cubic-bezier(.45,0,.2,1) 1.75s forwards; }
        @keyframes pttDraw { to { stroke-dashoffset:0; } }
        .pta-crow { fill:none; stroke:rgba(43,38,32,.35); stroke-width:1.6; stroke-dasharray:2 6; stroke-linecap:round; } .dark .pta-crow { stroke:rgba(237,229,212,.35); }
        .pta-thumb { position:absolute; z-index:2; width:clamp(44px,14%,58px); aspect-ratio:1; border-radius:50%; border:3px solid #FFFDF8; background-size:cover; background-position:center; box-shadow:0 8px 18px rgba(0,0,0,.28); transform:translate(-50%,-50%) scale(.6); opacity:0; transition:opacity .5s ease, transform .6s cubic-bezier(.34,1.56,.64,1); }
        .dark .pta-thumb { border-color:#1C1812; }
        .pta-thumb.t0 { left:68.8%; top:37%; } .pta-thumb.t1 { left:55.4%; top:60.5%; }
        .ptt.is-in .pta-thumb { opacity:1; transform:translate(-50%,-50%) scale(1); }
        .ptt.is-in .pta-thumb.t0 { transition-delay:1.3s; } .ptt.is-in .pta-thumb.t1 { transition-delay:2.4s; }
        .pta-route.d1 { stroke:#B8914A; } .pta-route.d2 { stroke:#C0674A; }
        .pta-stop rect { stroke:#FFFDF8; stroke-width:2; } .pta-stop.d1 rect { fill:#B8914A; } .pta-stop.d2 rect { fill:#C0674A; }
        .pta-stop text, .pta-end text { font-family:var(--sans, 'Inter', sans-serif); font-size:10px; font-weight:700; text-anchor:middle; fill:#fff; }
        .pta-end circle { stroke:#FFFDF8; stroke-width:2.5; } .pta-end.a circle { fill:#1F1A13; } .pta-end.b circle { fill:#C9A86A; } .pta-end.b text { fill:#1A150C; }
        .dark .pta-stop rect, .dark .pta-end circle { stroke:#1C1812; }
        .dark .pta-end.a circle { fill:#EDE5D4; } .dark .pta-end.a text { fill:#1F1A13; }
        .pta-label { font-family:var(--serif, 'Cormorant Garamond', serif); font-size:15px; font-weight:500; fill:#3B3226; paint-order:stroke; stroke:#F1E8D5; stroke-width:3px; stroke-linejoin:round; }
        .pta-label.it { font-style:italic; }
        .dark .pta-label { fill:#E4D9C2; stroke:#1C1812; }
        .pta-compass circle { fill:none; stroke:#B39F78; } .pta-compass path { fill:#9A6B2A; }
        .pta-compass text { font-family:var(--serif, 'Cormorant Garamond', serif); font-size:11px; text-anchor:middle; fill:#6B5A3A; }
        .dark .pta-compass circle { stroke:#56492F; } .dark .pta-compass path { fill:#C9A86A; } .dark .pta-compass text { fill:#B5A584; }
        .pta-legend { position:absolute; right:14px; top:20px; z-index:2; display:flex; gap:6px; }
        .pta-legend span { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.9); color:#2B2620; font-size:11px; font-weight:600; line-height:1; }
        .dark .pta-legend span { background:rgba(20,18,14,.75); color:#EDE5D4; border:1px solid rgba(237,229,212,.12); }
        .pta-legend i { width:14px; height:3px; border-radius:2px; } .pta-legend i.d1 { background:#B8914A; } .pta-legend i.d2 { background:#C0674A; }

        @media (max-width:900px) {
          .ptt-steps { grid-template-columns:1fr; max-width:560px; gap:34px; }
          .ptt-media { aspect-ratio:1/1; }
          .ptt-media.is-map { aspect-ratio:4/5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .s2 .pta-route { stroke-dashoffset:0; animation:none !important; }
          .pta-thumb { opacity:1; transform:translate(-50%,-50%); transition:none; }
          .ptt-step { opacity:1; transform:none; transition:none; }
          .ptt-media { transition:none; }
        }
      `}</style>

      <div className="ptt-head">
        <p className="eyebrow">{tx.eyebrow}</p>
        <h2 className="ptt-h2">
          {tx.head} <em>{tx.headEm}</em>
        </h2>
        <p className="ptt-sub">{tx.sub}</p>
      </div>

      <div className="ptt-steps">
        {/* 1 — Start & Ziel: nur A und B auf der Karte */}
        <Link href="/plan" prefetch={false} className="ptt-step">
          <div className="ptt-media is-map">
            <AtlasMap stage={1} places={tx.places} d1={tx.d1} d2={tx.d2} />
            <span className="ptt-num">1</span>
            <div className="ptt-ui">
              <i className="ptt-pin">A</i>
              <span>{tx.s1ui[0]}</span>
              <span aria-hidden="true">→</span>
              <i className="ptt-pin b">B</i>
              <span>{tx.s1ui[1]}</span>
            </div>
          </div>
          <h3 className="ptt-t">{tx.s1t}</h3>
          <p className="ptt-p">{tx.s1p}</p>
        </Link>

        {/* 2 — Schöne Straßen: goldene Route mit Foto-Stopps */}
        <Link href="/plan" prefetch={false} className="ptt-step">
          <div className="ptt-media is-map">
            <AtlasMap stage={2} places={tx.places} d1={tx.d1} d2={tx.d2} thumbs={photos.map((p) => p.src)} />
            <span className="ptt-num">2</span>
            <div className="ptt-ui">
              <i className="ptt-ico">✦</i>
              <span>
                {photos[0].title} {tx.s2ui}
              </span>
            </div>
          </div>
          <h3 className="ptt-t">{tx.s2t}</h3>
          <p className="ptt-p">{tx.s2p}</p>
        </Link>

        {/* 3 — Tag für Tag: fertiger Trip mit Tagen und nummerierten Stopps */}
        <Link href="/plan" prefetch={false} className="ptt-step">
          <div className="ptt-media is-map">
            <AtlasMap stage={3} places={tx.places} d1={tx.d1} d2={tx.d2} />
            <span className="ptt-num">3</span>
            <div className="ptt-ui">
              <i className="ptt-ico">♡</i>
              <span>{tx.s3ui}</span>
            </div>
          </div>
          <h3 className="ptt-t">{tx.s3t}</h3>
          <p className="ptt-p">{tx.s3p}</p>
        </Link>
      </div>

      <Link href="/plan" prefetch={false} className="ptt-cta">
        {tx.cta} <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </section>
  );
}
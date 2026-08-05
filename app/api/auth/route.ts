// app/api/auth/route.ts
import { NextResponse } from "next/server";
import {
  serializeCookieHeader,
  DEFAULT_COOKIE_OPTIONS,
  createChunks,
  MAX_CHUNK_SIZE,
} from "@supabase/auth-helpers-nextjs";

function getProjectRef(url: string) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "local";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const event = body?.event ?? null;
    const session = body?.session ?? null;

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const baseName = `sb-${getProjectRef(supabaseUrl)}-auth-token`;

    // build cookie options; ensure secure only in production
    const cookieOptions = { ...DEFAULT_COOKIE_OPTIONS, secure: process.env.NODE_ENV === "production" };

    // SIGNED_OUT — удаляем возможные куски cookie и основной ключ
    if (event === "SIGNED_OUT") {
      const headers = new Headers();

      // удаляем до 20 возможных частей
      for (let i = 0; i < 20; i++) {
        const name = `${baseName}.${i}`;
        const cookie = serializeCookieHeader(name, "", { ...cookieOptions, maxAge: 0 });
        headers.append("Set-Cookie", cookie);
      }

      // также удалим основное имя на случай, если оно использовалось
      headers.append(
        "Set-Cookie",
        serializeCookieHeader(baseName, "", { ...cookieOptions, maxAge: 0 })
      );

      return new NextResponse(null, { status: 200, headers });
    }

    // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED — сохраняем сессию в cookie
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (!session) {
        return NextResponse.json({ error: "session missing" }, { status: 400 });
      }

      const serialized = JSON.stringify(session);

      const headers = new Headers();

      // Если короткая — можно положить в один cookie
      if (serialized.length <= MAX_CHUNK_SIZE) {
        const cookie = serializeCookieHeader(baseName, serialized, cookieOptions);
        headers.append("Set-Cookie", cookie);
        return new NextResponse(null, { status: 200, headers });
      }

      // Иначе — разбиваем на куски и выставляем несколько Set-Cookie
      // Some versions of the auth helper have different TypeScript signatures for createChunks.
      // Cast to any to avoid build-time type mismatches while preserving runtime behavior.
      const chunks = (createChunks as any)(serialized, MAX_CHUNK_SIZE);
      chunks.forEach((chunk: string, idx: number) => {
        const name = `${baseName}.${idx}`;
        const cookie = serializeCookieHeader(name, chunk, cookieOptions);
        headers.append("Set-Cookie", cookie);
      });

      // удалим старый одиночный cookie на случай
      headers.append(
        "Set-Cookie",
        serializeCookieHeader(baseName, "", { ...cookieOptions, maxAge: 0 })
      );

      return new NextResponse(null, { status: 200, headers });
    }

    // если пришёл запрос без event — можно просто ответить OK
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

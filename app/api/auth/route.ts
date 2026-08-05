// app/api/auth/route.ts
import { NextResponse } from "next/server";
import {
  serializeCookieHeader,
  DEFAULT_COOKIE_OPTIONS,
  createChunks,
  MAX_CHUNK_SIZE,
} from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const event = body?.event ?? null;
    const session = body?.session ?? null;

    // SIGNED_OUT — удаляем возможные куски cookie и основной ключ
    if (event === "SIGNED_OUT") {
      const headers = new Headers();

      // удаляем до 20 возможных частей
      for (let i = 0; i < 20; i++) {
        const name = `${DEFAULT_COOKIE_OPTIONS.name}.${i}`;
        const cookie = serializeCookieHeader(name, "", { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 });
        headers.append("Set-Cookie", cookie);
      }

      // также удалим основное имя на случай, если оно использовалось
      headers.append(
        "Set-Cookie",
        serializeCookieHeader(DEFAULT_COOKIE_OPTIONS.name, "", { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 })
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
        const cookie = serializeCookieHeader(DEFAULT_COOKIE_OPTIONS.name, serialized, DEFAULT_COOKIE_OPTIONS);
        headers.append("Set-Cookie", cookie);
        return new NextResponse(null, { status: 200, headers });
      }

      // Иначе — разбиваем на куски и выставляем несколько Set-Cookie
      const chunks = createChunks(serialized, MAX_CHUNK_SIZE);
      chunks.forEach((chunk, idx) => {
        const name = `${DEFAULT_COOKIE_OPTIONS.name}.${idx}`;
        const cookie = serializeCookieHeader(name, chunk, DEFAULT_COOKIE_OPTIONS);
        headers.append("Set-Cookie", cookie);
      });

      // удалим старый одиночный cookie на случай
      headers.append(
        "Set-Cookie",
        serializeCookieHeader(DEFAULT_COOKIE_OPTIONS.name, "", { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 })
      );

      return new NextResponse(null, { status: 200, headers });
    }

    // если пришёл запрос без event — можно просто ответить OK
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

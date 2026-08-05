
// app/api/auth/route.ts
import { NextResponse } from "next/server";
import {
  serializeCookieHeader,
  DEFAULT_COOKIE_OPTIONS,
} from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const event = body?.event ?? null;
    const session = body?.session ?? null;

    // SIGNED_OUT — удаляем cookie
    if (event === "SIGNED_OUT") {
      const cookie = serializeCookieHeader(
        // имя и опции берём из DEFAULT_COOKIE_OPTIONS
        // @ts-ignore (некоторые typing setups могут ругаться, но runtime OK)
        DEFAULT_COOKIE_OPTIONS.name,
        "",
        // выставляем maxAge:0, чтобы удалить
        { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 }
      );
      return new NextResponse(null, {
        status: 200,
        headers: { "Set-Cookie": cookie },
      });
    }

    // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED — сохраняем сессию в cookie
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (!session) {
        return NextResponse.json({ error: "session missing" }, { status: 400 });
      }

      const cookieValue = JSON.stringify(session);

      const cookie = serializeCookieHeader(
        // @ts-ignore
        DEFAULT_COOKIE_OPTIONS.name,
        cookieValue,
        DEFAULT_COOKIE_OPTIONS
      );

      return new NextResponse(null, {
        status: 200,
        headers: { "Set-Cookie": cookie },
      });
    }

    // если пришёл запрос без event — можно просто ответить OK
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
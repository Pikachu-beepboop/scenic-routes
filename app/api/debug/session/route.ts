// app/api/debug/session/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const nextCookies = cookies();

    const cookieHandler = {
      get(name: string) {
        const c = nextCookies.get(name);
        return c ? c.value : undefined;
      },
    } as any;

    const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
    const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: cookieHandler });

    const { data } = await supabase.auth.getSession();

    return NextResponse.json({ session: data.session ?? null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

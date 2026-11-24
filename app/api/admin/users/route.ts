import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = 'edge';


// Diese Route läuft ausschließlich serverseitig — genau wie
// app/api/delete-account/route.ts. Der Service-Role-Key darf NIEMALS im
// Client-Code (z.B. lib/supabase.ts oder app/admin/page.tsx) verwendet werden,
// er umgeht Row Level Security komplett.
//
// WARUM es diese Route überhaupt gibt: auf `profiles` ist RLS aktiv mit der
// Policy "Users can view own profile" (auth.uid() = id). Der Users-Tab im Admin
// Panel hat vorher direkt mit dem anon-Key abgefragt und bekam dadurch nur noch
// das eigene Profil zurück. Die Policy bleibt bewusst unverändert — der
// Admin-Zugriff läuft stattdessen hier über einen separaten serverseitigen
// Client mit Service-Role.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// GEÄNDERT: Wer Admin ist, steht jetzt in der Tabelle public.admins (nach User-ID),
// nicht mehr in ADMIN_EMAILS / NEXT_PUBLIC_ADMIN_EMAILS. Siehe Migration
// supabase/migrations/20261124220000_admins_table_and_storage_lockdown.sql.

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server ist nicht korrekt konfiguriert (fehlender Service-Role-Key)." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verifiziert den mitgeschickten Access-Token serverseitig gegen Supabase.
    // Ein selbst gebasteltes/abgelaufenes Token fällt hier durch.
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    // Der eigentliche Zugriffsschutz: nur eingeloggte Admins bekommen die
    // vollständige Nutzerliste. Der Client-Guard in app/admin/page.tsx ist
    // reine UI-Kosmetik und schützt hier nichts.
    // GEÄNDERT: Prüfung gegen die Tabelle admins (Service-Role liest an RLS vorbei).
    // Fail closed: Fehler oder kein Eintrag → kein Zugriff.
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, email, avatar_url, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unbekannter Serverfehler." },
      { status: 500 }
    );
  }
}
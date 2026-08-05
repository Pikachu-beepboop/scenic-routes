import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = 'edge';


// Diese Route läuft ausschließlich serverseitig. Der Service-Role-Key darf
// NIEMALS im Client-Code (z.B. lib/supabase.ts) verwendet werden — er
// umgeht Row Level Security komplett und gehört nur hierher, in eine
// serverseitige Next.js-Route.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function POST(req: NextRequest) {
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

    // Admin-Client mit Service-Role — kann Nutzer verwalten und RLS umgehen
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verifiziert den mitgeschickten Access-Token und ermittelt den Nutzer
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    const userId = userData.user.id;

    // Zugehörige Daten entfernen (falls kein ON DELETE CASCADE in Supabase gesetzt ist,
    // schadet das explizite Löschen hier nicht — bei vorhandenem Cascade sind das No-Ops)
    await supabaseAdmin.from("saved_routes").delete().eq("user_id", userId);
    await supabaseAdmin.from("newsletter_subscribers").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Den Auth-User selbst löschen
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unbekannter Serverfehler." },
      { status: 500 }
    );
  }
}
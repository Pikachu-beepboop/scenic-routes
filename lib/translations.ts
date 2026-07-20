// Zentrale Übersetzungs-Tabelle. Jeder Key hat einen englischen und einen
// deutschen Text. Neue Texte einfach hier ergänzen und im JSX mit
// t("mein.key") statt dem hartcodierten String verwenden.
//
// Konvention für Keys: bereich.unterbereich.name (z.B. "nav.explore")

export const translations = {
  // Navigation — auf allen Seiten identisch
  "nav.explore":    { en: "Explore Routes",  de: "Routen entdecken" },
  "nav.about":      { en: "About",           de: "Über uns" },
  "nav.myTrips":    { en: "My Trips",        de: "Meine Trips" },
  "nav.login":      { en: "Login",           de: "Anmelden" },
  "nav.profile":    { en: "Profile",         de: "Profil" },
  "nav.signOut":    { en: "Sign Out",        de: "Abmelden" },
  "nav.adminPanel": { en: "Admin Panel",     de: "Admin-Bereich" },
  "nav.navigate":   { en: "Navigate",        de: "Navigation" },
  "nav.account":    { en: "Account",         de: "Konto" },

  // Preferences-Seite
  "prefs.title":        { en: "Preferences",                              de: "Einstellungen" },
  "prefs.subtitle":     { en: "Units, language, map style and recommendations.", de: "Einheiten, Sprache, Kartenstil und Empfehlungen." },
  "prefs.distanceUnit": { en: "Distance Unit",                             de: "Entfernungseinheit" },
  "prefs.language":     { en: "Language",                                  de: "Sprache" },
  "prefs.startPage":    { en: "Start Page",                                de: "Startseite" },
  "prefs.mapStyle":     { en: "Default Map Style",                         de: "Standard-Kartenstil" },

  // Allgemein
  "common.saveChanges":  { en: "Save Changes",              de: "Änderungen speichern" },
  "common.cancel":       { en: "Cancel",                    de: "Abbrechen" },
  "common.theme":        { en: "Theme",                     de: "Design" },
  "common.roleExplorer": { en: "Scenic Route Explorer",     de: "Landschaftsrouten-Entdecker" },

  // Homepage — Hero
  "home.hero.line1":    { en: "Start",                                            de: "Starte" },
  "home.hero.line2":    { en: "your journey",                                     de: "deine Reise" },
  "home.hero.subtitle": { en: "Scenic drives. Hidden places. Stories worth the journey.", de: "Traumhafte Fahrten. Versteckte Orte. Geschichten, die die Reise wert sind." },

  // Homepage — Popular Destinations
  "home.popular.eyebrow":      { en: "Popular Destinations",              de: "Beliebte Ziele" },
  "home.popular.headLine1":    { en: "Roads made",                        de: "Straßen gemacht" },
  "home.popular.headLine2":    { en: "for the journey",                   de: "für die Reise" },
  "home.popular.viewAll":      { en: "View all destinations",             de: "Alle Ziele ansehen" },
  "home.popular.fallbackType": { en: "Scenic Route",                      de: "Landschaftsroute" },
  "home.popular.fallbackDesc": { en: "One of the world's most scenic driving routes", de: "Eine der schönsten Panoramastrecken der Welt" },

  // Homepage — Builder
  "home.builder.eyebrow":   { en: "Build your route",       de: "Route zusammenstellen" },
  "home.builder.headLine1": { en: "Your journey,",          de: "Deine Reise," },
  "home.builder.headLine2": { en: "your way",                de: "auf deine Art" },
  "home.builder.sub":       { en: "Discover handpicked scenic drives and find the route that fits your next adventure.", de: "Entdecke handverlesene Panoramastrecken und finde die Route für dein nächstes Abenteuer." },
  "home.builder.findRoute": { en: "Find Route",              de: "Route finden" },

  // Homepage — Destinations Map
  "home.dest.eyebrow": { en: "Destinations",                          de: "Reiseziele" },
  "home.dest.heading": { en: "Places that stay with you",             de: "Orte, die bleiben" },
  "home.dest.sub":     { en: "Explore handpicked regions around the world", de: "Entdecke handverlesene Regionen weltweit" },

  // Homepage — Features
  "home.features.eyebrow":       { en: "Why travel with Scenic Routes", de: "Warum mit Scenic Routes reisen" },
  "home.features.headLine1":     { en: "Designed for",                  de: "Gemacht für" },
  "home.features.headLine2":     { en: "the road ahead",                de: "die Straße vor dir" },
  "home.features.curated.title": { en: "Curated with care",             de: "Sorgfältig kuratiert" },
  "home.features.curated.text":  { en: "Handpicked routes and places researched by real travelers.", de: "Handverlesene Routen und Orte, recherchiert von echten Reisenden." },
  "home.features.detail.title":  { en: "Driven by detail",              de: "Detailverliebt" },
  "home.features.detail.text":   { en: "Maps, tips, and insights that make every mile smoother.", de: "Karten, Tipps und Insights, die jede Meile angenehmer machen." },
  "home.features.freedom.title": { en: "Built for freedom",             de: "Für Freiheit gemacht" },
  "home.features.freedom.text":  { en: "Flexible plans that adapt to the way you travel.", de: "Flexible Pläne, die sich deiner Reiseweise anpassen." },
  "home.features.stories.title": { en: "Stories that inspire",          de: "Geschichten, die inspirieren" },
  "home.features.stories.text":  { en: "Journeys, guides, and journals to fuel your next adventure.", de: "Reisen, Guides und Journale für dein nächstes Abenteuer." },

  // Homepage — Testimonials
  "home.testimonial.quote1": { en: "Every curve led to something unforgettable. Scenic Routes turned a trip into a story.", de: "Jede Kurve führte zu etwas Unvergesslichem. Scenic Routes hat aus einer Fahrt eine Geschichte gemacht." },
  "home.testimonial.role1":  { en: "Traveler",              de: "Reisende" },
  "home.testimonial.quote2": { en: "I've driven roads all over the world. Scenic Routes showed me places I never would have found alone.", de: "Ich bin schon auf Straßen rund um die Welt gefahren. Scenic Routes hat mir Orte gezeigt, die ich allein nie gefunden hätte." },
  "home.testimonial.role2":  { en: "Automotive Journalist", de: "Automobil-Journalist" },
  "home.testimonial.quote3": { en: "The routes, the timing, the hidden gems along the way — absolutely flawless.", de: "Die Routen, das Timing, die versteckten Perlen unterwegs — absolut makellos." },
  "home.testimonial.role3":  { en: "World Traveler",        de: "Weltenbummlerin" },

  // Homepage — Footer
  "home.footer.tagline": { en: "Thoughtfully curated road trips for people who value the journey as much as the destination", de: "Sorgfältig kuratierte Roadtrips für Menschen, denen die Reise genauso wichtig ist wie das Ziel" },
  "home.footer.rights":  { en: "All Rights Reserved.",      de: "Alle Rechte vorbehalten." },

  // Footer-Spalten
  "footer.col.explore": { en: "Explore", de: "Entdecken" },
  "footer.col.about":   { en: "About",   de: "Über uns" },
  "footer.col.support": { en: "Support", de: "Support" },
  "footer.col.legal":   { en: "Legal",   de: "Rechtliches" },

  "footer.link.allRoutes":        { en: "All Routes",           de: "Alle Routen" },
  "footer.link.myTrips":          { en: "My Trips",             de: "Meine Trips" },
  "footer.link.profile":          { en: "Profile",              de: "Profil" },
  "footer.link.travellerPass":    { en: "Traveller Pass",       de: "Reisepass" },
  "footer.link.about":            { en: "About",                de: "Über uns" },
  "footer.link.ourTeam":          { en: "Our Team",              de: "Unser Team" },
  "footer.link.faq":              { en: "FAQ",                   de: "Häufige Fragen" },
  "footer.link.contact":          { en: "Contact",               de: "Kontakt" },
  "footer.link.reportProblem":    { en: "Report a Problem",      de: "Problem melden" },
  "footer.link.reportRouteIssue": { en: "Report Route Issue",    de: "Routenproblem melden" },
  "footer.link.termsOfUse":       { en: "Terms of Use",          de: "Nutzungsbedingungen" },
  "footer.link.privacyPolicy":    { en: "Privacy Policy",        de: "Datenschutz" },
  "footer.link.imprint":          { en: "Imprint",               de: "Impressum" },

  // About-Seite — Hero
  "about.eyebrow":     { en: "About Us",                                              de: "Über uns" },
  "about.h1.line1":    { en: "Built by road lovers,",                                 de: "Gebaut von Straßenliebhabern," },
  "about.h1.emphasis": { en: "for road lovers.",                                      de: "für Straßenliebhaber." },
  "about.hero.sub":    { en: "We started Scenic Routes because we were tired of GPS apps routing us through motorways. Every trip should feel like an adventure — we map the roads that make you pull over and stare.", de: "Wir haben Scenic Routes gestartet, weil wir es leid waren, dass GPS-Apps uns über Autobahnen leiten. Jede Fahrt sollte sich wie ein Abenteuer anfühlen — wir kartieren die Straßen, bei denen man anhalten und staunen muss." },
  "about.hero.explore":  { en: "Explore Routes", de: "Routen entdecken" },
  "about.hero.sayHello": { en: "Say Hello",       de: "Hallo sagen" },

  // About-Seite — Stats
  "about.stats.routes":      { en: "Curated Routes", de: "Kuratierte Routen" },
  "about.stats.countries":   { en: "Countries",       de: "Länder" },
  "about.stats.travellers":  { en: "Travellers",      de: "Reisende" },
  "about.stats.continents":  { en: "Continents",      de: "Kontinente" },

  // About-Seite — Values
  "about.values.eyebrow":    { en: "What we believe",                     de: "Woran wir glauben" },
  "about.values.heading1":   { en: "Three principles",                    de: "Drei Prinzipien" },
  "about.values.heading2":   { en: "that guide us.",                      de: "die uns leiten." },
  "about.values.v1.title":   { en: "Slow Down",                           de: "Verlangsamen" },
  "about.values.v1.text":    { en: "The fastest route is rarely the best one. We celebrate roads that make you pull over, breathe deep, and stay a little longer.", de: "Die schnellste Route ist selten die beste. Wir feiern Straßen, bei denen man anhält, durchatmet und ein bisschen länger bleibt." },
  "about.values.v2.title":   { en: "Go Off-Script",                       de: "Vom Plan abweichen" },
  "about.values.v2.text":    { en: "Every great road trip has an unplanned detour. We build tools that help you discover those moments — not avoid them.", de: "Jeder großartige Roadtrip hat einen ungeplanten Umweg. Wir bauen Tools, die dir helfen, diese Momente zu entdecken — nicht zu vermeiden." },
  "about.values.v3.title":   { en: "Leave It Better",                     de: "Es besser hinterlassen" },
  "about.values.v3.text":    { en: "We only feature routes where travellers are welcome and nature is respected. Beautiful roads deserve careful guests.", de: "Wir zeigen nur Routen, auf denen Reisende willkommen sind und die Natur respektiert wird. Schöne Straßen verdienen rücksichtsvolle Gäste." },

  // About-Seite — Mission
  "about.mission.eyebrow":  { en: "Our Mission",              de: "Unsere Mission" },
  "about.mission.heading1": { en: "Every road tells",          de: "Jede Straße erzählt" },
  "about.mission.heading2": { en: "a story.",                  de: "eine Geschichte." },
  "about.mission.p1":       { en: "We believe the best journeys happen on roads that haven't been optimised for speed.", de: "Wir glauben, dass die besten Reisen auf Straßen stattfinden, die nicht auf Geschwindigkeit optimiert wurden." },
  "about.mission.p2":       { en: "is a curated collection of the world's most breathtaking drives — each one handpicked by people who understand that the journey is the destination.", de: "ist eine kuratierte Sammlung der atemberaubendsten Fahrten der Welt — jede handverlesen von Menschen, die verstehen, dass die Reise das Ziel ist." },
  "about.mission.p3":       { en: "From alpine passes to coastal curves, we map the roads that reward the curious traveller with moments that GPS will never understand.", de: "Von Alpenpässen bis zu Küstenkurven kartieren wir die Straßen, die neugierige Reisende mit Momenten belohnen, die kein GPS je verstehen wird." },

  // About-Seite — Team
  "about.team.eyebrow":    { en: "The Team",                          de: "Das Team" },
  "about.team.heading1":   { en: "The people behind",                  de: "Die Menschen hinter" },
  "about.team.heading2":   { en: "the roads.",                         de: "den Straßen." },
  "about.team.sub":        { en: "A small crew of passionate drivers, designers and engineers building the tool we always wished existed.", de: "Ein kleines Team aus leidenschaftlichen Fahrer:innen, Designer:innen und Ingenieur:innen, das das Tool baut, das wir uns schon immer gewünscht haben." },
  "about.team.role1":      { en: "Co-Founder & Product",               de: "Mitgründer & Produkt" },
  "about.team.bio1":       { en: "Road tripper at heart. Built Scenic Routes because every great drive deserves to be discovered.", de: "Roadtripper mit Herz und Seele. Hat Scenic Routes gebaut, weil jede großartige Fahrt entdeckt werden sollte." },
  "about.team.role2":      { en: "Co-Founder & Engineering",           de: "Mitgründer & Engineering" },
  "about.team.bio2":       { en: "The brain behind the tech. Builds every feature from the ground up and keeps everything running smoothly.", de: "Der Kopf hinter der Technik. Baut jedes Feature von Grund auf und hält alles am Laufen." },
  "about.team.role3":      { en: "Design Manager",                     de: "Design Manager" },
  "about.team.bio3":       { en: "Makes sure every pixel is in its right place. Turns complex ideas into clean, beautiful interfaces.", de: "Sorgt dafür, dass jedes Pixel am richtigen Platz sitzt. Verwandelt komplexe Ideen in klare, schöne Interfaces." },
  "about.team.smallTeam":  { en: "A small team, big passion for the road.", de: "Ein kleines Team, große Leidenschaft für die Straße." },
  "about.team.joinTeam":   { en: "Join the team",                      de: "Werde Teil des Teams" },

  // About-Seite — CTA
  "about.cta.eyebrow":       { en: "Ready to explore?",                     de: "Bereit zu entdecken?" },
  "about.cta.heading1":      { en: "Your next great",                      de: "Dein nächster großer" },
  "about.cta.heading2":      { en: "road trip starts here.",               de: "Roadtrip beginnt hier." },
  "about.cta.sub":           { en: "Hundreds of handpicked routes. Endless open road.", de: "Hunderte handverlesene Routen. Endlos offene Straße." },
  "about.cta.browseRoutes":  { en: "Browse Routes",                        de: "Routen durchsuchen" },
  "about.cta.createAccount": { en: "Create Account",                       de: "Konto erstellen" },

  // My-Trips-Seite
  "mytrips.eyebrow":         { en: "Your Collection",                         de: "Deine Sammlung" },
  "mytrips.h1":              { en: "My Trips",                                de: "Meine Trips" },
  "mytrips.subtitle":        { en: "The journeys you've chosen to remember. Revisit your favorite scenic routes and plan your next adventure.", de: "Die Reisen, die du dir merken wolltest. Besuche deine liebsten Panoramastrecken erneut und plane dein nächstes Abenteuer." },
  "mytrips.stats.saved":     { en: "Saved Routes",                            de: "Gespeicherte Routen" },
  "mytrips.stats.countries": { en: "Countries",                               de: "Länder" },
  "mytrips.savedTitle":      { en: "Your saved scenic routes",                de: "Deine gespeicherten Panoramastrecken" },
  "mytrips.savedSuffix":     { en: "saved",                                   de: "gespeichert" },

  "mytrips.empty.signInTitle": { en: "Sign in to build your collection.",     de: "Melde dich an, um deine Sammlung aufzubauen." },
  "mytrips.empty.signInText":  { en: "Create an account and save the scenic routes you want to drive later.", de: "Erstelle ein Konto und speichere die Panoramastrecken, die du später fahren möchtest." },
  "mytrips.empty.loginBtn":    { en: "Login →",                               de: "Anmelden →" },
  "mytrips.empty.noRoutesTitle": { en: "No saved routes yet.",                de: "Noch keine gespeicherten Routen." },
  "mytrips.empty.noRoutesText":  { en: "Explore the collection and save the routes that speak to you.", de: "Durchstöbere die Sammlung und speichere die Routen, die dich ansprechen." },
  "mytrips.empty.exploreBtn":    { en: "Explore Routes →",                    de: "Routen entdecken →" },

  "mytrips.openRoute":       { en: "Open route",                              de: "Route öffnen" },
  "mytrips.removeFromSaved": { en: "Remove from saved",                       de: "Aus Gespeicherten entfernen" },
  "mytrips.remove":          { en: "Remove",                                  de: "Entfernen" },
  "mytrips.loadMore":        { en: "Load more routes",                        de: "Weitere Routen laden" },
  "mytrips.showing":         { en: "Showing",                                 de: "Zeige" },
  "common.of":               { en: "of",                                      de: "von" },
  "common.routes":           { en: "routes",                                  de: "Routen" },

  // Explore-Seite — Hero & Suche
  "explore.hero.eyebrow":     { en: "Discover · Explore · Drive",              de: "Entdecken · Erkunden · Fahren" },
  "explore.hero.titleLine1":  { en: "Find your",                               de: "Finde deine" },
  "explore.hero.titleLine2":  { en: "perfect route",                          de: "perfekte Route" },
  "explore.hero.sub":         { en: "Search through hundreds of handpicked scenic drives — filtered by country, duration.", de: "Durchsuche Hunderte handverlesener Panoramastrecken — gefiltert nach Land und Dauer." },
  "explore.search.country":       { en: "Country",              de: "Land" },
  "explore.search.duration":      { en: "Duration",             de: "Dauer" },
  "explore.search.chooseDest":    { en: "Choose destination",   de: "Reiseziel wählen" },
  "explore.search.chooseDur":     { en: "Choose duration",      de: "Dauer wählen" },
  "explore.search.allCountries":  { en: "All countries",        de: "Alle Länder" },
  "explore.search.anyDuration":   { en: "Any duration",         de: "Beliebige Dauer" },
  "explore.search.destAvailable": { en: "destinations available", de: "Reiseziele verfügbar" },
  "explore.search.durAvailable":  { en: "durations available",  de: "Dauern verfügbar" },
  "explore.search.findRoute":     { en: "Find Route",           de: "Route finden" },
  "explore.search.searchCountries": { en: "Search for countries", de: "Länder suchen" },

  // Explore-Seite — Ergebnisse & Filter
  "explore.loading":         { en: "Loading routes…",           de: "Routen werden geladen…" },
  "explore.routesFound":     { en: "routes found",              de: "Routen gefunden" },
  "explore.filters":         { en: "Filters",                   de: "Filter" },
  "explore.resetAll":        { en: "Reset all",                 de: "Alles zurücksetzen" },
  "explore.terrain":         { en: "Terrain",                   de: "Gelände" },
  "explore.minRating":       { en: "Minimum Rating",             de: "Mindestbewertung" },
  "explore.country":         { en: "Country",                   de: "Land" },
  "explore.clearAll":        { en: "Clear all",                 de: "Alle löschen" },
  "explore.clearFilters":    { en: "Clear Filters",              de: "Filter löschen" },
  "explore.noRoutesFound":   { en: "No routes found.",           de: "Keine Routen gefunden." },
  "explore.tryAdjusting":    { en: "Try adjusting your filters or search for a different destination.", de: "Versuche, deine Filter anzupassen oder nach einem anderen Reiseziel zu suchen." },
  "explore.viewRoute":       { en: "View Route",                 de: "Route ansehen" },
  "explore.loadMore":        { en: "Load more routes",           de: "Weitere Routen laden" },
} as const;

export type TranslationKey = keyof typeof translations;
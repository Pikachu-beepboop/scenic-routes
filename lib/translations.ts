// Zentrale Übersetzungs-Tabelle. Jeder Key hat einen englischen, deutschen
// und russischen Text. Neue Texte einfach hier ergänzen und im JSX mit
// t("mein.key") statt dem hartcodierten String verwenden.
//
// Konvention für Keys: bereich.unterbereich.name (z.B. "nav.explore")

export const translations = {
  // Navigation — auf allen Seiten identisch
  "nav.explore":    { en: "Explore Routes",  de: "Routen entdecken", ru: "Маршруты" },
  "nav.about":      { en: "About",           de: "Über uns",         ru: "О нас" },
  "nav.myTrips":    { en: "My Trips",        de: "Meine Trips",      ru: "Мои поездки" },
  "nav.login":      { en: "Login",           de: "Anmelden",         ru: "Войти" },
  "nav.profile":    { en: "Profile",         de: "Profil",           ru: "Профиль" },
  "nav.signOut":    { en: "Sign Out",        de: "Abmelden",         ru: "Выйти" },
  "nav.adminPanel": { en: "Admin Panel",     de: "Admin-Bereich",    ru: "Панель администратора" },
  "nav.navigate":   { en: "Navigate",        de: "Navigation",       ru: "Навигация" },
  "nav.account":    { en: "Account",         de: "Konto",            ru: "Аккаунт" },

  // Preferences-Seite / Preferences-Tab im Profil
  "prefs.title":        { en: "Preferences",                              de: "Einstellungen",                                ru: "Настройки" },
  "prefs.subtitle":     { en: "Units, language, map style and recommendations.", de: "Einheiten, Sprache, Kartenstil und Empfehlungen.", ru: "Единицы измерения, язык, стиль карты и рекомендации." },
  "prefs.distanceUnit": { en: "Distance Unit",                             de: "Entfernungseinheit",                           ru: "Единица расстояния" },
  "prefs.language":     { en: "Language",                                  de: "Sprache",                                      ru: "Язык" },
  "prefs.startPage":    { en: "Start Page",                                de: "Startseite",                                   ru: "Начальная страница" },
  "prefs.mapStyle":     { en: "Default Map Style",                         de: "Standard-Kartenstil",                          ru: "Стиль карты по умолчанию" },
  "prefs.km":           { en: "Kilometers",                                de: "Kilometer",                                    ru: "Километры" },
  "prefs.mi":           { en: "Miles",                                     de: "Meilen",                                       ru: "Мили" },
  "prefs.scenic":       { en: "Scenic",                                    de: "Landschaftlich",                               ru: "Живописный" },
  "prefs.satellite":    { en: "Satellite",                                 de: "Satellit",                                     ru: "Спутник" },

  // Allgemein
  "common.saveChanges":  { en: "Save Changes",              de: "Änderungen speichern",           ru: "Сохранить изменения" },
  "common.saving":       { en: "Saving...",                 de: "Wird gespeichert...",             ru: "Сохранение..." },
  "common.cancel":       { en: "Cancel",                    de: "Abbrechen",                        ru: "Отмена" },
  "common.theme":        { en: "Theme",                     de: "Design",                           ru: "Тема" },
  "common.roleExplorer": { en: "Scenic Route Explorer",     de: "Landschaftsrouten-Entdecker",       ru: "Исследователь живописных маршрутов" },

  // Homepage — Hero
  "home.hero.line1":    { en: "Start",                                            de: "Starte",                                                  ru: "Начни" },
  "home.hero.line2":    { en: "your journey",                                     de: "deine Reise",                                             ru: "своё путешествие" },
  "home.hero.subtitle": { en: "Scenic drives. Hidden places. Stories worth the journey.", de: "Traumhafte Fahrten. Versteckte Orte. Geschichten, die die Reise wert sind.", ru: "Живописные дороги. Скрытые места. Истории, ради которых стоит отправиться в путь." },

  // Homepage — Popular Destinations
  "home.popular.eyebrow":      { en: "Popular Destinations",              de: "Beliebte Ziele",                    ru: "Популярные направления" },
  "home.popular.headLine1":    { en: "Roads made",                        de: "Straßen gemacht",                   ru: "Дороги, созданные" },
  "home.popular.headLine2":    { en: "for the journey",                   de: "für die Reise",                     ru: "для путешествия" },
  "home.popular.viewAll":      { en: "View all destinations",             de: "Alle Ziele ansehen",                ru: "Смотреть все направления" },
  "home.popular.fallbackType": { en: "Scenic Route",                      de: "Landschaftsroute",                  ru: "Живописный маршрут" },
  "home.popular.fallbackDesc": { en: "One of the world's most scenic driving routes", de: "Eine der schönsten Panoramastrecken der Welt", ru: "Один из самых живописных автомобильных маршрутов мира" },

  // Homepage — Builder
  "home.builder.eyebrow":   { en: "Build your route",       de: "Route zusammenstellen",     ru: "Составь свой маршрут" },
  "home.builder.headLine1": { en: "Your journey,",          de: "Deine Reise,",              ru: "Твоё путешествие," },
  "home.builder.headLine2": { en: "your way",                de: "auf deine Art",             ru: "по-своему" },
  "home.builder.sub":       { en: "Discover handpicked scenic drives and find the route that fits your next adventure.", de: "Entdecke handverlesene Panoramastrecken und finde die Route für dein nächstes Abenteuer.", ru: "Открой для себя тщательно отобранные живописные маршруты и найди подходящий для следующего приключения." },
  "home.builder.findRoute": { en: "Find Route",              de: "Route finden",              ru: "Найти маршрут" },

  // Homepage — Destinations Map
  "home.dest.eyebrow": { en: "Destinations",                          de: "Reiseziele",                            ru: "Направления" },
  "home.dest.heading": { en: "Places that stay with you",             de: "Orte, die bleiben",                     ru: "Места, которые остаются с тобой" },
  "home.dest.sub":     { en: "Explore handpicked regions around the world", de: "Entdecke handverlesene Regionen weltweit", ru: "Исследуй тщательно отобранные регионы по всему миру" },

  // Homepage — Features
  "home.features.eyebrow":       { en: "Why travel with Scenic Routes", de: "Warum mit Scenic Routes reisen",  ru: "Почему путешествовать со Scenic Routes" },
  "home.features.headLine1":     { en: "Designed for",                  de: "Gemacht für",                       ru: "Создано для" },
  "home.features.headLine2":     { en: "the road ahead",                de: "die Straße vor dir",                ru: "дороги впереди" },
  "home.features.curated.title": { en: "Curated with care",             de: "Sorgfältig kuratiert",              ru: "Тщательно отобрано" },
  "home.features.curated.text":  { en: "Handpicked routes and places researched by real travelers.", de: "Handverlesene Routen und Orte, recherchiert von echten Reisenden.", ru: "Маршруты и места, отобранные и исследованные реальными путешественниками." },
  "home.features.detail.title":  { en: "Driven by detail",              de: "Detailverliebt",                    ru: "Внимание к деталям" },
  "home.features.detail.text":   { en: "Maps, tips, and insights that make every mile smoother.", de: "Karten, Tipps und Insights, die jede Meile angenehmer machen.", ru: "Карты, советы и инсайты, которые делают каждую милю приятнее." },
  "home.features.freedom.title": { en: "Built for freedom",             de: "Für Freiheit gemacht",              ru: "Создано для свободы" },
  "home.features.freedom.text":  { en: "Flexible plans that adapt to the way you travel.", de: "Flexible Pläne, die sich deiner Reiseweise anpassen.", ru: "Гибкие планы, которые подстраиваются под твой стиль путешествий." },
  "home.features.stories.title": { en: "Stories that inspire",          de: "Geschichten, die inspirieren",      ru: "Истории, которые вдохновляют" },
  "home.features.stories.text":  { en: "Journeys, guides, and journals to fuel your next adventure.", de: "Reisen, Guides und Journale für dein nächstes Abenteuer.", ru: "Путешествия, гиды и дневники для твоего следующего приключения." },

  // Homepage — Testimonials
  "home.testimonial.quote1": { en: "Every curve led to something unforgettable. Scenic Routes turned a trip into a story.", de: "Jede Kurve führte zu etwas Unvergesslichem. Scenic Routes hat aus einer Fahrt eine Geschichte gemacht.", ru: "Каждый поворот вёл к чему-то незабываемому. Scenic Routes превратил поездку в историю." },
  "home.testimonial.role1":  { en: "Traveler",              de: "Reisende",                          ru: "Путешественница" },
  "home.testimonial.quote2": { en: "I've driven roads all over the world. Scenic Routes showed me places I never would have found alone.", de: "Ich bin schon auf Straßen rund um die Welt gefahren. Scenic Routes hat mir Orte gezeigt, die ich allein nie gefunden hätte.", ru: "Я проехал по дорогам всего мира. Scenic Routes показал мне места, которые я никогда бы не нашёл сам." },
  "home.testimonial.role2":  { en: "Automotive Journalist", de: "Automobil-Journalist",              ru: "Автомобильный журналист" },
  "home.testimonial.quote3": { en: "The routes, the timing, the hidden gems along the way — absolutely flawless.", de: "Die Routen, das Timing, die versteckten Perlen unterwegs — absolut makellos.", ru: "Маршруты, тайминг, скрытые жемчужины по пути — всё было безупречно." },
  "home.testimonial.role3":  { en: "World Traveler",        de: "Weltenbummlerin",                   ru: "Путешественница по миру" },

  // Homepage — Footer
  "home.footer.tagline": { en: "Thoughtfully curated road trips for people who value the journey as much as the destination", de: "Sorgfältig kuratierte Roadtrips für Menschen, denen die Reise genauso wichtig ist wie das Ziel", ru: "Продуманные автопутешествия для тех, кому дорога важна так же, как и пункт назначения" },
  "home.footer.rights":  { en: "All Rights Reserved.",      de: "Alle Rechte vorbehalten.",           ru: "Все права защищены." },

  // Footer-Spalten
  "footer.col.explore": { en: "Explore", de: "Entdecken", ru: "Исследовать" },
  "footer.col.about":   { en: "About",   de: "Über uns",  ru: "О нас" },
  "footer.col.support": { en: "Support", de: "Support",   ru: "Поддержка" },
  "footer.col.legal":   { en: "Legal",   de: "Rechtliches", ru: "Правовая информация" },

  "footer.link.allRoutes":        { en: "All Routes",           de: "Alle Routen",              ru: "Все маршруты" },
  "footer.link.myTrips":          { en: "My Trips",             de: "Meine Trips",              ru: "Мои поездки" },
  "footer.link.profile":          { en: "Profile",              de: "Profil",                   ru: "Профиль" },
  "footer.link.travellerPass":    { en: "Traveller Pass",       de: "Reisepass",                ru: "Пропуск путешественника" },
  "footer.link.about":            { en: "About",                de: "Über uns",                 ru: "О нас" },
  "footer.link.ourTeam":          { en: "Our Team",              de: "Unser Team",               ru: "Наша команда" },
  "footer.link.faq":              { en: "FAQ",                   de: "Häufige Fragen",           ru: "Частые вопросы" },
  "footer.link.contact":          { en: "Contact",               de: "Kontakt",                  ru: "Контакты" },
  "footer.link.reportProblem":    { en: "Report a Problem",      de: "Problem melden",           ru: "Сообщить о проблеме" },
  "footer.link.reportRouteIssue": { en: "Report Route Issue",    de: "Routenproblem melden",     ru: "Сообщить о проблеме с маршрутом" },
  "footer.link.termsOfUse":       { en: "Terms of Use",          de: "Nutzungsbedingungen",      ru: "Условия использования" },
  "footer.link.privacyPolicy":    { en: "Privacy Policy",        de: "Datenschutz",              ru: "Политика конфиденциальности" },
  "footer.link.imprint":          { en: "Imprint",               de: "Impressum",                ru: "Выходные данные" },

// ==================== About-Seite ====================


  // About-Seite — Hero
  "about.eyebrow":     { en: "About Us",                                              de: "Über uns",                                                ru: "О нас" },
  "about.h1.line1":    { en: "Built by road lovers,",                                 de: "Gebaut von Straßenliebhabern,",                           ru: "Создано любителями дорог," },
  "about.h1.emphasis": { en: "for road lovers.",                                      de: "für Straßenliebhaber.",                                   ru: "для любителей дорог." },
  "about.hero.sub":    { en: "We started Scenic Routes because we were tired of GPS apps routing us through motorways. Every trip should feel like an adventure — we map the roads that make you pull over and stare.", de: "Wir haben Scenic Routes gestartet, weil wir es leid waren, dass GPS-Apps uns über Autobahnen leiten. Jede Fahrt sollte sich wie ein Abenteuer anfühlen — wir kartieren die Straßen, bei denen man anhalten und staunen muss.", ru: "Мы создали Scenic Routes, потому что устали от GPS-приложений, ведущих нас по автомагистралям. Каждая поездка должна ощущаться как приключение — мы наносим на карту дороги, ради которых хочется остановиться и просто смотреть." },
  "about.hero.explore":  { en: "Explore Routes", de: "Routen entdecken", ru: "Смотреть маршруты" },
  "about.hero.sayHello": { en: "Say Hello",       de: "Hallo sagen",     ru: "Написать нам" },

  // About-Seite — Stats
  "about.stats.routes":      { en: "Curated Routes", de: "Kuratierte Routen", ru: "Отобранных маршрутов" },
  "about.stats.countries":   { en: "Countries",       de: "Länder",            ru: "Стран" },
  "about.stats.travellers":  { en: "Travellers",      de: "Reisende",          ru: "Путешественников" },
  "about.stats.continents":  { en: "Continents",      de: "Kontinente",        ru: "Континентов" },

  // About-Seite — Values
  "about.values.eyebrow":    { en: "What we believe",                     de: "Woran wir glauben",                      ru: "Во что мы верим" },
  "about.values.heading1":   { en: "Three principles",                    de: "Drei Prinzipien",                        ru: "Три принципа" },
  "about.values.heading2":   { en: "that guide us.",                      de: "die uns leiten.",                        ru: "которые нас направляют." },
  "about.values.v1.title":   { en: "Slow Down",                           de: "Verlangsamen",                           ru: "Притормози" },
  "about.values.v1.text":    { en: "The fastest route is rarely the best one. We celebrate roads that make you pull over, breathe deep, and stay a little longer.", de: "Die schnellste Route ist selten die beste. Wir feiern Straßen, bei denen man anhält, durchatmet und ein bisschen länger bleibt.", ru: "Самый быстрый маршрут редко бывает лучшим. Мы ценим дороги, на которых хочется остановиться, вдохнуть полной грудью и задержаться подольше." },
  "about.values.v2.title":   { en: "Go Off-Script",                       de: "Vom Plan abweichen",                     ru: "Отклонись от плана" },
  "about.values.v2.text":    { en: "Every great road trip has an unplanned detour. We build tools that help you discover those moments — not avoid them.", de: "Jeder großartige Roadtrip hat einen ungeplanten Umweg. Wir bauen Tools, die dir helfen, diese Momente zu entdecken — nicht zu vermeiden.", ru: "В каждом отличном автопутешествии есть незапланированный крюк. Мы создаём инструменты, которые помогают находить такие моменты, а не избегать их." },
  "about.values.v3.title":   { en: "Leave It Better",                     de: "Es besser hinterlassen",                 ru: "Оставь место лучше" },
  "about.values.v3.text":    { en: "We only feature routes where travellers are welcome and nature is respected. Beautiful roads deserve careful guests.", de: "Wir zeigen nur Routen, auf denen Reisende willkommen sind und die Natur respektiert wird. Schöne Straßen verdienen rücksichtsvolle Gäste.", ru: "Мы показываем только маршруты, где путешественникам рады, а природу уважают. Красивые дороги заслуживают бережных гостей." },

  // About-Seite — Mission
  "about.mission.eyebrow":  { en: "Our Mission",              de: "Unsere Mission",                     ru: "Наша миссия" },
  "about.mission.heading1": { en: "Every road tells",          de: "Jede Straße erzählt",                ru: "Каждая дорога рассказывает" },
  "about.mission.heading2": { en: "a story.",                  de: "eine Geschichte.",                   ru: "свою историю." },
  "about.mission.p1":       { en: "We believe the best journeys happen on roads that haven't been optimised for speed.", de: "Wir glauben, dass die besten Reisen auf Straßen stattfinden, die nicht auf Geschwindigkeit optimiert wurden.", ru: "Мы верим, что лучшие путешествия случаются на дорогах, которые не оптимизированы под скорость." },
  "about.mission.p2":       { en: "is a curated collection of the world's most breathtaking drives — each one handpicked by people who understand that the journey is the destination.", de: "ist eine kuratierte Sammlung der atemberaubendsten Fahrten der Welt — jede handverlesen von Menschen, die verstehen, dass die Reise das Ziel ist.", ru: "— это подобранная коллекция самых захватывающих дорог мира: каждая выбрана людьми, которые понимают, что путь и есть цель." },
  "about.mission.p3":       { en: "From alpine passes to coastal curves, we map the roads that reward the curious traveller with moments that GPS will never understand.", de: "Von Alpenpässen bis zu Küstenkurven kartieren wir die Straßen, die neugierige Reisende mit Momenten belohnen, die kein GPS je verstehen wird.", ru: "От альпийских перевалов до прибрежных серпантинов — мы наносим на карту дороги, которые дарят любопытным путешественникам моменты, непостижимые для навигатора." },

  // About-Seite — Team
  "about.team.eyebrow":    { en: "The Team",                          de: "Das Team",                          ru: "Команда" },
  "about.team.heading1":   { en: "The people behind",                  de: "Die Menschen hinter",               ru: "Люди, стоящие" },
  "about.team.heading2":   { en: "the roads.",                         de: "den Straßen.",                      ru: "за этими дорогами." },
  "about.team.sub":        { en: "A small crew of passionate drivers, designers and engineers building the tool we always wished existed.", de: "Ein kleines Team aus leidenschaftlichen Fahrer:innen, Designer:innen und Ingenieur:innen, das das Tool baut, das wir uns schon immer gewünscht haben.", ru: "Небольшая команда увлечённых водителей, дизайнеров и инженеров, создающих инструмент, о котором мы всегда мечтали." },
  "about.team.role1":      { en: "Co-Founder & Product",               de: "Mitgründer & Produkt",              ru: "Сооснователь и продукт" },
  "about.team.bio1":       { en: "Road tripper at heart. Built Scenic Routes because every great drive deserves to be discovered.", de: "Roadtripper mit Herz und Seele. Hat Scenic Routes gebaut, weil jede großartige Fahrt entdeckt werden sollte.", ru: "Автопутешественник в душе. Создал Scenic Routes, потому что каждая отличная дорога заслуживает быть открытой." },
  "about.team.role2":      { en: "Co-Founder & Engineering",           de: "Mitgründer & Engineering",          ru: "Сооснователь и разработка" },
  "about.team.bio2":       { en: "The brain behind the tech. Builds every feature from the ground up and keeps everything running smoothly.", de: "Der Kopf hinter der Technik. Baut jedes Feature von Grund auf und hält alles am Laufen.", ru: "Технический мозг проекта. Создаёт каждую функцию с нуля и следит, чтобы всё работало без сбоев." },
  "about.team.role3":      { en: "Design Manager",                     de: "Design Manager",                    ru: "Руководитель дизайна" },
  "about.team.bio3":       { en: "Makes sure every pixel is in its right place. Turns complex ideas into clean, beautiful interfaces.", de: "Sorgt dafür, dass jedes Pixel am richtigen Platz sitzt. Verwandelt komplexe Ideen in klare, schöne Interfaces.", ru: "Следит, чтобы каждый пиксель был на своём месте. Превращает сложные идеи в чистые, красивые интерфейсы." },
  "about.team.smallTeam":  { en: "A small team, big passion for the road.", de: "Ein kleines Team, große Leidenschaft für die Straße.", ru: "Маленькая команда с большой страстью к дороге." },
  "about.team.joinTeam":   { en: "Join the team",                      de: "Werde Teil des Teams",              ru: "Присоединиться к команде" },

  // About-Seite — CTA
  "about.cta.eyebrow":       { en: "Ready to explore?",                     de: "Bereit zu entdecken?",                   ru: "Готовы исследовать?" },
  "about.cta.heading1":      { en: "Your next great",                      de: "Dein nächster großer",                   ru: "Твоё следующее большое" },
  "about.cta.heading2":      { en: "road trip starts here.",               de: "Roadtrip beginnt hier.",                 ru: "автопутешествие начинается здесь." },
  "about.cta.sub":           { en: "Hundreds of handpicked routes. Endless open road.", de: "Hunderte handverlesene Routen. Endlos offene Straße.", ru: "Сотни отобранных маршрутов. Бескрайняя открытая дорога." },
  "about.cta.browseRoutes":  { en: "Browse Routes",                        de: "Routen durchsuchen",                     ru: "Смотреть маршруты" },
  "about.cta.createAccount": { en: "Create Account",                       de: "Konto erstellen",                        ru: "Создать аккаунт" },

// ==================== My Trips-Seite ====================


  // My-Trips-Seite
  "mytrips.eyebrow":         { en: "Your Collection",                         de: "Deine Sammlung",                            ru: "Твоя коллекция" },
  "mytrips.h1":              { en: "My Trips",                                de: "Meine Trips",                               ru: "Мои поездки" },
  "mytrips.subtitle":        { en: "The journeys you've chosen to remember. Revisit your favorite scenic routes and plan your next adventure.", de: "Die Reisen, die du dir merken wolltest. Besuche deine liebsten Panoramastrecken erneut und plane dein nächstes Abenteuer.", ru: "Путешествия, которые ты решил(а) сохранить. Возвращайся к любимым живописным маршрутам и планируй следующее приключение." },
  "mytrips.stats.saved":     { en: "Saved Routes",                            de: "Gespeicherte Routen",                       ru: "Сохранённые маршруты" },
  "mytrips.stats.countries": { en: "Countries",                               de: "Länder",                                    ru: "Стран" },
  "mytrips.savedTitle":      { en: "Your saved scenic routes",                de: "Deine gespeicherten Panoramastrecken",      ru: "Твои сохранённые живописные маршруты" },
  "mytrips.savedSuffix":     { en: "saved",                                   de: "gespeichert",                               ru: "сохранено" },

  "mytrips.empty.signInTitle": { en: "Sign in to build your collection.",     de: "Melde dich an, um deine Sammlung aufzubauen.", ru: "Войди, чтобы создать свою коллекцию." },
  "mytrips.empty.signInText":  { en: "Create an account and save the scenic routes you want to drive later.", de: "Erstelle ein Konto und speichere die Panoramastrecken, die du später fahren möchtest.", ru: "Создай аккаунт и сохраняй живописные маршруты, которые хочешь проехать позже." },
  "mytrips.empty.loginBtn":    { en: "Login →",                               de: "Anmelden →",                                ru: "Войти →" },
  "mytrips.empty.noRoutesTitle": { en: "No saved routes yet.",                de: "Noch keine gespeicherten Routen.",          ru: "Пока нет сохранённых маршрутов." },
  "mytrips.empty.noRoutesText":  { en: "Explore the collection and save the routes that speak to you.", de: "Durchstöbere die Sammlung und speichere die Routen, die dich ansprechen.", ru: "Просмотри коллекцию и сохрани маршруты, которые тебя вдохновляют." },
  "mytrips.empty.exploreBtn":    { en: "Explore Routes →",                    de: "Routen entdecken →",                        ru: "Смотреть маршруты →" },

  "mytrips.openRoute":       { en: "Open route",                              de: "Route öffnen",                              ru: "Открыть маршрут" },
  "mytrips.removeFromSaved": { en: "Remove from saved",                       de: "Aus Gespeicherten entfernen",               ru: "Удалить из сохранённых" },
  "mytrips.remove":          { en: "Remove",                                  de: "Entfernen",                                 ru: "Удалить" },
  "mytrips.loadMore":        { en: "Load more routes",                        de: "Weitere Routen laden",                      ru: "Загрузить ещё маршруты" },
  "mytrips.showing":         { en: "Showing",                                 de: "Zeige",                                     ru: "Показано" },
  "common.of":               { en: "of",                                      de: "von",                                       ru: "из" },
  "common.routes":           { en: "routes",                                  de: "Routen",                                    ru: "маршрутов" },

// ==================== Explore-Seite ====================


  // Explore-Seite — Hero & Suche
  "explore.hero.eyebrow":     { en: "Discover · Explore · Drive",              de: "Entdecken · Erkunden · Fahren",             ru: "Открывай · Исследуй · Езжай" },
  "explore.hero.titleLine1":  { en: "Find your",                               de: "Finde deine",                               ru: "Найди свой" },
  "explore.hero.titleLine2":  { en: "perfect route",                          de: "perfekte Route",                            ru: "идеальный маршрут" },
  "explore.hero.sub":         { en: "Search through hundreds of handpicked scenic drives — filtered by country, duration.", de: "Durchsuche Hunderte handverlesener Panoramastrecken — gefiltert nach Land und Dauer.", ru: "Ищи среди сотен отобранных живописных маршрутов — с фильтрами по стране и продолжительности." },
  "explore.search.country":       { en: "Country",              de: "Land",                       ru: "Страна" },
  "explore.search.duration":      { en: "Duration",             de: "Dauer",                      ru: "Продолжительность" },
  "explore.search.chooseDest":    { en: "Choose destination",   de: "Reiseziel wählen",           ru: "Выбери направление" },
  "explore.search.chooseDur":     { en: "Choose duration",      de: "Dauer wählen",               ru: "Выбери продолжительность" },
  "explore.search.allCountries":  { en: "All countries",        de: "Alle Länder",                ru: "Все страны" },
  "explore.search.anyDuration":   { en: "Any duration",         de: "Beliebige Dauer",            ru: "Любая продолжительность" },
  "explore.search.destAvailable": { en: "destinations available", de: "Reiseziele verfügbar",     ru: "направлений доступно" },
  "explore.search.durAvailable":  { en: "durations available",  de: "Dauern verfügbar",           ru: "вариантов продолжительности" },
  "explore.search.findRoute":     { en: "Find Route",           de: "Route finden",               ru: "Найти маршрут" },
  "explore.search.searchCountries": { en: "Search for countries", de: "Länder suchen",            ru: "Поиск стран" },

  // Explore-Seite — Ergebnisse & Filter
  "explore.loading":         { en: "Loading routes…",           de: "Routen werden geladen…",     ru: "Загрузка маршрутов…" },
  "explore.routesFound":     { en: "routes found",              de: "Routen gefunden",            ru: "маршрутов найдено" },
  "explore.filters":         { en: "Filters",                   de: "Filter",                     ru: "Фильтры" },
  "explore.resetAll":        { en: "Reset all",                 de: "Alles zurücksetzen",         ru: "Сбросить всё" },
  "explore.terrain":         { en: "Terrain",                   de: "Gelände",                    ru: "Местность" },
  "explore.minRating":       { en: "Minimum Rating",             de: "Mindestbewertung",           ru: "Минимальный рейтинг" },
  "explore.country":         { en: "Country",                   de: "Land",                       ru: "Страна" },
  "explore.clearAll":        { en: "Clear all",                 de: "Alle löschen",               ru: "Очистить всё" },
  "explore.clearFilters":    { en: "Clear Filters",              de: "Filter löschen",             ru: "Очистить фильтры" },
  "explore.noRoutesFound":   { en: "No routes found.",           de: "Keine Routen gefunden.",     ru: "Маршруты не найдены." },
  "explore.tryAdjusting":    { en: "Try adjusting your filters or search for a different destination.", de: "Versuche, deine Filter anzupassen oder nach einem anderen Reiseziel zu suchen.", ru: "Попробуй изменить фильтры или поискать другое направление." },
  "explore.viewRoute":       { en: "View Route",                 de: "Route ansehen",              ru: "Смотреть маршрут" },
  "explore.loadMore":        { en: "Load more routes",           de: "Weitere Routen laden",       ru: "Загрузить ещё маршруты" },

  // ==================== Profile-Seite ====================

  // Subtab-Überschriften (Titel + Untertitel im Header der Megacard)
  "profile.subtab.profile.title":         { en: "Profile",                    de: "Profil",                          ru: "Профиль" },
  "profile.subtab.profile.subtitle":      { en: "Manage your personal information.", de: "Verwalte deine persönlichen Informationen.", ru: "Управляй своей личной информацией." },
  "profile.subtab.pass.title":            { en: "Traveller Pass",             de: "Reisepass",                       ru: "Пропуск путешественника" },
  "profile.subtab.pass.subtitle":         { en: "Your digital passport — stamps, routes and identity.", de: "Dein digitaler Reisepass — Stempel, Routen und Identität.", ru: "Твой цифровой паспорт — штампы, маршруты и личность." },
  "profile.subtab.email.title":           { en: "Email Address",              de: "E-Mail-Adresse",                  ru: "Адрес электронной почты" },
  "profile.subtab.email.subtitle":        { en: "Manage your email address associated with your account.", de: "Verwalte die E-Mail-Adresse deines Kontos.", ru: "Управляй адресом электронной почты своего аккаунта." },
  "profile.subtab.password.title":        { en: "Password",                   de: "Passwort",                        ru: "Пароль" },
  "profile.subtab.password.subtitle":     { en: "Change the password used to sign in.", de: "Ändere das Passwort für die Anmeldung.", ru: "Измени пароль для входа." },
  "profile.subtab.twofa.title":           { en: "Two-Factor Authentication",  de: "Zwei-Faktor-Authentifizierung",   ru: "Двухфакторная аутентификация" },
  "profile.subtab.twofa.subtitle":        { en: "Add an extra layer of security to your account.", de: "Füge deinem Konto eine zusätzliche Sicherheitsebene hinzu.", ru: "Добавь дополнительный уровень безопасности своему аккаунту." },
  "profile.subtab.sessions.title":        { en: "Sessions",                   de: "Sitzungen",                       ru: "Сеансы" },
  "profile.subtab.sessions.subtitle":     { en: "See where you're signed in and manage active sessions.", de: "Sieh, wo du angemeldet bist, und verwalte aktive Sitzungen.", ru: "Смотри, где ты вошёл(а) в систему, и управляй активными сеансами." },
  "profile.subtab.notifications.title":   { en: "Notifications",              de: "Benachrichtigungen",              ru: "Уведомления" },
  "profile.subtab.notifications.subtitle": { en: "Choose what you want to be notified about.", de: "Wähle aus, worüber du benachrichtigt werden möchtest.", ru: "Выбери, о чём ты хочешь получать уведомления." },
  "profile.subtab.privacy.title":         { en: "Privacy",                    de: "Datenschutz",                     ru: "Конфиденциальность" },
  "profile.subtab.privacy.subtitle":      { en: "Control your visibility and data.", de: "Kontrolliere deine Sichtbarkeit und Daten.", ru: "Управляй своей видимостью и данными." },
  "profile.subtab.support.title":         { en: "Support & Feedback",         de: "Support & Feedback",              ru: "Поддержка и отзывы" },
  "profile.subtab.support.subtitle":      { en: "Get help or send us your feedback.", de: "Hole dir Hilfe oder sende uns dein Feedback.", ru: "Получи помощь или отправь нам отзыв." },
  "profile.subtab.about.title":           { en: "About",                      de: "Über die App",                    ru: "О приложении" },
  "profile.subtab.about.subtitle":        { en: "Version, legal and app information.", de: "Version, rechtliche und App-Informationen.", ru: "Версия, правовая информация и сведения о приложении." },

  // Sub-Navigation (Sidebar / mobile Tab-Leiste)
  "profile.nav.settings":     { en: "Settings",  de: "Einstellungen", ru: "Настройки" },
  "profile.nav.account":      { en: "Account",   de: "Konto",         ru: "Аккаунт" },
  "profile.nav.security":     { en: "Security",  de: "Sicherheit",    ru: "Безопасность" },
  "profile.nav.more":         { en: "More",      de: "Mehr",          ru: "Ещё" },
  "profile.nav.emailShort":   { en: "Email",     de: "E-Mail",        ru: "Почта" },
  "profile.nav.passwordShort": { en: "Password", de: "Passwort",     ru: "Пароль" },
  "profile.nav.twofaShort":   { en: "2FA",       de: "2FA",           ru: "2FA" },
  "profile.nav.sessionsShort": { en: "Sessions", de: "Sitzungen",    ru: "Сеансы" },
  "profile.nav.passShort":    { en: "Pass",      de: "Pass",          ru: "Пропуск" },
  "profile.nav.notificationsShort": { en: "Notifications", de: "Benachrichtigungen", ru: "Уведомления" },
  "profile.nav.privacyShort": { en: "Privacy",   de: "Datenschutz",   ru: "Конфиденциальность" },
  "profile.nav.supportShort": { en: "Support",   de: "Support",       ru: "Поддержка" },
  "profile.nav.aboutShort":   { en: "About",     de: "Über",          ru: "О нас" },
  "profile.nav.myTrips":      { en: "My Trips",  de: "Meine Trips",   ru: "Мои поездки" },

  // Mobile-Menü-Abschnitte
  "profile.mobile.navigate": { en: "Navigate", de: "Navigation", ru: "Навигация" },
  "profile.mobile.account":  { en: "Account",  de: "Konto",       ru: "Аккаунт" },
  "profile.mobile.security": { en: "Security", de: "Sicherheit",  ru: "Безопасность" },
  "profile.mobile.more":     { en: "More",     de: "Mehr",        ru: "Ещё" },

  // Save-Button
  "profile.save.saving": { en: "Saving...",     de: "Wird gespeichert...", ru: "Сохранение..." },

  // Profile-Info-Karte
  "profile.info.title":         { en: "Profile Information",  de: "Profilinformationen",     ru: "Информация профиля" },
  "profile.info.displayName":   { en: "Display Name",          de: "Anzeigename",              ru: "Отображаемое имя" },
  "profile.info.displayNamePh": { en: "Your display name",     de: "Dein Anzeigename",         ru: "Твоё отображаемое имя" },
  "profile.info.username":      { en: "Username",               de: "Benutzername",             ru: "Имя пользователя" },
  "profile.info.usernamePh":    { en: "Your username",          de: "Dein Benutzername",        ru: "Твоё имя пользователя" },
  "profile.info.country":       { en: "Country",                 de: "Land",                     ru: "Страна" },
  "profile.info.selectCountry": { en: "Select country",          de: "Land auswählen",           ru: "Выбери страну" },
  "profile.info.timezone":      { en: "Time Zone",                de: "Zeitzone",                 ru: "Часовой пояс" },
  "profile.info.aboutYou":      { en: "About You",                de: "Über dich",                ru: "О себе" },
  "profile.info.aboutYouPh":    { en: "Mountain lover. Scenic roads enthusiast.", de: "Bergliebhaber. Fan von Panoramastraßen.", ru: "Люблю горы. Увлекаюсь живописными дорогами." },
  "profile.info.memberSince":   { en: "Member since",             de: "Mitglied seit",            ru: "Участник с" },

  // Traveller-Stats-Karte
  "profile.stats.title":     { en: "Traveller Stats", de: "Reise-Statistik", ru: "Статистика путешественника" },
  "profile.stats.trips":     { en: "Trips",            de: "Trips",            ru: "Поездки" },
  "profile.stats.countries": { en: "Countries",        de: "Länder",           ru: "Страны" },
  "profile.stats.saved":     { en: "Saved Routes",     de: "Gespeicherte Routen", ru: "Сохранённые маршруты" },
  "profile.stats.distance":  { en: "Distance Traveled", de: "Zurückgelegte Distanz", ru: "Пройденное расстояние" },

  // Profile-Completion-Karte
  "profile.completion.title":       { en: "Profile Completion", de: "Profil-Vollständigkeit", ru: "Заполненность профиля" },
  "profile.completion.hint":        { en: "Complete your profile to unlock badges and personalize your experience.", de: "Vervollständige dein Profil, um Abzeichen freizuschalten und dein Erlebnis zu personalisieren.", ru: "Заполни профиль, чтобы открыть значки и персонализировать свой опыт." },
  "profile.completion.addPhoto":    { en: "Add profile picture", de: "Profilbild hinzufügen",   ru: "Добавить фото профиля" },
  "profile.completion.addAbout":    { en: "Add about you",       de: "Über dich hinzufügen",    ru: "Добавить информацию о себе" },
  "profile.completion.addCountry":  { en: "Add country",         de: "Land hinzufügen",         ru: "Добавить страну" },
  "profile.completion.connectEmail": { en: "Connect your email", de: "E-Mail bestätigen",       ru: "Подтвердить email" },
  "profile.completion.setPreferences": { en: "Set preferences",  de: "Einstellungen festlegen", ru: "Настроить параметры" },

  // Traveller-Pass-Mini-Karte
  "profile.passMini.title": { en: "Traveller Pass",                   de: "Reisepass",                    ru: "Пропуск путешественника" },
  "profile.passMini.sub":   { en: "Your passport to explore the world.", de: "Dein Pass, um die Welt zu entdecken.", ru: "Твой паспорт для путешествий по миру." },
  "profile.passMini.active": { en: "Active",                          de: "Aktiv",                        ru: "Активен" },
  "profile.passMini.view":  { en: "View My Passport",                 de: "Meinen Pass ansehen",          ru: "Посмотреть мой паспорт" },

  // Danger Zone
  "profile.danger.title":  { en: "Danger Zone",     de: "Gefahrenzone",       ru: "Опасная зона" },
  "profile.danger.text":   { en: "Permanently delete your account and all of your data. This action cannot be undone.", de: "Lösche dein Konto und alle deine Daten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.", ru: "Безвозвратно удали свой аккаунт и все данные. Это действие невозможно отменить." },
  "profile.danger.delete": { en: "Delete Account",  de: "Konto löschen",      ru: "Удалить аккаунт" },

  // Email-Tab
  "profile.email.current":    { en: "Current Email Address",  de: "Aktuelle E-Mail-Adresse", ru: "Текущий адрес электронной почты" },
  "profile.email.verified":   { en: "Verified",                de: "Bestätigt",               ru: "Подтверждён" },
  "profile.email.unverified": { en: "Unverified",              de: "Nicht bestätigt",         ru: "Не подтверждён" },
  "profile.email.newTitle":   { en: "New Email Address",       de: "Neue E-Mail-Adresse",     ru: "Новый адрес электронной почты" },
  "profile.email.newPh":      { en: "Enter new email address", de: "Neue E-Mail-Adresse eingeben", ru: "Введи новый адрес электронной почты" },
  "profile.email.confirmTitle": { en: "Confirm With Password", de: "Mit Passwort bestätigen", ru: "Подтверди паролем" },
  "profile.email.confirmPh":  { en: "Enter your current password", de: "Aktuelles Passwort eingeben", ru: "Введи текущий пароль" },
  "profile.email.info":       { en: "We will send a verification link to your new email address.", de: "Wir senden einen Bestätigungslink an deine neue E-Mail-Adresse.", ru: "Мы отправим ссылку для подтверждения на твой новый адрес электронной почты." },
  "profile.email.change":     { en: "Change Email",            de: "E-Mail ändern",           ru: "Изменить почту" },
  "profile.email.sending":    { en: "Sending...",               de: "Wird gesendet...",        ru: "Отправка..." },

  // Password-Tab
  "profile.password.title":     { en: "Change Password",          de: "Passwort ändern",          ru: "Изменить пароль" },
  "profile.password.new":       { en: "New Password",              de: "Neues Passwort",           ru: "Новый пароль" },
  "profile.password.newPh":     { en: "Enter a new password",      de: "Neues Passwort eingeben",  ru: "Введи новый пароль" },
  "profile.password.confirm":   { en: "Confirm New Password",      de: "Neues Passwort bestätigen", ru: "Подтверди новый пароль" },
  "profile.password.confirmPh": { en: "Confirm new password",      de: "Neues Passwort bestätigen", ru: "Подтверди новый пароль" },
  "profile.password.change":    { en: "Change Password",           de: "Passwort ändern",          ru: "Изменить пароль" },
  "profile.password.saving":    { en: "Saving...",                  de: "Wird gespeichert...",      ru: "Сохранение..." },

  // 2FA-Tab
  "profile.twofa.title":      { en: "Two-Factor Authentication", de: "Zwei-Faktor-Authentifizierung", ru: "Двухфакторная аутентификация" },
  "profile.twofa.app":        { en: "Authenticator App",         de: "Authenticator-App",             ru: "Приложение-аутентификатор" },
  "profile.twofa.comingSoon": { en: "Coming soon — we're working on adding two-factor authentication.", de: "Demnächst verfügbar — wir arbeiten an der Zwei-Faktor-Authentifizierung.", ru: "Скоро — мы работаем над добавлением двухфакторной аутентификации." },

  // Sessions-Tab
  "profile.sessions.title":          { en: "Active Sessions",              de: "Aktive Sitzungen",          ru: "Активные сеансы" },
  "profile.sessions.thisDevice":     { en: "This device",                  de: "Dieses Gerät",              ru: "Это устройство" },
  "profile.sessions.currentSession": { en: "Current session · Active now", de: "Aktuelle Sitzung · Jetzt aktiv", ru: "Текущий сеанс · Активен сейчас" },
  "profile.sessions.active":         { en: "Active",                        de: "Aktiv",                     ru: "Активен" },
  "profile.sessions.signOutOthers":  { en: "Sign Out Of All Other Sessions", de: "Von allen anderen Sitzungen abmelden", ru: "Выйти из всех других сеансов" },
  "profile.sessions.signingOut":     { en: "Signing out...",                de: "Wird abgemeldet...",        ru: "Выход..." },

  // Notifications-Tab
  "profile.notif.title":          { en: "Notifications",       de: "Benachrichtigungen",       ru: "Уведомления" },
  "profile.notif.nearby":         { en: "New Routes Nearby",   de: "Neue Routen in der Nähe",   ru: "Новые маршруты рядом" },
  "profile.notif.nearbyText":     { en: "Get notified about newly recommended routes near you.", de: "Erhalte Benachrichtigungen über neu empfohlene Routen in deiner Nähe.", ru: "Получай уведомления о новых рекомендованных маршрутах поблизости." },
  "profile.notif.reminders":      { en: "Trip Reminders",      de: "Trip-Erinnerungen",        ru: "Напоминания о поездках" },
  "profile.notif.remindersText":  { en: "Get reminders for upcoming planned trips.", de: "Erhalte Erinnerungen für bevorstehende geplante Trips.", ru: "Получай напоминания о предстоящих запланированных поездках." },
  "profile.notif.community":      { en: "Community Updates",   de: "Community-Updates",        ru: "Обновления сообщества" },
  "profile.notif.communityText":  { en: "News and updates from Scenic Routes.", de: "Neuigkeiten und Updates von Scenic Routes.", ru: "Новости и обновления от Scenic Routes." },
  "profile.notif.emailSettings":  { en: "Email Settings",      de: "E-Mail-Einstellungen",     ru: "Настройки почты" },

  // Privacy-Tab
  "profile.privacy.title":     { en: "Privacy & Security", de: "Datenschutz & Sicherheit", ru: "Конфиденциальность и безопасность" },
  "profile.privacy.maps":      { en: "Google Maps",        de: "Google Maps",              ru: "Google Карты" },
  "profile.privacy.mapsText":  { en: "Load maps from Google Maps on route pages. Google may process your IP address and device information.", de: "Lädt Karten von Google Maps auf Routenseiten. Google kann deine IP-Adresse und Geräteinformationen verarbeiten.", ru: "Загружает карты Google Maps на страницах маршрутов. Google может обрабатывать твой IP-адрес и информацию об устройстве." },
  "profile.privacy.track":     { en: "Track Activity",     de: "Aktivität verfolgen",       ru: "Отслеживать активность" },
  "profile.privacy.trackText": { en: "Save your activity for personal statistics.", de: "Speichere deine Aktivität für persönliche Statistiken.", ru: "Сохраняй свою активность для личной статистики." },

  // Support-Tab
  "profile.support.title":     { en: "Support & Feedback",           de: "Support & Feedback",         ru: "Поддержка и отзывы" },
  "profile.support.faq":       { en: "FAQ",                           de: "Häufige Fragen",              ru: "Частые вопросы" },
  "profile.support.contact":   { en: "Contact Us",                    de: "Kontaktiere uns",              ru: "Связаться с нами" },
  "profile.support.tutorials": { en: "Tutorials & Help Articles",     de: "Anleitungen & Hilfeartikel",  ru: "Руководства и справочные статьи" },
  "profile.support.feedback":  { en: "Send Feedback",                 de: "Feedback senden",              ru: "Отправить отзыв" },

  // About-Tab
  "profile.about.title":   { en: "About",           de: "Über die App",     ru: "О приложении" },
  "profile.about.version": { en: "Version",         de: "Version",           ru: "Версия" },
  "profile.about.terms":   { en: "Terms of Use",    de: "Nutzungsbedingungen", ru: "Условия использования" },
  "profile.about.privacy": { en: "Privacy Policy",  de: "Datenschutz",       ru: "Политика конфиденциальности" },
  "profile.about.imprint": { en: "Impressum",       de: "Impressum",         ru: "Выходные данные" },

  // Konto-Löschen-Dialog
  "profile.delete.title":        { en: "Delete your account?", de: "Konto löschen?",           ru: "Удалить аккаунт?" },
  "profile.delete.text":         { en: "This will permanently delete your account, saved routes, and profile data. This action cannot be undone.", de: "Dadurch werden dein Konto, deine gespeicherten Routen und Profildaten dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.", ru: "Это безвозвратно удалит твой аккаунт, сохранённые маршруты и данные профиля. Это действие невозможно отменить." },
  "profile.delete.typeConfirm":  { en: "Type DELETE to confirm", de: "Gib DELETE ein, um zu bestätigen", ru: "Введи DELETE для подтверждения" },
  "profile.delete.deleting":     { en: "Deleting…",              de: "Wird gelöscht…",           ru: "Удаление…" },
} as const;

export type TranslationKey = keyof typeof translations;
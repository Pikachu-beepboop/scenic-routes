const seasonalRoutes = {
  spring: [
    {
      id: 1,
      country: "Austria",
      name: "Grossglockner High Alpine Road",
      desc: "One of the most spectacular high alpine roads...",
      duration: "3-4 hours",
      badge: "Perfect Spring Weather ✨",
      image: "/grossglockner-high-alpine.jpg" // Achte darauf, dass die Bilder im public-Ordner liegen
    },
    {
      id: 2,
      country: "Italy",
      name: "Tuscan Countryside Route",
      desc: "A picturesque journey through rolling hills...",
      duration: "1-2 days",
      badge: "Ideal Conditions ☀️",
      image: "/Toscana.jpg"
    },
    {
      id: 3,
      country: "Germany",
      name: "Black Forest High Road",
      desc: "A scenic route through Germany's legendary Black Forest...",
      duration: "2-3 hours",
      badge: "Magic 🌲",
      image: "/black-forest-b500.jpg"
    }
  ],
  // Hier kannst du später summer, autumn, winter ergänzen
};

export default seasonalRoutes; // <-- Das hier ganz unten oder oben ändern
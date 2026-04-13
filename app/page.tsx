export default function Home() {
  // Данные пока просто в коде (без базы), чтобы вы видели визуал
  const mockRoutes = [
    {
      id: 1,
      title: "Ледяные пещеры Ватнайёкюдль",
      country: "Исландия",
      price: "1,200",
      image: "https://unsplash.com",
      tag: "Экстрим"
    },
    {
      id: 2,
      title: "Доломитовые Альпы: Треккинг",
      country: "Италия",
      price: "950",
      image: "https://unsplash.com",
      tag: "Горы"
    },
    {
      id: 3,
      title: "Сафари в парке Серенгети",
      country: "Танзания",
      price: "2,100",
      image: "https://unsplash.com",
      tag: "Природа"
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Навигация (как в Wix) */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <div className="text-2xl font-black leading-[0.8] tracking-tighter">
          Scenic <br /> <span className="text-black ml-4">Routes</span>
        </div>
        <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
          <a href="#" className="text-black">Маршруты</a>
          <a href="#" className="hover:text-black transition">О нас</a>
          <a href="#" className="hover:text-black transition">Контакты</a>
          <a href="#" className="hover:text-black transition">Обезьянка</a>
        </div>
        <button className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-tighter hover:bg-gray-800 transition">
          Войти
        </button>
      </nav>

      {/* Hero-секция (Главный баннер) */}
      <section className="px-12 py-75 text-center border-b border-gray-100 bg-cover bg-[center_bottom_-150px] bg-no-repeat" style={{ backgroundImage: 'url("/mountains-forest.avif")' }}>
        <h1 className="text-[120px] text-white font-black leading-[0.8] tracking-tighter mb-8 uppercase">
          Scenic <br /> <span className="text-white">Routes</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto font-medium">
          Мы создаем невероятные маршруты для тех, кто ищет больше, чем просто отпуск и веселья.
        </p>
      </section>

      {/* Сетка маршрутов */}
      <section className="p-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {mockRoutes.map((route) => (
            <div key={route.id} className="group relative aspect-[3/4] overflow-hidden bg-gray-100 border border-gray-200">
              <img 
                src={route.image} 
                alt={route.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Контент поверх картинки */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors p-8 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded">
                    {route.tag}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest">{route.country}</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-2 leading-tight">{route.title}</h3>
                  <div className="flex justify-between items-center border-t border-white/30 pt-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-500">
                    <span className="text-xl font-bold">${route.price}</span>
                    <button className="text-sm font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">
                      Подробнее
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Футер */}
      <footer className="p-12 text-center text-gray-300 text-xs font-bold uppercase tracking-[0.2em]">
    
      </footer>
    </main>
  );
}

import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#0f172a] text-gray-400 py-12 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-left">
          
          {/* Logo & Beschreibung */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              {/* Einfaches Logo aus CSS-Kreisen */}
              <div className="w-6 h-6 bg-emerald-500 rounded-sm rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-xl font-bold tracking-tight">Scenic Routes</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Discover the world's most beautiful driving routes through mountains, coastlines, and breathtaking landscapes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Explore Routes</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">My Trips</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm text-left">
              <li className="flex items-center gap-3">
                <span className="text-emerald-500">📧</span>
                <a href="mailto:hello@scenicroutes.com" className="hover:text-white">hello@scenicroutes.com</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-emerald-500">📍</span>
                <span>Worldwide Routes</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <div className="flex gap-3">
              {/* Social Media als Text-Buttons */}
              {['IG', 'FB', 'X'].map((social) => (
                <a key={social} href="#" className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-emerald-600 hover:text-white transition-all">
                  {social}
                </a>
              ))}
            </div>
            {/* Hilfe Button */}
            <button className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold hover:scale-110 transition-transform">
              ?
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
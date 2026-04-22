import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

export default function Footer({ className = '' }) {
  return (
    <footer className={`bg-[#071220] text-white/40 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="mb-4">
            <img src="/logo-comebuy.png" alt="ComeBuy" className="h-18 w-auto" />
          </div>
          <p className="text-white/25 text-xs leading-relaxed mb-5">
            Votre marché en ligne livré à domicile en moins d'une heure. Produits frais, menus camerounais, épices authentiques.
          </p>
          <div className="flex gap-2">
            {['f', 'in', 'tw', 'wa'].map(s => (
              <div key={s} className="w-8 h-8 bg-white/8 hover:bg-white/15 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-white/40 hover:text-white text-xs font-bold uppercase">
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Catalogue */}
        <div>
          <p className="text-white font-semibold mb-4 text-sm">Catalogue</p>
          {[
            ['Menus & Ingrédients', '/catalogue/menus_ingredients'],
            ['Fruits & Légumes',    '/catalogue/fruits'],
            ['Boissons',            '/catalogue/boissons'],
            ['Boulangerie',         '/catalogue/boulangerie'],
            ['Épices & Condiments', '/catalogue/epices'],
          ].map(([l, h]) => (
            <Link key={h} to={h} className="block py-1.5 text-white/35 hover:text-white transition-colors text-xs">{l}</Link>
          ))}
        </div>

        {/* Compte */}
        <div>
          <p className="text-white font-semibold mb-4 text-sm">Mon Compte</p>
          {[
            ['Mon profil',     '/profil'],
            ['Mes commandes',  '/commandes'],
            ['Fidélité',       '/fidelite'],
            ['Notifications',  '/notifications'],
            ['Connexion',      '/connexion'],
          ].map(([l, h]) => (
            <Link key={h} to={h} className="block py-1.5 text-white/35 hover:text-white transition-colors text-xs">{l}</Link>
          ))}
        </div>

        {/* Contact */}
        <div>
          <p className="text-white font-semibold mb-4 text-sm">Contact</p>
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs">
              <MapPin size={12} className="mt-0.5 shrink-0 text-amber-400"/>
              <span>Yaoundé &amp; Douala, Cameroun</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Phone size={12} className="text-amber-400 shrink-0"/>
              <span>+237 6XX XXX XXX</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Mail size={12} className="text-amber-400 shrink-0"/>
              <span>contact@comebuy.cm</span>
            </div>
          </div>
          <p className="text-white/50 font-medium mt-5 mb-2 text-xs">Horaires de livraison</p>
          {[
            ['Lun – Ven', '7h – 20h'],
            ['Samedi',     '7h – 18h'],
            ['Dimanche',   '8h – 14h'],
          ].map(([j, h]) => (
            <div key={j} className="flex items-center gap-2 text-xs mb-1">
              <Clock size={11} className="text-amber-400 shrink-0"/>
              <span className="text-white/30">{j}</span>
              <span className="ml-auto">{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust signals */}
      <div className="border-t border-white/8 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">🛵</span>
              <p className="text-white/70 text-xs font-semibold">Livraison rapide</p>
              <p className="text-white/30 text-[10px]">En moins d'1 heure</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">🔒</span>
              <p className="text-white/70 text-xs font-semibold">Paiement sécurisé</p>
              <p className="text-white/30 text-[10px]">Mobile Money & Espèces</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">🌿</span>
              <p className="text-white/70 text-xs font-semibold">Produits frais</p>
              <p className="text-white/30 text-[10px]">Du marché local chaque matin</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">💬</span>
              <p className="text-white/70 text-xs font-semibold">Support WhatsApp</p>
              <a href="https://wa.me/237600000000" className="text-amber-400 text-[10px] hover:underline">+237 6XX XXX XXX</a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 py-4 text-center text-xs text-white/18">
        © 2026 ComeBuy · Cameroun — Tous droits réservés
      </div>
    </footer>
  )
}

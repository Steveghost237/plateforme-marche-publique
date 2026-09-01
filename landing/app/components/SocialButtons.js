'use client';
import styles from './SocialButtons.module.css';

const FACEBOOK_URL  = 'https://www.facebook.com/comebuy237';
const INSTAGRAM_URL = 'https://www.instagram.com/comebuy237';
const TIKTOK_URL    = 'https://www.tiktok.com/@comebuy237';

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.514c-1.491 0-1.956.932-1.956 1.888v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.81 1.55V6.79a4.85 4.85 0 0 1-1.04-.1z"/>
    </svg>
  );
}

const NETWORKS = [
  {
    id: 'facebook',
    name: 'Facebook',
    url: FACEBOOK_URL,
    Icon: IconFacebook,
    color: '#1877F2',
    bg: '#E8F0FE',
    followers: '2.4K',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: INSTAGRAM_URL,
    Icon: IconInstagram,
    color: '#E1306C',
    bg: '#FCE4EC',
    followers: '1.8K',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: TIKTOK_URL,
    Icon: IconTikTok,
    color: '#010101',
    bg: '#F3F4F6',
    followers: '3.1K',
  },
];

// ── Variante : icônes rondes compactes ──────────────────────────────────────
export function SocialIcons({ light = false }) {
  return (
    <div className={styles.iconsRow}>
      {NETWORKS.map(({ id, name, url, Icon, color }) => (
        <a
          key={id}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Suivez-nous sur ${name}`}
          className={styles.iconBtn}
          style={{ '--brand': color }}
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}

// ── Variante : pilules avec libellé ─────────────────────────────────────────
export function SocialChips() {
  return (
    <div className={styles.chipsRow}>
      {NETWORKS.map(({ id, name, url, Icon, color }) => (
        <a
          key={id}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.chip}
          style={{ '--brand': color }}
        >
          <Icon />
          <span>{name}</span>
        </a>
      ))}
    </div>
  );
}

// ── Variante : cartes avec compteur abonnés ──────────────────────────────────
export function SocialCards() {
  return (
    <div className={styles.cardsRow}>
      {NETWORKS.map(({ id, name, url, Icon, color, bg, followers }) => (
        <a
          key={id}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.card}
          style={{ '--brand': color, '--brand-bg': bg }}
        >
          <div className={styles.cardIcon} style={{ background: color }}>
            <Icon />
          </div>
          <div className={styles.cardInfo}>
            <span className={styles.cardName}>{name}</span>
            <span className={styles.cardFollowers}>{followers} abonnés</span>
          </div>
          <div className={styles.cardFollow}>Suivre</div>
        </a>
      ))}
    </div>
  );
}

// ── Export par défaut : section complète ────────────────────────────────────
export default function SocialSection({ title = 'Rejoignez notre communauté' }) {
  return (
    <div className={styles.section}>
      {title && <p className={styles.sectionLabel}>{title}</p>}
      <SocialCards />
    </div>
  );
}

'use client';
import styles from './page.module.css';
import { SocialIcons, SocialChips, SocialCards } from './components/SocialButtons';

const NAVY   = '#0D2137';
const AMBER  = '#FBBF24';
const ORANGE = '#FF6600';
const GREEN  = '#16A34A';

export default function Home() {
  return (
    <div className={styles.root}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🛒</span>
            <span className={styles.logoText}>Come<b>Buy</b></span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Fonctionnalités</a>
            <a href="#paiements">Paiements</a>
            <a href="#contact">Contact</a>
            <a href="#download" className={styles.navCta}>Télécharger l'app</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>🇨🇲 Fait au Cameroun</div>
          <h1 className={styles.heroTitle}>
            La marketplace<br />
            <span className={styles.accent}>numérique du Cameroun</span>
          </h1>
          <p className={styles.heroSub}>
            Achetez et vendez en toute sécurité. Paiement instantané par MTN Mobile Money,
            Orange Money, carte bancaire ou PayPal. Livraison rapide partout au Cameroun.
          </p>
          <div className={styles.heroBtns}>
            <a href="#download" className={styles.btnPrimary}>
              📱 Télécharger l'app
            </a>
            <a href="https://comebuy-api.onrender.com/docs" target="_blank" rel="noreferrer" className={styles.btnOutline}>
              📖 Documentation API
            </a>
          </div>
          {/* Réseaux sociaux — sous les CTA */}
          <div className={styles.heroSocial}>
            <span className={styles.heroSocialLabel}>Suivez-nous</span>
            <SocialIcons light />
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}><b>4</b><span>Moyens de paiement</span></div>
            <div className={styles.statDivider} />
            <div className={styles.stat}><b>🔒</b><span>Paiements sécurisés</span></div>
            <div className={styles.statDivider} />
            <div className={styles.stat}><b>🇨🇲</b><span>Cameroun</span></div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.phoneFrame}>
            <div className={styles.phoneSc}>
              <div className={styles.appHeader}>
                <span>🛒 ComeBuy</span>
                <span>🔔</span>
              </div>
              <div className={styles.appSearch}>🔍 Rechercher un produit…</div>
              <div className={styles.appGrid}>
                {['📱 Téléphones', '👗 Mode', '🏠 Maison', '🍎 Alimentation', '💻 Informatique', '🚗 Auto'].map((c) => (
                  <div key={c} className={styles.appCat}>{c}</div>
                ))}
              </div>
              <div className={styles.appLabel}>Paiement via</div>
              <div className={styles.payRow}>
                <span className={styles.payBadge} style={{background:'#FFD700',color:'#333'}}>MTN</span>
                <span className={styles.payBadge} style={{background:ORANGE,color:'#fff'}}>Orange</span>
                <span className={styles.payBadge} style={{background:'#635BFF',color:'#fff'}}>Stripe</span>
                <span className={styles.payBadge} style={{background:'#003087',color:'#fff'}}>PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIEMENTS ── */}
      <section id="paiements" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Moyens de paiement acceptés</h2>
          <p className={styles.sectionSub}>
            Paiements traités en temps réel via des partenaires certifiés et sécurisés
          </p>
          <div className={styles.payGrid}>
            <PayCard
              icon="🟡"
              name="MTN Mobile Money"
              desc="Paiement instantané via notification USSD. Confirmez avec votre code PIN MTN."
              color="#FFD700"
              provider="NotchPay"
              tag="Cameroun"
            />
            <PayCard
              icon="🟠"
              name="Orange Money"
              desc="Paiement sécurisé via la page Orange Money ou notification directe."
              color={ORANGE}
              provider="NotchPay"
              tag="Cameroun"
            />
            <PayCard
              icon="💳"
              name="Carte bancaire"
              desc="Visa, Mastercard et toutes cartes internationales via Stripe Checkout."
              color="#635BFF"
              provider="Stripe"
              tag="International"
            />
            <PayCard
              icon="🅿️"
              name="PayPal"
              desc="Paiement sécurisé PayPal avec conversion automatique FCFA → EUR."
              color="#003087"
              provider="PayPal"
              tag="International"
            />
          </div>

          {/* Logos partenaires */}
          <div className={styles.partners}>
            <p className={styles.partnersLabel}>Nos partenaires de paiement</p>
            <div className={styles.partnerLogos}>
              <div className={styles.partnerChip} style={{background:'#f0f4ff'}}>
                <b style={{color:'#635BFF'}}>stripe</b>
              </div>
              <div className={styles.partnerChip} style={{background:'#e8f4fd'}}>
                <b style={{color:'#003087'}}>PayPal</b>
              </div>
              <div className={styles.partnerChip} style={{background:'#fff8e1'}}>
                <b style={{color:'#0D2137'}}>NotchPay</b>
              </div>
              <div className={styles.partnerChip} style={{background:'#fff7ed'}}>
                <b style={{color:ORANGE}}>Orange Money</b>
              </div>
              <div className={styles.partnerChip} style={{background:'#fefce8'}}>
                <b style={{color:'#a16207'}}>MTN MoMo</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="features" className={styles.sectionGray}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pourquoi choisir ComeBuy ?</h2>
          <div className={styles.featureGrid}>
            <Feature icon="⚡" title="Paiements en temps réel" desc="Confirmations instantanées. L'acheteur et le vendeur sont notifiés dès que le paiement est validé." />
            <Feature icon="🔒" title="Sécurité maximale" desc="Webhooks signés HMAC-SHA256. Données chiffrées. Aucune carte bancaire stockée." />
            <Feature icon="📦" title="Gestion des commandes" desc="Suivi en direct des commandes depuis la commande jusqu'à la livraison." />
            <Feature icon="📍" title="Livraison au Cameroun" desc="Zones de livraison configurables avec calcul automatique des frais selon la distance." />
            <Feature icon="🏪" title="Multi-vendeurs" desc="Plusieurs vendeurs sur la même plateforme. Chacun gère son catalogue et ses commandes." />
            <Feature icon="📊" title="Tableau de bord" desc="Statistiques de ventes, commandes en attente, paiements reçus — tout en un coup d'œil." />
          </div>
        </div>
      </section>

      {/* ── TÉLÉCHARGEMENT ── */}
      <section id="download" className={styles.downloadSection}>
        <div className={styles.sectionInner} style={{textAlign:'center'}}>
          <h2 style={{fontSize:32,fontWeight:800,color:'#fff',margin:'0 0 12px'}}>
            Téléchargez l'application
          </h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:16,margin:'0 0 32px'}}>
            Disponible sur Android. iOS bientôt disponible.
          </p>
          <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
            <a
              href="https://comebuy-api.onrender.com/static/app-release.apk"
              className={styles.downloadBtn}
            >
              📱 Télécharger APK Android
            </a>
          </div>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:16}}>
            Version actuelle — Compatible Android 6.0+
          </p>
          {/* Réseaux sociaux dans la section téléchargement */}
          <div style={{marginTop:36,paddingTop:32,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:16}}>
              Rejoignez notre communauté
            </p>
            <SocialChips />
          </div>
        </div>
      </section>

      {/* ── API / KYC ── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Intégration & API</h2>
          <p className={styles.sectionSub}>
            Backend REST API FastAPI disponible pour les partenaires et intégrateurs
          </p>
          <div className={styles.apiCard}>
            <div className={styles.apiInfo}>
              <div className={styles.apiItem}>
                <span className={styles.apiLabel}>API Backend</span>
                <a href="https://comebuy-api.onrender.com" target="_blank" rel="noreferrer" className={styles.apiLink}>
                  comebuy-api.onrender.com
                </a>
              </div>
              <div className={styles.apiItem}>
                <span className={styles.apiLabel}>Documentation</span>
                <a href="https://comebuy-api.onrender.com/docs" target="_blank" rel="noreferrer" className={styles.apiLink}>
                  comebuy-api.onrender.com/docs
                </a>
              </div>
              <div className={styles.apiItem}>
                <span className={styles.apiLabel}>Webhook NotchPay</span>
                <code className={styles.code}>https://comebuy-api.onrender.com/api/webhooks/notchpay</code>
              </div>
              <div className={styles.apiItem}>
                <span className={styles.apiLabel}>Webhook Stripe</span>
                <code className={styles.code}>https://comebuy-api.onrender.com/api/webhooks/stripe</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className={styles.sectionGray}>
        <div className={styles.sectionInner} style={{textAlign:'center'}}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <div className={styles.contactGrid}>
            <ContactCard icon="📧" label="Email" value="comebuy237@gmail.com" href="mailto:comebuy237@gmail.com" />
            <ContactCard icon="📍" label="Pays" value="Cameroun 🇨🇲" />
            <ContactCard icon="🌐" label="API" value="comebuy-api.onrender.com" href="https://comebuy-api.onrender.com" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span>🛒</span>
            <b>ComeBuy</b>
          </div>
          <p className={styles.footerDesc}>
            Plateforme de commerce en ligne sécurisée — Cameroun
          </p>
          {/* Réseaux sociaux dans le footer */}
          <div className={styles.footerSocial}>
            <SocialIcons />
          </div>
          <div className={styles.footerLinks}>
            <a href="#">Mentions légales</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Contact</a>
          </div>
          <p className={styles.footerCopy}>© 2026 ComeBuy. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

function PayCard({ icon, name, desc, color, provider, tag }) {
  return (
    <div className={styles.payCard}>
      <div className={styles.payCardIcon} style={{ background: color + '20', border: `2px solid ${color}40` }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
      </div>
      <h3 className={styles.payCardName}>{name}</h3>
      <p className={styles.payCardDesc}>{desc}</p>
      <div className={styles.payCardFooter}>
        <span className={styles.payCardProvider}>via {provider}</span>
        <span className={styles.payCardTag}>{tag}</span>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  );
}

function ContactCard({ icon, label, value, href }) {
  return (
    <div className={styles.contactCard}>
      <div className={styles.contactIcon}>{icon}</div>
      <div className={styles.contactLabel}>{label}</div>
      {href ? (
        <a href={href} className={styles.contactValue}>{value}</a>
      ) : (
        <div className={styles.contactValue}>{value}</div>
      )}
    </div>
  );
}

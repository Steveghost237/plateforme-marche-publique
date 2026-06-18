"""
Service d'envoi d'emails via CodingMailer (codingmailer.onrender.com).
Gère : OTP inscription/reset, email de bienvenue, facture de commande.

Variables d'environnement requises :
  CODINGMAILER_URL    — URL du mailer (défaut: https://codingmailer.onrender.com/send-email)
  COMEBUY_ADMIN_EMAIL — Email admin destinataire des notifications (ex: admin@comebuy.cm)
"""
import os
import re
import html
import httpx
from datetime import datetime

MAILER_URL   = os.environ.get("CODINGMAILER_URL", "https://codingmailer.onrender.com/send-email")
ADMIN_EMAIL  = os.environ.get("COMEBUY_ADMIN_EMAIL", "wilfriedtech.dev@gmail.com")

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

# ── Sécurité ──────────────────────────────────────────────────
def _s(text: str, max_len: int = 300) -> str:
    """Sanitise une chaîne : échappe le HTML, tronque, supprime les espaces."""
    return html.escape(str(text or "").strip()[:max_len])

def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match((email or "").strip()))


# ── Templates HTML ────────────────────────────────────────────
_BASE_STYLE = """
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f5f7;margin:0;padding:0}
  .wrap{max-width:520px;margin:30px auto;background:#fff;border-radius:12px;
        box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}
  .header{background:#1E3A5F;padding:28px 32px;text-align:center}
  .header h1{color:#fff;font-size:22px;margin:0;letter-spacing:2px}
  .header span{color:#F59E0B;font-weight:700}
  .body{padding:32px}
  .otp-box{background:#F0F7FF;border:2px dashed #2E6DA4;border-radius:10px;
           text-align:center;padding:20px;margin:20px 0}
  .otp-code{font-size:42px;font-weight:900;letter-spacing:10px;color:#1E3A5F}
  .otp-note{font-size:12px;color:#6B7280;margin-top:8px}
  .info-row{display:flex;justify-content:space-between;padding:8px 0;
            border-bottom:1px solid #F3F4F6;font-size:14px}
  .info-label{color:#6B7280;font-weight:600}
  .info-val{color:#1E3A5F;font-weight:700}
  .btn{display:inline-block;background:#1E3A5F;color:#fff!important;padding:12px 28px;
       border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px}
  .footer{background:#F9FAFB;text-align:center;padding:16px 32px;
          font-size:11px;color:#9CA3AF;border-top:1px solid #F3F4F6}
  .badge{display:inline-block;background:#FEF3C7;color:#92400E;padding:2px 10px;
         border-radius:20px;font-size:11px;font-weight:700}
  .warn{background:#FFF7ED;border-left:4px solid #F59E0B;padding:12px;
        border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;color:#92400E}
  .total{font-size:22px;font-weight:900;color:#1E3A5F;text-align:right;margin:16px 0}
</style>
"""

def _header(subtitle: str = "") -> str:
    return f"""
<div class="header">
  <h1>COME<span>BUY</span></h1>
  {f'<p style="color:#fff;opacity:.7;margin:4px 0 0;font-size:13px">{_s(subtitle)}</p>' if subtitle else ''}
</div>"""

def _footer() -> str:
    year = datetime.utcnow().year
    return f"""
<div class="footer">
  © {year} ComeBuy — Marché Camerounais en ligne<br>
  Yaoundé, Cameroun · <a href="mailto:{ADMIN_EMAIL}" style="color:#9CA3AF">{ADMIN_EMAIL}</a><br>
  <span style="color:#D1D5DB">Ne répondez pas à cet e-mail automatique.</span>
</div>"""


def _html_otp(otp: str, nom: str, contexte: str = "inscription") -> str:
    nom_safe = _s(nom) or "cher(e) utilisateur(trice)"
    if contexte == "reset":
        titre   = "Réinitialisation de mot de passe"
        intro   = f"Vous avez demandé la réinitialisation de votre mot de passe ComeBuy."
        action  = "Utilisez ce code pour créer un nouveau mot de passe."
    else:
        titre   = "Vérification de votre compte"
        intro   = f"Merci de rejoindre ComeBuy, <strong>{nom_safe}</strong> !"
        action  = "Entrez ce code dans l'application pour activer votre compte."

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">{_BASE_STYLE}</head>
<body><div class="wrap">
  {_header(titre)}
  <div class="body">
    <p style="font-size:15px;color:#374151">{intro}</p>
    <div class="otp-box">
      <div style="font-size:12px;color:#6B7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Votre code OTP</div>
      <div class="otp-code">{_s(otp, 6)}</div>
      <div class="otp-note">⏱ Valable <strong>5 minutes</strong> · Usage unique</div>
    </div>
    <p style="font-size:13px;color:#6B7280">{action}</p>
    <div class="warn">
      🔒 <strong>Ne partagez jamais ce code.</strong> ComeBuy ne vous le demandera jamais par téléphone ou SMS.
    </div>
  </div>
  {_footer()}
</div></body></html>"""


def _html_welcome(nom: str, telephone: str, role: str) -> str:
    nom_safe = _s(nom) or "Nouvel utilisateur"
    role_label = {"client": "Client", "livreur": "Livreur Partenaire"}.get(role, role.capitalize())
    role_emoji = "🛒" if role == "client" else "🛵"
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">{_BASE_STYLE}</head>
<body><div class="wrap">
  {_header("Bienvenue dans la famille ComeBuy !")}
  <div class="body">
    <p style="font-size:15px;color:#374151">Bonjour <strong>{nom_safe}</strong>,</p>
    <p style="color:#6B7280;font-size:14px">
      Votre compte ComeBuy a été créé avec succès. Voici un résumé de votre profil :
    </p>
    <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin:16px 0">
      <div class="info-row"><span class="info-label">Nom complet</span><span class="info-val">{nom_safe}</span></div>
      <div class="info-row"><span class="info-label">Téléphone</span><span class="info-val">{_s(telephone)}</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Rôle</span>
        <span class="badge">{role_emoji} {role_label}</span>
      </div>
    </div>
    {'<p style="font-size:13px;color:#374151">🛒 Parcourez notre catalogue et passez votre première commande dès maintenant !</p>' if role == 'client' else '<p style="font-size:13px;color:#374151">🛵 Bienvenue dans l\'équipe ! Connectez-vous sur l\'app pour recevoir vos premières missions de livraison.</p>'}
    <a href="https://comebuy-frontend.vercel.app" class="btn">Accéder à ComeBuy →</a>
  </div>
  {_footer()}
</div></body></html>"""


def _html_invoice(nom: str, numero: str, lignes: list, sous_total: int,
                  frais_livraison: int, total: int, adresse: str,
                  creneau: str, date_livraison: str) -> str:
    nom_safe    = _s(nom) or "Client"
    num_safe    = _s(numero)
    adr_safe    = _s(adresse)
    cren_safe   = _s(creneau).replace("_", " ")
    date_safe   = _s(date_livraison)

    rows = ""
    for l in lignes:
        rows += f"""
        <tr>
          <td style="padding:8px 4px;color:#374151">{_s(l.get('nom',''))}</td>
          <td style="padding:8px 4px;text-align:center;color:#374151">{l.get('quantite',1)}</td>
          <td style="padding:8px 4px;text-align:right;color:#1E3A5F;font-weight:700">
            {l.get('prix_total',0):,} F
          </td>
        </tr>"""

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">{_BASE_STYLE}
    <style>table{{width:100%;border-collapse:collapse}}
    th{{background:#F3F4F6;padding:8px 4px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase}}</style>
    </head>
<body><div class="wrap">
  {_header("Confirmation & Facture de commande")}
  <div class="body">
    <p style="font-size:15px;color:#374151">Bonjour <strong>{nom_safe}</strong>,</p>
    <p style="color:#6B7280;font-size:14px">
      Votre commande <strong>#{num_safe}</strong> a bien été enregistrée. Voici votre récapitulatif :
    </p>
    <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin:16px 0">
      <div class="info-row"><span class="info-label">N° Commande</span><span class="info-val">#{num_safe}</span></div>
      <div class="info-row"><span class="info-label">Livraison le</span><span class="info-val">{date_safe}</span></div>
      <div class="info-row"><span class="info-label">Créneau</span><span class="info-val">{cren_safe}</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Adresse</span><span class="info-val">{adr_safe}</span></div>
    </div>
    <table>
      <thead><tr>
        <th>Produit</th><th style="text-align:center">Qté</th><th style="text-align:right">Montant</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <div style="border-top:2px solid #F3F4F6;margin-top:12px;padding-top:12px">
      <div class="info-row"><span class="info-label">Sous-total</span><span class="info-val">{sous_total:,} FCFA</span></div>
      <div class="info-row"><span class="info-label">Frais de livraison</span><span class="info-val">{frais_livraison:,} FCFA</span></div>
      <div class="total">Total : {total:,} FCFA</div>
    </div>
    <div class="warn" style="background:#F0FDF4;border-color:#16A34A;color:#166534">
      ✅ Nous préparons votre commande. Vous serez notifié(e) à chaque étape.
    </div>
    <a href="https://comebuy-frontend.vercel.app/commandes" class="btn">Suivre ma commande →</a>
  </div>
  {_footer()}
</div></body></html>"""


# ── Envoi HTTP (synchrone) ────────────────────────────────────
def _send_email(to: str, subject: str, html_body: str) -> dict:
    """
    Appelle le service CodingMailer.
    Sécurité : validation email, timeout strict, gestion d'erreur complète.
    """
    if not is_valid_email(to):
        print(f"[EMAIL] Adresse invalide ignorée : {to!r}")
        return {"success": False, "error": "Adresse email invalide"}

    subject_clean = _s(subject, 150)

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                MAILER_URL,
                json={"to": to, "subject": subject_clean, "message": html_body},
                headers={"Content-Type": "application/json"},
            )
        if resp.status_code in (200, 201, 204):
            print(f"[EMAIL ✓] → {to} | {subject_clean}")
            return {"success": True}
        else:
            print(f"[EMAIL ✗] {resp.status_code} → {to} | {resp.text[:200]}")
            return {"success": False, "error": f"HTTP {resp.status_code}"}
    except httpx.TimeoutException:
        print(f"[EMAIL TIMEOUT] → {to}")
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        print(f"[EMAIL ERROR] → {to} : {e}")
        return {"success": False, "error": str(e)}


# ── API publique ──────────────────────────────────────────────
def send_otp_email(to_email: str, nom: str, otp: str,
                   contexte: str = "inscription") -> dict:
    """Envoie un OTP par email (inscription ou reset mot de passe)."""
    subject = (
        "ComeBuy — Votre code de vérification"
        if contexte != "reset"
        else "ComeBuy — Réinitialisation de mot de passe"
    )
    return _send_email(to_email, subject, _html_otp(otp, nom, contexte))


def send_welcome_email(to_email: str, nom: str, telephone: str,
                       role: str = "client") -> dict:
    """Envoie l'email de bienvenue après création de compte."""
    return _send_email(
        to_email,
        "ComeBuy — Bienvenue ! Votre compte est actif",
        _html_welcome(nom, telephone, role),
    )


def send_invoice_email(to_email: str, nom: str, numero: str, lignes: list,
                       sous_total: int, frais_livraison: int, total: int,
                       adresse: str = "", creneau: str = "",
                       date_livraison: str = "") -> dict:
    """Envoie la facture/confirmation de commande par email."""
    return _send_email(
        to_email,
        f"ComeBuy — Confirmation commande #{numero}",
        _html_invoice(nom, numero, lignes, sous_total, frais_livraison,
                      total, adresse, creneau, date_livraison),
    )

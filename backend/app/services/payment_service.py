"""
Service de paiement multi-provider:
- NotchPay (MTN Mobile Money, Orange Money) — Cameroun
- Stripe (Visa, Mastercard, cartes internationales)
- PayPal (paiement international)

Docs:
  NotchPay: https://docs.notchpay.co
  Stripe:   https://docs.stripe.com/api
  PayPal:   https://developer.paypal.com/docs/api/orders/v2/
"""
import os
import socket
import httpx
from typing import Optional

# Charger .env (pydantic-settings ne pousse pas les variables dans os.environ)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Fallback DNS pour domaines paiements ────────────────
# Certains DNS ISP bloquent ou ne résolvent pas les APIs de paiement.
# On monkey-patch socket.getaddrinfo pour utiliser un DNS Google (8.8.8.8)
# en fallback quand le DNS OS échoue.
_FALLBACK_DNS_HOSTS = {
    "api.notchpay.co",
    "api.stripe.com",
    "checkout.stripe.com",
    "api-m.sandbox.paypal.com",
    "api-m.paypal.com",
}
_original_getaddrinfo = socket.getaddrinfo
_dns_cache: dict = {}


def _resolve_via_google(hostname: str) -> Optional[str]:
    """Résout un hostname via le DoH (DNS over HTTPS) de Cloudflare en fallback."""
    if hostname in _dns_cache:
        return _dns_cache[hostname]
    try:
        import urllib.request, json
        url = f"https://1.1.1.1/dns-query?name={hostname}&type=A"
        req = urllib.request.Request(url, headers={"Accept": "application/dns-json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            for ans in data.get("Answer", []):
                if ans.get("type") == 1:
                    ip = ans["data"]
                    _dns_cache[hostname] = ip
                    print(f"[DNS fallback] {hostname} → {ip} (via Cloudflare DoH)")
                    return ip
    except Exception as e:
        print(f"[DNS fallback error] {hostname}: {e}")
    return None


def _patched_getaddrinfo(host, port, *args, **kwargs):
    try:
        return _original_getaddrinfo(host, port, *args, **kwargs)
    except socket.gaierror:
        host_str = host.decode() if isinstance(host, bytes) else host
        if not isinstance(host_str, str):
            raise
        if (host_str in _FALLBACK_DNS_HOSTS
                or host_str.endswith(".notchpay.co")
                or host_str.endswith(".stripe.com")
                or host_str.endswith(".paypal.com")):
            ip = _resolve_via_google(host_str)
            if ip:
                return _original_getaddrinfo(ip, port, *args, **kwargs)
        raise


socket.getaddrinfo = _patched_getaddrinfo

# ── NotchPay ────────────────────────────────────────────
NOTCHPAY_BASE = "https://api.notchpay.co"
NOTCHPAY_PUBLIC_KEY = os.environ.get("NOTCHPAY_PUBLIC_KEY", "")
NOTCHPAY_SANDBOX = os.environ.get("NOTCHPAY_SANDBOX", "true").lower() in ("true", "1", "yes")

# ── Stripe ──────────────────────────────────────────────
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_BASE = "https://api.stripe.com/v1"

# ── PayPal ──────────────────────────────────────────────
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET", "")
PAYPAL_SANDBOX = os.environ.get("PAYPAL_SANDBOX", "true").lower() in ("true", "1", "yes")
PAYPAL_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_SANDBOX else "https://api-m.paypal.com"


def get_headers():
    return {
        "Authorization": NOTCHPAY_PUBLIC_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _detect_momo_channel(telephone: str) -> str:
    """Détecte l'opérateur (MTN ou Orange) à partir du numéro camerounais.
    MTN CM : 67x, 650-654, 680-684
    Orange CM : 69x, 655-659, 685-689, 656-659
    """
    digits = telephone.lstrip("+").replace(" ", "")
    if digits.startswith("237"):
        digits = digits[3:]
    if not digits or len(digits) < 9:
        return "cm.mtn"  # défaut
    prefix3 = digits[:3]
    prefix2 = digits[:2]
    # MTN
    if prefix2 == "67" or prefix3 in ("650","651","652","653","654","680","681","682","683","684"):
        return "cm.mtn"
    # Orange
    if prefix2 == "69" or prefix3 in ("655","656","657","658","659","685","686","687","688","689"):
        return "cm.orange"
    return "cm.mtn"


async def initier_paiement(
    montant_fcfa: int,
    telephone: str,
    email: Optional[str],
    reference: str,
    description: str = "Commande Marché·CM",
    callback_url: str = "",
    operator: Optional[str] = None,  # "mtn" ou "orange" ; auto-détecté si None
) -> dict:
    """
    Initie un paiement Mobile Money (MTN/Orange CM) via NotchPay en flux DIRECT :
    1. /payments/initialize → crée la transaction, récupère la référence
    2. /payments/{ref} (POST) avec channel cm.mtn/cm.orange + phone → déclenche le push USSD
       → le client reçoit une notification sur son téléphone et confirme avec son code PIN.

    Le client NE QUITTE PAS l'application, contrairement au flux hosted.
    """
    if not NOTCHPAY_PUBLIC_KEY:
        print(f"[PAIEMENT SIMULATION] {reference} → {montant_fcfa} FCFA pour {telephone}")
        return {
            "success": True,
            "simulation": True,
            "reference": reference,
            "message": "Paiement simulé (pas de clé NotchPay configurée)",
        }

    # Normaliser le téléphone au format E.164 (+237XXXXXXXXX)
    tel_clean = telephone.replace(" ", "").replace("-", "")
    if not tel_clean.startswith("+"):
        if tel_clean.startswith("237"):
            tel_clean = "+" + tel_clean
        elif tel_clean.startswith("6"):
            tel_clean = "+237" + tel_clean
        else:
            tel_clean = "+" + tel_clean

    # Détection automatique de l'opérateur si non précisé
    if operator == "mtn":
        channel = "cm.mtn"
    elif operator == "orange":
        channel = "cm.orange"
    else:
        channel = _detect_momo_channel(tel_clean)

    init_payload = {
        "email": email or f"{tel_clean.lstrip('+')}@comebuy.cm",
        "amount": int(montant_fcfa),
        "currency": "XAF",
        "phone": tel_clean,
        "reference": reference,
        "description": description,
        "callback": callback_url,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # ──── Étape 1 : Initialize ────────────────────────────────
            init_resp = await client.post(
                f"{NOTCHPAY_BASE}/payments/initialize",
                json=init_payload,
                headers=get_headers(),
            )
            init_data = init_resp.json()
            if init_resp.status_code not in (200, 201):
                return {
                    "success": False,
                    "error": init_data.get("message", "Erreur initialisation NotchPay"),
                    "details": init_data,
                }

            tx_ref = init_data.get("transaction", {}).get("reference") or reference
            authorization_url = init_data.get("authorization_url")

            # ──── Étape 2 : Direct charge → push USSD ─────────────────
            charge_payload = {
                "channel": channel,
                "data": {"phone": tel_clean},
            }
            charge_resp = await client.post(
                f"{NOTCHPAY_BASE}/payments/{tx_ref}",
                json=charge_payload,
                headers=get_headers(),
            )
            charge_data = charge_resp.json()
            print(f"[NOTCHPAY CHARGE {channel}] {tx_ref} → {charge_resp.status_code}: {charge_data}")

            if charge_resp.status_code in (200, 201, 202):
                # Le push USSD a bien été envoyé (ou la transaction est en attente)
                return {
                    "success": True,
                    "transaction_ref": tx_ref,
                    "channel": channel,
                    "operator": "MTN" if channel == "cm.mtn" else "Orange",
                    "status": charge_data.get("status") or charge_data.get("transaction", {}).get("status") or "pending",
                    "authorization_url": authorization_url,  # fallback web si USSD échoue
                    "message": f"Notification envoyée au {tel_clean}. Composez *126# si vous ne recevez rien et entrez votre code PIN.",
                }
            else:
                # Charge directe a échoué → fallback URL hosted
                return {
                    "success": True,
                    "transaction_ref": tx_ref,
                    "channel": channel,
                    "fallback_to_hosted": True,
                    "authorization_url": authorization_url,
                    "error": charge_data.get("message", "Charge directe échouée, utilisez le lien"),
                }
    except Exception as e:
        print(f"[NOTCHPAY ERROR] {e}")
        return {"success": False, "error": str(e)}


async def verifier_paiement(reference: str) -> dict:
    """Vérifie le statut d'un paiement NotchPay."""
    if not NOTCHPAY_PUBLIC_KEY:
        return {"success": True, "simulation": True, "status": "complete"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{NOTCHPAY_BASE}/payments/{reference}",
                headers=get_headers(),
            )
            data = resp.json()
            tx = data.get("transaction", {})
            return {
                "success": True,
                "status": tx.get("status"),
                "amount": tx.get("amount"),
                "currency": tx.get("currency"),
                "reference": tx.get("reference"),
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ══════════════════════════════════════════════════════════
# STRIPE — Cartes bancaires internationales
# ══════════════════════════════════════════════════════════

async def initier_paiement_stripe(
    montant_fcfa: int,
    email: Optional[str],
    reference: str,
    description: str = "Commande Marché·CM",
    success_url: str = "",
    cancel_url: str = "",
) -> dict:
    """Crée une session Stripe Checkout (redirige l'utilisateur vers Stripe)."""
    if not STRIPE_SECRET_KEY:
        print(f"[STRIPE SIMULATION] {reference} → {montant_fcfa} FCFA")
        return {
            "success": True,
            "simulation": True,
            "reference": reference,
            "checkout_url": f"/paiement/simulation?ref={reference}&mode=stripe",
            "message": "Paiement Stripe simulé (pas de clé configurée)",
        }

    import base64
    auth_header = base64.b64encode(f"{STRIPE_SECRET_KEY}:".encode()).decode()

    payload = {
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "xaf",
        "line_items[0][price_data][product_data][name]": description,
        "line_items[0][price_data][unit_amount]": str(montant_fcfa),
        "line_items[0][quantity]": "1",
        "mode": "payment",
        "client_reference_id": reference,
        "customer_email": email or "",
        "success_url": success_url or "https://comebuy.cm/commande/succes?ref={CHECKOUT_SESSION_ID}",
        "cancel_url": cancel_url or "https://comebuy.cm/commande/annule",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{STRIPE_BASE}/checkout/sessions",
                data=payload,
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            data = resp.json()
            if resp.status_code in (200, 201):
                return {
                    "success": True,
                    "checkout_url": data.get("url"),
                    "session_id": data.get("id"),
                    "reference": reference,
                }
            else:
                return {"success": False, "error": data.get("error", {}).get("message", "Erreur Stripe")}
    except Exception as e:
        print(f"[STRIPE ERROR] {e}")
        return {"success": False, "error": str(e)}


# ══════════════════════════════════════════════════════════
# PAYPAL — Paiement international
# ══════════════════════════════════════════════════════════

async def _get_paypal_token() -> Optional[str]:
    """Obtient un access token PayPal via client credentials."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        return None
    try:
        import base64
        credentials = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{PAYPAL_BASE}/v1/oauth2/token",
                data="grant_type=client_credentials",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            if resp.status_code == 200:
                return resp.json().get("access_token")
    except Exception as e:
        print(f"[PAYPAL TOKEN ERROR] {e}")
    return None


async def initier_paiement_paypal(
    montant_fcfa: int,
    email: Optional[str],
    reference: str,
    description: str = "Commande Marché·CM",
    return_url: str = "",
    cancel_url: str = "",
) -> dict:
    """Crée une commande PayPal (redirige l'utilisateur vers PayPal)."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        print(f"[PAYPAL SIMULATION] {reference} → {montant_fcfa} FCFA")
        return {
            "success": True,
            "simulation": True,
            "reference": reference,
            "checkout_url": f"/paiement/simulation?ref={reference}&mode=paypal",
            "message": "Paiement PayPal simulé (pas de clé configurée)",
        }

    token = await _get_paypal_token()
    if not token:
        return {"success": False, "error": "Impossible d'obtenir un token PayPal"}

    # Convertir FCFA en EUR pour PayPal (taux approximatif 1 EUR ≈ 656 XAF)
    montant_eur = round(montant_fcfa / 656, 2)

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference,
            "description": description,
            "amount": {
                "currency_code": "EUR",
                "value": str(montant_eur),
            },
        }],
        "application_context": {
            "return_url": return_url or "https://comebuy.cm/commande/succes",
            "cancel_url": cancel_url or "https://comebuy.cm/commande/annule",
            "brand_name": "ComeBuy Marché",
            "user_action": "PAY_NOW",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{PAYPAL_BASE}/v2/checkout/orders",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            if resp.status_code in (200, 201):
                approve_link = next(
                    (l["href"] for l in data.get("links", []) if l.get("rel") == "approve"), None
                )
                return {
                    "success": True,
                    "order_id": data.get("id"),
                    "checkout_url": approve_link,
                    "reference": reference,
                }
            else:
                return {"success": False, "error": str(data)}
    except Exception as e:
        print(f"[PAYPAL ERROR] {e}")
        return {"success": False, "error": str(e)}


async def verifier_paiement_stripe(session_id: str) -> dict:
    """Vérifie le statut réel d'une session Stripe Checkout."""
    if not STRIPE_SECRET_KEY:
        return {"success": True, "simulation": True, "status": "paid"}
    import base64
    auth_header = base64.b64encode(f"{STRIPE_SECRET_KEY}:".encode()).decode()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{STRIPE_BASE}/checkout/sessions/{session_id}",
                headers={"Authorization": f"Basic {auth_header}"},
            )
            data = resp.json()
            if resp.status_code == 200:
                return {
                    "success": True,
                    "status": data.get("payment_status"),  # "paid" / "unpaid"
                    "amount_total": data.get("amount_total"),
                    "currency": data.get("currency"),
                    "customer_email": data.get("customer_details", {}).get("email"),
                    "session_id": session_id,
                }
            return {"success": False, "error": data.get("error", {}).get("message")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def capturer_paiement_paypal(order_id: str) -> dict:
    """Capture (finalise) une commande PayPal approuvée par le client."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        return {"success": True, "simulation": True, "status": "COMPLETED"}
    token = await _get_paypal_token()
    if not token:
        return {"success": False, "error": "Token PayPal indisponible"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{PAYPAL_BASE}/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            if resp.status_code in (200, 201):
                return {
                    "success": True,
                    "status": data.get("status"),  # COMPLETED
                    "order_id": order_id,
                    "payer_email": data.get("payer", {}).get("email_address"),
                }
            return {"success": False, "error": str(data)}
    except Exception as e:
        return {"success": False, "error": str(e)}

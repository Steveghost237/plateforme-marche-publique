"""
webhooks.py — Endpoints de confirmation paiement en temps réel
  POST /api/webhooks/notchpay  ← NotchPay notifie le serveur quand un paiement change de statut
  POST /api/webhooks/stripe    ← Stripe envoie les events (checkout.session.completed, etc.)
"""
import os, hmac, hashlib, json
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi import Depends

from app.core.database import get_db
from app.models.models import Commande, Paiement, Notification

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks paiement"])

NOTCHPAY_HASH = os.environ.get("NOTCHPAY_HASH", "")      # Secret hash NotchPay (dashboard)
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")  # whsec_... Stripe


def _marquer_payee(cmd: Commande, pmt: Paiement | None, db: Session, mode: str) -> None:
    """Marque la commande comme payée et crée la notification."""
    if cmd.statut == "payee":
        return
    if pmt:
        pmt.statut = "confirme"
        pmt.confirme_at = datetime.utcnow()
    cmd.statut = "payee"
    cmd.payee_at = datetime.utcnow()
    db.add(Notification(
        destinataire_id=cmd.client_id,
        type="commande_confirmee",
        titre="Paiement confirmé ✅",
        corps=f"Commande {cmd.numero} payée via {mode}.",
        donnees_json={"commande_id": str(cmd.id)},
    ))
    db.commit()
    print(f"[WEBHOOK] Commande {cmd.numero} → payee (via {mode})")


# ══════════════════════════════════════════════════════════
# NOTCHPAY WEBHOOK
# ══════════════════════════════════════════════════════════

@webhook_router.post("/notchpay")
async def notchpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    NotchPay envoie un POST dès que le statut d'une transaction change.
    Header X-Notch-Signature contient un HMAC-SHA256 du body avec le NOTCHPAY_HASH.
    """
    body = await request.body()
    raw = body.decode()

    # ── Vérification signature (si clé configurée) ──────────
    if NOTCHPAY_HASH:
        sig_header = request.headers.get("x-notch-signature", "")
        expected = hmac.new(
            NOTCHPAY_HASH.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, sig_header):
            print(f"[WEBHOOK NotchPay] Signature invalide")
            raise HTTPException(400, "Signature invalide")

    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(400, "JSON invalide")

    event = data.get("event", "")
    tx = data.get("data", {}) or data.get("transaction", {})

    print(f"[WEBHOOK NotchPay] event={event} status={tx.get('status')} ref={tx.get('reference')}")

    status = (tx.get("status") or "").lower()
    reference = tx.get("reference") or tx.get("trxref")

    if status in ("complete", "completed", "success") and reference:
        # Chercher la commande par son numéro (= reference NotchPay)
        cmd = db.query(Commande).filter(Commande.numero == reference).first()
        if cmd:
            pmt = db.query(Paiement).filter(Paiement.commande_id == cmd.id).first()
            _marquer_payee(cmd, pmt, db, "Mobile Money")

    return {"received": True}


# ══════════════════════════════════════════════════════════
# STRIPE WEBHOOK
# ══════════════════════════════════════════════════════════

@webhook_router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Stripe envoie les events (checkout.session.completed, payment_intent.succeeded…).
    La signature est vérifiée avec le STRIPE_WEBHOOK_SECRET.
    """
    body = await request.body()

    # ── Vérification signature Stripe ──────────────────────
    if STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            _verify_stripe_signature(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            print(f"[WEBHOOK Stripe] Signature invalide: {e}")
            raise HTTPException(400, "Signature Stripe invalide")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(400, "JSON invalide")

    event_type = event.get("type", "")
    obj = event.get("data", {}).get("object", {})

    print(f"[WEBHOOK Stripe] type={event_type} id={obj.get('id')}")

    if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
        session_id = obj.get("id")
        client_ref = obj.get("client_reference_id")  # = cmd.numero pour Checkout
        payment_status = obj.get("payment_status") or obj.get("status")

        if payment_status in ("paid", "succeeded") and client_ref:
            cmd = db.query(Commande).filter(Commande.numero == client_ref).first()
            if cmd:
                pmt = db.query(Paiement).filter(Paiement.commande_id == cmd.id).first()
                if pmt and session_id:
                    pmt.reference_externe = session_id
                _marquer_payee(cmd, pmt, db, "Stripe")

    return {"received": True}


def _verify_stripe_signature(payload: bytes, sig_header: str, secret: str) -> None:
    """Vérifie la signature Stripe Webhook (algorithme officiel)."""
    parts = {k: v for k, v in (p.split("=", 1) for p in sig_header.split(",") if "=" in p)}
    timestamp = parts.get("t", "")
    v1 = parts.get("v1", "")
    signed = f"{timestamp}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, v1):
        raise ValueError("Signature mismatch")

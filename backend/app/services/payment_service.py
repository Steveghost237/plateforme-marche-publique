"""
Service de paiement Mobile Money via NotchPay (API gratuite pour le Cameroun)
Docs: https://docs.notchpay.co
- Supporte MTN Mobile Money et Orange Money
- Mode sandbox gratuit pour les tests
- Clé API à définir dans la variable d'environnement NOTCHPAY_PUBLIC_KEY
"""
import os
import httpx
from typing import Optional

NOTCHPAY_BASE = "https://api.notchpay.co"
NOTCHPAY_PUBLIC_KEY = os.environ.get("NOTCHPAY_PUBLIC_KEY", "")
NOTCHPAY_SANDBOX = os.environ.get("NOTCHPAY_SANDBOX", "true").lower() in ("true", "1", "yes")


def get_headers():
    return {
        "Authorization": NOTCHPAY_PUBLIC_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def initier_paiement(
    montant_fcfa: int,
    telephone: str,
    email: Optional[str],
    reference: str,
    description: str = "Commande Marché·CM",
    callback_url: str = "",
) -> dict:
    """
    Initie un paiement via NotchPay.
    Retourne l'URL de paiement ou les infos de transaction.
    """
    if not NOTCHPAY_PUBLIC_KEY:
        # Mode simulation si pas de clé API configurée
        print(f"[PAIEMENT SIMULATION] {reference} → {montant_fcfa} FCFA pour {telephone}")
        return {
            "success": True,
            "simulation": True,
            "reference": reference,
            "message": "Paiement simulé (pas de clé NotchPay configurée)",
        }

    payload = {
        "email": email or f"{telephone}@comebuy.cm",
        "amount": montant_fcfa,
        "currency": "XAF",
        "phone": telephone,
        "reference": reference,
        "description": description,
        "callback": callback_url,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{NOTCHPAY_BASE}/payments/initialize",
                json=payload,
                headers=get_headers(),
            )
            data = resp.json()

            if resp.status_code in (200, 201):
                return {
                    "success": True,
                    "transaction_ref": data.get("transaction", {}).get("reference"),
                    "authorization_url": data.get("authorization_url"),
                    "status": data.get("transaction", {}).get("status"),
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Erreur paiement"),
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

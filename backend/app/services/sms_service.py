"""
Service d'envoi de SMS pour les confirmations de commande.
Utilise l'API Infobip (gratuit en trial: 1000 SMS/mois).
Alternative: Twilio trial, Orange SMS API Cameroun.

Variable d'env requises:
  INFOBIP_API_KEY   — clé API Infobip
  INFOBIP_BASE_URL  — ex: https://xxxxx.api.infobip.com
  SMS_SENDER        — nom d'expéditeur (ex: MarcheCM)
"""
import os
import httpx

INFOBIP_API_KEY = os.environ.get("INFOBIP_API_KEY", "")
INFOBIP_BASE_URL = os.environ.get("INFOBIP_BASE_URL", "https://api.infobip.com")
SMS_SENDER = os.environ.get("SMS_SENDER", "MarcheCM")


async def envoyer_sms(telephone: str, message: str) -> dict:
    """Envoie un SMS via Infobip. Retourne le statut."""
    if not INFOBIP_API_KEY:
        print(f"[SMS SIMULATION] → {telephone}: {message}")
        return {"success": True, "simulation": True}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{INFOBIP_BASE_URL}/sms/2/text/advanced",
                headers={
                    "Authorization": f"App {INFOBIP_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "messages": [{
                        "from": SMS_SENDER,
                        "destinations": [{"to": telephone}],
                        "text": message,
                    }]
                },
            )
            data = resp.json()
            status = data.get("messages", [{}])[0].get("status", {})
            return {
                "success": status.get("groupName") == "PENDING" or resp.status_code in (200, 201),
                "message_id": data.get("messages", [{}])[0].get("messageId"),
            }
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return {"success": False, "error": str(e)}


def sms_confirmation_commande(numero_commande: str, total_fcfa: int, creneau: str = "") -> str:
    """Génère le texte SMS de confirmation de commande."""
    total_fmt = f"{total_fcfa:,}".replace(",", " ")
    msg = (
        f"Marché·CM - Commande {numero_commande} confirmée !\n"
        f"Montant: {total_fmt} FCFA\n"
    )
    if creneau:
        msg += f"Créneau: {creneau.replace('_', ' ')}\n"
    msg += "Suivez votre commande sur comebuy.vercel.app/commandes"
    return msg


def sms_statut_commande(numero_commande: str, statut: str) -> str:
    """Génère le texte SMS de changement de statut."""
    labels = {
        "assignee": "Un livreur a été assigné à votre commande",
        "en_cours_marche": "Votre livreur est au marché en train d'acheter vos produits",
        "en_livraison": "Votre commande est en route ! Préparez-vous",
        "livree": "Votre commande a été livrée. Merci et bon appétit !",
    }
    msg = labels.get(statut, f"Statut: {statut}")
    return f"Marché·CM - {numero_commande}\n{msg}"

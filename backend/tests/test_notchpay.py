"""
Tests unitaires — Service de paiement NotchPay
Couvre :
  - Détection de l'opérateur via le numéro de téléphone
  - Mode simulation (aucune clé API)
  - Initialisation réussie + push USSD MTN
  - Initialisation réussie + push USSD Orange
  - Fallback vers page hébergée quand le push USSD échoue
  - Erreur d'initialisation (HTTP 401 / 422 / 500)
  - Timeout / exception réseau
  - Normalisation des numéros de téléphone
  - Vérification du statut d'un paiement (verifier_paiement)
  - Opérateur forcé explicitement (mtn / orange)
"""
import os
import json
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# ── Helpers ─────────────────────────────────────────────────────────────────

def _make_httpx_response(status_code: int, body: dict):
    """Crée un faux objet Response httpx."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = body
    return resp


def _async_client_ctx(init_resp, charge_resp=None):
    """
    Retourne un context-manager async qui simule httpx.AsyncClient.
    init_resp  → réponse pour /payments/initialize  (POST)
    charge_resp → réponse pour /payments/{ref}       (POST)
    Si charge_resp est None la même réponse est utilisée pour les deux.
    """
    client_mock = AsyncMock()
    responses = [init_resp]
    if charge_resp is not None:
        responses.append(charge_resp)

    client_mock.post = AsyncMock(side_effect=responses)
    client_mock.get  = AsyncMock(return_value=init_resp)   # pour verifier_paiement

    async_ctx = MagicMock()
    async_ctx.__aenter__ = AsyncMock(return_value=client_mock)
    async_ctx.__aexit__  = AsyncMock(return_value=False)
    return async_ctx, client_mock


# ════════════════════════════════════════════════════════════════════════════
# 1. Détection de l'opérateur (_detect_momo_channel)
# ════════════════════════════════════════════════════════════════════════════

class TestDetectMomoChannel:

    def _detect(self, tel):
        from app.services.payment_service import _detect_momo_channel
        return _detect_momo_channel(tel)

    # ── MTN ──────────────────────────────────────────────────────────────
    def test_mtn_prefix_67(self):
        assert self._detect("+237670000000") == "cm.mtn"

    def test_mtn_prefix_650(self):
        assert self._detect("237650000000") == "cm.mtn"

    def test_mtn_prefix_654(self):
        assert self._detect("654000000") == "cm.mtn"

    def test_mtn_prefix_680(self):
        assert self._detect("680000000") == "cm.mtn"

    def test_mtn_prefix_684(self):
        assert self._detect("+237684000000") == "cm.mtn"

    # ── Orange ───────────────────────────────────────────────────────────
    def test_orange_prefix_69(self):
        assert self._detect("+237690000000") == "cm.orange"

    def test_orange_prefix_655(self):
        assert self._detect("237655000000") == "cm.orange"

    def test_orange_prefix_659(self):
        assert self._detect("659000000") == "cm.orange"

    def test_orange_prefix_685(self):
        assert self._detect("+237685000000") == "cm.orange"

    def test_orange_prefix_689(self):
        assert self._detect("689000000") == "cm.orange"

    # ── Cas limites ──────────────────────────────────────────────────────
    def test_numero_trop_court_retourne_mtn(self):
        assert self._detect("12345") == "cm.mtn"

    def test_numero_vide_retourne_mtn(self):
        assert self._detect("") == "cm.mtn"

    def test_numero_inconnu_retourne_mtn_par_defaut(self):
        assert self._detect("+237610000000") == "cm.mtn"


# ════════════════════════════════════════════════════════════════════════════
# 2. Normalisation du numéro de téléphone
# ════════════════════════════════════════════════════════════════════════════

class TestPhoneNormalization:
    """
    Vérifie que le numéro est converti en +237XXXXXXXXX avant l'appel API.
    On injecte une clé factice pour éviter le mode simulation.
    """

    @pytest.mark.asyncio
    async def test_numero_9_chiffres_sans_indicatif(self):
        """670000000 → +237670000000"""
        init_body = {
            "transaction": {"reference": "REF001"},
            "authorization_url": "https://pay.notchpay.co/REF001",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_test_fake"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                montant_fcfa=5000,
                telephone="670000000",
                email=None,
                reference="REF001",
            )
        # Le payload envoyé doit contenir +237670000000
        call_kwargs = client.post.call_args_list[0]
        phone_sent = call_kwargs.kwargs.get("json", {}).get("phone") or \
                     call_kwargs.args[1].get("phone", "") if call_kwargs.args else ""
        # On accepte aussi que le payload soit passé en args
        first_call_json = client.post.call_args_list[0][1].get("json") or {}
        assert first_call_json.get("phone", "").startswith("+237")

    @pytest.mark.asyncio
    async def test_numero_avec_237_sans_plus(self):
        """2376700000000 → +237670000000"""
        init_body = {
            "transaction": {"reference": "REF002"},
            "authorization_url": "https://pay.notchpay.co/REF002",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_test_fake"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            await initier_paiement(5000, "2376700000000", None, "REF002")
        first_call_json = client.post.call_args_list[0][1].get("json") or {}
        assert first_call_json.get("phone", "").startswith("+237")


# ════════════════════════════════════════════════════════════════════════════
# 3. Mode simulation (aucune clé NOTCHPAY_PUBLIC_KEY)
# ════════════════════════════════════════════════════════════════════════════

class TestSimulationMode:

    @pytest.mark.asyncio
    async def test_simulation_sans_cle(self):
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", ""):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                montant_fcfa=2000,
                telephone="670000000",
                email="test@test.cm",
                reference="SIM001",
            )
        assert result["success"] is True
        assert result["simulation"] is True
        assert result["reference"] == "SIM001"

    @pytest.mark.asyncio
    async def test_simulation_verifier_paiement(self):
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", ""):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("SIM001")
        assert result["success"] is True
        assert result["simulation"] is True
        assert result["status"] == "complete"


# ════════════════════════════════════════════════════════════════════════════
# 4. Initialisation réussie + push USSD MTN
# ════════════════════════════════════════════════════════════════════════════

class TestInitierPaiementMTN:

    @pytest.mark.asyncio
    async def test_push_ussd_mtn_succes(self):
        init_body = {
            "transaction": {"reference": "TX_MTN_001"},
            "authorization_url": "https://pay.notchpay.co/TX_MTN_001",
        }
        charge_body = {"status": "pending", "transaction": {"status": "pending"}}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live_mtn"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                montant_fcfa=10000,
                telephone="+237670000001",
                email="client@test.cm",
                reference="TX_MTN_001",
                operator="mtn",
            )
        assert result["success"] is True
        assert result.get("fallback_to_hosted") is not True
        assert result["operator"] == "MTN"
        assert result["channel"] == "cm.mtn"
        assert result["transaction_ref"] == "TX_MTN_001"
        assert "checkout_url" in result   # URL de secours toujours présente

    @pytest.mark.asyncio
    async def test_push_ussd_mtn_status_202(self):
        """HTTP 202 Accepted doit aussi être considéré comme succès."""
        init_body = {
            "transaction": {"reference": "TX_MTN_202"},
            "authorization_url": "https://pay.notchpay.co/TX_MTN_202",
        }
        charge_body = {"status": "processing"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(202, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live_mtn"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(10000, "+237670000001", None, "TX_MTN_202")
        assert result["success"] is True
        assert result.get("fallback_to_hosted") is not True

    @pytest.mark.asyncio
    async def test_charge_mtn_ussd_code_dans_message(self):
        """Le message doit mentionner *126# pour MTN."""
        init_body = {
            "transaction": {"reference": "TX_MTN_MSG"},
            "authorization_url": "https://pay.notchpay.co/TX_MTN_MSG",
        }
        charge_body = {"status": "pending"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_MTN_MSG", operator="mtn")
        assert "*126#" in result.get("message", "")


# ════════════════════════════════════════════════════════════════════════════
# 5. Initialisation réussie + push USSD Orange
# ════════════════════════════════════════════════════════════════════════════

class TestInitierPaiementOrange:

    @pytest.mark.asyncio
    async def test_push_ussd_orange_succes(self):
        init_body = {
            "transaction": {"reference": "TX_ORA_001"},
            "authorization_url": "https://pay.notchpay.co/TX_ORA_001",
        }
        charge_body = {"status": "pending"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live_ora"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                montant_fcfa=7500,
                telephone="+237690000001",
                email="orange@test.cm",
                reference="TX_ORA_001",
                operator="orange",
            )
        assert result["success"] is True
        assert result["operator"] == "Orange"
        assert result["channel"] == "cm.orange"
        assert result.get("fallback_to_hosted") is not True

    @pytest.mark.asyncio
    async def test_ussd_orange_message_code_150(self):
        """Le message doit mentionner #150*50# pour Orange Money."""
        init_body = {
            "transaction": {"reference": "TX_ORA_MSG"},
            "authorization_url": "https://pay.notchpay.co/TX_ORA_MSG",
        }
        charge_body = {"status": "pending"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237690000001", None, "TX_ORA_MSG", operator="orange")
        assert "#150*50#" in result.get("message", "")

    @pytest.mark.asyncio
    async def test_auto_detect_orange_depuis_numero(self):
        """Sans operator=, le canal doit être détecté automatiquement."""
        init_body = {
            "transaction": {"reference": "TX_AUTO"},
            "authorization_url": "https://pay.notchpay.co/TX_AUTO",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237690000001", None, "TX_AUTO")
        # Canal Orange détecté automatiquement
        charge_json = client.post.call_args_list[1][1].get("json") or {}
        assert charge_json.get("channel") == "cm.orange"


# ════════════════════════════════════════════════════════════════════════════
# 6. Fallback vers page hébergée (push USSD échoue)
# ════════════════════════════════════════════════════════════════════════════

class TestFallbackHosted:

    @pytest.mark.asyncio
    async def test_charge_http_400_declenche_fallback(self):
        init_body = {
            "transaction": {"reference": "TX_FB_001"},
            "authorization_url": "https://pay.notchpay.co/TX_FB_001",
        }
        charge_body = {"message": "Subscriber not reachable"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(400, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237690000001", None, "TX_FB_001", operator="orange")
        assert result["success"] is True
        assert result["fallback_to_hosted"] is True
        assert result["checkout_url"] == "https://pay.notchpay.co/TX_FB_001"

    @pytest.mark.asyncio
    async def test_charge_http_422_declenche_fallback(self):
        init_body = {
            "transaction": {"reference": "TX_FB_422"},
            "authorization_url": "https://pay.notchpay.co/TX_FB_422",
        }
        charge_body = {"message": "Unprocessable Entity"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(422, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_FB_422")
        assert result["fallback_to_hosted"] is True

    @pytest.mark.asyncio
    async def test_charge_status_failed_declenche_fallback(self):
        """HTTP 200 mais status=failed dans le corps → fallback."""
        init_body = {
            "transaction": {"reference": "TX_FAILED"},
            "authorization_url": "https://pay.notchpay.co/TX_FAILED",
        }
        charge_body = {"status": "failed", "message": "Insufficient funds"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_FAILED")
        assert result["fallback_to_hosted"] is True

    @pytest.mark.asyncio
    async def test_fallback_contient_toujours_checkout_url(self):
        """checkout_url ne doit jamais être vide en mode fallback."""
        init_body = {
            "transaction": {"reference": "TX_URL"},
            "authorization_url": "https://pay.notchpay.co/UNIQUE_URL",
        }
        charge_body = {"message": "error"}
        ctx, _ = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(500, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237690000001", None, "TX_URL", operator="orange")
        assert result.get("checkout_url") == "https://pay.notchpay.co/UNIQUE_URL"


# ════════════════════════════════════════════════════════════════════════════
# 7. Erreur à l'initialisation
# ════════════════════════════════════════════════════════════════════════════

class TestErreurInitialisation:

    @pytest.mark.asyncio
    async def test_init_http_401_retourne_echec(self):
        init_body = {"message": "Unauthorized — clé invalide"}
        ctx, _ = _async_client_ctx(_make_httpx_response(401, init_body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_invalide"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_ERR401")
        assert result["success"] is False
        assert "Unauthorized" in result["error"] or "401" in result.get("error", "")

    @pytest.mark.asyncio
    async def test_init_http_500_retourne_echec(self):
        init_body = {"message": "Internal Server Error"}
        ctx, _ = _async_client_ctx(_make_httpx_response(500, init_body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_ERR500")
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_init_http_422_retourne_echec(self):
        init_body = {"message": "Montant minimum non atteint"}
        ctx, _ = _async_client_ctx(_make_httpx_response(422, init_body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(1, "+237670000001", None, "TX_422")   # montant trop bas
        assert result["success"] is False
        assert "error" in result


# ════════════════════════════════════════════════════════════════════════════
# 8. Erreur réseau / timeout
# ════════════════════════════════════════════════════════════════════════════

class TestErreurReseau:

    @pytest.mark.asyncio
    async def test_timeout_retourne_echec(self):
        import httpx as _httpx
        ctx = MagicMock()
        ctx.__aenter__ = AsyncMock(side_effect=_httpx.TimeoutException("timeout"))
        ctx.__aexit__ = AsyncMock(return_value=False)
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_TIMEOUT")
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_connexion_refusee_retourne_echec(self):
        import httpx as _httpx
        ctx = MagicMock()
        ctx.__aenter__ = AsyncMock(side_effect=_httpx.ConnectError("Connection refused"))
        ctx.__aexit__ = AsyncMock(return_value=False)
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(5000, "+237670000001", None, "TX_CONN")
        assert result["success"] is False


# ════════════════════════════════════════════════════════════════════════════
# 9. Vérification du statut d'un paiement (verifier_paiement)
# ════════════════════════════════════════════════════════════════════════════

class TestVerifierPaiement:

    @pytest.mark.asyncio
    async def test_statut_complete(self):
        body = {
            "transaction": {
                "reference": "TX_VRF_001",
                "status": "complete",
                "amount": 10000,
                "currency": "XAF",
            }
        }
        ctx, _ = _async_client_ctx(_make_httpx_response(200, body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("TX_VRF_001")
        assert result["success"] is True
        assert result["status"] == "complete"
        assert result["amount"] == 10000

    @pytest.mark.asyncio
    async def test_statut_pending(self):
        body = {
            "transaction": {
                "reference": "TX_VRF_PEND",
                "status": "pending",
                "amount": 5000,
                "currency": "XAF",
            }
        }
        ctx, _ = _async_client_ctx(_make_httpx_response(200, body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("TX_VRF_PEND")
        assert result["success"] is True
        assert result["status"] == "pending"

    @pytest.mark.asyncio
    async def test_statut_failed(self):
        body = {
            "transaction": {
                "reference": "TX_VRF_FAIL",
                "status": "failed",
                "amount": 5000,
                "currency": "XAF",
            }
        }
        ctx, _ = _async_client_ctx(_make_httpx_response(200, body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("TX_VRF_FAIL")
        assert result["status"] == "failed"

    @pytest.mark.asyncio
    async def test_erreur_reseau_verification(self):
        import httpx as _httpx
        ctx = MagicMock()
        ctx.__aenter__ = AsyncMock(side_effect=_httpx.TimeoutException("timeout"))
        ctx.__aexit__ = AsyncMock(return_value=False)
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("TX_TIMEOUT")
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_reference_inconnue_retourne_success_true(self):
        """NotchPay retourne toujours 200 même pour une référence inconnue."""
        body = {"transaction": {"reference": "UNKNOWN", "status": "pending"}}
        ctx, _ = _async_client_ctx(_make_httpx_response(200, body))
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import verifier_paiement
            result = await verifier_paiement("UNKNOWN")
        assert result["success"] is True


# ════════════════════════════════════════════════════════════════════════════
# 10. Opérateur forcé vs auto-détecté
# ════════════════════════════════════════════════════════════════════════════

class TestOperateurForce:

    @pytest.mark.asyncio
    async def test_force_mtn_sur_numero_orange(self):
        """Opérateur MTN forcé même si le numéro est Orange."""
        init_body = {
            "transaction": {"reference": "TX_FORCE"},
            "authorization_url": "https://pay.notchpay.co/TX_FORCE",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                5000, "+237690000001", None, "TX_FORCE", operator="mtn"
            )
        assert result["channel"] == "cm.mtn"
        charge_json = client.post.call_args_list[1][1].get("json") or {}
        assert charge_json.get("channel") == "cm.mtn"

    @pytest.mark.asyncio
    async def test_force_orange_sur_numero_mtn(self):
        """Opérateur Orange forcé même si le numéro est MTN."""
        init_body = {
            "transaction": {"reference": "TX_FORCE_ORA"},
            "authorization_url": "https://pay.notchpay.co/TX_FORCE_ORA",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            result = await initier_paiement(
                5000, "+237670000001", None, "TX_FORCE_ORA", operator="orange"
            )
        assert result["channel"] == "cm.orange"


# ════════════════════════════════════════════════════════════════════════════
# 11. Intégrité du payload envoyé à NotchPay
# ════════════════════════════════════════════════════════════════════════════

class TestPayloadIntegrite:

    @pytest.mark.asyncio
    async def test_payload_contient_tous_les_champs_requis(self):
        init_body = {
            "transaction": {"reference": "TX_PAYLOAD"},
            "authorization_url": "https://pay.notchpay.co/TX_PAYLOAD",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            await initier_paiement(
                montant_fcfa=15000,
                telephone="+237670000001",
                email="user@comebuy.cm",
                reference="TX_PAYLOAD",
                description="Commande TEST",
                callback_url="https://comebuy-api.onrender.com/api/webhooks/notchpay",
            )
        init_json = client.post.call_args_list[0][1].get("json") or {}
        assert init_json["amount"] == 15000
        assert init_json["currency"] == "XAF"
        assert init_json["email"] == "user@comebuy.cm"
        assert init_json["reference"] == "TX_PAYLOAD"
        assert init_json["description"] == "Commande TEST"
        assert init_json["callback"] == "https://comebuy-api.onrender.com/api/webhooks/notchpay"

    @pytest.mark.asyncio
    async def test_email_genere_si_absent(self):
        """Si email=None, un email est généré depuis le numéro."""
        init_body = {
            "transaction": {"reference": "TX_NOEMAIL"},
            "authorization_url": "https://pay.notchpay.co/TX_NOEMAIL",
        }
        charge_body = {"status": "pending"}
        ctx, client = _async_client_ctx(
            _make_httpx_response(200, init_body),
            _make_httpx_response(200, charge_body),
        )
        with patch("app.services.payment_service.NOTCHPAY_PUBLIC_KEY", "pk_live"), \
             patch("httpx.AsyncClient", return_value=ctx):
            from app.services.payment_service import initier_paiement
            await initier_paiement(5000, "+237670000001", None, "TX_NOEMAIL")
        init_json = client.post.call_args_list[0][1].get("json") or {}
        assert "@comebuy.cm" in init_json.get("email", "")

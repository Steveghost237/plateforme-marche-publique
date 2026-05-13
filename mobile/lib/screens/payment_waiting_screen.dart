import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';

/// Écran d'attente pendant un paiement externe (Stripe/PayPal/MoMo).
/// - Pour Stripe/PayPal : ouvre [checkoutUrl] dans le navigateur, affiche un bouton "J'ai payé"
///   qui appelle l'endpoint de vérification correspondant.
/// - Pour MoMo : poll automatique de /statut-paiement-momo toutes les 3s pendant 90s.
class PaymentWaitingScreen extends StatefulWidget {
  final String cmdId;
  final String numero;
  final String mode; // 'stripe' | 'paypal' | 'momo'
  final String? checkoutUrl;
  final String? operator; // MTN | Orange (pour MoMo)
  final String? telephone;

  const PaymentWaitingScreen({
    super.key,
    required this.cmdId,
    required this.numero,
    required this.mode,
    this.checkoutUrl,
    this.operator,
    this.telephone,
  });

  @override
  State<PaymentWaitingScreen> createState() => _PaymentWaitingScreenState();
}

class _PaymentWaitingScreenState extends State<PaymentWaitingScreen> {
  final ApiService _api = ApiService();
  String _status = 'waiting'; // waiting | success | error
  String _errorMsg = '';
  int _pollCount = 0;
  Timer? _timer;
  bool _verifyingExternal = false;

  @override
  void initState() {
    super.initState();
    if (widget.mode == 'momo') {
      _startMomoPolling();
    } else {
      _openCheckoutUrl();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _openCheckoutUrl() async {
    if (widget.checkoutUrl == null || widget.checkoutUrl!.isEmpty) return;
    final uri = Uri.parse(widget.checkoutUrl!);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _verifyStripeOrPaypal() async {
    setState(() => _verifyingExternal = true);
    try {
      final endpoint = widget.mode == 'stripe'
          ? '/commandes/${widget.cmdId}/verifier-paiement-stripe'
          : '/commandes/${widget.cmdId}/verifier-paiement-paypal';
      final result = await _api.post(endpoint, {});
      if (result['success'] == true) {
        if (!mounted) return;
        Provider.of<CartProvider>(context, listen: false).clear();
        setState(() => _status = 'success');
      } else {
        setState(() {
          _status = 'error';
          _errorMsg =
              result['error']?.toString() ?? 'Paiement non confirmé. Réessayez.';
        });
      }
    } catch (e) {
      setState(() {
        _status = 'error';
        _errorMsg = e.toString();
      });
    } finally {
      if (mounted) setState(() => _verifyingExternal = false);
    }
  }

  void _startMomoPolling() {
    const maxAttempts = 30;
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      _pollCount += 1;
      setState(() {});
      try {
        final result =
            await _api.get('/commandes/${widget.cmdId}/statut-paiement-momo');
        final status = (result['status'] ?? '').toString().toLowerCase();
        if (status == 'complete' ||
            status == 'completed' ||
            status == 'success' ||
            status == 'successful') {
          timer.cancel();
          if (!mounted) return;
          Provider.of<CartProvider>(context, listen: false).clear();
          setState(() => _status = 'success');
        } else if (['failed', 'canceled', 'cancelled', 'rejected']
            .contains(status)) {
          timer.cancel();
          setState(() {
            _status = 'error';
            _errorMsg = result['error']?.toString() ??
                'Paiement $status. Veuillez réessayer.';
          });
        } else if (_pollCount >= maxAttempts) {
          timer.cancel();
          setState(() {
            _status = 'error';
            _errorMsg =
                'Délai dépassé (90s). Vérifiez votre téléphone et réessayez.';
          });
        }
      } catch (e) {
        // ignore transient errors, keep polling
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5EFE6),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                      color: Colors.black12,
                      blurRadius: 12,
                      offset: Offset(0, 4))
                ],
              ),
              child: _buildContent(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_status == 'success') return _buildSuccess();
    if (_status == 'error') return _buildError();
    if (widget.mode == 'momo') return _buildMomoWaiting();
    return _buildStripePaypalWaiting();
  }

  Widget _buildMomoWaiting() {
    final isOrange = (widget.operator ?? '').toLowerCase().contains('orange');
    final ussd = isOrange ? '#150*50#' : '*126#';
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.smartphone,
              size: 42, color: Color(0xFFD97706)),
        ),
        const SizedBox(height: 16),
        Text(
          '${widget.operator ?? "Mobile Money"} — Confirmez sur votre téléphone',
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0D2137)),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7).withOpacity(.4),
            border: Border.all(color: const Color(0xFFFCD34D)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('📱 ${widget.telephone ?? ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              Text(
                '1. Vous allez recevoir une notification ${isOrange ? "Orange Money" : "MTN MoMo"}.\n'
                '2. Si rien ne s\'affiche, composez $ussd\n'
                '3. Entrez votre code PIN pour confirmer.\n'
                '4. Cette page se mettra à jour automatiquement.',
                style: const TextStyle(fontSize: 12, color: Colors.black87),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2)),
            const SizedBox(width: 8),
            Text('En attente… (${_pollCount * 3}s / 90s)',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            _timer?.cancel();
            Navigator.of(context).popUntil((r) => r.isFirst);
          },
          child: const Text('Annuler et retourner au panier',
              style: TextStyle(color: Colors.redAccent, fontSize: 12)),
        ),
      ],
    );
  }

  Widget _buildStripePaypalWaiting() {
    final providerName = widget.mode == 'stripe' ? 'Stripe' : 'PayPal';
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: Color(0xFFE0F2FE),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.credit_card,
              size: 42, color: Color(0xFF0369A1)),
        ),
        const SizedBox(height: 16),
        Text('Paiement $providerName en cours',
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0D2137))),
        const SizedBox(height: 12),
        const Text(
          'Une fenêtre s\'est ouverte dans votre navigateur. Effectuez le paiement, puis revenez ici et touchez le bouton ci-dessous.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.black54),
        ),
        const SizedBox(height: 20),
        if (widget.checkoutUrl != null)
          TextButton.icon(
            onPressed: _openCheckoutUrl,
            icon: const Icon(Icons.open_in_new, size: 16),
            label: Text('Rouvrir $providerName'),
          ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _verifyingExternal ? null : _verifyStripeOrPaypal,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D2137),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            icon: _verifyingExternal
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.check_circle_outline),
            label: Text(_verifyingExternal
                ? 'Vérification…'
                : 'J\'ai effectué le paiement'),
          ),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
          child: const Text('Annuler', style: TextStyle(fontSize: 12)),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
              color: Color(0xFFD1FAE5), shape: BoxShape.circle),
          child: const Icon(Icons.check, size: 42, color: Color(0xFF059669)),
        ),
        const SizedBox(height: 16),
        const Text('Paiement confirmé !',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0D2137))),
        const SizedBox(height: 4),
        Text(widget.numero,
            style: const TextStyle(
                fontSize: 16,
                color: Color(0xFFD97706),
                fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        const Text(
          'Votre commande a bien été enregistrée. Vous recevrez une notification dès qu\'elle sera prête.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.black54),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () =>
                Navigator.of(context).popUntil((r) => r.isFirst),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D2137),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Retour à l\'accueil'),
          ),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
              color: Color(0xFFFEE2E2), shape: BoxShape.circle),
          child: const Icon(Icons.cancel, size: 42, color: Color(0xFFDC2626)),
        ),
        const SizedBox(height: 16),
        const Text('Paiement non confirmé',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0D2137))),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFFEE2E2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(_errorMsg,
              style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () =>
                Navigator.of(context).popUntil((r) => r.isFirst),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D2137),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Retour au panier'),
          ),
        ),
      ],
    );
  }
}

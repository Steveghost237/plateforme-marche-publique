import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';

const _navy  = Color(0xFF0D2137);
const _amber = Color(0xFFFBBF24);

class PaymentWaitingScreen extends StatefulWidget {
  final String cmdId;
  final String numero;
  final String mode; // 'stripe' | 'paypal' | 'momo'
  final String? checkoutUrl;
  final String? operator;
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

class _PaymentWaitingScreenState extends State<PaymentWaitingScreen>
    with TickerProviderStateMixin {
  final ApiService _api = ApiService();
  String _status = 'waiting';
  String _errorMsg = '';
  int _pollCount = 0;
  static const int _maxPolls = 30; // 30 × 3s = 90s
  Timer? _timer;
  bool _verifyingExternal = false;

  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;
  late AnimationController _successCtrl;
  late Animation<double> _successAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.92, end: 1.08).animate(
        CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    _successCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _successAnim = CurvedAnimation(parent: _successCtrl, curve: Curves.elasticOut);

    if (widget.mode == 'momo') {
      _startMomoPolling();
    } else {
      _openCheckoutUrl();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseCtrl.dispose();
    _successCtrl.dispose();
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
        _pulseCtrl.stop();
        _successCtrl.forward();
        setState(() => _status = 'success');
      } else {
        setState(() {
          _status = 'error';
          _errorMsg = result['error']?.toString() ?? 'Paiement non confirmé.';
        });
      }
    } catch (e) {
      setState(() { _status = 'error'; _errorMsg = e.toString(); });
    } finally {
      if (mounted) setState(() => _verifyingExternal = false);
    }
  }

  void _startMomoPolling() {
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) { timer.cancel(); return; }
      _pollCount += 1;
      setState(() {});
      try {
        final result = await _api.get('/commandes/${widget.cmdId}/statut-paiement-momo');
        final status = (result['status'] ?? '').toString().toLowerCase();
        if (['complete', 'completed', 'success', 'successful'].contains(status)) {
          timer.cancel();
          if (!mounted) return;
          Provider.of<CartProvider>(context, listen: false).clear();
          _pulseCtrl.stop();
          _successCtrl.forward();
          setState(() => _status = 'success');
        } else if (['failed', 'canceled', 'cancelled', 'rejected'].contains(status)) {
          timer.cancel();
          setState(() {
            _status = 'error';
            _errorMsg = result['error']?.toString() ?? 'Paiement échoué. Veuillez réessayer.';
          });
        } else if (_pollCount >= _maxPolls) {
          timer.cancel();
          setState(() {
            _status = 'error';
            _errorMsg = 'Délai dépassé (90s). Vérifiez votre téléphone ou réessayez.';
          });
        }
      } catch (_) {}
    });
  }

  // ── Build ──────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: _buildCard(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCard() {
    return Container(
      key: ValueKey(_status),
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: _navy.withOpacity(.10), blurRadius: 20, offset: const Offset(0, 8))
        ],
      ),
      child: _status == 'success'
          ? _buildSuccess()
          : _status == 'error'
              ? _buildError()
              : widget.mode == 'momo'
                  ? _buildMomoWaiting()
                  : _buildStripePaypalWaiting(),
    );
  }

  // ── MoMo waiting ──
  Widget _buildMomoWaiting() {
    final isOrange = (widget.operator ?? '').toLowerCase().contains('orange');
    final operatorColor = isOrange ? const Color(0xFFFF6600) : const Color(0xFFFFCC00);
    final operatorBg = isOrange ? const Color(0xFFFFF7ED) : const Color(0xFFFFFBEB);
    final ussd = isOrange ? '#150*50#' : '*126#';
    final progress = _pollCount / _maxPolls;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Animated phone icon
        ScaleTransition(
          scale: _pulseAnim,
          child: Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: operatorBg,
              shape: BoxShape.circle,
              border: Border.all(color: operatorColor, width: 3),
            ),
            child: Center(
              child: Text(isOrange ? '🟠' : '🟡',
                  style: const TextStyle(fontSize: 40)),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          widget.operator ?? 'Mobile Money',
          style: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w800, color: operatorColor),
        ),
        const SizedBox(height: 4),
        const Text('En attente de votre confirmation',
            style: TextStyle(fontSize: 14, color: Colors.black54)),
        const SizedBox(height: 20),

        // Steps
        _buildStep('1', 'Notification envoyée sur votre téléphone', true),
        const SizedBox(height: 8),
        _buildStep('2', 'Entrez votre code PIN ${isOrange ? "Orange Money" : "MTN MoMo"}', false),
        const SizedBox(height: 8),
        _buildStep('3', 'Confirmation automatique ici', false),
        const SizedBox(height: 20),

        // Phone + USSD
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: operatorBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: operatorColor.withOpacity(.4)),
          ),
          child: Row(
            children: [
              Icon(Icons.smartphone_rounded, color: operatorColor, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('+237 ${widget.telephone ?? ''}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 13, color: _navy)),
                    Text('Si aucune notification → composez $ussd',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Progress bar
        Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: Colors.grey.shade100,
                valueColor: AlwaysStoppedAnimation<Color>(operatorColor),
              ),
            ),
            const SizedBox(height: 6),
            Text('${_pollCount * 3}s / 90s — Vérification en cours…',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () { _timer?.cancel(); Navigator.of(context).popUntil((r) => r.isFirst); },
          child: const Text('Annuler', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
        ),
      ],
    );
  }

  Widget _buildStep(String num, String text, bool active) {
    return Row(
      children: [
        Container(
          width: 24, height: 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active ? _navy : Colors.grey.shade100,
          ),
          child: Center(
            child: Text(num,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: active ? Colors.white : Colors.grey.shade400)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(text,
              style: TextStyle(
                  fontSize: 12,
                  color: active ? _navy : Colors.grey.shade500,
                  fontWeight: active ? FontWeight.w600 : FontWeight.normal)),
        ),
      ],
    );
  }

  // ── Stripe / PayPal waiting ──
  Widget _buildStripePaypalWaiting() {
    final isStripe = widget.mode == 'stripe';
    final color = isStripe ? const Color(0xFF635BFF) : const Color(0xFF003087);
    final bg = isStripe ? const Color(0xFFF5F3FF) : const Color(0xFFEFF6FF);
    final emoji = isStripe ? '💳' : '🅿️';
    final name = isStripe ? 'Stripe' : 'PayPal';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ScaleTransition(
          scale: _pulseAnim,
          child: Container(
            width: 90, height: 90,
            decoration: BoxDecoration(
              color: bg, shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(.3), width: 3),
            ),
            child: Center(child: Text(emoji, style: const TextStyle(fontSize: 42))),
          ),
        ),
        const SizedBox(height: 20),
        Text('Paiement $name', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 8),
        const Text(
          'Une page de paiement s\'est ouverte dans votre navigateur.\nFinalisez le paiement puis revenez ici.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.5),
        ),
        const SizedBox(height: 24),
        if (widget.checkoutUrl != null) ...[
          OutlinedButton.icon(
            onPressed: _openCheckoutUrl,
            icon: Icon(Icons.open_in_new, size: 16, color: color),
            label: Text('Rouvrir $name', style: TextStyle(color: color)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: color.withOpacity(.4)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            ),
          ),
          const SizedBox(height: 12),
        ],
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _verifyingExternal ? null : _verifyStripeOrPaypal,
            style: ElevatedButton.styleFrom(
              backgroundColor: _navy,
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: _verifyingExternal
                ? const SizedBox(width: 16, height: 16,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.check_circle_outline, size: 18),
            label: Text(_verifyingExternal ? 'Vérification en cours…' : 'J\'ai effectué le paiement',
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
          child: const Text('Annuler', style: TextStyle(fontSize: 12, color: Colors.grey)),
        ),
      ],
    );
  }

  // ── Success ──
  Widget _buildSuccess() {
    return ScaleTransition(
      scale: _successAnim,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 90, height: 90,
            decoration: const BoxDecoration(color: Color(0xFFD1FAE5), shape: BoxShape.circle),
            child: const Icon(Icons.check_rounded, size: 50, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 20),
          const Text('Paiement confirmé !',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: _navy)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: _amber.withOpacity(.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(widget.numero,
                style: const TextStyle(fontSize: 14, color: _navy, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 16),
          const Text(
            'Votre commande a été enregistrée.\nVous recevrez une notification dès que votre livreur sera en route.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.5),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
              style: ElevatedButton.styleFrom(
                backgroundColor: _navy,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.home_rounded, size: 18),
              label: const Text('Retour à l\'accueil',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Error ──
  Widget _buildError() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 90, height: 90,
          decoration: const BoxDecoration(color: Color(0xFFFEE2E2), shape: BoxShape.circle),
          child: const Icon(Icons.error_outline_rounded, size: 50, color: Color(0xFFDC2626)),
        ),
        const SizedBox(height: 20),
        const Text('Paiement non confirmé',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _navy)),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFEE2E2),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(_errorMsg,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            style: ElevatedButton.styleFrom(
              backgroundColor: _navy,
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.shopping_cart_rounded, size: 18),
            label: const Text('Retour au panier', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}

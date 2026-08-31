import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import 'payment_waiting_screen.dart';

// ─── Couleurs & constantes ────────────────────────────────
const _navy  = Color(0xFF0D2137);
const _amber = Color(0xFFFBBF24);
const _bg    = Color(0xFFF8FAFC);

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  bool _isLoading = false;
  bool _adressesLoading = true;
  String _selectedCreneau = 'matin_8h_12h';
  String _modePaiement = 'mtn_momo';
  String? _selectedAdresseId;
  List<Map<String, dynamic>> _adresses = [];
  final TextEditingController _telPaiementCtrl = TextEditingController();
  late AnimationController _btnAnim;

  static const _creneaux = [
    {'value': 'matin_8h_12h',        'label': 'Matin',       'sub': '8h – 12h',  'icon': '🌅'},
    {'value': 'apres_midi_12h_16h',  'label': 'Après-midi',  'sub': '12h – 16h', 'icon': '☀️'},
    {'value': 'soir_16h_20h',        'label': 'Soir',        'sub': '16h – 20h', 'icon': '🌆'},
  ];

  static const _paiements = [
    {
      'value': 'mtn_momo',
      'label': 'MTN MoMo',
      'sub': 'Mobile Money',
      'color': 0xFFFFCC00,
      'bg': 0xFFFFFBEB,
      'border': 0xFFFCD34D,
      'emoji': '🟡',
    },
    {
      'value': 'orange_money',
      'label': 'Orange Money',
      'sub': 'Mobile Money',
      'color': 0xFFFF6600,
      'bg': 0xFFFFF7ED,
      'border': 0xFFFDBA74,
      'emoji': '🟠',
    },
    {
      'value': 'stripe',
      'label': 'Carte bancaire',
      'sub': 'Visa · Mastercard',
      'color': 0xFF635BFF,
      'bg': 0xFFF5F3FF,
      'border': 0xFFC4B5FD,
      'emoji': '💳',
    },
    {
      'value': 'paypal',
      'label': 'PayPal',
      'sub': 'Paiement international',
      'color': 0xFF003087,
      'bg': 0xFFEFF6FF,
      'border': 0xFF93C5FD,
      'emoji': '🅿️',
    },
    {
      'value': 'especes',
      'label': 'Espèces',
      'sub': 'Payer à la livraison',
      'color': 0xFF16A34A,
      'bg': 0xFFF0FDF4,
      'border': 0xFF86EFAC,
      'emoji': '💵',
    },
  ];

  @override
  void initState() {
    super.initState();
    _btnAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 120));
    _loadAdresses();
  }

  Future<void> _loadAdresses() async {
    try {
      final data = await _api.get('/adresses/');
      final list =
          (data as List).map((a) => Map<String, dynamic>.from(a)).toList();
      setState(() {
        _adresses = list;
        _adressesLoading = false;
        if (list.isNotEmpty) {
          final defaut = list.firstWhere((a) => a['est_par_defaut'] == true,
              orElse: () => list.first);
          _selectedAdresseId = defaut['id'];
        }
      });
    } catch (e) {
      setState(() => _adressesLoading = false);
    }
  }

  Future<void> _ajouterAdresse() async {
    final quartierCtrl = TextEditingController();
    final villeCtrl = TextEditingController(text: 'Yaoundé');
    final libelleCtrl = TextEditingController(text: 'Domicile');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouvelle adresse'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: libelleCtrl,
                decoration: const InputDecoration(
                    labelText: 'Libellé', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
                controller: quartierCtrl,
                decoration: const InputDecoration(
                    labelText: 'Quartier', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
                controller: villeCtrl,
                decoration: const InputDecoration(
                    labelText: 'Ville', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              if (quartierCtrl.text.isEmpty) return;
              try {
                await _api.post('/adresses/', {
                  'libelle': libelleCtrl.text,
                  'quartier': quartierCtrl.text,
                  'ville': villeCtrl.text,
                  'est_par_defaut': _adresses.isEmpty,
                });
                Navigator.of(ctx).pop(true);
              } catch (e) {
                Navigator.of(ctx).pop(false);
              }
            },
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
    if (result == true) await _loadAdresses();
  }

  String _formatPrix(int montant) {
    return montant.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]} ',
        );
  }

  bool get _besoinTelephone =>
      _modePaiement == 'mtn_momo' || _modePaiement == 'orange_money';

  Future<void> _passerCommande() async {
    if (_selectedAdresseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Veuillez sélectionner une adresse de livraison'),
            backgroundColor: Colors.orange),
      );
      return;
    }

    // Validation du numéro de téléphone pour MTN / Orange
    String? telPaiement;
    if (_besoinTelephone) {
      final tel = _telPaiementCtrl.text.trim().replaceAll(' ', '');
      if (tel.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content:
                  Text('Veuillez saisir le numéro à débiter (Mobile Money)'),
              backgroundColor: Colors.orange),
        );
        return;
      }
      // Doit être 9 chiffres camerounais (ex: 67XXXXXXX, 65XXXXXXX, 69XXXXXXX)
      final reg = RegExp(r'^(?:\+?237)?(6\d{8})$');
      final match = reg.firstMatch(tel);
      if (match == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Numéro invalide. Format: 6XXXXXXXX (9 chiffres)'),
              backgroundColor: Colors.orange),
        );
        return;
      }
      telPaiement = '237${match.group(1)}';
    }

    final cart = Provider.of<CartProvider>(context, listen: false);
    setState(() => _isLoading = true);

    try {
      final commandeData = {
        'adresse_id': _selectedAdresseId,
        'creneau': _selectedCreneau,
        'date_livraison': DateTime.now()
            .add(const Duration(days: 1))
            .toIso8601String()
            .split('T')[0],
        'mode_paiement': _modePaiement,
        'telephone_paiement': telPaiement,
        'lignes': cart.toCommandeData(),
        'note_client': null,
        'poids_estime_kg': 0.0,
      };

      final response = await _api.post('/commandes/', commandeData);
      final cmdId = response['id'];

      final numero = response['numero']?.toString() ?? '';

      if (_besoinTelephone) {
        // Mobile Money : déclenche un USSD push (MTN MoMo / Orange Money)
        final paymentResult = await _api.post(
          '/commandes/$cmdId/initier-paiement',
          {'telephone_paiement': telPaiement},
        );
        if (paymentResult['simulation'] == true) {
          // Pas de clé NotchPay → confirmation directe (dev)
          await _api.post('/commandes/$cmdId/payer', {});
          cart.clear();
          if (!mounted) return;
          Navigator.of(context).popUntil((route) => route.isFirst);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Commande passée avec succès !'),
                backgroundColor: Colors.green),
          );
          return;
        }
        if (paymentResult['success'] == true) {
          if (!mounted) return;
          final fallback = paymentResult['fallback_to_hosted'] == true;
          final checkoutUrl = paymentResult['checkout_url']?.toString() ?? '';
          final isSandbox  = paymentResult['sandbox'] == true;
          // Si le push USSD a échoué → on ouvre la page hébergée NotchPay
          // (même flux que Stripe : le client paye dans le navigateur)
          Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (_) => PaymentWaitingScreen(
              cmdId: cmdId.toString(),
              numero: numero,
              mode: fallback ? 'momo_hosted' : 'momo',
              operator: paymentResult['operator']?.toString(),
              telephone: telPaiement,
              checkoutUrl: checkoutUrl.isNotEmpty ? checkoutUrl : null,
              sandbox: isSandbox,
            ),
          ));
          return;
        }
        throw Exception(
            paymentResult['error'] ?? 'Échec de l\'initiation du paiement');
      } else if (_modePaiement == 'stripe') {
        final stripeResult = await _api.post(
          '/commandes/$cmdId/initier-paiement-stripe',
          {'success_url': '', 'cancel_url': ''},
        );
        if (stripeResult['success'] == true &&
            stripeResult['checkout_url'] != null) {
          if (!mounted) return;
          Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (_) => PaymentWaitingScreen(
              cmdId: cmdId.toString(),
              numero: numero,
              mode: 'stripe',
              checkoutUrl: stripeResult['checkout_url']?.toString(),
            ),
          ));
          return;
        }
        throw Exception(stripeResult['error'] ?? 'Échec du paiement Stripe');
      } else if (_modePaiement == 'paypal') {
        final ppResult = await _api.post(
          '/commandes/$cmdId/initier-paiement-paypal',
          {'return_url': '', 'cancel_url': ''},
        );
        if (ppResult['success'] == true && ppResult['checkout_url'] != null) {
          if (!mounted) return;
          Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (_) => PaymentWaitingScreen(
              cmdId: cmdId.toString(),
              numero: numero,
              mode: 'paypal',
              checkoutUrl: ppResult['checkout_url']?.toString(),
            ),
          ));
          return;
        }
        throw Exception(ppResult['error'] ?? 'Échec du paiement PayPal');
      } else {
        // Espèces à la livraison : confirmation immédiate
        await _api.post('/commandes/$cmdId/payer', {});
        cart.clear();
        if (!mounted) return;
        Navigator.of(context).popUntil((route) => route.isFirst);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Commande passée avec succès !'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _telPaiementCtrl.dispose();
    _btnAnim.dispose();
    super.dispose();
  }

  // ── Section title ──
  Widget _sectionTitle(String text, IconData icon) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: _amber.withOpacity(.18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: _amber),
            ),
            const SizedBox(width: 10),
            Text(text,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700, color: _navy)),
          ],
        ),
      );

  // ── Adresse card ──
  Widget _adresseCard(Map<String, dynamic> a) {
    final selected = _selectedAdresseId == a['id'];
    return GestureDetector(
      onTap: () => setState(() => _selectedAdresseId = a['id']),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? _navy : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? _amber : Colors.grey.shade200, width: selected ? 2 : 1),
          boxShadow: selected
              ? [BoxShadow(color: _navy.withOpacity(.18), blurRadius: 8, offset: const Offset(0, 3))]
              : [BoxShadow(color: Colors.black.withOpacity(.04), blurRadius: 4)],
        ),
        child: Row(
          children: [
            Icon(
              a['est_par_defaut'] == true ? Icons.star_rounded : Icons.location_on_rounded,
              color: selected ? _amber : Colors.grey.shade400,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a['libelle'] ?? a['quartier'] ?? '',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: selected ? Colors.white : _navy)),
                  const SizedBox(height: 2),
                  Text('${a['quartier'] ?? ''}, ${a['ville'] ?? ''}',
                      style: TextStyle(
                          fontSize: 12,
                          color: selected ? Colors.white70 : Colors.grey.shade500)),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: _amber, size: 20),
          ],
        ),
      ),
    );
  }

  // ── Créneau card ──
  Widget _creneauCard(Map<String, String> c) {
    final selected = _selectedCreneau == c['value'];
    return GestureDetector(
      onTap: () => setState(() => _selectedCreneau = c['value']!),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? _navy : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? _amber : Colors.grey.shade200, width: selected ? 2 : 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(c['icon']!, style: const TextStyle(fontSize: 22)),
            const SizedBox(height: 4),
            Text(c['label']!,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : _navy)),
            Text(c['sub']!,
                style: TextStyle(
                    fontSize: 10, color: selected ? Colors.white60 : Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }

  // ── Payment card ──
  Widget _paymentCard(Map<String, dynamic> p) {
    final selected = _modePaiement == p['value'];
    final color = Color(p['color'] as int);
    final bg = Color(p['bg'] as int);
    final border = Color(p['border'] as int);
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _modePaiement = p['value'] as String);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? bg : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? border : Colors.grey.shade200, width: selected ? 2 : 1),
          boxShadow: selected
              ? [BoxShadow(color: color.withOpacity(.15), blurRadius: 8, offset: const Offset(0, 3))]
              : [BoxShadow(color: Colors.black.withOpacity(.03), blurRadius: 4)],
        ),
        child: Row(
          children: [
            Text(p['emoji'] as String, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p['label'] as String,
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: selected ? color : _navy)),
                  Text(p['sub'] as String,
                      style: TextStyle(
                          fontSize: 11,
                          color: selected ? color.withOpacity(.7) : Colors.grey.shade500)),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? color : Colors.transparent,
                border: Border.all(
                    color: selected ? color : Colors.grey.shade300, width: 2),
              ),
              child: selected
                  ? const Icon(Icons.check, size: 13, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final fraisLiv = cart.sousTotal >= 5000 ? 0 : 1000;
    final total = cart.sousTotal + fraisLiv;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _navy,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Finaliser la commande',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // ── ADRESSE ───────────────────────────────────────
            _sectionTitle('Adresse de livraison', Icons.location_on_rounded),
            if (_adressesLoading)
              const Center(
                  child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(color: _amber)))
            else if (_adresses.isEmpty)
              GestureDetector(
                onTap: _ajouterAdresse,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                            color: _amber.withOpacity(.1),
                            borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.add_location_rounded,
                            color: _amber, size: 24),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Ajouter une adresse',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700, color: _navy)),
                            Text('Requis pour la livraison',
                                style:
                                    TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                    ],
                  ),
                ),
              )
            else ...[
              ..._adresses.map(_adresseCard),
              TextButton.icon(
                onPressed: _ajouterAdresse,
                icon: const Icon(Icons.add_rounded, size: 16, color: _amber),
                label: const Text('Ajouter une adresse',
                    style: TextStyle(color: _amber, fontSize: 12)),
              ),
            ],

            const SizedBox(height: 24),

            // ── CRÉNEAU ────────────────────────────────────────
            _sectionTitle('Créneau de livraison', Icons.access_time_rounded),
            Row(
              children: _creneaux
                  .map((c) => Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: _creneauCard(c),
                        ),
                      ))
                  .toList(),
            ),

            const SizedBox(height: 24),

            // ── MODE DE PAIEMENT ───────────────────────────────
            _sectionTitle('Mode de paiement', Icons.payment_rounded),
            ..._paiements.map(_paymentCard),

            // ── Champ téléphone (MoMo) ─────────────────────────
            if (_besoinTelephone) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _modePaiement == 'mtn_momo'
                      ? const Color(0xFFFFFBEB)
                      : const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: _modePaiement == 'mtn_momo'
                          ? const Color(0xFFFCD34D)
                          : const Color(0xFFFDBA74)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.smartphone_rounded,
                            size: 16,
                            color: _modePaiement == 'mtn_momo'
                                ? Colors.amber.shade700
                                : Colors.orange.shade700),
                        const SizedBox(width: 6),
                        Text(
                          'Numéro ${_modePaiement == 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: _modePaiement == 'mtn_momo'
                                  ? Colors.amber.shade800
                                  : Colors.orange.shade800),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _telPaiementCtrl,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600, color: _navy),
                      decoration: InputDecoration(
                        hintText: '6XXXXXXXX',
                        prefixText: '+237 ',
                        prefixStyle: const TextStyle(
                            color: _navy, fontWeight: FontWeight.w600),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                                color: Colors.grey.shade200, width: 1)),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                                color: _modePaiement == 'mtn_momo'
                                    ? Colors.amber
                                    : Colors.orange,
                                width: 2)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '📲 Vous recevrez une notification pour confirmer avec votre PIN',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 28),

            // ── RÉCAPITULATIF ──────────────────────────────────
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.receipt_long_rounded,
                          size: 18, color: _amber),
                      const SizedBox(width: 8),
                      const Text('Récapitulatif',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: _navy)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _recapRow('Articles', '${_formatPrix(cart.sousTotal)} F', false),
                  const SizedBox(height: 8),
                  _recapRow(
                    fraisLiv == 0 ? 'Livraison (offerte 🎁)' : 'Frais de livraison',
                    fraisLiv == 0 ? 'Gratuit' : '${_formatPrix(fraisLiv)} F',
                    false,
                    valueColor: fraisLiv == 0 ? Colors.green.shade600 : null,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: Color(0xFFE5E7EB)),
                  ),
                  _recapRow('Total à payer', '${_formatPrix(total)} F', true),
                ],
              ),
            ),
          ],
        ),
      ),

      // ── BOUTON FLOTTANT ────────────────────────────────────
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(.08),
                blurRadius: 16,
                offset: const Offset(0, -4))
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(color: Colors.grey, fontSize: 13)),
                Text('${_formatPrix(total)} FCFA',
                    style: const TextStyle(
                        color: _navy,
                        fontSize: 18,
                        fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _passerCommande,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _amber,
                  foregroundColor: _navy,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  disabledBackgroundColor: Colors.grey.shade200,
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: _navy))
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.lock_rounded, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            _modePaiement == 'especes'
                                ? 'Confirmer la commande'
                                : 'Payer ${_formatPrix(total)} F',
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recapRow(String label, String value, bool bold, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: bold ? 15 : 13,
                fontWeight: bold ? FontWeight.w700 : FontWeight.normal,
                color: bold ? _navy : Colors.grey.shade600)),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 17 : 13,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: valueColor ?? (bold ? _amber : _navy))),
      ],
    );
  }
}

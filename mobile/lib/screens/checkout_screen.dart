import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import 'payment_waiting_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = false;
  bool _adressesLoading = true;
  String _selectedCreneau = 'matin_8h_12h';
  String _modePaiement = 'mtn_momo';
  String? _selectedAdresseId;
  List<Map<String, dynamic>> _adresses = [];
  final TextEditingController _telPaiementCtrl = TextEditingController();

  final List<Map<String, String>> _creneaux = [
    {'value': 'matin_8h_12h', 'label': 'Matin (8h - 12h)'},
    {'value': 'apres_midi_12h_16h', 'label': 'Après-midi (12h - 16h)'},
    {'value': 'soir_16h_20h', 'label': 'Soir (16h - 20h)'},
  ];

  final List<Map<String, String>> _paiements = [
    {'value': 'mtn_momo', 'label': 'MTN Mobile Money', 'icon': '🟡'},
    {'value': 'orange_money', 'label': 'Orange Money', 'icon': '🟠'},
    {'value': 'stripe', 'label': 'Carte bancaire (Visa/MC)', 'icon': '💳'},
    {'value': 'paypal', 'label': 'PayPal', 'icon': '🅿️'},
    {'value': 'especes', 'label': 'Espèces à la livraison', 'icon': '💵'},
  ];

  @override
  void initState() {
    super.initState();
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
          Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (_) => PaymentWaitingScreen(
              cmdId: cmdId.toString(),
              numero: numero,
              mode: 'momo',
              operator: paymentResult['operator']?.toString(),
              telephone: telPaiement,
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final fraisLiv = cart.sousTotal >= 5000 ? 0 : 500;
    final total = cart.sousTotal + fraisLiv;

    return Scaffold(
      appBar: AppBar(title: const Text('Finaliser la commande')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── ADRESSE DE LIVRAISON ──
            const Text('Adresse de livraison',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (_adressesLoading)
              const Center(child: CircularProgressIndicator())
            else if (_adresses.isEmpty)
              Card(
                child: ListTile(
                  leading:
                      const Icon(Icons.add_location, color: Color(0xFFFBBF24)),
                  title: const Text('Aucune adresse'),
                  subtitle: const Text('Ajoutez une adresse pour continuer'),
                  trailing: const Icon(Icons.add),
                  onTap: _ajouterAdresse,
                ),
              )
            else
              ..._adresses.map((a) => RadioListTile<String>(
                    title: Text(a['libelle'] ?? a['quartier'] ?? '',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle:
                        Text('${a['quartier'] ?? ''}, ${a['ville'] ?? ''}'),
                    value: a['id'],
                    groupValue: _selectedAdresseId,
                    onChanged: (v) => setState(() => _selectedAdresseId = v),
                    activeColor: const Color(0xFFFBBF24),
                    secondary: Icon(
                      a['est_par_defaut'] == true
                          ? Icons.star
                          : Icons.location_on,
                      color: const Color(0xFFFBBF24),
                      size: 20,
                    ),
                  )),
            if (_adresses.isNotEmpty)
              TextButton.icon(
                onPressed: _ajouterAdresse,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Ajouter une adresse'),
              ),

            const SizedBox(height: 24),
            // ── CRÉNEAU ──
            const Text('Créneau de livraison',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ..._creneaux.map((c) => RadioListTile<String>(
                  title: Text(c['label']!),
                  value: c['value']!,
                  groupValue: _selectedCreneau,
                  onChanged: (v) => setState(() => _selectedCreneau = v!),
                  activeColor: const Color(0xFFFBBF24),
                )),

            const SizedBox(height: 24),
            // ── PAIEMENT ──
            const Text('Mode de paiement',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ..._paiements.map((p) => RadioListTile<String>(
                  title: Text(p['label']!),
                  value: p['value']!,
                  groupValue: _modePaiement,
                  onChanged: (v) => setState(() => _modePaiement = v!),
                  activeColor: const Color(0xFFFBBF24),
                )),

            // Champ téléphone visible uniquement si MTN ou Orange Money
            if (_besoinTelephone) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _telPaiementCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Numéro Mobile Money à débiter',
                  hintText: '6XXXXXXXX',
                  prefixIcon: Icon(
                    _modePaiement == 'mtn_momo'
                        ? Icons.phone_android
                        : Icons.phone_iphone,
                    color: _modePaiement == 'mtn_momo'
                        ? Colors.amber
                        : Colors.orange,
                  ),
                  prefixText: '+237 ',
                  border: const OutlineInputBorder(),
                  helperText:
                      'Une notification de paiement sera envoyée sur ce numéro',
                ),
              ),
            ],

            // Info Stripe
            if (_modePaiement == 'stripe') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: const Row(
                  children: [
                    Text('💳', style: TextStyle(fontSize: 20)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Vous serez redirigé vers Stripe pour saisir vos informations de carte (Visa, Mastercard).',
                        style:
                            TextStyle(fontSize: 12, color: Color(0xFF1E40AF)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Info PayPal
            if (_modePaiement == 'paypal') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.indigo.shade100),
                ),
                child: const Row(
                  children: [
                    Text('🅿️', style: TextStyle(fontSize: 20)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Vous serez redirigé vers PayPal pour finaliser le paiement avec votre compte ou carte internationale.',
                        style:
                            TextStyle(fontSize: 12, color: Color(0xFF3730A3)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),
            // ── RÉCAPITULATIF ──
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Récapitulatif',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Sous-total'),
                        Text('${_formatPrix(cart.sousTotal)} F',
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Frais de livraison'),
                        Text(
                          fraisLiv == 0
                              ? 'Offert'
                              : '${_formatPrix(fraisLiv)} F',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: fraisLiv == 0 ? Colors.green : null),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        Text(
                          '${_formatPrix(total)} F',
                          style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFFBBF24)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _passerCommande,
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                                Color(0xFF0D2137))),
                      )
                    : const Text('Confirmer la commande',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

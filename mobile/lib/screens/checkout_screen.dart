import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = false;
  String _selectedCreneau = 'matin_8h_12h';
  String _modePaiement = 'mtn_momo';

  final List<Map<String, String>> _creneaux = [
    {'value': 'matin_8h_12h', 'label': 'Matin (8h - 12h)'},
    {'value': 'apres_midi_12h_16h', 'label': 'Après-midi (12h - 16h)'},
    {'value': 'soir_16h_20h', 'label': 'Soir (16h - 20h)'},
  ];

  final List<Map<String, String>> _paiements = [
    {'value': 'mtn_momo', 'label': 'MTN Mobile Money'},
    {'value': 'orange_money', 'label': 'Orange Money'},
    {'value': 'especes', 'label': 'Espèces à la livraison'},
  ];

  Future<void> _passerCommande() async {
    final cart = Provider.of<CartProvider>(context, listen: false);

    setState(() => _isLoading = true);

    try {
      final commandeData = {
        'adresse_id': null, // À implémenter avec sélection d'adresse
        'creneau': _selectedCreneau,
        'date_livraison': DateTime.now()
            .add(const Duration(days: 1))
            .toIso8601String()
            .split('T')[0],
        'mode_paiement': _modePaiement,
        'telephone_paiement': null,
        'lignes': cart.toCommandeData(),
        'note_client': null,
        'poids_estime_kg': 0.0,
      };

      final response = await _api.post('/commandes/', commandeData);

      // Payer la commande
      await _api.post('/commandes/${response['id']}/payer', {});

      cart.clear();

      if (!mounted) return;

      Navigator.of(context).popUntil((route) => route.isFirst);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Commande passée avec succès !'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Finaliser la commande'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Créneau de livraison',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._creneaux.map((creneau) => RadioListTile<String>(
                  title: Text(creneau['label']!),
                  value: creneau['value']!,
                  groupValue: _selectedCreneau,
                  onChanged: (value) {
                    setState(() => _selectedCreneau = value!);
                  },
                  activeColor: const Color(0xFFFBBF24),
                )),
            const SizedBox(height: 24),
            const Text(
              'Mode de paiement',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._paiements.map((paiement) => RadioListTile<String>(
                  title: Text(paiement['label']!),
                  value: paiement['value']!,
                  groupValue: _modePaiement,
                  onChanged: (value) {
                    setState(() => _modePaiement = value!);
                  },
                  activeColor: const Color(0xFFFBBF24),
                )),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Récapitulatif',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Sous-total'),
                        Text(
                          '${cart.sousTotal.toString().replaceAllMapped(
                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                (Match m) => '${m[1]} ',
                              )} F',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Frais de livraison'),
                        Text(
                          cart.sousTotal >= 5000 ? 'Offert' : '500 F',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: cart.sousTotal >= 5000 ? Colors.green : null,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${(cart.sousTotal + (cart.sousTotal >= 5000 ? 0 : 500)).toString().replaceAllMapped(
                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                (Match m) => '${m[1]} ',
                              )} F',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFFBBF24),
                          ),
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
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Color(0xFF0D2137)),
                        ),
                      )
                    : const Text(
                        'Confirmer la commande',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

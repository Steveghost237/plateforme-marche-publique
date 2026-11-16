import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/commande.dart';
import '../services/api_service.dart';
import 'order_detail_screen.dart';
import 'payment_waiting_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final ApiService _api = ApiService();
  List<Commande> _commandes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCommandes();
  }

  Future<void> _loadCommandes() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.get('/commandes/mes-commandes');
      setState(() {
        _commandes = (data as List).map((c) => Commande.fromJson(c)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Color _getStatutColor(String statut) {
    switch (statut) {
      case 'livree':
        return Colors.green;
      case 'annulee':
        return Colors.red;
      case 'en_livraison':
        return Colors.blue;
      case 'payee':
      case 'prete':
        return const Color(0xFF6366F1);
      case 'en_attente':
      case 'en_attente_paiement':
        return Colors.deepOrange;
      case 'prix_a_confirmer':
        return const Color(0xFF9333EA); // violet
      case 'assignee':
      case 'en_cours_marche':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getStatutLabel(String statut) {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'en_attente_paiement':
        return 'À payer';
      case 'prix_a_confirmer':
        return 'Prix en cours';
      case 'payee':
        return 'Confirmée';
      case 'prete':
        return 'Prête';
      case 'assignee':
        return 'Livreur assigné';
      case 'en_cours_marche':
        return 'Au marché';
      case 'en_livraison':
        return 'En livraison';
      case 'livree':
        return 'Livrée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  }

  Future<void> _reprendrePaiement(BuildContext ctx, Commande commande) async {
    final telCtrl = TextEditingController(text: commande.telephonePaiement ?? '');
    final mode = commande.modePaiement ?? 'especes';
    final besoinTel = mode == 'mtn_momo' || mode == 'mtn_mobile_money' || mode == 'orange_money';

    bool confirmed = true;
    if (besoinTel && telCtrl.text.isEmpty) {
      confirmed = await showDialog<bool>(
        context: ctx,
        builder: (c) => AlertDialog(
          title: const Text('Numéro Mobile Money'),
          content: TextField(
            controller: telCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Numéro à débiter',
              hintText: '6XXXXXXXX',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')),
            ElevatedButton(onPressed: () => Navigator.pop(c, true), child: const Text('Payer')),
          ],
        ),
      ) ?? false;
    }
    if (!confirmed) return;

    setState(() => _isLoading = true);
    try {
      final tel = besoinTel ? '237${telCtrl.text.trim().replaceAll(RegExp(r'^(\+?237)?'), '')}' : null;
      final result = await _api.post('/commandes/${commande.id}/initier-paiement', {
        if (tel != null) 'telephone_paiement': tel,
      });
      if (!ctx.mounted) return;
      if (result['success'] == true || result['simulation'] == true) {
        final checkoutUrl = result['checkout_url']?.toString();
        Navigator.of(ctx).push(MaterialPageRoute(
          builder: (_) => PaymentWaitingScreen(
            cmdId: commande.id,
            numero: commande.numero,
            mode: mode,
            telephone: tel,
            checkoutUrl: checkoutUrl,
            sandbox: result['sandbox'] == true,
          ),
        ));
      }
    } catch (e) {
      if (ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Commandes'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _commandes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.receipt_long_outlined,
                        size: 100,
                        color: Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune commande',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadCommandes,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _commandes.length,
                    itemBuilder: (context, index) {
                      final commande = _commandes[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => OrderDetailScreen(commandeId: commande.id),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      commande.numero,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _getStatutColor(commande.statut).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: _getStatutColor(commande.statut),
                                          width: 1,
                                        ),
                                      ),
                                      child: Text(
                                        _getStatutLabel(commande.statut),
                                        style: TextStyle(
                                          color: _getStatutColor(commande.statut),
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  DateFormat('dd/MM/yyyy à HH:mm').format(commande.createdAt),
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 14,
                                  ),
                                ),
                                if (commande.creneau != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Créneau: ${commande.creneau!.replaceAll('_', ' ')}',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${commande.lignes?.length ?? 0} article(s)',
                                      style: TextStyle(
                                        color: Colors.grey[700],
                                        fontSize: 14,
                                      ),
                                    ),
                                    Text(
                                      commande.totalFormate,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18,
                                        color: Color(0xFFFBBF24),
                                      ),
                                    ),
                                  ],
                                ),
                                if (commande.isEnCours) ...[
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    width: double.infinity,
                                    child: OutlinedButton.icon(
                                      onPressed: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => OrderDetailScreen(commandeId: commande.id),
                                          ),
                                        );
                                      },
                                      icon: const Icon(Icons.location_on),
                                      label: const Text('Suivre la livraison'),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: const Color(0xFF0D2137),
                                      ),
                                    ),
                                  ),
                                ],
                                // Bouton Payer pour commandes en attente de paiement
                                if (commande.isEnAttentePaiement) ...[
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _reprendrePaiement(context, commande),
                                      icon: const Icon(Icons.payment),
                                      label: const Text('Payer maintenant'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFFBBF24),
                                        foregroundColor: const Color(0xFF0D2137),
                                      ),
                                    ),
                                  ),
                                ],
                                // Info prix en cours de confirmation
                                if (commande.isPrixAConfirmer) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF3E8FF),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF9333EA).withOpacity(0.3)),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.info_outline, size: 16, color: Color(0xFF9333EA)),
                                        SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'Prix en cours de confirmation par notre agent. Vous recevrez une notification.',
                                            style: TextStyle(fontSize: 12, color: Color(0xFF9333EA)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

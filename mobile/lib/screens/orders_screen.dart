import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/commande.dart';
import '../services/api_service.dart';
import 'order_detail_screen.dart';

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
      case 'assignee':
      case 'en_cours_marche':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getStatutLabel(String statut) {
    switch (statut) {
      case 'payee':
        return 'Confirmée';
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

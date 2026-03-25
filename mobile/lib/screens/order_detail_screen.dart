import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/commande.dart';
import '../services/api_service.dart';

class OrderDetailScreen extends StatefulWidget {
  final String commandeId;
  const OrderDetailScreen({super.key, required this.commandeId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final ApiService _api = ApiService();
  Commande? _commande;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCommande();
  }

  Future<void> _loadCommande() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.get('/commandes/${widget.commandeId}');
      setState(() {
        _commande = Commande.fromJson(data);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _callLivreur() async {
    if (_commande?.livreurTelephone != null) {
      final uri = Uri.parse('tel:${_commande!.livreurTelephone}');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    }
  }

  Future<void> _smsLivreur() async {
    if (_commande?.livreurTelephone != null) {
      final uri = Uri.parse('sms:${_commande!.livreurTelephone}');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détail de la commande'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _commande == null
              ? const Center(child: Text('Commande introuvable'))
              : RefreshIndicator(
                  onRefresh: _loadCommande,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _commande!.numero,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _commande!.isLivree
                                          ? Colors.green.withOpacity(0.1)
                                          : Colors.orange.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      _commande!.statut.toUpperCase(),
                                      style: TextStyle(
                                        color: _commande!.isLivree ? Colors.green : Colors.orange,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              if (_commande!.creneau != null)
                                Text('Créneau: ${_commande!.creneau!.replaceAll('_', ' ')}'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Info livreur si assigné
                      if (_commande!.livreurNom != null) ...[
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Votre livreur',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 30,
                                      backgroundColor: const Color(0xFFFBBF24),
                                      backgroundImage: _commande!.livreurPhoto != null
                                          ? NetworkImage(_commande!.livreurPhoto!)
                                          : null,
                                      child: _commande!.livreurPhoto == null
                                          ? const Icon(Icons.delivery_dining, size: 30)
                                          : null,
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _commande!.livreurNom!,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                            ),
                                          ),
                                          if (_commande!.livreurTelephone != null)
                                            Text(
                                              _commande!.livreurTelephone!,
                                              style: const TextStyle(
                                                color: Colors.grey,
                                                fontSize: 14,
                                              ),
                                            ),
                                          if (_commande!.livreurNote != null)
                                            Row(
                                              children: [
                                                const Icon(Icons.star, size: 16, color: Colors.amber),
                                                const SizedBox(width: 4),
                                                Text(
                                                  '${_commande!.livreurNote!.toStringAsFixed(1)} • ${_commande!.livreurNiveau ?? 'Junior'}',
                                                  style: const TextStyle(fontSize: 14),
                                                ),
                                              ],
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                if (_commande!.livreurTelephone != null) ...[
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: _callLivreur,
                                          icon: const Icon(Icons.phone),
                                          label: const Text('Appeler'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                            foregroundColor: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: _smsLivreur,
                                          icon: const Icon(Icons.message),
                                          label: const Text('SMS'),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Articles
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Articles',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Divider(height: 24),
                              if (_commande!.lignes != null)
                                ...(_commande!.lignes!.map((ligne) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${ligne.produitNom} × ${ligne.quantite}',
                                          style: const TextStyle(fontSize: 14),
                                        ),
                                      ),
                                      Text(
                                        '${ligne.prixTotal} F',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ))),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Sous-total'),
                                  Text('${_commande!.sousTotalFcfa} F'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Livraison'),
                                  Text(
                                    _commande!.fraisLivraison == 0
                                        ? 'Offert'
                                        : '${_commande!.fraisLivraison} F',
                                    style: TextStyle(
                                      color: _commande!.fraisLivraison == 0
                                          ? Colors.green
                                          : null,
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
                                    _commande!.totalFormate,
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
                    ],
                  ),
                ),
    );
  }
}

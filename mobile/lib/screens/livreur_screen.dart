import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/commande.dart';
import '../services/api_service.dart';

class LivreurScreen extends StatefulWidget {
  const LivreurScreen({super.key});

  @override
  State<LivreurScreen> createState() => _LivreurScreenState();
}

class _LivreurScreenState extends State<LivreurScreen> {
  final ApiService _api = ApiService();
  List<Commande> _disponibles = [];
  List<Commande> _enCours = [];
  bool _isLoading = true;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final [dispo, cours] = await Future.wait([
        _api.get('/commandes/livreur/disponibles'),
        _api.get('/commandes/livreur/en-cours'),
      ]);

      setState(() {
        _disponibles = (dispo as List).map((c) => Commande.fromJson(c)).toList();
        _enCours = (cours as List).map((c) => Commande.fromJson(c)).toList();
        _isLoading = false;
        if (_enCours.isNotEmpty) _selectedTab = 0;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _accepterCommande(String id) async {
    try {
      await _api.post('/commandes/$id/accepter', {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Commande acceptée !'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData();
      setState(() => _selectedTab = 0);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _changerStatut(String id, String statut) async {
    try {
      await _api.post('/commandes/$id/statut', {'statut': statut});
      final messages = {
        'en_cours_marche': 'Vous êtes au marché 🛒',
        'en_livraison': 'En route vers le client 🛵',
        'livree': 'Livraison confirmée ✅',
      };
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(messages[statut] ?? 'Statut mis à jour'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _callClient(String? telephone) async {
    if (telephone != null) {
      final uri = Uri.parse('tel:$telephone');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    }
  }

  Future<void> _smsClient(String? telephone) async {
    if (telephone != null) {
      final uri = Uri.parse('sms:$telephone');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Espace Livreur'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: const Color(0xFF0D2137),
            child: TabBar(
              controller: null,
              onTap: (index) => setState(() => _selectedTab = index),
              indicatorColor: const Color(0xFFFBBF24),
              labelColor: const Color(0xFFFBBF24),
              unselectedLabelColor: Colors.white70,
              tabs: [
                Tab(text: 'En cours (${_enCours.length})'),
                Tab(text: 'Disponibles (${_disponibles.length})'),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _selectedTab == 0
                    ? _buildEnCoursTab()
                    : _buildDisponiblesTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildEnCoursTab() {
    if (_enCours.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.delivery_dining, size: 80, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Aucune livraison en cours',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _enCours.length,
      itemBuilder: (context, index) {
        final commande = _enCours[index];
        final nextStatut = _getNextStatut(commande.statut);
        
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
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
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getStatutColor(commande.statut),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _getStatutLabel(commande.statut),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                
                // Contact client
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFBBF24).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFBBF24)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.person, size: 16, color: Color(0xFF0D2137)),
                          SizedBox(width: 8),
                          Text(
                            'Contact client',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  commande.clientNom ?? 'Client',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                if (commande.clientTelephone != null)
                                  Text(
                                    commande.clientTelephone!,
                                    style: const TextStyle(
                                      color: Colors.grey,
                                      fontSize: 14,
                                    ),
                                  ),
                                if (commande.adresse != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.location_on, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            '${commande.adresse!['quartier'] ?? ''}, ${commande.adresse!['ville'] ?? ''}',
                                            style: const TextStyle(
                                              color: Colors.grey,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (commande.clientTelephone != null) ...[
                            IconButton(
                              onPressed: () => _callClient(commande.clientTelephone),
                              icon: const Icon(Icons.phone),
                              color: Colors.green,
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.green.withOpacity(0.1),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: () => _smsClient(commande.clientTelephone),
                              icon: const Icon(Icons.message),
                              color: const Color(0xFF0D2137),
                              style: IconButton.styleFrom(
                                backgroundColor: const Color(0xFF0D2137).withOpacity(0.1),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Montant commande'),
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
                
                if (nextStatut != null) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _changerStatut(commande.id, nextStatut),
                      child: Text(_getNextLabel(commande.statut)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDisponiblesTab() {
    if (_disponibles.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 80, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Aucune commande disponible',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _disponibles.length,
      itemBuilder: (context, index) {
        final commande = _disponibles[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
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
                if (commande.creneau != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    commande.creneau!.replaceAll('_', ' '),
                    style: const TextStyle(color: Colors.grey, fontSize: 14),
                  ),
                ],
                if (commande.adresse != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${commande.adresse!['quartier'] ?? ''}, ${commande.adresse!['ville'] ?? ''}',
                          style: const TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _accepterCommande(commande.id),
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Accepter cette commande'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String? _getNextStatut(String statut) {
    const map = {
      'assignee': 'en_cours_marche',
      'en_cours_marche': 'en_livraison',
      'en_livraison': 'livree',
    };
    return map[statut];
  }

  String _getNextLabel(String statut) {
    const map = {
      'assignee': '🛒 Je suis au marché',
      'en_cours_marche': '🛵 Je suis en route',
      'en_livraison': '✅ Livraison effectuée',
    };
    return map[statut] ?? 'Continuer';
  }

  Color _getStatutColor(String statut) {
    switch (statut) {
      case 'assignee':
        return Colors.blue;
      case 'en_cours_marche':
        return Colors.orange;
      case 'en_livraison':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatutLabel(String statut) {
    switch (statut) {
      case 'assignee':
        return '🔵 Assigné';
      case 'en_cours_marche':
        return '🛒 Au marché';
      case 'en_livraison':
        return '🛵 En livraison';
      default:
        return statut;
    }
  }
}

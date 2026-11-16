import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _compte;
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _recompenses = [];
  List<Map<String, dynamic>> _avantages = [];
  bool _isLoading = true;
  bool _isExchanging = false;

  static const _niveaux = {
    'bronze': {'emoji': '🥉', 'label': 'Bronze', 'min': 0, 'max': 999},
    'argent': {'emoji': '🥈', 'label': 'Argent', 'min': 1000, 'max': 4999},
    'or': {'emoji': '🥇', 'label': 'Or', 'min': 5000, 'max': 9999},
    'vip': {'emoji': '👑', 'label': 'VIP', 'min': 10000, 'max': 99999},
  };

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final compte = await _api.get('/fidelite/compte');
      final txData = await _api.get('/fidelite/transactions');
      final recompData = await _api.get('/fidelite/recompenses');
      final avData = await _api.get('/fidelite/avantages');
      setState(() {
        _compte = Map<String, dynamic>.from(compte);
        _transactions =
            (txData as List).map((t) => Map<String, dynamic>.from(t)).toList();
        _recompenses =
            (recompData as List).map((r) => Map<String, dynamic>.from(r)).toList();
        _avantages =
            (avData as List).map((a) => Map<String, dynamic>.from(a)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _echangerRecompense(Map<String, dynamic> rec) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Échanger des points ?'),
        content: Text(
          'Échanger ${rec['cout_points']} pts contre « ${rec['nom']} » ?',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Échanger'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isExchanging = true);
    try {
      final result = await _api.post('/fidelite/echanger/${rec['id']}', {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Récompense obtenue !'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isExchanging = false);
    }
  }

  String _formatAvantage(Map<String, dynamic> av) {
    final type = av['type_avantage'];
    final valeur = av['valeur_avantage'];
    switch (type) {
      case 'livraison':
        return 'Livraison offerte';
      case 'reduction_pct':
        return '-${valeur?.toStringAsFixed(0) ?? '15'}% sur la commande';
      case 'produit':
        return 'Produit offert (jusqu\'à ${valeur?.toStringAsFixed(0) ?? '0'} F)';
      default:
        return av['nom'] ?? 'Avantage';
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Points Fidélité')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final points = _compte?['points_actuels'] ?? 0;
    final total = _compte?['points_totaux'] ?? 0;
    final niveau = _compte?['niveau'] ?? 'bronze';
    final niv = _niveaux[niveau] ?? _niveaux['bronze']!;
    final nextMax = (niv['max'] as int) + 1;
    final progress = nextMax > 0 ? (points / nextMax).clamp(0.0, 1.0) : 0.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Points Fidélité')),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Carte points ──
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Text(niv['emoji'] as String,
                        style: const TextStyle(fontSize: 60)),
                    const SizedBox(height: 12),
                    Text(
                      '$points Points',
                      style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0D2137)),
                    ),
                    const SizedBox(height: 4),
                    Text('Niveau ${niv['label']}',
                        style:
                            TextStyle(fontSize: 18, color: Colors.grey[600])),
                    const SizedBox(height: 4),
                    Text('Total cumulé : $total pts',
                        style:
                            TextStyle(fontSize: 12, color: Colors.grey[400])),
                    const SizedBox(height: 20),
                    LinearProgressIndicator(
                      value: progress.toDouble(),
                      backgroundColor: Colors.grey[300],
                      valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFFFBBF24)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$points / $nextMax pts pour le niveau suivant',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),

            // ── Avantages actifs (coupons) ──
            if (_avantages.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text('Mes avantages',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ..._avantages.where((a) => a['statut'] == 'active').map((av) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: const Color(0xFFF0FDF4),
                  child: ListTile(
                    leading: const Icon(Icons.card_giftcard,
                        color: Color(0xFF16A34A)),
                    title: Text(av['nom'] ?? 'Avantage',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text(
                      '${_formatAvantage(av)} • expire ${_formatDate(av['expire_at'])}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF16A34A),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Actif',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                    ),
                  ),
                );
              }),
            ],

            // ── Récompenses disponibles ──
            const SizedBox(height: 24),
            const Text('Récompenses',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (_recompenses.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Aucune récompense disponible',
                    style: TextStyle(color: Colors.grey)),
              )
            else
              ..._recompenses.map((rec) {
                final cout = rec['cout_points'] ?? 0;
                final peutEchanger = points >= cout;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: peutEchanger
                          ? const Color(0xFFFBBF24)
                          : Colors.grey[300],
                      child: Text(rec['icone'] ?? '🎁',
                          style: const TextStyle(fontSize: 20)),
                    ),
                    title: Text(rec['nom'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text(
                      '${rec['description'] ?? ''} • $cout pts',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: ElevatedButton(
                      onPressed: peutEchanger && !_isExchanging
                          ? () => _echangerRecompense(rec)
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: peutEchanger
                            ? const Color(0xFFFBBF24)
                            : Colors.grey[300],
                        foregroundColor: const Color(0xFF0D2137),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        minimumSize: Size.zero,
                      ),
                      child: Text(
                        peutEchanger ? 'Échanger' : 'Pas assez',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                );
              }),

            // ── Historique ──
            if (_transactions.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text('Historique',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ..._transactions.map((tx) {
                final pts = tx['points'] ?? 0;
                final isGain = pts > 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(
                      isGain ? Icons.add_circle : Icons.remove_circle,
                      color: isGain ? Colors.green : Colors.red,
                    ),
                    title: Text(tx['description'] ?? tx['type'] ?? '',
                        style: const TextStyle(fontSize: 14)),
                    subtitle: Text(_formatDate(tx['created_at']),
                        style:
                            TextStyle(fontSize: 11, color: Colors.grey[500])),
                    trailing: Text(
                      '${isGain ? '+' : ''}$pts pts',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isGain ? Colors.green : Colors.red),
                    ),
                  ),
                );
              }),
            ],

            const SizedBox(height: 24),
            const Text('Comment gagner des points ?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildPointsInfo(
                icon: Icons.shopping_cart,
                title: 'Achats',
                description: '1 point pour chaque 500 FCFA dépensés'),
            _buildPointsInfo(
                icon: Icons.star,
                title: 'Avis',
                description: '10 points par avis laissé'),
            _buildPointsInfo(
                icon: Icons.lightbulb,
                title: 'Suggestion',
                description: '100 points si votre suggestion est retenue'),
          ],
        ),
      ),
    );
  }

  Widget _buildPointsInfo(
      {required IconData icon,
      required String title,
      required String description}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFFFBBF24)),
        title: Text(title),
        subtitle: Text(description),
      ),
    );
  }
}

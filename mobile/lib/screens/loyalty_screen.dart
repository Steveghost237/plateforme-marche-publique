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
  bool _isLoading = true;

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
      setState(() {
        _compte = Map<String, dynamic>.from(compte);
        _transactions =
            (txData as List).map((t) => Map<String, dynamic>.from(t)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
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
            const SizedBox(height: 24),
            if (_transactions.isNotEmpty) ...[
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

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return '';
    }
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

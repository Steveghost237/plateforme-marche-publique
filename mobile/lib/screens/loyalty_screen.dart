import 'package:flutter/material.dart';

class LoyaltyScreen extends StatelessWidget {
  const LoyaltyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final int points = 0;
    final int level = 1;
    final int nextLevelPoints = 100;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Points Fidélité'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Icon(
                    Icons.stars,
                    size: 80,
                    color: Color(0xFFFBBF24),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '$points Points',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0D2137),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Niveau $level',
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 24),
                  LinearProgressIndicator(
                    value: points / nextLevelPoints,
                    backgroundColor: Colors.grey[300],
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFFBBF24),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$points / $nextLevelPoints points pour le niveau ${level + 1}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Comment gagner des points ?',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildPointsInfo(
            icon: Icons.shopping_cart,
            title: 'Achats',
            description: '1 point pour chaque 1000 FCFA dépensés',
          ),
          _buildPointsInfo(
            icon: Icons.person_add,
            title: 'Parrainage',
            description: '50 points par ami parrainé',
          ),
          _buildPointsInfo(
            icon: Icons.star,
            title: 'Avis',
            description: '10 points par avis laissé',
          ),
          _buildPointsInfo(
            icon: Icons.cake,
            title: 'Anniversaire',
            description: '100 points bonus le jour de votre anniversaire',
          ),
          const SizedBox(height: 24),
          const Text(
            'Avantages par niveau',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildLevelCard(
            level: 1,
            name: 'Bronze',
            minPoints: 0,
            benefits: ['Accès au catalogue', 'Support client'],
            color: Colors.brown,
          ),
          _buildLevelCard(
            level: 2,
            name: 'Argent',
            minPoints: 100,
            benefits: ['5% de réduction', 'Livraison prioritaire'],
            color: Colors.grey,
          ),
          _buildLevelCard(
            level: 3,
            name: 'Or',
            minPoints: 500,
            benefits: ['10% de réduction', 'Livraison gratuite', 'Offres exclusives'],
            color: const Color(0xFFFBBF24),
          ),
          _buildLevelCard(
            level: 4,
            name: 'Platine',
            minPoints: 1000,
            benefits: ['15% de réduction', 'Support VIP', 'Cadeaux mensuels'],
            color: Colors.blueGrey,
          ),
        ],
      ),
    );
  }

  Widget _buildPointsInfo({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFFFBBF24)),
        title: Text(title),
        subtitle: Text(description),
      ),
    );
  }

  Widget _buildLevelCard({
    required int level,
    required String name,
    required int minPoints,
    required List<String> benefits,
    required Color color,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.star, color: color, size: 32),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Niveau $level - $name',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'À partir de $minPoints points',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...benefits.map((benefit) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, size: 16, color: Colors.green),
                      const SizedBox(width: 8),
                      Text(benefit),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
import '../utils/image_utils.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _listes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFavoris();
  }

  Future<void> _loadFavoris() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.get('/favoris/');
      setState(() {
        _listes =
            (data as List).map((l) => Map<String, dynamic>.from(l)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _allProduits {
    final result = <Map<String, dynamic>>[];
    for (final liste in _listes) {
      final listeId = liste['id'];
      for (final p in (liste['produits'] as List? ?? [])) {
        final item = Map<String, dynamic>.from(p);
        item['_liste_id'] = listeId;
        result.add(item);
      }
    }
    return result;
  }

  Future<void> _removeFavorite(String listeId, String produitId) async {
    try {
      await _api.delete('/favoris/$listeId/produits/$produitId');
      _loadFavoris();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Retiré des favoris'),
              duration: Duration(seconds: 2)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final produits = _allProduits;

    return Scaffold(
      appBar: AppBar(title: const Text('Mes Favoris')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : produits.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.favorite_border,
                          size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('Aucun favori',
                          style:
                              TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 8),
                      Text('Ajoutez vos produits préférés depuis le catalogue',
                          style:
                              TextStyle(fontSize: 14, color: Colors.grey[500])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadFavoris,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: produits.length,
                    itemBuilder: (context, index) {
                      final p = produits[index];
                      final imageUrl = ImageUtils.getImageUrl(p['image_url']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(
                              width: 60,
                              height: 60,
                              child: CachedNetworkImage(
                                      imageUrl: imageUrl,
                                      fit: BoxFit.cover,
                                      placeholder: (_, __) => Container(
                                          color: Colors.grey[200],
                                          child: const Icon(
                                              Icons.restaurant_menu)),
                                      errorWidget: (_, __, ___) => Container(
                                          color: Colors.grey[200],
                                          child: const Icon(
                                              Icons.restaurant_menu)),
                                    ),
                            ),
                          ),
                          title: Text(p['nom'] ?? '',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text('${p['prix_base_fcfa'] ?? 0} FCFA',
                              style: const TextStyle(
                                  color: Color(0xFFFBBF24),
                                  fontWeight: FontWeight.bold)),
                          trailing: IconButton(
                            icon: const Icon(Icons.favorite, color: Colors.red),
                            onPressed: () => _removeFavorite(
                                p['_liste_id'], p['produit_id']),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

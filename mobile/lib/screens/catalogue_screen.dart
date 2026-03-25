import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/produit.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../config/api_config.dart';

class CatalogueScreen extends StatefulWidget {
  const CatalogueScreen({super.key});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  final ApiService _api = ApiService();
  List<Section> _sections = [];
  List<Produit> _produits = [];
  bool _isLoading = true;
  String? _selectedSection;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final sectionsData = await _api.get('/catalogue/sections', auth: false);
      final produitsData = await _api.get(
        '/catalogue/produits?limit=100${_selectedSection != null ? '&section=$_selectedSection' : ''}',
        auth: false,
      );

      setState(() {
        _sections = (sectionsData as List).map((s) => Section.fromJson(s)).toList();
        _produits = (produitsData as List).map((p) => Produit.fromJson(p)).toList();
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

  List<Produit> get _filteredProduits {
    return _produits.where((p) {
      final matchesSearch = _searchQuery.isEmpty ||
          p.nom.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesSearch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Marché en Ligne'),
        actions: [
          Consumer<CartProvider>(
            builder: (context, cart, child) {
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart),
                    onPressed: () {},
                  ),
                  if (cart.itemCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFFBBF24),
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '${cart.itemCount}',
                          style: const TextStyle(
                            color: Color(0xFF0D2137),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Barre de recherche
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Rechercher un produit...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value);
              },
            ),
          ),

          // Sections horizontales
          if (_sections.isNotEmpty)
            SizedBox(
              height: 50,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _sections.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: const Text('Tous'),
                        selected: _selectedSection == null,
                        onSelected: (selected) {
                          setState(() => _selectedSection = null);
                          _loadData();
                        },
                        selectedColor: const Color(0xFFFBBF24),
                      ),
                    );
                  }
                  final section = _sections[index - 1];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(section.nom),
                      selected: _selectedSection == section.code,
                      onSelected: (selected) {
                        setState(() => _selectedSection = selected ? section.code : null);
                        _loadData();
                      },
                      selectedColor: const Color(0xFFFBBF24),
                    ),
                  );
                },
              ),
            ),

          const SizedBox(height: 8),

          // Liste des produits
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredProduits.isEmpty
                    ? const Center(child: Text('Aucun produit trouvé'))
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.75,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        itemCount: _filteredProduits.length,
                        itemBuilder: (context, index) {
                          final produit = _filteredProduits[index];
                          return _buildProduitCard(produit);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildProduitCard(Produit produit) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: produit.imageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: produit.imageUrl!.startsWith('http')
                          ? produit.imageUrl!
                          : '${ApiConfig.baseUrl.replaceAll('/api', '')}${produit.imageUrl}',
                      fit: BoxFit.cover,
                      width: double.infinity,
                      placeholder: (context, url) => Container(
                        color: Colors.grey[200],
                        child: const Center(child: CircularProgressIndicator()),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Colors.grey[200],
                        child: const Icon(Icons.image_not_supported, size: 48),
                      ),
                    )
                  : Container(
                      color: Colors.grey[200],
                      child: const Icon(Icons.shopping_basket, size: 48),
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  produit.nom,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  produit.prixFormate,
                  style: const TextStyle(
                    color: Color(0xFFFBBF24),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Provider.of<CartProvider>(context, listen: false).addItem(produit);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('${produit.nom} ajouté au panier'),
                          duration: const Duration(seconds: 1),
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Ajouter', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

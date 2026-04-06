import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/produit.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../utils/image_utils.dart';

class MenuCustomizationScreen extends StatefulWidget {
  final Produit produit;

  const MenuCustomizationScreen({super.key, required this.produit});

  @override
  State<MenuCustomizationScreen> createState() => _MenuCustomizationScreenState();
}

class _MenuCustomizationScreenState extends State<MenuCustomizationScreen> {
  final ApiService _api = ApiService();
  Map<String, IngredientConfig> _config = {};
  bool _isLoading = true;
  Produit? _produitDetail;

  @override
  void initState() {
    super.initState();
    _loadProduitDetail();
  }

  Future<void> _loadProduitDetail() async {
    try {
      final response = await _api.get('/catalogue/produits/${widget.produit.slug}');
      setState(() {
        _produitDetail = Produit.fromJson(response);
        // Initialiser la configuration des ingrédients
        if (_produitDetail!.ingredients != null) {
          for (var ingredient in _produitDetail!.ingredients!) {
            _config[ingredient.id] = IngredientConfig(
              quantite: ingredient.quantiteDefaut.toDouble(),
              prix: _calculerPrixCurseur(ingredient, ingredient.quantiteDefaut.toDouble()),
            );
          }
        }
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

  double _calculerPrixCurseur(Ingredient ingredient, double quantite) {
    if (quantite <= ingredient.quantiteMin) return 0.0;
    if (quantite >= ingredient.quantiteMax) return ingredient.prixMaxFcfa.toDouble();
    
    final ratio = (quantite - ingredient.quantiteMin) / (ingredient.quantiteMax - ingredient.quantiteMin);
    return ingredient.prixMinFcfa + (ratio * (ingredient.prixMaxFcfa - ingredient.prixMinFcfa));
  }

  void _updateCurseur(Ingredient ingredient, double valeur) {
    setState(() {
      _config[ingredient.id] = IngredientConfig(
        quantite: valeur,
        prix: _calculerPrixCurseur(ingredient, valeur),
      );
    });
  }

  double _getPrixTotalIngredients() {
    return _config.values.fold(0.0, (sum, config) => sum + config.prix);
  }

  void _addToCart() {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    
    // Créer une liste d'ingrédients personnalisés
    final ingredientsPersonnalises = _config.entries.map((entry) {
      final ingredient = _produitDetail!.ingredients!.firstWhere((ing) => ing.id == entry.key);
      return IngredientPersonnalise(
        ingredientId: entry.key,
        quantite: entry.value.quantite.toInt(),
        unite: ingredient.unite,
        prixChoisi: entry.value.prix.toInt(),
      );
    }).toList();

    // Ajouter au panier avec les ingrédients personnalisés
    cartProvider.addItemWithIngredients(
      widget.produit,
      ingredientsPersonnalises.map((ing) => ing.toJson()).toList(),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${widget.produit.nom} personnalisé ajouté au panier'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Personnalisation')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_produitDetail == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        body: const Center(child: Text('Impossible de charger le produit')),
      );
    }

    final produit = _produitDetail!;
    final prixBase = produit.prixFcfa.toDouble();
    final prixIngredients = _getPrixTotalIngredients();
    final prixTotal = prixBase + prixIngredients;

    return Scaffold(
      appBar: AppBar(
        title: Text('Personnaliser ${produit.nom}'),
        backgroundColor: const Color(0xFF0D2137),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Contenu scrollable
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Header avec image et prix
                  Container(
                    color: Colors.grey[50],
                    child: Column(
                      children: [
                        // Image
                        if (produit.imageUrl != null &&
                            ImageUtils.isValidImageUrl(produit.imageUrl))
                          ClipRRect(
                            child: CachedNetworkImage(
                              imageUrl: ImageUtils.getImageUrl(produit.imageUrl),
                              height: 180,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                height: 180,
                                width: double.infinity,
                                color: Colors.grey[200],
                                child: const Center(
                                  child: CircularProgressIndicator(color: Color(0xFF0D2137)),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                height: 180,
                                width: double.infinity,
                                color: Colors.grey[200],
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.image_not_supported, size: 48, color: Colors.grey),
                                    SizedBox(height: 8),
                                    Text('Image non disponible', style: TextStyle(color: Colors.grey)),
                                  ],
                                ),
                              ),
                            ),
                          ),

                        // Informations et prix
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                produit.nom,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0D2137),
                                ),
                              ),
                              const SizedBox(height: 8),
                              if (produit.description != null && produit.description!.isNotEmpty)
                                Text(
                                  produit.description!,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              const SizedBox(height: 16),
                              
                              // Prix résumé
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFBBF24).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFFBBF24).withOpacity(0.3)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text('Prix base:', style: TextStyle(fontSize: 14)),
                                        Text(
                                          '${prixBase.toInt().toString().replaceAllMapped(
                                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                                (Match m) => '${m[1]} ',
                                              )} F',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (prixIngredients > 0) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Ingrédients:', style: TextStyle(fontSize: 14)),
                                          Text(
                                            '+${prixIngredients.toInt().toString().replaceAllMapped(
                                                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                                  (Match m) => '${m[1]} ',
                                                )} F',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFFFBBF24),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                    const Divider(),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text(
                                          'Total:',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '${prixTotal.toInt().toString().replaceAllMapped(
                                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                                (Match m) => '${m[1]} ',
                                              )} F',
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF0D2137),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Liste des ingrédients
                  Container(
                    color: Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // Header ingrédients
                          Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF0D2137),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    '${produit.ingredients?.length ?? 0}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Personnalisez vos ingrédients',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0D2137),
                                      ),
                                    ),
                                    Text(
                                      'Ajustez les quantités selon vos besoins',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          
                          // Liste des ingrédients
                          if (produit.ingredients != null && produit.ingredients!.isNotEmpty)
                            ...produit.ingredients!.map((ingredient) {
                              final config = _config[ingredient.id];
                              if (config == null) return const SizedBox.shrink();
                              
                              return _buildIngredientCard(ingredient, config);
                            }).toList()
                          else
                            const Center(
                              child: Text('Aucun ingrédient personnalisable'),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Bouton d'ajout au panier fixe en bas
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _addToCart,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFBBF24),
                  foregroundColor: const Color(0xFF0D2137),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.shopping_cart, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Ajouter au panier - ${prixTotal.toInt().toString().replaceAllMapped(
                            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                            (Match m) => '${m[1]} ',
                          )} F',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientCard(Ingredient ingredient, IngredientConfig config) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header ingrédient
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Text(
                      ingredient.nom,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0D2137),
                      ),
                    ),
                    const SizedBox(width: 4),
                    ingredient.estObligatoire
                        ? const Text(
                            '*',
                            style: TextStyle(
                              color: Colors.red,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : Text(
                            '(opt.)',
                            style: TextStyle(
                              color: Colors.grey[400],
                              fontSize: 12,
                            ),
                          ),
                  ],
                ),
              ),
              Text(
                config.prix > 0
                    ? '+${config.prix.toInt().toString().replaceAllMapped(
                          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                          (Match m) => '${m[1]} ',
                        )} F'
                    : 'Inclus',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: config.prix > 0 ? const Color(0xFFFBBF24) : Colors.green,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Curseur de quantité
          if (ingredient.typeSaisie == 'curseur') ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${ingredient.quantiteMin} ${ingredient.unite}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      '${config.quantite.toInt()} ${ingredient.unite}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0D2137),
                      ),
                    ),
                    Text(
                      '${ingredient.quantiteMax} ${ingredient.unite}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: const Color(0xFF0D2137),
                    inactiveTrackColor: Colors.grey[300],
                    thumbColor: const Color(0xFF0D2137),
                    overlayColor: const Color(0xFF0D2137).withOpacity(0.2),
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 12),
                    trackHeight: 6,
                  ),
                  child: Slider(
                    value: config.quantite,
                    min: ingredient.quantiteMin.toDouble(),
                    max: ingredient.quantiteMax.toDouble(),
                    divisions: ingredient.unite == 'g' ? 
                        ((ingredient.quantiteMax - ingredient.quantiteMin) / 50).round() : 
                        ingredient.unite == 'pcs' ? 
                        (ingredient.quantiteMax - ingredient.quantiteMin) : 
                        20,
                    onChanged: (value) => _updateCurseur(ingredient, value),
                  ),
                ),
              ],
            ),
          ] else if (ingredient.typeSaisie == 'toggle') ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateCurseur(ingredient, 1),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: config.quantite > 0 ? const Color(0xFF0D2137) : Colors.grey[200],
                      foregroundColor: config.quantite > 0 ? Colors.white : Colors.grey[600],
                    ),
                    child: const Text('Oui'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateCurseur(ingredient, 0),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: config.quantite == 0 ? const Color(0xFF0D2137) : Colors.grey[200],
                      foregroundColor: config.quantite == 0 ? Colors.white : Colors.grey[600],
                    ),
                    child: const Text('Non'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class IngredientConfig {
  final double quantite;
  final double prix;

  IngredientConfig({
    required this.quantite,
    required this.prix,
  });
}

class IngredientPersonnalise {
  final String ingredientId;
  final int quantite;
  final String unite;
  final int prixChoisi;

  IngredientPersonnalise({
    required this.ingredientId,
    required this.quantite,
    required this.unite,
    required this.prixChoisi,
  });

  Map<String, dynamic> toJson() {
    return {
      'ingredient_id': ingredientId,
      'quantite': quantite,
      'unite': unite,
      'prix_choisi': prixChoisi,
    };
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/produit.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../utils/image_utils.dart';
import 'menu_customization_screen.dart';

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
  bool _hasError = false;
  String? _selectedSection;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    try {
      final sectionsData = await _api.get('/catalogue/sections', auth: false);
      final produitsData = await _api.get(
        '/catalogue/produits?limit=100${_selectedSection != null ? '&section=$_selectedSection' : ''}',
        auth: false,
      );

      setState(() {
        _sections =
            (sectionsData as List).map((s) => Section.fromJson(s)).toList();
        _produits =
            (produitsData as List).map((p) => Produit.fromJson(p)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
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
        title: const Text('Composez votre repas'),
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
          // Header fixe avec recherche et filtres
          Container(
            color: Colors.white,
            child: Column(
              children: [
                // Barre de recherche
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Rechercher un produit...',
                      prefixIcon:
                          const Icon(Icons.search, color: Color(0xFF0D2137)),
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

                // Filtres par section
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(
                    height: 50,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
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
                        final isSelected = section.code == _selectedSection;

                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(section.nom),
                            selected: isSelected,
                            onSelected: (selected) {
                              setState(() {
                                _selectedSection =
                                    selected ? section.code : null;
                              });
                              _loadData();
                            },
                            backgroundColor: Colors.grey[200],
                            selectedColor: const Color(0xFF0D2137),
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : Colors.black87,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Contenu scrollable
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _hasError
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.wifi_off,
                                size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            const Text('Impossible de charger les produits',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey)),
                            const SizedBox(height: 8),
                            const Text('Vérifiez votre connexion internet',
                                style: TextStyle(
                                    fontSize: 13, color: Colors.grey)),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadData,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Réessayer'),
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF0D2137),
                                  foregroundColor: Colors.white),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // ── BANNIÈRE COMPOSITION DYNAMIQUE ──
                              const _CompositionBanner(),
                              const SizedBox(height: 16),
                              // ── GRILLE PRODUITS ──
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 0.75,
                                  crossAxisSpacing: 16,
                                  mainAxisSpacing: 16,
                                ),
                                itemCount: _filteredProduits.length,
                                itemBuilder: (context, index) {
                                  return _buildProduitCard(
                                      _filteredProduits[index]);
                                },
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

  Widget _buildProduitCard(Produit produit) {
    return GestureDetector(
      onTap: () => _showProduitDetails(produit),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
          border: Border.all(color: Colors.grey.shade100),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── IMAGE ──
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: Colors.grey.shade100,
                    child: produit.imageUrl != null &&
                            ImageUtils.isValidImageUrl(produit.imageUrl)
                        ? CachedNetworkImage(
                            imageUrl: ImageUtils.getImageUrl(produit.imageUrl),
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                            placeholder: (context, url) => Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.grey.shade300,
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => Center(
                              child: Icon(Icons.image_outlined,
                                  size: 36, color: Colors.grey.shade300),
                            ),
                          )
                        : Center(
                            child: Icon(Icons.image_outlined,
                                size: 36, color: Colors.grey.shade300),
                          ),
                  ),
                  // Overlay indisponible
                  if (!produit.stockDispo)
                    Container(
                      color: Colors.black.withOpacity(0.55),
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('Indisponible',
                              style: TextStyle(
                                  color: Colors.grey.shade700,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                  // Badges top-left
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        if (produit.estPopulaire)
                          _badge('⭐ Pop.', const Color(0xFFFBBF24),
                              const Color(0xFF0D2137)),
                        if (produit.estNouveau)
                          _badge('✨ Nouveau', const Color(0xFF10B981),
                              Colors.white),
                      ],
                    ),
                  ),
                  // Badge Menu bottom-right
                  if (produit.estMenu)
                    Positioned(
                      bottom: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0D2137).withOpacity(0.8),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('🍽️ Menu',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                ],
              ),
            ),
            // ── INFOS ──
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Nom de la section
                    if (produit.sectionNom != null)
                      Text(
                        produit.sectionNom!,
                        style: TextStyle(
                          fontSize: 9,
                          color: Colors.grey.shade400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 2),
                    // Nom du produit
                    Expanded(
                      child: Text(
                        produit.nom,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: Color(0xFF0D2137),
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Prix + bouton sur la même ligne
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Prix
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                produit.prixFormate,
                                style: const TextStyle(
                                  color: Color(0xFFF59E0B),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (produit.aGammePrix &&
                                  produit.prixMaxFcfa != produit.prixBaseFcfa)
                                Text(
                                  '– ${produit.prixMaxFormate}',
                                  style: TextStyle(
                                    color: Colors.grey.shade300,
                                    fontSize: 11,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Bouton
                        if (produit.estMenu)
                          GestureDetector(
                            onTap: () => _showProduitDetails(produit),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Composer',
                                    style: TextStyle(
                                      color: Color(0xFF1B6CA8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(width: 2),
                                  Icon(Icons.chevron_right,
                                      size: 14, color: Color(0xFF1B6CA8)),
                                ],
                              ),
                            ),
                          )
                        else
                          GestureDetector(
                            onTap: produit.stockDispo
                                ? () {
                                    Provider.of<CartProvider>(context,
                                            listen: false)
                                        .addItem(produit);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                            '${produit.nom} ajouté au panier'),
                                        duration: const Duration(seconds: 2),
                                        backgroundColor:
                                            const Color(0xFF0D2137),
                                        behavior: SnackBarBehavior.floating,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                      ),
                                    );
                                  }
                                : null,
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D2137),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(Icons.add,
                                  color: produit.stockDispo
                                      ? Colors.white
                                      : Colors.white.withOpacity(0.3),
                                  size: 16),
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

  Widget _badge(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Text(text,
          style:
              TextStyle(color: fg, fontSize: 9, fontWeight: FontWeight.bold)),
    );
  }

  void _showProduitDetails(Produit produit) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: ListView(
            controller: scrollController,
            children: [
              // Image du produit
              if (produit.imageUrl != null &&
                  ImageUtils.isValidImageUrl(produit.imageUrl))
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: ImageUtils.getImageUrl(produit.imageUrl),
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      height: 160,
                      color: Colors.grey[200],
                      child: const Center(
                          child: CircularProgressIndicator(
                              color: Color(0xFF0D2137))),
                    ),
                    errorWidget: (context, url, error) => Container(
                      height: 160,
                      color: Colors.grey[200],
                      child: const Icon(Icons.image_not_supported,
                          size: 48, color: Colors.grey),
                    ),
                  ),
                ),
              const SizedBox(height: 16),

              // Nom et badges
              Row(
                children: [
                  Expanded(
                    child: Text(
                      produit.nom,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Badges
              Wrap(
                spacing: 8,
                children: [
                  if (produit.estMenu)
                    const Chip(
                      label: Text('MENU',
                          style: TextStyle(color: Colors.white, fontSize: 12)),
                      backgroundColor: Colors.red,
                    ),
                  if (produit.estNouveau)
                    const Chip(
                      label: Text('NOUVEAU',
                          style: TextStyle(color: Colors.white, fontSize: 12)),
                      backgroundColor: Colors.green,
                    ),
                  if (produit.estPopulaire)
                    const Chip(
                      label: Text('POPULAIRE',
                          style: TextStyle(
                              color: Color(0xFF0D2137), fontSize: 12)),
                      backgroundColor: Color(0xFFFBBF24),
                    ),
                ],
              ),
              const SizedBox(height: 16),

              // Prix
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBBF24).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      produit.aGammePrix ? 'Prix :' : 'Prix unique :',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      produit.prixFormate,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFBBF24),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Description
              if (produit.description != null &&
                  produit.description!.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Description',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      produit.description!,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),

              // Section
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.category, color: Colors.grey[600]),
                    const SizedBox(width: 8),
                    Text(
                      'Section: ${produit.sectionNom ?? produit.sectionCode}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Bouton d'ajout au panier
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (produit.estMenu) {
                      // Rediriger vers la personnalisation pour les menus
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) =>
                              MenuCustomizationScreen(produit: produit),
                        ),
                      );
                    } else {
                      // Ajout direct pour les produits non-menu
                      Provider.of<CartProvider>(context, listen: false)
                          .addItem(produit);
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('${produit.nom} ajouté au panier'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFBBF24),
                    foregroundColor: const Color(0xFF0D2137),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    produit.estMenu
                        ? 'Personnaliser et ajouter'
                        : 'Ajouter au panier',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── BANNIÈRE DYNAMIQUE COMPOSITION ─────────────────────────────
class _CompositionBanner extends StatefulWidget {
  const _CompositionBanner();

  @override
  State<_CompositionBanner> createState() => _CompositionBannerState();
}

class _CompositionBannerState extends State<_CompositionBanner> {
  int _tipIndex = 0;

  static final _tips = [
    {
      'icon': '🍽️',
      'title': 'Composez votre menu sur mesure',
      'sub':
          'Choisissez vos ingrédients, ajustez les quantités et créez le plat qui vous ressemble.',
      'color': Color(0xFF0D2137),
    },
    {
      'icon': '🥘',
      'title': 'Ici, rien n\'est tout fait !',
      'sub':
          'Chaque commande est préparée avec les ingrédients frais que VOUS choisissez au marché.',
      'color': Color(0xFF166534),
    },
    {
      'icon': '🛒',
      'title': 'Du marché à votre cuisine',
      'sub':
          'Nos livreurs achètent vos ingrédients frais au marché local et vous les livrent en 30 min.',
      'color': Color(0xFF7A3E10),
    },
    {
      'icon': '✨',
      'title': 'Personnalisez chaque détail',
      'sub':
          'Plus de piment ? Moins de sel ? Ajustez chaque ingrédient avec les curseurs.',
      'color': Color(0xFF8A1A1A),
    },
  ];

  @override
  void initState() {
    super.initState();
    _startRotation();
  }

  void _startRotation() {
    Future.delayed(const Duration(seconds: 6), () {
      if (mounted) {
        setState(() => _tipIndex = (_tipIndex + 1) % _tips.length);
        _startRotation();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final tip = _tips[_tipIndex];
    final color = tip['color'] as Color;

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 500),
      child: Container(
        key: ValueKey(_tipIndex),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color, color.withValues(alpha: 0.85)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.25),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Text(
              tip['icon'] as String,
              style: const TextStyle(fontSize: 32),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tip['title'] as String,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    tip['sub'] as String,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 11,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            // Dots indicator
            Column(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(_tips.length, (i) {
                return Container(
                  width: 5,
                  height: 5,
                  margin: const EdgeInsets.symmetric(vertical: 2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i == _tipIndex
                        ? Colors.white
                        : Colors.white.withValues(alpha: 0.3),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}

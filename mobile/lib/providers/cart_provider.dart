import 'package:flutter/foundation.dart';
import '../models/produit.dart';
import '../services/api_service.dart';

class CartItem {
  final Produit produit;
  int quantite;
  final List<Map<String, dynamic>>? ingredientsPersonnalises;
  final String? note; // article personnalisé saisi par le client
  final int? prixOverride; // prix estimé pour les articles personnalisés

  CartItem({
    required this.produit,
    this.quantite = 1,
    this.ingredientsPersonnalises,
    this.note,
    this.prixOverride,
  });

  bool get isCustom => note != null && note!.isNotEmpty;

  int get total {
    int prixTotal = prixOverride ?? produit.prixFcfa;
    if (ingredientsPersonnalises != null) {
      prixTotal += ingredientsPersonnalises!
          .fold(0, (sum, ing) => sum + ((ing['prix_choisi'] as int?) ?? 0));
    }
    return prixTotal * quantite;
  }
}

class CartProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final Map<String, CartItem> _items = {};
  bool _syncEnabled = false; // activé une fois l'utilisateur connecté

  Map<String, CartItem> get items => _items;

  int get itemCount => _items.length;

  int get totalQuantite =>
      _items.values.fold(0, (sum, item) => sum + item.quantite);

  int get sousTotal => _items.values.fold(0, (sum, item) => sum + item.total);

  /// Indique si le panier contient des articles "au marché" (sans prix fixe)
  bool get hasPrixMarche =>
      _items.values.any((i) => i.isCustom && (i.prixOverride ?? 0) <= 0);

  void _syncAsync() {
    if (_syncEnabled) {
      _syncToServer().catchError((_) {}); // silencieux
    }
  }

  void addItem(Produit produit, {int quantite = 1}) {
    if (_items.containsKey(produit.id)) {
      _items[produit.id]!.quantite += quantite;
    } else {
      _items[produit.id] = CartItem(produit: produit, quantite: quantite);
    }
    notifyListeners();
    _syncAsync();
  }

  void removeItem(String itemKey) {
    _items.remove(itemKey);
    notifyListeners();
    _syncAsync();
  }

  void updateQuantite(String itemKey, int quantite) {
    if (_items.containsKey(itemKey)) {
      if (quantite <= 0) {
        _items.remove(itemKey);
      } else {
        _items[itemKey]!.quantite = quantite;
      }
      notifyListeners();
      _syncAsync();
    }
  }

  void addItemWithIngredients(
      Produit produit, List<Map<String, dynamic>> ingredientsPersonnalises) {
    final uniqueId =
        '${produit.id}_${ingredientsPersonnalises.map((ing) => '${ing['ingredient_id']}_${ing['quantite']}').join('_')}';

    if (_items.containsKey(uniqueId)) {
      _items[uniqueId]!.quantite += 1;
    } else {
      _items[uniqueId] = CartItem(
        produit: produit,
        quantite: 1,
        ingredientsPersonnalises: ingredientsPersonnalises,
      );
    }
    notifyListeners();
    _syncAsync();
  }

  /// Article personnalisé (section "Ma Liste") — chaque ligne reste distincte
  void addCustomItem(Produit produit,
      {required String nom, int quantite = 1, int prixEstime = 0}) {
    final key =
        'custom_${DateTime.now().millisecondsSinceEpoch}_${_items.length}';
    _items[key] = CartItem(
      produit: produit,
      quantite: quantite,
      note: nom,
      prixOverride: prixEstime,
    );
    notifyListeners();
    _syncAsync();
  }

  /// Vide le panier local ET le panier serveur (après commande)
  void clear() {
    _items.clear();
    notifyListeners();
    if (_syncEnabled) {
      _api.delete('/panier/').catchError((_) {});
    }
  }

  /// Vide uniquement le panier local (à la déconnexion)
  void clearLocalOnly() {
    _syncEnabled = false;
    _items.clear();
    notifyListeners();
  }

  // ── Synchronisation serveur ────────────────────────────────

  /// Charge le panier depuis le serveur et reconstruit l'état local.
  /// Appelé après connexion réussie.
  Future<void> loadFromServer() async {
    _syncEnabled = true;
    try {
      final data = await _api.get('/panier/');
      _items.clear();
      for (final row in (data as List)) {
        final p = row['produit'];
        if (p == null) continue;
        final produit = Produit(
          id: p['id']?.toString() ?? '',
          nom: p['nom']?.toString() ?? '',
          slug: p['slug']?.toString() ?? p['id']?.toString() ?? '',
          prixFcfa: (p['prix_fcfa'] as num?)?.toInt() ?? 0,
          unite: p['unite']?.toString() ?? 'unité',
          imageUrl: p['image_url']?.toString(),
          sectionCode: p['section_code']?.toString() ?? '',
          sectionId: p['section_id']?.toString(),
          description: p['description']?.toString(),
          estPopulaire: p['est_populaire'] == true,
          estActif: p['est_actif'] != false,
        );
        final key = row['item_key']?.toString() ?? produit.id;
        final ings = row['ingredients'] != null
            ? List<Map<String, dynamic>>.from(
                (row['ingredients'] as List).map((i) => Map<String, dynamic>.from(i)))
            : null;
        _items[key] = CartItem(
          produit: produit,
          quantite: (row['quantite'] ?? 1) as int,
          ingredientsPersonnalises: (ings?.isEmpty ?? true) ? null : ings,
          note: row['note_ligne']?.toString(),
          prixOverride: row['prix_unitaire'] != null
              ? (row['prix_unitaire'] as num).toInt()
              : null,
        );
      }
      notifyListeners();
    } catch (_) {
      // Si l'API échoue, on garde le panier local
    }
  }

  /// Envoie l'état local complet au serveur (source de vérité = client)
  Future<void> _syncToServer() async {
    final lignes = _items.entries.map((e) => {
      'item_key': e.key,
      'produit_id': e.value.produit.id,
      'quantite': e.value.quantite,
      'prix_unitaire': e.value.prixOverride ?? e.value.produit.prixFcfa,
      'note_ligne': e.value.note,
      'ingredients': e.value.ingredientsPersonnalises ?? [],
    }).toList();
    await _api.put('/panier/', {'lignes': lignes});
  }

  List<Map<String, dynamic>> toCommandeData() {
    return _items.values.map((item) {
      return {
        'produit_id': item.produit.id,
        'section_id': item.produit.sectionId ?? item.produit.sectionCode,
        'quantite': item.quantite,
        'prix_unitaire': item.prixOverride ?? item.produit.prixFcfa,
        'note_ligne': item.note,
        'ingredients': item.ingredientsPersonnalises ?? [],
      };
    }).toList();
  }
}

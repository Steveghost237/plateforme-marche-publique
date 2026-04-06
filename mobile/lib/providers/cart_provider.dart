import 'package:flutter/foundation.dart';
import '../models/produit.dart';

class CartItem {
  final Produit produit;
  int quantite;
  final List<Map<String, dynamic>>? ingredientsPersonnalises;

  CartItem({
    required this.produit,
    this.quantite = 1,
    this.ingredientsPersonnalises,
  });

  int get total {
    int prixTotal = produit.prixFcfa;
    if (ingredientsPersonnalises != null) {
      prixTotal += ingredientsPersonnalises!
          .fold(0, (sum, ing) => sum + ((ing['prix_choisi'] as int?) ?? 0));
    }
    return prixTotal * quantite;
  }
}

class CartProvider with ChangeNotifier {
  final Map<String, CartItem> _items = {};

  Map<String, CartItem> get items => _items;

  int get itemCount => _items.length;

  int get totalQuantite =>
      _items.values.fold(0, (sum, item) => sum + item.quantite);

  int get sousTotal => _items.values.fold(0, (sum, item) => sum + item.total);

  void addItem(Produit produit, {int quantite = 1}) {
    if (_items.containsKey(produit.id)) {
      _items[produit.id]!.quantite += quantite;
    } else {
      _items[produit.id] = CartItem(produit: produit, quantite: quantite);
    }
    notifyListeners();
  }

  void removeItem(String produitId) {
    _items.remove(produitId);
    notifyListeners();
  }

  void updateQuantite(String produitId, int quantite) {
    if (_items.containsKey(produitId)) {
      if (quantite <= 0) {
        _items.remove(produitId);
      } else {
        _items[produitId]!.quantite = quantite;
      }
      notifyListeners();
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
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  List<Map<String, dynamic>> toCommandeData() {
    return _items.values
        .map((item) => {
              'produit_id': item.produit.id,
              'section_id': item.produit.sectionCode,
              'quantite': item.quantite,
              'prix_unitaire': item.produit.prixFcfa,
              'ingredients': [],
            })
        .toList();
  }
}

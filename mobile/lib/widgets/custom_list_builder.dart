import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/produit.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import '../screens/cart_screen.dart';

/// Builder "Ma Liste de Marché" : le client saisit librement ses articles
/// même s'ils ne sont pas au catalogue. Chaque article devient une ligne
/// de commande avec note_ligne (prix estimatif, confirmé au marché).
class CustomListBuilder extends StatefulWidget {
  const CustomListBuilder({super.key});

  @override
  State<CustomListBuilder> createState() => _CustomListBuilderState();
}

class _CustomListBuilderState extends State<CustomListBuilder> {
  final ApiService _api = ApiService();
  final _nomCtrl = TextEditingController();
  final _qteCtrl = TextEditingController(text: '1');
  final _prixCtrl = TextEditingController();

  Produit? _produitRef; // produit sentinelle "article-personnalise"
  bool _checking = true;
  final List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _loadProduitRef();
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _qteCtrl.dispose();
    _prixCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProduitRef() async {
    try {
      final data =
          await _api.get('/catalogue/produits?section=ma_liste&limit=10', auth: false);
      final list = (data as List).map((p) => Produit.fromJson(p)).toList();
      Produit? ref;
      for (final p in list) {
        if (p.slug == 'article-personnalise') { ref = p; break; }
      }
      _produitRef = ref ?? (list.isNotEmpty ? list.first : null);
    } catch (_) {
      _produitRef = null;
    }
    if (mounted) setState(() => _checking = false);
  }

  void _addItem() {
    final nom = _nomCtrl.text.trim();
    if (nom.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Décrivez l\'article (ex: Sardine 125g, Riz 5kg…)'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    setState(() {
      _items.add({
        'nom': nom,
        'quantite': int.tryParse(_qteCtrl.text) ?? 1,
        'prix': int.tryParse(_prixCtrl.text) ?? 0,
      });
      _nomCtrl.clear();
      _qteCtrl.text = '1';
      _prixCtrl.clear();
    });
  }

  int get _totalEstime =>
      _items.fold(0, (a, i) => a + (i['prix'] as int) * (i['quantite'] as int));

  void _addAllToCart() {
    if (_produitRef == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Fonctionnalité en cours d\'activation — réessayez bientôt'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    final cart = context.read<CartProvider>();
    for (final it in _items) {
      cart.addCustomItem(
        _produitRef!,
        nom: it['nom'] as String,
        quantite: it['quantite'] as int,
        prixEstime: it['prix'] as int,
      );
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${_items.length} article(s) ajouté(s) au panier'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const CartScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Bandeau explicatif
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0D2137), Color(0xFF1B4A7A)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Icon(Icons.edit_note, color: Color(0xFFFBBF24), size: 22),
                  SizedBox(width: 8),
                  Text('Votre liste, vos produits',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15)),
                ]),
                SizedBox(height: 8),
                Text(
                  'Un produit n\'est pas au catalogue ? Écrivez-le ici : '
                  'notre livreur le trouvera au marché. Le prix est estimatif, '
                  'confirmé à l\'achat.',
                  style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Formulaire d'ajout
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  TextField(
                    controller: _nomCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Article *',
                      hintText: 'Ex: Sardine 125g, Riz parfumé 5 kg, Savon…',
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _qteCtrl,
                          keyboardType: TextInputType.number,
                          decoration:
                              const InputDecoration(labelText: 'Quantité'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _prixCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                              labelText: 'Prix estimé (F)',
                              hintText: 'Optionnel'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _addItem,
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter à ma liste'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Liste en cours
          Card(
            child: Column(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF5F5F5),
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Ma liste (${_items.length})',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Color(0xFF0D2137))),
                      if (_items.isNotEmpty)
                        Text('≈ $_totalEstime F estimés',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFFB45309))),
                    ],
                  ),
                ),
                if (_items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(children: [
                      Icon(Icons.edit_note, size: 48, color: Colors.grey),
                      SizedBox(height: 8),
                      Text('Votre liste est vide',
                          style: TextStyle(color: Colors.grey)),
                      Text('Ajoutez vos articles un par un',
                          style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ]),
                  )
                else
                  ..._items.asMap().entries.map((e) {
                    final i = e.key;
                    final it = e.value;
                    final prix = it['prix'] as int;
                    final qte = it['quantite'] as int;
                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 12,
                        backgroundColor: const Color(0xFFFFF7E6),
                        child: Text('${i + 1}',
                            style: const TextStyle(
                                fontSize: 10, color: Color(0xFFB45309))),
                      ),
                      title: Text(it['nom'] as String,
                          style: const TextStyle(fontSize: 14)),
                      subtitle: Text('×$qte',
                          style: const TextStyle(fontSize: 11)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            prix > 0 ? '${prix * qte} F' : 'au marché',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFFBBF24),
                                fontSize: 13),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            color: Colors.red[300],
                            onPressed: () =>
                                setState(() => _items.removeAt(i)),
                          ),
                        ],
                      ),
                    );
                  }),
                if (_items.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed:
                            (_checking || _produitRef == null) ? null : _addAllToCart,
                        icon: const Icon(Icons.shopping_cart),
                        label: Text(
                            'Ajouter ${_items.length} article(s) au panier'),
                      ),
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

import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _addresses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.get('/adresses/');
      setState(() {
        _addresses =
            (data as List).map((a) => Map<String, dynamic>.from(a)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Adresses'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _addresses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.location_off,
                          size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('Aucune adresse enregistrée',
                          style:
                              TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _addAddress,
                        icon: const Icon(Icons.add),
                        label: const Text('Ajouter une adresse'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadAddresses,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _addresses.length,
                    itemBuilder: (context, index) {
                      final a = _addresses[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Icon(
                            a['est_par_defaut'] == true
                                ? Icons.star
                                : Icons.location_on,
                            color: const Color(0xFFFBBF24),
                          ),
                          title: Text(a['libelle'] ?? a['quartier'] ?? ''),
                          subtitle: Text(
                              '${a['quartier'] ?? ''}, ${a['ville'] ?? ''}'),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () => _deleteAddress(a['id']),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addAddress,
        child: const Icon(Icons.add),
      ),
    );
  }

  void _addAddress() {
    final libelleCtrl = TextEditingController(text: 'Domicile');
    final quartierCtrl = TextEditingController();
    final villeCtrl = TextEditingController(text: 'Yaoundé');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ajouter une adresse'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: libelleCtrl,
              decoration: const InputDecoration(
                  labelText: 'Libellé (ex: Maison, Bureau)',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: quartierCtrl,
              decoration: const InputDecoration(
                  labelText: 'Quartier', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: villeCtrl,
              decoration: const InputDecoration(
                  labelText: 'Ville', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              if (quartierCtrl.text.isEmpty) return;
              Navigator.of(ctx).pop();
              try {
                await _api.post('/adresses/', {
                  'libelle': libelleCtrl.text,
                  'quartier': quartierCtrl.text,
                  'ville': villeCtrl.text,
                  'est_par_defaut': _addresses.isEmpty,
                });
                _loadAddresses();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Adresse ajoutée'),
                        backgroundColor: Colors.green),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Erreur: $e'),
                        backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
  }

  void _deleteAddress(String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'adresse'),
        content:
            const Text('Êtes-vous sûr de vouloir supprimer cette adresse ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await _api.delete('/adresses/$id');
                _loadAddresses();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Erreur: $e'),
                        backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.get('/notifications/');
      setState(() {
        _notifications =
            (data as List).map((n) => Map<String, dynamic>.from(n)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  IconData _getIcon(String? type) {
    switch (type) {
      case 'commande_confirmee':
        return Icons.check_circle;
      case 'livreur_assigne':
      case 'livreur_en_cours_marche':
        return Icons.two_wheeler;
      case 'livreur_en_livraison':
        return Icons.local_shipping;
      case 'livreur_livree':
        return Icons.celebration;
      default:
        return Icons.notifications;
    }
  }

  Color _getColor(String? type) {
    switch (type) {
      case 'commande_confirmee':
        return Colors.green;
      case 'livreur_assigne':
        return Colors.orange;
      case 'livreur_en_cours_marche':
        return Colors.blue;
      case 'livreur_en_livraison':
        return Colors.indigo;
      case 'livreur_livree':
        return const Color(0xFFFBBF24);
      default:
        return const Color(0xFF0D2137);
    }
  }

  String _formatTime(String? isoDate) {
    if (isoDate == null) return '';
    try {
      final date = DateTime.parse(isoDate);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return "À l'instant";
      if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
      if (diff.inDays < 7) return 'Il y a ${diff.inDays}j';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }

  Future<void> _markAsRead(int index) async {
    final notif = _notifications[index];
    if (notif['lue'] == true) return;
    try {
      await _api.post('/notifications/${notif['id']}/lire', {});
      setState(() {
        _notifications[index]['lue'] = true;
      });
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await _api.post('/notifications/tout-lire', {});
      setState(() {
        for (var n in _notifications) {
          n['lue'] = true;
        }
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _notifications.any((n) => n['lue'] != true);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text(
                'Tout lire',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_off,
                          size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('Aucune notification',
                          style:
                              TextStyle(fontSize: 18, color: Colors.grey[600])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final n = _notifications[index];
                      final isRead = n['lue'] == true;
                      return Container(
                        color: isRead
                            ? Colors.white
                            : const Color(0xFFFBBF24).withOpacity(0.08),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _getColor(n['type']),
                            child: Icon(_getIcon(n['type']),
                                color: Colors.white, size: 20),
                          ),
                          title: Text(
                            n['titre'] ?? 'Notification',
                            style: TextStyle(
                              fontWeight:
                                  isRead ? FontWeight.normal : FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(n['corps'] ?? '',
                                  style: const TextStyle(fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(_formatTime(n['created_at']),
                                  style: TextStyle(
                                      fontSize: 11, color: Colors.grey[500])),
                            ],
                          ),
                          onTap: () => _markAsRead(index),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<void> init() async {
    await _api.loadToken();
    if (_api.hasToken) {
      try {
        await loadUser();
      } catch (e) {
        await logout();
      }
    }
  }

  Future<void> loadUser() async {
    try {
      final data = await _api.get('/auth/me');
      _user = User.fromJson(data);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> login(String telephone, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _api.post(
        '/auth/connexion',
        {'telephone': telephone, 'mot_de_passe': password},
        auth: false,
      );

      await _api.saveToken(data['access_token']);
      _user = User.fromJson(data['utilisateur']);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> register({
    required String telephone,
    required String nomComplet,
    required String password,
    String? email,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.post(
        '/auth/inscription',
        {
          'telephone': telephone,
          'nom_complet': nomComplet,
          'mot_de_passe': password,
          if (email != null) 'email': email,
        },
        auth: false,
      );

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    _user = null;
    notifyListeners();
  }
}

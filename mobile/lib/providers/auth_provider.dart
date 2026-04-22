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
        {
          'telephone': telephone,
          'mot_de_passe': password,
          'plateforme': 'mobile'
        },
        auth: false,
      );

      await _api.saveToken(data['access_token']);
      if (data['refresh_token'] != null) {
        await _api.saveRefreshToken(data['refresh_token']);
      }
      _user = User.fromJson(data['user']);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  String? _devOtp; // Pour stocker l'OTP de développement

  Future<void> register({
    required String telephone,
    required String nomComplet,
    required String password,
    String? email,
  }) async {
    _isLoading = true;
    _error = null;
    _devOtp = null;
    notifyListeners();

    try {
      // Étape 1: Demander un OTP
      final response = await _api.post(
        '/auth/inscription/otp',
        {
          'telephone': telephone,
          'operateur': 'mobile', // Opérateur par défaut
        },
        auth: false,
      );

      // Extraire l'OTP de développement de la réponse
      if (response != null && response['otp_dev'] != null) {
        _devOtp = response['otp_dev'].toString();
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  String? get devOtp => _devOtp;

  Future<void> verifyOtp({
    required String telephone,
    required String otp,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.post(
        '/auth/inscription/verifier',
        {
          'telephone': telephone,
          'otp_code': otp,
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

  Future<void> finalizeRegistration({
    required String telephone,
    required String nomComplet,
    required String password,
    String? email,
    String role = 'client',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        '/auth/inscription/finaliser',
        {
          'telephone': telephone,
          'nom_complet': nomComplet,
          'mot_de_passe': password,
          'role': role,
          if (email != null) 'email': email,
        },
        auth: false,
      );

      // Sauvegarder le token et les données utilisateur
      if (response['access_token'] != null) {
        await _api.saveToken(response['access_token']);
      }
      if (response['refresh_token'] != null) {
        await _api.saveRefreshToken(response['refresh_token']);
      }
      if (response['user'] != null) {
        _user = User.fromJson(response['user']);
      }

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

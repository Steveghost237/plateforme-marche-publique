import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  bool get hasToken => _token != null;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    _refreshToken = prefs.getString('refresh_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  Map<String, String> _getHeaders({bool includeAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (includeAuth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<dynamic> get(String endpoint, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    return _requestWithRetry(
      () => http.get(url, headers: _getHeaders(includeAuth: auth)),
      auth: auth,
    );
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> data,
      {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    return _requestWithRetry(
      () => http.post(url,
          headers: _getHeaders(includeAuth: auth), body: jsonEncode(data)),
      auth: auth,
    );
  }

  Future<dynamic> put(String endpoint, Map<String, dynamic> data,
      {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    return _requestWithRetry(
      () => http.put(url,
          headers: _getHeaders(includeAuth: auth), body: jsonEncode(data)),
      auth: auth,
    );
  }

  Future<dynamic> delete(String endpoint, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    return _requestWithRetry(
      () => http.delete(url, headers: _getHeaders(includeAuth: auth)),
      auth: auth,
    );
  }

  String? _refreshToken;

  Future<void> saveRefreshToken(String token) async {
    _refreshToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('refresh_token', token);
  }

  Future<void> loadRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    _refreshToken = prefs.getString('refresh_token');
  }

  bool _isRefreshing = false;

  Future<bool> _tryRefreshToken() async {
    if (_isRefreshing || _refreshToken == null) return false;
    _isRefreshing = true;
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/auth/refresh');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': _refreshToken}),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        await saveToken(data['access_token']);
        if (data['refresh_token'] != null) {
          await saveRefreshToken(data['refresh_token']);
        }
        return true;
      }
    } catch (_) {
    } finally {
      _isRefreshing = false;
    }
    return false;
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      try {
        final decoded = jsonDecode(response.body);
        return decoded;
      } catch (e) {
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Erreur de parsing: ${e.toString()}',
        );
      }
    } else {
      String errorMessage = 'Erreur réseau';
      try {
        if (response.body.isNotEmpty) {
          final errorData = jsonDecode(response.body);
          errorMessage =
              errorData['detail'] ?? errorData['message'] ?? 'Erreur inconnue';
        }
      } catch (_) {
        errorMessage = 'Erreur ${response.statusCode}';
      }
      throw ApiException(
        statusCode: response.statusCode,
        message: errorMessage,
      );
    }
  }

  Future<dynamic> _requestWithRetry(Future<http.Response> Function() request,
      {bool auth = true}) async {
    final response = await request();
    if (response.statusCode == 401 && auth) {
      final refreshed = await _tryRefreshToken();
      if (refreshed) {
        final retryResponse = await request();
        return _handleResponse(retryResponse);
      }
    }
    return _handleResponse(response);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => message;
}

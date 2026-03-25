import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
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

  Future<Map<String, dynamic>> get(String endpoint, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final response = await http.get(url, headers: _getHeaders(includeAuth: auth));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> data, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final response = await http.post(
      url,
      headers: _getHeaders(includeAuth: auth),
      body: jsonEncode(data),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> put(String endpoint, Map<String, dynamic> data, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final response = await http.put(
      url,
      headers: _getHeaders(includeAuth: auth),
      body: jsonEncode(data),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(String endpoint, {bool auth = true}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final response = await http.delete(url, headers: _getHeaders(includeAuth: auth));
    return _handleResponse(response);
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body);
    } else {
      throw ApiException(
        statusCode: response.statusCode,
        message: response.body.isNotEmpty ? jsonDecode(response.body)['detail'] ?? 'Erreur inconnue' : 'Erreur réseau',
      );
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => message;
}

class ApiConfig {
  // Mode local : flutter run --dart-define=USE_LOCAL_API=true
  // Mode local avec IP custom : --dart-define=LOCAL_API_URL=http://192.168.1.XX:10000/api
  // Mode production (défaut) : flutter build apk --release
  static const bool _isLocal = bool.fromEnvironment('USE_LOCAL_API', defaultValue: false);

  static const String _localDefaultUrl = 'http://10.0.2.2:8000/api'; // Android Emulator (port par défaut du backend local)
  static const String _prodDefaultUrl = 'https://comebuy-api.onrender.com/api';

  static const String baseUrl = _isLocal
      ? String.fromEnvironment('LOCAL_API_URL', defaultValue: _localDefaultUrl)
      : String.fromEnvironment('PROD_API_URL', defaultValue: _prodDefaultUrl);

  // Endpoints
  static const String auth = '/auth';
  static const String catalogue = '/catalogue';
  static const String commandes = '/commandes';
  static const String livreur = '/livreur';
  static const String admin = '/admin';
  static const String fidelite = '/fidelite';
  static const String notifications = '/notifications';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}

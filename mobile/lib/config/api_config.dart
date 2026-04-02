class ApiConfig {
  // URL du backend FastAPI
  // Pour Android Emulator: 10.0.2.2
  // Pour iOS Simulator: localhost
  // Pour device physique: IP de votre machine
  static const String baseUrl = 'http://192.168.1.179:8000/api';
  
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

import '../config/api_config.dart';

class ImageUtils {
  /// Retourne l'URL complète et valide pour une image
  /// Gère les URLs relatives et absolues
  static String getImageUrl(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) {
      return '';
    }
    
    // Si l'URL est déjà complète (commence par http), la retourner telle quelle
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Si l'URL commence par /, la combiner avec l'URL de base du serveur
    if (imageUrl.startsWith('/')) {
      return '${ApiConfig.baseUrl.replaceAll('/api', '')}$imageUrl';
    }
    
    // Sinon, considérer que c'est un chemin relatif et le combiner
    return '${ApiConfig.baseUrl.replaceAll('/api', '')}/$imageUrl';
  }
  
  /// Vérifie si une URL d'image est valide
  static bool isValidImageUrl(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) {
      return false;
    }
    
    // Accepter les URLs complètes et les chemins relatifs valides
    return imageUrl.startsWith('http://') || 
           imageUrl.startsWith('https://') || 
           imageUrl.startsWith('/') ||
           !imageUrl.contains(' ');
  }
}

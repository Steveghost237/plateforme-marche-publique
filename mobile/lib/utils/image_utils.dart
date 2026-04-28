import '../config/api_config.dart';

class ImageUtils {
  /// Retourne l'URL complète et valide pour une image.
  /// Gère les URLs relatives, absolues, avec espaces et accents.
  static String getImageUrl(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) {
      return '';
    }

    // URL absolue : retourner telle quelle
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    final origin = ApiConfig.baseUrl.replaceAll('/api', '');
    final path = imageUrl.startsWith('/') ? imageUrl : '/$imageUrl';

    // Encoder chaque segment du path (espaces → %20, accents → UTF-8 encodés)
    final encoded = path
        .split('/')
        .map((s) => s.isEmpty ? s : Uri.encodeComponent(s))
        .join('/');

    return '$origin$encoded';
  }

  /// Vérifie si une URL d'image est valide.
  static bool isValidImageUrl(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) {
      return false;
    }
    return imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://') ||
        imageUrl.startsWith('/') ||
        imageUrl.isNotEmpty;
  }
}

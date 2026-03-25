class User {
  final String id;
  final String telephone;
  final String nomComplet;
  final String? email;
  final String? avatarUrl;
  final String role;
  final String statut;

  User({
    required this.id,
    required this.telephone,
    required this.nomComplet,
    this.email,
    this.avatarUrl,
    required this.role,
    required this.statut,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      telephone: json['telephone'],
      nomComplet: json['nom_complet'] ?? '',
      email: json['email'],
      avatarUrl: json['avatar_url'],
      role: json['role'],
      statut: json['statut'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'telephone': telephone,
      'nom_complet': nomComplet,
      'email': email,
      'avatar_url': avatarUrl,
      'role': role,
      'statut': statut,
    };
  }

  bool get isClient => role == 'client';
  bool get isLivreur => role == 'livreur';
  bool get isAdmin => role == 'admin' || role == 'super_admin';
}

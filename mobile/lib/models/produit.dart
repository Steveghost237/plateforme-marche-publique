class Produit {
  final String id;
  final String nom;
  final String slug;
  final String? description;
  final int prixFcfa;
  final String? imageUrl;
  final String unite;
  final bool estActif;
  final bool estPopulaire;
  final String sectionCode;
  final String? sectionNom;

  Produit({
    required this.id,
    required this.nom,
    required this.slug,
    this.description,
    required this.prixFcfa,
    this.imageUrl,
    required this.unite,
    this.estActif = true,
    this.estPopulaire = false,
    required this.sectionCode,
    this.sectionNom,
  });

  factory Produit.fromJson(Map<String, dynamic> json) {
    return Produit(
      id: json['id'],
      nom: json['nom'],
      slug: json['slug'],
      description: json['description'],
      prixFcfa: json['prix_fcfa'] ?? 0,
      imageUrl: json['image_url'],
      unite: json['unite'] ?? 'unité',
      estActif: json['est_actif'] ?? true,
      estPopulaire: json['est_populaire'] ?? false,
      sectionCode: json['section_code'] ?? '',
      sectionNom: json['section_nom'],
    );
  }

  String get prixFormate => '${prixFcfa.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]} ',
      )} F';
}

class Section {
  final String id;
  final String code;
  final String nom;
  final String? description;
  final String? icone;
  final bool actif;

  Section({
    required this.id,
    required this.code,
    required this.nom,
    this.description,
    this.icone,
    this.actif = true,
  });

  factory Section.fromJson(Map<String, dynamic> json) {
    return Section(
      id: json['id'],
      code: json['code'],
      nom: json['nom'],
      description: json['description'],
      icone: json['icone'],
      actif: json['actif'] ?? true,
    );
  }
}

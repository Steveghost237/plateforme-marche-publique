class Produit {
  final String id;
  final String nom;
  final String slug;
  final String? description;
  final int prixFcfa;
  final int? prixBaseFcfa;
  final int? prixMaxFcfa;
  final String? imageUrl;
  final String unite;
  final bool estActif;
  final bool estPopulaire;
  final bool estMenu;
  final bool estNouveau;
  final bool stockDispo;
  final String sectionCode;
  final String? sectionId;
  final String? sectionNom;
  final List<Ingredient>? ingredients;

  Produit({
    required this.id,
    required this.nom,
    required this.slug,
    this.description,
    required this.prixFcfa,
    this.prixBaseFcfa,
    this.prixMaxFcfa,
    this.imageUrl,
    required this.unite,
    this.estActif = true,
    this.estPopulaire = false,
    this.estMenu = false,
    this.estNouveau = false,
    this.stockDispo = true,
    required this.sectionCode,
    this.sectionId,
    this.sectionNom,
    this.ingredients,
  });

  factory Produit.fromJson(Map<String, dynamic> json) {
    // Gérer la section si elle est imbriquée
    String sectionCode = '';
    String? sectionId;
    String? sectionNom;
    if (json['section'] != null) {
      sectionCode = json['section']['code'] ?? '';
      sectionId = json['section']['id']?.toString();
      sectionNom = json['section']['nom'];
    } else {
      sectionCode = json['section_code'] ?? '';
      sectionId = json['section_id']?.toString();
      sectionNom = json['section_nom'];
    }

    return Produit(
      id: json['id'],
      nom: json['nom'],
      slug: json['slug'],
      description: json['description'],
      prixFcfa: json['prix_fcfa'] ?? json['prix_base_fcfa'] ?? 0,
      prixBaseFcfa: json['prix_base_fcfa'],
      prixMaxFcfa: json['prix_max_fcfa'],
      imageUrl: json['image_url'],
      unite: json['unite'] ?? 'unité',
      estActif: json['est_actif'] ?? json['stock_dispo'] ?? true,
      estPopulaire: json['est_populaire'] ?? false,
      estMenu: json['est_menu'] ?? false,
      estNouveau: json['est_nouveau'] ?? false,
      stockDispo: json['stock_dispo'] ?? true,
      sectionCode: sectionCode,
      sectionId: sectionId,
      sectionNom: sectionNom,
      ingredients: json['ingredients'] != null
          ? (json['ingredients'] as List)
              .map((i) => Ingredient.fromJson(i))
              .toList()
          : null,
    );
  }

  String get prixFormate {
    if (prixBaseFcfa != null && prixMaxFcfa != null) {
      return '${prixBaseFcfa.toString().replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
            (Match m) => '${m[1]} ',
          )} - ${prixMaxFcfa.toString().replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
            (Match m) => '${m[1]} ',
          )} F';
    }
    return '${prixFcfa.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]} ',
        )} F';
  }

  bool get aGammePrix => prixBaseFcfa != null && prixMaxFcfa != null;
  String get prixMinFormate => '${prixBaseFcfa?.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]} ',
      ) ?? prixFcfa.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]} ',
      )} F';
  String get prixMaxFormate => '${prixMaxFcfa?.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]} ',
      ) ?? prixFcfa.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]} ',
      )} F';
}

class Ingredient {
  final String id;
  final String nom;
  final String? description;
  final String? icone;
  final bool estObligatoire;
  final String typeSaisie;
  final String unite;
  final int quantiteDefaut;
  final int quantiteMin;
  final int quantiteMax;
  final int prixMinFcfa;
  final int prixMaxFcfa;
  final int prixDefautFcfa;

  Ingredient({
    required this.id,
    required this.nom,
    this.description,
    this.icone,
    this.estObligatoire = true,
    this.typeSaisie = 'curseur',
    this.unite = 'g',
    this.quantiteDefaut = 100,
    this.quantiteMin = 0,
    this.quantiteMax = 200,
    this.prixMinFcfa = 0,
    this.prixMaxFcfa = 500,
    this.prixDefautFcfa = 200,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      id: json['id'],
      nom: json['nom'],
      description: json['description'],
      icone: json['icone'],
      estObligatoire: json['est_obligatoire'] ?? true,
      typeSaisie: json['type_saisie'] ?? 'curseur',
      unite: json['unite'] ?? 'g',
      quantiteDefaut: (json['quantite_defaut'] as num?)?.toInt() ?? 100,
      quantiteMin: (json['quantite_min'] as num?)?.toInt() ?? 0,
      quantiteMax: (json['quantite_max'] as num?)?.toInt() ?? 200,
      prixMinFcfa: json['prix_min_fcfa'] ?? 0,
      prixMaxFcfa: json['prix_max_fcfa'] ?? 500,
      prixDefautFcfa: json['prix_defaut_fcfa'] ?? 200,
    );
  }

  String get quantiteFormatee => '$quantiteDefaut $unite';
  String get prixFormate => '${prixDefautFcfa.toString().replaceAllMapped(
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

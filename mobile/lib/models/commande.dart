class Commande {
  final String id;
  final String numero;
  final String statut;
  final String? creneau;
  final DateTime? dateLivraison;
  final int sousTotalFcfa;
  final int fraisLivraison;
  final int totalFcfa;
  final int pointsGagnes;
  final DateTime createdAt;
  final DateTime? livreeAt;
  final DateTime? assigneeAt;
  
  // Info livreur
  final String? livreurNom;
  final String? livreurTelephone;
  final String? livreurPhoto;
  final double? livreurNote;
  final String? livreurNiveau;
  final int? livreurTotalLivraisons;
  
  // Info client
  final String? clientNom;
  final String? clientTelephone;
  
  // Adresse
  final Map<String, dynamic>? adresse;
  
  // Lignes
  final List<LigneCommande>? lignes;

  Commande({
    required this.id,
    required this.numero,
    required this.statut,
    this.creneau,
    this.dateLivraison,
    required this.sousTotalFcfa,
    required this.fraisLivraison,
    required this.totalFcfa,
    required this.pointsGagnes,
    required this.createdAt,
    this.livreeAt,
    this.assigneeAt,
    this.livreurNom,
    this.livreurTelephone,
    this.livreurPhoto,
    this.livreurNote,
    this.livreurNiveau,
    this.livreurTotalLivraisons,
    this.clientNom,
    this.clientTelephone,
    this.adresse,
    this.lignes,
  });

  factory Commande.fromJson(Map<String, dynamic> json) {
    return Commande(
      id: json['id'],
      numero: json['numero'],
      statut: json['statut'],
      creneau: json['creneau'],
      dateLivraison: json['date_livraison'] != null 
          ? DateTime.parse(json['date_livraison']) 
          : null,
      sousTotalFcfa: json['sous_total_fcfa'] ?? 0,
      fraisLivraison: json['frais_livraison'] ?? 0,
      totalFcfa: json['total_fcfa'] ?? 0,
      pointsGagnes: json['points_gagnes'] ?? 0,
      createdAt: DateTime.parse(json['created_at']),
      livreeAt: json['livree_at'] != null 
          ? DateTime.parse(json['livree_at']) 
          : null,
      assigneeAt: json['assignee_at'] != null 
          ? DateTime.parse(json['assignee_at']) 
          : null,
      livreurNom: json['livreur_nom'],
      livreurTelephone: json['livreur_telephone'],
      livreurPhoto: json['livreur_photo'],
      livreurNote: json['livreur_note']?.toDouble(),
      livreurNiveau: json['livreur_niveau'],
      livreurTotalLivraisons: json['livreur_total_livraisons'],
      clientNom: json['client_nom'],
      clientTelephone: json['client_telephone'],
      adresse: json['adresse'],
      lignes: json['lignes'] != null
          ? (json['lignes'] as List).map((l) => LigneCommande.fromJson(l)).toList()
          : null,
    );
  }

  String get totalFormate => '${totalFcfa.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (Match m) => '${m[1]} ',
  )} F';

  bool get isEnCours => ['assignee', 'en_cours_marche', 'en_livraison'].contains(statut);
  bool get isLivree => statut == 'livree';
  bool get isAnnulee => statut == 'annulee';
}

class LigneCommande {
  final String id;
  final String? produitNom;
  final int quantite;
  final int prixUnitaire;
  final int prixTotal;

  LigneCommande({
    required this.id,
    this.produitNom,
    required this.quantite,
    required this.prixUnitaire,
    required this.prixTotal,
  });

  factory LigneCommande.fromJson(Map<String, dynamic> json) {
    return LigneCommande(
      id: json['id'],
      produitNom: json['produit_nom'],
      quantite: json['quantite'],
      prixUnitaire: json['prix_unitaire'],
      prixTotal: json['prix_total'],
    );
  }
}

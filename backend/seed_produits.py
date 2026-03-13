"""Seed complet: sections + produits camerounais + ingrédients."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Section, Produit, Ingredient

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # ── SECTIONS ────────────────────────────────────────────────
    SECTIONS = [
        dict(code="menus_ingredients", nom="Menus & Ingrédients", description="Plats camerounais traditionnels et leurs ingrédients", icone="🥘", couleur_hex="#0D2137", ordre=1),
        dict(code="fruits",            nom="Fruits & Légumes",    description="Fruits et légumes frais du marché",                    icone="🍊", couleur_hex="#1a5c1a", ordre=2),
        dict(code="boissons",          nom="Boissons",            description="Boissons fraîches et traditionnelles",                 icone="🥤", couleur_hex="#1B4A8A", ordre=3),
        dict(code="boulangerie",       nom="Boulangerie",         description="Pain frais, pâtisseries et viennoiseries",            icone="🍞", couleur_hex="#7a3e10", ordre=4),
        dict(code="epices",            nom="Épices & Condiments", description="Épices, sauces et condiments camerounais",            icone="🌶️", couleur_hex="#8a1a1a", ordre=5),
    ]
    secs = {}
    for s in SECTIONS:
        obj = db.query(Section).filter(Section.code == s["code"]).first()
        if not obj:
            obj = Section(**s); db.add(obj); db.flush()
            print(f"  Section créée: {s['nom']}")
        secs[s["code"]] = obj

    # ── PRODUITS MENUS ──────────────────────────────────────────
    MENUS = [
        dict(nom="Eru (Okok)",       slug="eru-okok",        prix_base_fcfa=4500, prix_max_fcfa=7500,
             description="Plat traditionnel des régions du Sud-Ouest et Littoral camerounais. Feuilles d'okok broyées mitonnées avec viande de bœuf, crevettes, et waterleaf, relevées d'huile de palme rouge.",
             image_url="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Ndolé",            slug="ndole",           prix_base_fcfa=3800, prix_max_fcfa=6500,
             description="Le plat national du Cameroun ! Feuilles de ndolé (plante amère) mijotées avec arachides pilées, viande ou crevettes, servies avec des plantains ou du bâton de manioc.",
             image_url="https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Poulet DG",        slug="poulet-dg",       prix_base_fcfa=5500, prix_max_fcfa=8000,
             description="'Directeur Général' – poulet sauté avec plantains mûrs frits, carottes et poivrons dans une sauce tomate parfumée. Un classique festif camerounais.",
             image_url="https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Koki (Gâteau de haricots)", slug="koki-gateau-haricots", prix_base_fcfa=2500, prix_max_fcfa=4000,
             description="Gâteau traditionnel de haricots à peau noire pilés, mélangés à l'huile de palme et cuits à la vapeur dans des feuilles de bananier. Riche et nourrissant.",
             image_url="https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Mbongo Tchobi",    slug="mbongo-tchobi",   prix_base_fcfa=5000, prix_max_fcfa=8500,
             description="Sauce noire épicée à base de mbongo (écorce noire), avec viande ou poisson fumé. Spécialité sawa (côtière) aux arômes intenses et profonds.",
             image_url="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=False, est_nouveau=True),
        dict(nom="Beignets de Haricots (Accra)", slug="beignets-haricots-accra", prix_base_fcfa=500, prix_max_fcfa=1500,
             description="Beignets croustillants de haricots haricots blancs épicés, frits à l'huile. Snack populaire servi avec du piment frais.",
             image_url="https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Achu Soup",        slug="achu-soup",       prix_base_fcfa=4200, prix_max_fcfa=7000,
             description="Soupe jaune traditionnelle des Grassfields (Nord-Ouest). Taro pilé servi avec une soupe à base de kaolin jaune, viande, et huile de palme.",
             image_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=False, est_nouveau=True),
        dict(nom="Sauce Gombo",      slug="sauce-gombo",     prix_base_fcfa=3200, prix_max_fcfa=5500,
             description="Sauce à base de gombo (okra) haché avec viande de bœuf, poisson fumé, crevettes séchées et épices. Filante et savoureuse, servie avec du fufu ou riz.",
             image_url="https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=False, est_nouveau=False),
        dict(nom="Nkui",             slug="nkui",            prix_base_fcfa=4000, prix_max_fcfa=7200,
             description="Soupe traditionnelle bamiléké à base de plantes médicinales et nutritives. Épaisse et filante, préparée avec des feuilles spéciales et de la viande de porc.",
             image_url="https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=False, est_nouveau=True),
        dict(nom="Poisson Braisé",   slug="poisson-braise",  prix_base_fcfa=3000, prix_max_fcfa=5000,
             description="Poisson entier (capitaine, barracuda ou tilapia) mariné aux épices camerounaises et grillé au charbon de bois. Servi avec du bâton de manioc et piment.",
             image_url="https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80&fit=crop",
             est_menu=True, est_populaire=True, est_nouveau=False),
        dict(nom="Miondo (Bâton de Manioc)", slug="miondo-baton-manioc", prix_base_fcfa=300, prix_max_fcfa=1000,
             description="Bâton de manioc traditionnel du Cameroun coastal. Manioc fermenté, pilé et cuit dans des feuilles. Accompagnement incontournable des plats camerounais.",
             image_url="https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80&fit=crop",
             est_menu=False, est_populaire=True, est_nouveau=False),
        dict(nom="Fufu Corn",        slug="fufu-corn",       prix_base_fcfa=400, prix_max_fcfa=1000,
             description="Pâte de maïs fermentée de l'Ouest Cameroun. Accompagnement polyvalent pour toutes les sauces traditionnelles camerounaises.",
             image_url="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80&fit=crop",
             est_menu=False, est_populaire=True, est_nouveau=False),
        dict(nom="Plantain Mûr Frit", slug="plantain-mur-frit", prix_base_fcfa=500, prix_max_fcfa=1500,
             description="Tranches de bananes plantains mûres frites dans l'huile de palme jusqu'à doré. Douceur naturelle caramélisée, accompagnement classique.",
             image_url="https://images.unsplash.com/photo-1587395651786-9485a4cefa3b?w=600&q=80&fit=crop",
             est_menu=False, est_populaire=True, est_nouveau=False),
    ]

    # ── PRODUITS FRUITS ─────────────────────────────────────────
    FRUITS = [
        dict(nom="Ananas du Cameroun", slug="ananas-cameroun", prix_base_fcfa=500, prix_max_fcfa=1500,
             description="Ananas sucré et juteux cultivé dans les régions du Centre et du Littoral. Riche en bromélaïne et vitamines.",
             image_url="https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Mangue Camerounaise", slug="mangue-camerounaise", prix_base_fcfa=300, prix_max_fcfa=1000,
             description="Mangue locale sucrée et parfumée. Variétés: Kent, Tommy, Amélie. Disponible de mars à juillet.",
             image_url="https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Papaye",            slug="papaye",           prix_base_fcfa=400, prix_max_fcfa=1200,
             description="Papaye fraîche locale, riche en papaïne et vitamine C. Idéale en salade de fruits ou jus.",
             image_url="https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Avocat",            slug="avocat",           prix_base_fcfa=200, prix_max_fcfa=600,
             description="Avocat vert du jardin camerounais. Chair crémeuse et riche, parfait pour accompagner les repas ou en guacamole.",
             image_url="https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Banane Plantain (vert)", slug="banane-plantain-vert", prix_base_fcfa=500, prix_max_fcfa=1500,
             description="Plantains verts frais pour cuisson. Idéal pour les chips, le pilon ou accompagner les plats en sauce.",
             image_url="https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Goyave",            slug="goyave",           prix_base_fcfa=250, prix_max_fcfa=800,
             description="Goyave rose sucrée et parfumée. Excellente source de vitamine C, à croquer ou en jus frais.",
             image_url="https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=600&q=80&fit=crop",
             est_populaire=False),
        dict(nom="Tomates Fraîches (1kg)", slug="tomates-fraiches-kg", prix_base_fcfa=400, prix_max_fcfa=800,
             description="Tomates rouges mûres du marché local. Indispensables pour les sauces, soupes et salades africaines.",
             image_url="https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Oignons (1kg)",     slug="oignons-kg",       prix_base_fcfa=350, prix_max_fcfa=700,
             description="Oignons violets et blancs du Nord Cameroun. Base aromatique indispensable de la cuisine camerounaise.",
             image_url="https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=80&fit=crop",
             est_populaire=True),
    ]

    # ── PRODUITS BOISSONS ───────────────────────────────────────
    BOISSONS = [
        dict(nom="Jus de Gingembre Frais", slug="jus-gingembre-frais", prix_base_fcfa=500, prix_max_fcfa=1000,
             description="Jus de gingembre frais, citronné et épicé. Préparé artisanalement. Tonifiant et digestif.",
             image_url="https://images.unsplash.com/photo-1602920068637-81de93f23c33?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Supermont 1.5L",    slug="supermont-1-5l",   prix_base_fcfa=300, prix_max_fcfa=350,
             description="Eau minérale naturelle Supermont en bouteille 1.5 litre. La marque la plus connue du Cameroun.",
             image_url="https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Coca-Cola 50cl",    slug="coca-cola-50cl",   prix_base_fcfa=400, prix_max_fcfa=500,
             description="Coca-Cola fraîche en canette ou bouteille 50cl. La boisson préférée des Camerounais.",
             image_url="https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Fanta Orange 50cl", slug="fanta-orange-50cl", prix_base_fcfa=350, prix_max_fcfa=450,
             description="Fanta Orange pétillante en bouteille 50cl. Rafraîchissante et fruitée.",
             image_url="https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80&fit=crop",
             est_populaire=False),
        dict(nom="Jus de Bissap (Hibiscus)", slug="jus-bissap-hibiscus", prix_base_fcfa=500, prix_max_fcfa=1200,
             description="Jus de fleurs d'hibiscus séchées, légèrement sucré et aromatisé. Riche en antioxydants et vitamine C.",
             image_url="https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Matango (Vin de Raphia)", slug="matango-vin-raphia", prix_base_fcfa=300, prix_max_fcfa=800,
             description="Vin de palme raphia fraîchement tapé. Boisson traditionnelle légèrement fermentée des régions forestières.",
             image_url="https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&q=80&fit=crop",
             est_populaire=False, est_nouveau=True),
        dict(nom="Watalife 75cl",     slug="watalife-75cl",    prix_base_fcfa=250, prix_max_fcfa=300,
             description="Eau purifiée en sachet Watalife 75cl. La plus consommée des eaux en sachets au Cameroun.",
             image_url="https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&q=80&fit=crop",
             est_populaire=True),
    ]

    # ── PRODUITS BOULANGERIE ────────────────────────────────────
    BOULANGERIE = [
        dict(nom="Pain Boulangerie (baguette)", slug="pain-boulangerie-baguette", prix_base_fcfa=250, prix_max_fcfa=300,
             description="Baguette de pain frais croustillante, cuite au four chaque matin. Le pain camerounais par excellence.",
             image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Beignets Chauds (10 pcs)", slug="beignets-chauds-10pcs", prix_base_fcfa=500, prix_max_fcfa=1000,
             description="Beignets ronds et moelleux frits à l'huile, légèrement sucrés. Incontournables du petit-déjeuner camerounais.",
             image_url="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Gâteau de Fête",    slug="gateau-fete",      prix_base_fcfa=5000, prix_max_fcfa=15000,
             description="Gâteau à étages décoré, parfumé à la vanille ou au chocolat. Idéal pour anniversaires et cérémonies.",
             image_url="https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&q=80&fit=crop",
             est_populaire=False),
        dict(nom="Mandazi (Beignet sucré)", slug="mandazi-beignet-sucre", prix_base_fcfa=300, prix_max_fcfa=800,
             description="Beignets triangulaires à la noix de coco, légèrement sucrés et épicés. Populaires en Afrique centrale.",
             image_url="https://images.unsplash.com/photo-1619898804872-82038fa25da5?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Pain de Mie (tranché)", slug="pain-mie-tranche", prix_base_fcfa=700, prix_max_fcfa=1200,
             description="Pain de mie industriel en tranches. Idéal pour sandwichs, toasts et petits-déjeuners rapides.",
             image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop",
             est_populaire=False),
    ]

    # ── PRODUITS ÉPICES ─────────────────────────────────────────
    EPICES = [
        dict(nom="Piment Rouge Frais (100g)", slug="piment-rouge-frais-100g", prix_base_fcfa=200, prix_max_fcfa=500,
             description="Piments rouges piquants frais du marché camerounais. Indispensables pour pimenter sauces et marinades.",
             image_url="https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Huile de Palme (1L)", slug="huile-palme-1l",  prix_base_fcfa=1200, prix_max_fcfa=1800,
             description="Huile de palme rouge non raffinée, riche en bêta-carotène. Base de nombreux plats camerounais comme le ndolé et l'eru.",
             image_url="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Crevettes Séchées (100g)", slug="crevettes-sechees-100g", prix_base_fcfa=800, prix_max_fcfa=1500,
             description="Crevettes séchées fumées, saveur intense. Indispensables pour parfumer les sauces et bouillons africains.",
             image_url="https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Cube Bouillon Maggi (x12)", slug="cube-bouillon-maggi-x12", prix_base_fcfa=150, prix_max_fcfa=200,
             description="Cubes de bouillon Maggi, assaisonnement universel de la cuisine camerounaise. Boîte de 12 cubes.",
             image_url="https://images.unsplash.com/photo-1587132117046-008c6586a5ac?w=600&q=80&fit=crop",
             est_populaire=True),
        dict(nom="Sel de Cuisine (500g)", slug="sel-cuisine-500g", prix_base_fcfa=150, prix_max_fcfa=250,
             description="Sel de table fin ou gros sel pour la cuisine. Conditionnement 500g.",
             image_url="https://images.unsplash.com/photo-1520358026095-c9b4db6d7963?w=600&q=80&fit=crop",
             est_populaire=False),
        dict(nom="Poivre Noir Moulu (50g)", slug="poivre-noir-moulu-50g", prix_base_fcfa=300, prix_max_fcfa=600,
             description="Poivre noir moulu, arôme intense et piquant. Assaisonnement de base pour marinades et sauces.",
             image_url="https://images.unsplash.com/photo-1473101119397-76f3c72bd0e4?w=600&q=80&fit=crop",
             est_populaire=False),
        dict(nom="Mbongo (Écorce noire) 50g", slug="mbongo-ecorce-noire-50g", prix_base_fcfa=500, prix_max_fcfa=1000,
             description="Écorce noire séchée, épice principale du Mbongo Tchobi. Arôme fumé et légèrement amer, typiquement camerounais.",
             image_url="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
             est_populaire=False, est_nouveau=True),
        dict(nom="Njansang (Graine) 100g", slug="njansang-graine-100g", prix_base_fcfa=600, prix_max_fcfa=1200,
             description="Graines de njansang torréfiées, épice distinctive de la cuisine du Cameroun. Utilisées moulues dans les sauces.",
             image_url="https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
             est_populaire=False),
    ]

    # ── INGRÉDIENTS DES MENUS ───────────────────────────────────
    INGREDIENTS_PAR_SLUG = {
        "eru-okok": [
            dict(nom="Feuilles d'Okok (Eru)", est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=500, quantite_min=200, quantite_max=1000, prix_min_fcfa=500, prix_max_fcfa=2500, prix_defaut_fcfa=1200),
            dict(nom="Viande de Bœuf",       est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=300, quantite_min=100, quantite_max=800, prix_min_fcfa=500, prix_max_fcfa=4000, prix_defaut_fcfa=1500),
            dict(nom="Waterleaf (Talinum)",  est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=200, quantite_min=100, quantite_max=500, prix_min_fcfa=200, prix_max_fcfa=1000, prix_defaut_fcfa=400),
            dict(nom="Crevettes Séchées",    est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=50,  quantite_min=0,   quantite_max=200, prix_min_fcfa=0,   prix_max_fcfa=1500, prix_defaut_fcfa=400),
            dict(nom="Huile de Palme",       est_obligatoire=True,  type_saisie="curseur", unite="cl",
                 quantite_defaut=10,  quantite_min=5,   quantite_max=30,  prix_min_fcfa=100, prix_max_fcfa=600,  prix_defaut_fcfa=200),
            dict(nom="Poisson Fumé",         est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=100, quantite_min=0,   quantite_max=300, prix_min_fcfa=0,   prix_max_fcfa=1500, prix_defaut_fcfa=600),
        ],
        "ndole": [
            dict(nom="Feuilles de Ndolé",    est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=400, quantite_min=200, quantite_max=800, prix_min_fcfa=400, prix_max_fcfa=2000, prix_defaut_fcfa=800),
            dict(nom="Arachides Pilées",     est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=150, quantite_min=50,  quantite_max=400, prix_min_fcfa=200, prix_max_fcfa=1200, prix_defaut_fcfa=500),
            dict(nom="Viande de Bœuf",       est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=250, quantite_min=0,   quantite_max=600, prix_min_fcfa=0,   prix_max_fcfa=3000, prix_defaut_fcfa=1200),
            dict(nom="Crevettes Fraîches",   est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=100, quantite_min=0,   quantite_max=300, prix_min_fcfa=0,   prix_max_fcfa=2000, prix_defaut_fcfa=800),
            dict(nom="Huile de Palme",       est_obligatoire=True,  type_saisie="curseur", unite="cl",
                 quantite_defaut=8,   quantite_min=4,   quantite_max=20,  prix_min_fcfa=100, prix_max_fcfa=400,  prix_defaut_fcfa=160),
            dict(nom="Oignons",             est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=100, quantite_min=50,  quantite_max=250, prix_min_fcfa=50,  prix_max_fcfa=200,  prix_defaut_fcfa=100),
        ],
        "poulet-dg": [
            dict(nom="Poulet (morceaux)",    est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=600, quantite_min=300, quantite_max=1200, prix_min_fcfa=1500, prix_max_fcfa=6000, prix_defaut_fcfa=2500),
            dict(nom="Plantains Mûrs",       est_obligatoire=True,  type_saisie="curseur", unite="pcs",
                 quantite_defaut=2,   quantite_min=1,   quantite_max=6,   prix_min_fcfa=200, prix_max_fcfa=1200,  prix_defaut_fcfa=500),
            dict(nom="Tomates Fraîches",     est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=200, quantite_min=100, quantite_max=500, prix_min_fcfa=100, prix_max_fcfa=500,   prix_defaut_fcfa=200),
            dict(nom="Poivron Vert/Rouge",   est_obligatoire=False, type_saisie="curseur", unite="pcs",
                 quantite_defaut=1,   quantite_min=0,   quantite_max=3,   prix_min_fcfa=0,   prix_max_fcfa=300,   prix_defaut_fcfa=100),
            dict(nom="Carottes",             est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=100, quantite_min=0,   quantite_max=300, prix_min_fcfa=0,   prix_max_fcfa=300,   prix_defaut_fcfa=150),
            dict(nom="Huile de Cuisson",     est_obligatoire=True,  type_saisie="curseur", unite="cl",
                 quantite_defaut=5,   quantite_min=3,   quantite_max=15,  prix_min_fcfa=100, prix_max_fcfa=400,   prix_defaut_fcfa=200),
        ],
        "mbongo-tchobi": [
            dict(nom="Mbongo (Écorce Noire)", est_obligatoire=True, type_saisie="curseur", unite="g",
                 quantite_defaut=30, quantite_min=10, quantite_max=80, prix_min_fcfa=200, prix_max_fcfa=800, prix_defaut_fcfa=400),
            dict(nom="Viande de Porc/Bœuf",  est_obligatoire=True,  type_saisie="curseur", unite="g",
                 quantite_defaut=500, quantite_min=200, quantite_max=1000, prix_min_fcfa=1000, prix_max_fcfa=5000, prix_defaut_fcfa=2500),
            dict(nom="Poisson Fumé",          est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=100, quantite_min=0,   quantite_max=300, prix_min_fcfa=0,    prix_max_fcfa=1500, prix_defaut_fcfa=600),
            dict(nom="Njansang",              est_obligatoire=False, type_saisie="curseur", unite="g",
                 quantite_defaut=20,  quantite_min=0,   quantite_max=60,  prix_min_fcfa=0,    prix_max_fcfa=600,  prix_defaut_fcfa=200),
            dict(nom="Huile de Palme",        est_obligatoire=True,  type_saisie="curseur", unite="cl",
                 quantite_defaut=8,   quantite_min=4,   quantite_max=25,  prix_min_fcfa=100,  prix_max_fcfa=500,  prix_defaut_fcfa=200),
        ],
    }

    def seed_section(section_code, items, extra_kwargs=None):
        sec = secs[section_code]
        for i, item in enumerate(items):
            existing = db.query(Produit).filter(Produit.slug == item["slug"]).first()
            if not existing:
                kwargs = dict(
                    section_id=sec.id,
                    est_actif=True,
                    stock_dispo=True,
                    est_menu=item.get("est_menu", False),
                    est_populaire=item.get("est_populaire", False),
                    est_nouveau=item.get("est_nouveau", False),
                    ordre=i,
                    nom=item["nom"],
                    slug=item["slug"],
                    description=item.get("description",""),
                    prix_base_fcfa=item["prix_base_fcfa"],
                    prix_max_fcfa=item.get("prix_max_fcfa", item["prix_base_fcfa"]),
                    image_url=item.get("image_url",""),
                )
                if extra_kwargs:
                    kwargs.update(extra_kwargs)
                p = Produit(**kwargs)
                db.add(p)
                db.flush()

                # Ingrédients
                ingrs = INGREDIENTS_PAR_SLUG.get(item["slug"], [])
                for j, ing in enumerate(ingrs):
                    db.add(Ingredient(produit_id=p.id, ordre=j, **ing))

                print(f"  Produit: {item['nom']}")

    seed_section("menus_ingredients", MENUS)
    seed_section("fruits",    FRUITS)
    seed_section("boissons",  BOISSONS)
    seed_section("boulangerie", BOULANGERIE)
    seed_section("epices",    EPICES)

    db.commit()
    print("\n✅ Seed produits terminé avec succès!")

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback; traceback.print_exc()
    raise
finally:
    db.close()

"""Met à jour les image_url de tous les produits avec des photos Unsplash précises."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.core.database import SessionLocal
from app.models.models import Produit

db = SessionLocal()

# slug → URL Unsplash ciblée
IMAGES = {
    # ══════════════════════════════════════════
    # MENUS & INGRÉDIENTS
    # ══════════════════════════════════════════
    "eru-okok":                  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80&fit=crop",
    "ndole":                     "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80&fit=crop",
    "poulet-dg":                 "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600&q=80&fit=crop",
    "koki-gateau-haricots":      "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&fit=crop",
    "mbongo-tchobi":             "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&q=80&fit=crop",
    "beignets-haricots-accra":   "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",
    "achu-soup":                 "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",
    "sauce-gombo":               "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80&fit=crop",
    "nkui":                      "https://images.unsplash.com/photo-1576097449798-7c7f90e1248a?w=600&q=80&fit=crop",
    "poisson-braise":            "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80&fit=crop",
    "miondo-baton-manioc":       "https://images.unsplash.com/photo-1592417817038-d13fd7342605?w=600&q=80&fit=crop",
    "fufu-corn":                 "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",
    "plantain-mur-frit":         "https://images.unsplash.com/photo-1587395651786-9485a4cefa3b?w=600&q=80&fit=crop",

    # ══════════════════════════════════════════
    # FRUITS
    # ══════════════════════════════════════════
    "ananas-cameroun":           "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80&fit=crop",
    "mangue-camerounaise":       "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80&fit=crop",
    "papaye":                    "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=600&q=80&fit=crop",
    "avocat":                    "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600&q=80&fit=crop",
    "banane-plantain-vert":      "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600&q=80&fit=crop",
    "goyave":                    "https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=600&q=80&fit=crop",
    "banane-douce":              "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80&fit=crop",
    "pasteque":                  "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=600&q=80&fit=crop",
    "orange-cameroun":           "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&q=80&fit=crop",
    "citron-vert":               "https://images.unsplash.com/photo-1590502593747-42a996133562?w=600&q=80&fit=crop",
    "pamplemousse":              "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=600&q=80&fit=crop",
    "mandarine":                 "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80&fit=crop",
    "corossol-graviola":         "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&q=80&fit=crop",
    "safou-prune-africaine":     "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&fit=crop",
    "noix-de-coco":              "https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=600&q=80&fit=crop",
    "fruit-passion-maracuja":    "https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=600&q=80&fit=crop",
    "pomme-cannelle":            "https://images.unsplash.com/photo-1548153475-16249dc55194?w=600&q=80&fit=crop",
    "melon":                     "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=600&q=80&fit=crop",
    "pomme-cajou":               "https://images.unsplash.com/photo-1590005354167-6da97870c757?w=600&q=80&fit=crop",
    "tamarin":                   "https://images.unsplash.com/photo-1607451938419-ecec23f50f10?w=600&q=80&fit=crop",
    "nefle-japon":               "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=600&q=80&fit=crop",
    "cerise-pays":               "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=600&q=80&fit=crop",
    "prune-cythere":             "https://images.unsplash.com/photo-1595124323852-a078a4e9f39c?w=600&q=80&fit=crop",
    "baobab-pain-singe-200g":    "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80&fit=crop",
    "jujube-datte-chinoise":     "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&q=80&fit=crop",

    # ══════════════════════════════════════════
    # LÉGUMES
    # ══════════════════════════════════════════
    "tomates-fraiches-kg":            "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80&fit=crop",
    "oignons-kg":                     "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=80&fit=crop",
    "gombo-frais-500g":               "https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=600&q=80&fit=crop",
    "macabo-taro":                    "https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=600&q=80&fit=crop",
    "igname":                         "https://images.unsplash.com/photo-1591985666643-1eec5b63e02d?w=600&q=80&fit=crop",
    "manioc-frais":                   "https://images.unsplash.com/photo-1592417817038-d13fd7342605?w=600&q=80&fit=crop",
    "patate-douce":                   "https://images.unsplash.com/photo-1596097635121-14b63a7a7e93?w=600&q=80&fit=crop",
    "pomme-terre-kg":                 "https://images.unsplash.com/photo-1518977906741-cbdeab0be0d7?w=600&q=80&fit=crop",
    "feuilles-manioc-kpwem-500g":     "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&fit=crop",
    "feuilles-ndole-500g":            "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80&fit=crop",
    "feuilles-okok-eru-500g":         "https://images.unsplash.com/photo-1515023115894-0791ecb48568?w=600&q=80&fit=crop",
    "waterleaf-talinum-500g":         "https://images.unsplash.com/photo-1592924802770-6c8a2039d4f5?w=600&q=80&fit=crop",
    "morelle-noire-zom":              "https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=600&q=80&fit=crop",
    "epinards-locaux-500g":           "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80&fit=crop",
    "folere-oseille-guinee-200g":     "https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=600&q=80&fit=crop",
    "haricots-verts-500g":            "https://images.unsplash.com/photo-1567375698348-5d9d5ae10c5b?w=600&q=80&fit=crop",
    "aubergine-africaine-garden-egg": "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=600&q=80&fit=crop",
    "aubergine-violette":             "https://images.unsplash.com/photo-1528826007177-f38517ce9a8b?w=600&q=80&fit=crop",
    "concombre":                      "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&q=80&fit=crop",
    "chou-vert-pomme":                "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&q=80&fit=crop",
    "laitue":                         "https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=600&q=80&fit=crop",
    "carottes-kg":                    "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=600&q=80&fit=crop",
    "poivron-vert":                   "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&q=80&fit=crop",
    "poivron-rouge":                  "https://images.unsplash.com/photo-1526346698789-22fd84314424?w=600&q=80&fit=crop",
    "ail-frais-100g":                 "https://images.unsplash.com/photo-1540148426945-6cf22a6b2571?w=600&q=80&fit=crop",
    "gingembre-frais-200g":           "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600&q=80&fit=crop",
    "courge-citrouille":              "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&q=80&fit=crop",
    "mais-frais-epi":                 "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80&fit=crop",
    "arachides-fraiches-500g":        "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=600&q=80&fit=crop",
    "haricots-rouges-niebe-kg":       "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&q=80&fit=crop",
    "haricots-blancs-cornille-kg":    "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80&fit=crop",
    "pistache-graines-courge-200g":   "https://images.unsplash.com/photo-1541990931185-5e3f48693df4?w=600&q=80&fit=crop",
    "persil-celeri-frais":            "https://images.unsplash.com/photo-1506807803488-8eafc15316c7?w=600&q=80&fit=crop",

    # ══════════════════════════════════════════
    # BOISSONS — Eaux
    # ══════════════════════════════════════════
    "supermont-1-5l":            "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&fit=crop",
    "tangui-1-5l":               "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&fit=crop",
    "source-du-pays-1-5l":       "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&fit=crop",
    "vitale-1-5l":               "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&fit=crop",
    "eau-sachet-pure-water-x10": "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&q=80&fit=crop",

    # Sodas
    "coca-cola-50cl":            "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80&fit=crop",
    "fanta-orange-50cl":         "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80&fit=crop",
    "sprite-50cl":               "https://images.unsplash.com/photo-1473967879196-02b75060e09e?w=600&q=80&fit=crop",
    "schweppes-tonic-33cl":      "https://images.unsplash.com/photo-1568752481197-2d1f6f3c2e86?w=600&q=80&fit=crop",
    "top-ananas-50cl":           "https://images.unsplash.com/photo-1560508180-03f285f67ded?w=600&q=80&fit=crop",
    "top-grenadine-50cl":        "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&q=80&fit=crop",
    "malta-guinness-33cl":       "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&q=80&fit=crop",
    "vimto-33cl":                "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&q=80&fit=crop",
    "pepsi-50cl":                "https://images.unsplash.com/photo-1531895861208-cf5571308fd7?w=600&q=80&fit=crop",

    # Jus
    "jus-gingembre-frais":       "https://images.unsplash.com/photo-1602920068637-81de93f23c33?w=600&q=80&fit=crop",
    "jus-bissap-hibiscus":       "https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=600&q=80&fit=crop",
    "jus-folere":                "https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=600&q=80&fit=crop",
    "jus-baobab-bouye":          "https://images.unsplash.com/photo-1560508180-03f285f67ded?w=600&q=80&fit=crop",
    "jus-tamarin":               "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80&fit=crop",
    "jus-corossol":              "https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=600&q=80&fit=crop",
    "jus-mangue-frais":          "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80&fit=crop",
    "jus-fruit-passion":         "https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=600&q=80&fit=crop",
    "jus-pasteque-frais":        "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=600&q=80&fit=crop",
    "jus-ananas-frais":          "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80&fit=crop",
    "jus-cocktail-tropical":     "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80&fit=crop",
    "santal-mangue-1l":          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&fit=crop",

    # Boissons traditionnelles
    "matango-vin-raphia":        "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&q=80&fit=crop",
    "mimbo-vin-palme":           "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&q=80&fit=crop",
    "bili-bili-biere-mil":       "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80&fit=crop",
    "arki-alcool-mil":           "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80&fit=crop",
    "kossam-lait-caille-peul":   "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80&fit=crop",
    "odontol-liqueur-locale":    "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80&fit=crop",

    # Bières
    "33-export-biere-65cl":      "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",
    "castel-beer-65cl":          "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&q=80&fit=crop",
    "beaufort-biere-65cl":       "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",
    "mutzig-65cl":               "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80&fit=crop",
    "guinness-cameroun-65cl":    "https://images.unsplash.com/photo-1518176258769-f227c798150e?w=600&q=80&fit=crop",
    "kadji-beer-65cl":           "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",
    "isenbeck-65cl":             "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",
    "harp-lager-65cl":           "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",
    "manyan-65cl":               "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&fit=crop",

    # Énergie / Lait / Café
    "red-bull-25cl":             "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&q=80&fit=crop",
    "monster-energy-50cl":       "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&q=80&fit=crop",
    "power-horse-25cl":          "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&q=80&fit=crop",
    "lait-peak-concentre-160g":  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80&fit=crop",
    "lait-cowbell-sachet-x10":   "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80&fit=crop",
    "yaourt-nature-pot-125ml":   "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80&fit=crop",
    "cafe-camerounais-moulu-250g": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop",
    "the-camerounais-ndawara-100g": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80&fit=crop",
    "ovaltine-chocolat-chaud-400g": "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80&fit=crop",

    # ══════════════════════════════════════════
    # BOULANGERIE
    # ══════════════════════════════════════════
    "pain-boulangerie-baguette": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop",
    "pain-mie-tranche":          "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=600&q=80&fit=crop",
    "pain-complet-ble-entier":   "https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=600&q=80&fit=crop",
    "pain-sucre-camerounais":    "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e19?w=600&q=80&fit=crop",
    "pain-au-lait":              "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop",
    "pain-saucisson":            "https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600&q=80&fit=crop",
    "pain-chocolat-croissant":   "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80&fit=crop",

    # Beignets
    "beignets-chauds-10pcs":         "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop",
    "beignets-haricots-accra-x10":   "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",
    "beignets-banane-makala-x10":    "https://images.unsplash.com/photo-1587395651786-9485a4cefa3b?w=600&q=80&fit=crop",
    "mandazi-beignet-sucre":         "https://images.unsplash.com/photo-1619898804872-82038fa25da5?w=600&q=80&fit=crop",
    "puff-puff-beignets-souffles-x10": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop",
    "beignets-mais-corn-chaff":      "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80&fit=crop",

    # Gâteaux
    "gateau-fete":               "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&q=80&fit=crop",
    "koki-boulangerie":          "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&fit=crop",
    "gateau-pistache-nnam-ngon": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&q=80&fit=crop",
    "nnam-owondo-gateau-arachide": "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=600&q=80&fit=crop",
    "gateau-mais-corn-bread":    "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=600&q=80&fit=crop",
    "gateau-manioc-bobolo-sucre": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e19?w=600&q=80&fit=crop",
    "gateau-patate-douce":       "https://images.unsplash.com/photo-1596097635121-14b63a7a7e93?w=600&q=80&fit=crop",
    "chin-chin-biscuits-frits-200g": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80&fit=crop",
    "kouign-galette-sucree":     "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop",
    "caramel-toffee-camerounais-x20": "https://images.unsplash.com/photo-1582488757568-59254cf57dc3?w=600&q=80&fit=crop",
    "donuts-beignets-americains-x6": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop",
    "tarte-aux-fruits":          "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&q=80&fit=crop",
    "eclairs-chocolat-x3":       "https://images.unsplash.com/photo-1612198790700-b2f81ad52c6c?w=600&q=80&fit=crop",

    # Bouillies
    "bouillie-mais-pap-500g":    "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?w=600&q=80&fit=crop",
    "bouillie-riz-500g":         "https://images.unsplash.com/photo-1536304993881-ff86e0c9c2c7?w=600&q=80&fit=crop",
    "bouillie-soja-500g":        "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?w=600&q=80&fit=crop",
    "sanga-bouillie-mais-fermente": "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?w=600&q=80&fit=crop",

    # ══════════════════════════════════════════
    # ÉPICES — Piments
    # ══════════════════════════════════════════
    "piment-rouge-frais-100g":   "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600&q=80&fit=crop",
    "piment-vert-frais-100g":    "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600&q=80&fit=crop",
    "piment-seche-moulu-50g":    "https://images.unsplash.com/photo-1548611716-3000415a4098?w=600&q=80&fit=crop",
    "piment-fume-ndzing-50g":    "https://images.unsplash.com/photo-1548611716-3000415a4098?w=600&q=80&fit=crop",
    "piment-cayenne-50g":        "https://images.unsplash.com/photo-1548611716-3000415a4098?w=600&q=80&fit=crop",
    "scotch-bonnet-habanero-100g": "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600&q=80&fit=crop",

    # Épices locales
    "mbongo-ecorce-noire-50g":   "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
    "njansang-graine-100g":      "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
    "nkui-poudre-ecorces-50g":   "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
    "pebe-aidan-fruit-50g":      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
    "esese-poivre-guinee-50g":   "https://images.unsplash.com/photo-1473101119397-76f3c72bd0e4?w=600&q=80&fit=crop",
    "poivre-blanc-penja-50g":    "https://images.unsplash.com/photo-1473101119397-76f3c72bd0e4?w=600&q=80&fit=crop",
    "poivre-noir-penja-50g":     "https://images.unsplash.com/photo-1473101119397-76f3c72bd0e4?w=600&q=80&fit=crop",
    "djindja-4-cotes-50g":       "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
    "noix-muscade-50g":          "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
    "clou-girofle-50g":          "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop",
    "cannelle-batons-50g":       "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80&fit=crop",
    "curcuma-poudre-50g":        "https://images.unsplash.com/photo-1615485291234-9d694218aeb3?w=600&q=80&fit=crop",
    "curry-poudre-50g":          "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
    "feuille-laurier-20g":       "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&q=80&fit=crop",
    "thym-seche-20g":            "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&q=80&fit=crop",
    "basilic-frais-seche-20g":   "https://images.unsplash.com/photo-1560963805-6c64419b9a1b?w=600&q=80&fit=crop",
    "country-onion-oignon-brousse-50g": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=80&fit=crop",
    "graines-selim-kieng-50g":   "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",

    # Huiles
    "huile-palme-1l":            "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80&fit=crop",
    "huile-palme-blanche-1l":    "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80&fit=crop",
    "huile-arachide-1l":         "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80&fit=crop",
    "huile-vegetale-mayor-1l":   "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80&fit=crop",
    "beurre-karite-200g":        "https://images.unsplash.com/photo-1517281862878-9c1d6abb3620?w=600&q=80&fit=crop",
    "huile-coco-vierge-250ml":   "https://images.unsplash.com/photo-1580881444619-e19d1e5eb78d?w=600&q=80&fit=crop",

    # Condiments
    "cube-bouillon-maggi-x12":   "https://images.unsplash.com/photo-1587132117046-008c6586a5ac?w=600&q=80&fit=crop",
    "cube-jumbo-x12":            "https://images.unsplash.com/photo-1587132117046-008c6586a5ac?w=600&q=80&fit=crop",
    "sel-cuisine-500g":          "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=600&q=80&fit=crop",
    "poivre-noir-moulu-50g":     "https://images.unsplash.com/photo-1473101119397-76f3c72bd0e4?w=600&q=80&fit=crop",
    "crevettes-sechees-100g":    "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80&fit=crop",
    "poisson-fume-200g":         "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80&fit=crop",
    "ecrevisses-sechees-100g":   "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80&fit=crop",
    "potasse-alimentaire-kangwa-50g": "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
    "vinaigre-50cl":             "https://images.unsplash.com/photo-1558818498-28c1e7605cc0?w=600&q=80&fit=crop",
    "moutarde-dijon-200g":       "https://images.unsplash.com/photo-1558818498-28c1e7605cc0?w=600&q=80&fit=crop",
    "sauce-soja-250ml":          "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&fit=crop",
    "mayonnaise-300g":           "https://images.unsplash.com/photo-1558818498-28c1e7605cc0?w=600&q=80&fit=crop",
    "ketchup-300g":              "https://images.unsplash.com/photo-1558818498-28c1e7605cc0?w=600&q=80&fit=crop",
    "pate-arachide-500g":        "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=600&q=80&fit=crop",
    "concentre-tomate-400g":     "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80&fit=crop",
    "sucre-poudre-1kg":          "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80&fit=crop",
    "bicarbonate-soude-100g":    "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&q=80&fit=crop",
}

try:
    updated = 0
    not_found = []
    for slug, url in IMAGES.items():
        prod = db.query(Produit).filter(Produit.slug == slug).first()
        if prod:
            prod.image_url = url
            updated += 1
        else:
            not_found.append(slug)
    db.commit()
    print(f"\n✅ {updated} images mises à jour avec succès!")
    if not_found:
        print(f"⚠️  {len(not_found)} slugs introuvables: {not_found[:5]}{'...' if len(not_found)>5 else ''}")
except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback; traceback.print_exc()
    raise
finally:
    db.close()

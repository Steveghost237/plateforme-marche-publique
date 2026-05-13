import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LangProvider extends ChangeNotifier {
  String _lang = 'fr';
  String get lang => _lang;
  bool get isFr => _lang == 'fr';

  LangProvider() {
    _loadLang();
  }

  Future<void> _loadLang() async {
    final prefs = await SharedPreferences.getInstance();
    _lang = prefs.getString('app_lang') ?? 'fr';
    notifyListeners();
  }

  Future<void> toggle() async {
    _lang = _lang == 'fr' ? 'en' : 'fr';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_lang', _lang);
    notifyListeners();
  }

  String t(String key) {
    return (_lang == 'fr' ? _fr[key] : _en[key]) ?? key;
  }

  static const Map<String, String> _fr = {
    'home': 'Accueil',
    'catalogue': 'Catalogue',
    'compose_meal': 'Composez votre repas',
    'cart': 'Panier',
    'orders': 'Mes commandes',
    'profile': 'Profil',
    'login': 'Connexion',
    'signup': 'Inscription',
    'logout': 'Déconnexion',
    'search': 'Rechercher...',
    'checkout': 'Commander',
    'delivery_address': 'Adresse de livraison',
    'delivery_slot': 'Créneau de livraison',
    'payment_method': 'Mode de paiement',
    'confirm_pay': 'Confirmer & Payer',
    'subtotal': 'Sous-total',
    'delivery_fee': 'Frais de livraison',
    'total': 'Total',
    'free_delivery': 'Livraison offerte',
    'order_success': 'Commande passée avec succès !',
    'mtn_momo': 'MTN Mobile Money',
    'orange_money': 'Orange Money',
    'stripe': 'Carte bancaire (Visa/MC)',
    'paypal': 'PayPal',
    'cash': 'Espèces à la livraison',
    'phone_label': 'Numéro Mobile Money à débiter',
    'stripe_info': 'Vous serez redirigé vers Stripe pour saisir vos informations de carte.',
    'paypal_info': 'Vous serez redirigé vers PayPal pour finaliser le paiement.',
    'secure_payment': 'Paiement 100% sécurisé',
    'summary': 'Récapitulatif',
    'add_address': 'Ajouter une adresse',
    'no_address': 'Aucune adresse',
    'morning': 'Matin (8h - 12h)',
    'afternoon': 'Après-midi (12h - 16h)',
    'evening': 'Soir (16h - 20h)',
  };

  static const Map<String, String> _en = {
    'home': 'Home',
    'catalogue': 'Catalogue',
    'compose_meal': 'Compose your meal',
    'cart': 'Cart',
    'orders': 'My orders',
    'profile': 'Profile',
    'login': 'Login',
    'signup': 'Sign up',
    'logout': 'Logout',
    'search': 'Search...',
    'checkout': 'Order',
    'delivery_address': 'Delivery address',
    'delivery_slot': 'Delivery slot',
    'payment_method': 'Payment method',
    'confirm_pay': 'Confirm & Pay',
    'subtotal': 'Subtotal',
    'delivery_fee': 'Delivery fee',
    'total': 'Total',
    'free_delivery': 'Free delivery',
    'order_success': 'Order placed successfully!',
    'mtn_momo': 'MTN Mobile Money',
    'orange_money': 'Orange Money',
    'stripe': 'Credit card (Visa/MC)',
    'paypal': 'PayPal',
    'cash': 'Cash on delivery',
    'phone_label': 'Mobile Money number to charge',
    'stripe_info': 'You will be redirected to Stripe to enter your card details.',
    'paypal_info': 'You will be redirected to PayPal to complete your payment.',
    'secure_payment': '100% secure payment',
    'summary': 'Summary',
    'add_address': 'Add an address',
    'no_address': 'No address',
    'morning': 'Morning (8am - 12pm)',
    'afternoon': 'Afternoon (12pm - 4pm)',
    'evening': 'Evening (4pm - 8pm)',
  };
}

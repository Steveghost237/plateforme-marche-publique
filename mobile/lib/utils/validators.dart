import 'package:flutter/material.dart';

class Validators {
  static final _cameroonPhoneRegex = RegExp(r'^(\+?237)?[6-9]\d{8}$');

  static bool isValidCameroonPhone(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[\s\-().]+'), '');
    return _cameroonPhoneRegex.hasMatch(cleaned);
  }

  static String normalizeCameroonPhone(String phone) {
    var cleaned = phone.replaceAll(RegExp(r'[\s\-().]+'), '');
    if (cleaned.startsWith('00237')) cleaned = '+237${cleaned.substring(5)}';
    if (cleaned.startsWith('237') && !cleaned.startsWith('+')) {
      cleaned = '+$cleaned';
    }
    if (RegExp(r'^[6-9]\d{8}$').hasMatch(cleaned)) cleaned = '+237$cleaned';
    return cleaned;
  }

  static PasswordStrength getPasswordStrength(String password) {
    if (password.isEmpty) return PasswordStrength(0, '', Colors.grey);
    int score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (password.contains(RegExp(r'[A-Z]'))) score++;
    if (password.contains(RegExp(r'[0-9]'))) score++;
    if (password.contains(RegExp(r'[^A-Za-z0-9]'))) score++;

    if (score <= 1) return PasswordStrength(score, 'Faible', Colors.red);
    if (score <= 2) return PasswordStrength(score, 'Moyen', Colors.orange);
    if (score <= 3)
      return PasswordStrength(score, 'Bon', const Color(0xFFFBBF24));
    return PasswordStrength(score, 'Fort', Colors.green);
  }
}

class PasswordStrength {
  final int score;
  final String label;
  final Color color;
  PasswordStrength(this.score, this.label, this.color);
}

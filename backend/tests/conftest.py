"""
Configuration pytest pour les tests NotchPay.
Réinitialise les variables d'environnement sensibles avant chaque test.
"""
import os
import sys
import pytest

# Ajouter le dossier backend/ au PYTHONPATH pour les imports relatifs
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Valeurs d'environnement neutres pour les tests
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY",   "test-secret-key-minimum-32-characters!!")
os.environ.setdefault("NOTCHPAY_PUBLIC_KEY", "")
os.environ.setdefault("STRIPE_SECRET_KEY",   "")
os.environ.setdefault("PAYPAL_CLIENT_ID",    "")
os.environ.setdefault("PAYPAL_SECRET",       "")

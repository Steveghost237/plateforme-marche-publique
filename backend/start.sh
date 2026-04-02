#!/bin/bash

# Script de démarrage pour Render.com

echo "🚀 Démarrage de ComeBuy API..."

# Créer les tables de la base de données
echo "📊 Création des tables..."
python create_tables_and_seed.py

# Démarrer le serveur Uvicorn
echo "🌐 Démarrage du serveur..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

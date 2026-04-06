"""Migration: ajouter colonne derniere_plateforme à la table utilisateurs"""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_plateforme VARCHAR(20)"))
        conn.commit()
        print("✅ Colonne derniere_plateforme ajoutée avec succès")
    except Exception as e:
        print(f"⚠️ {e}")

"""Réduit le logo dans les ic_launcher pour qu'il tienne dans la safe-zone (66%) des adaptive icons Android.
Et redimensionne tous les ic_launcher.png + ic_launcher_foreground.png avec un padding suffisant pour qu'aucune partie ne soit rognée.
"""
from PIL import Image
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "android", "app", "src", "main", "res")
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "images", "logo-comebuy.png")

# Tailles standards Android
SIZES_LAUNCHER = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Foreground doit être 108dp (avec safe-zone de 66dp au centre)
SIZES_FOREGROUND = {
    "drawable-mdpi": 108,
    "drawable-hdpi": 162,
    "drawable-xhdpi": 216,
    "drawable-xxhdpi": 324,
    "drawable-xxxhdpi": 432,
}

logo = Image.open(LOGO).convert("RGBA")

# 1) ic_launcher.png : logo carré sur fond transparent, padding 12% pour ne pas être rogné par les coins
for folder, size in SIZES_LAUNCHER.items():
    path = os.path.join(BASE, folder, "ic_launcher.png")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.78)  # 78% du carré pour laisser du padding
    resized = logo.resize((inner, inner), Image.LANCZOS)
    pos = ((size - inner) // 2, (size - inner) // 2)
    canvas.paste(resized, pos, resized)
    canvas.save(path)
    print(f"  ic_launcher {folder} → {size}x{size} (logo {inner}x{inner})")

# 2) ic_launcher_foreground.png : logo dans la safe-zone (66% du centre)
for folder, size in SIZES_FOREGROUND.items():
    path = os.path.join(BASE, folder, "ic_launcher_foreground.png")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.55)  # 55% pour s'assurer que le logo soit dans la safe-zone
    resized = logo.resize((inner, inner), Image.LANCZOS)
    pos = ((size - inner) // 2, (size - inner) // 2)
    canvas.paste(resized, pos, resized)
    canvas.save(path)
    print(f"  ic_launcher_foreground {folder} → {size}x{size} (logo {inner}x{inner})")

print("\nLogos APP redimensionnés avec padding pour ne plus être rognés.")

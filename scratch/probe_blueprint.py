from PIL import Image, ImageDraw
import os
import shutil

# Blueprint is 1024x1024
# Grid: rows A-G10 (left), col labels A1-G10 at borders
# Visual inspection: the plant key panel is at roughly x=900-990, y=565-740 on the 1024x1024 image
# The printed plant icons are on the isometric map itself

# Restore from backup first
blueprint_path = 'assets/karuna_house_blueprint.png'
backup_path = 'assets/karuna_house_blueprint_original.png'

if os.path.exists(backup_path):
    shutil.copy(backup_path, blueprint_path)
    print("Restored from backup.")

img = Image.open(blueprint_path)
draw = ImageDraw.Draw(img)

# Sample pixel at rough center of "Plant Key" panel region
print("Plant Key region sample pixels:")
samples = [
    (905, 565), (905, 620), (905, 680), (905, 740),
    (950, 565), (950, 620), (950, 680), (950, 740),
    (990, 565), (990, 620), (990, 680), (990, 740),
]
for x, y in samples:
    print(f"  ({x}, {y}): {img.getpixel((x, y))}")

# Also check some large plant icon regions on the map  
print("\nMap icon region samples:")
icon_samples = [
    (200, 500), (220, 520), (240, 540),  # left side saguaros
    (380, 680), (400, 700),  # bottom area
    (780, 160), (800, 180),  # upper right area
]
for x, y in icon_samples:
    print(f"  ({x}, {y}): {img.getpixel((x, y))}")

from PIL import Image
import os

images = [
    'slipper_plant.png', 'elephant_bush.png', 'baja_fairy_duster.png',
    'lantana.png', 'texas_sage.png', 'totem_pole.png'
]

for filename in images:
    path = os.path.join('assets/generated', filename)
    if os.path.exists(path):
        img = Image.open(path)
        print(f"{filename} top-left pixel: {img.getpixel((0, 0))}")

from PIL import Image

img = Image.open('assets/generated/slipper_plant.png')
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")
# Let's count some pixel transparency or check background pixels
bg_pixels = 0
for x in range(img.width):
    p = img.getpixel((x, 0))
    if len(p) > 3 and p[3] == 0:
        bg_pixels += 1
print(f"Transparent pixels at row 0: {bg_pixels} out of {img.width}")

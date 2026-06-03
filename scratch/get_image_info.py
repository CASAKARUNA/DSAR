from PIL import Image

img = Image.open('assets/karuna_house_blueprint.png')
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")
# Print pixel values from top-left area to find the exact background color
for x in range(10):
    for y in range(10):
        print(f"Pixel at {x},{y}: {img.getpixel((x, y))}")
        break

from PIL import Image

def test_rotate():
    img = Image.open('assets/karuna_house_blueprint.png')
    # Bounding box of the compass rose
    # Let's crop from x=780 to 880, y=100 to 200
    compass = img.crop((785, 100, 875, 190))
    # Rotate by 135 degrees counter-clockwise
    rotated = compass.rotate(135, resample=Image.Resampling.BICUBIC, fillcolor=(238, 226, 200))
    # Save rotated compass
    rotated.save('scratch/rotated_compass.png')

if __name__ == '__main__':
    test_rotate()
    print("Rotated compass saved to scratch/rotated_compass.png")

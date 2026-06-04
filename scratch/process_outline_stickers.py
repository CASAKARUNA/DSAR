import os
from PIL import Image, ImageDraw, ImageOps

# Paths
BRAIN_DIR = '/Users/davidsardarizadeh/.gemini/antigravity-ide/brain/e75eb5d8-44fa-4876-9c65-e2a8fe7ce826'
OUTPUT_DIR = '/Users/davidsardarizadeh/Documents/antigravity/lively-franklin/assets/generated'

# Mapping of the target 33 plant filenames to their templates
FILENAME_MAPPING = {
    'slipper_plant.png': 'slipper_plant_isometric',
    'elephant_bush.png': 'olive_tree_isometric',
    'baja_fairy_duster.png': 'sage_isometric',
    'lantana.png': 'sage_isometric',
    'texas_sage.png': 'sage_isometric',
    'totem_pole.png': 'slipper_plant_isometric',
    'desert_spoon.png': 'agave_isometric',
    'queen_vic_agave.png': 'agave_isometric',
    'rosemary.png': 'sage_isometric',
    'bougainvillea.png': 'sage_isometric',
    'russian_sage.png': 'sage_isometric',
    'olive_tree.png': 'olive_tree_isometric',
    'pomegranate.png': 'olive_tree_isometric',
    'bottlebrush.png': 'sage_isometric',
    'smoke_bush.png': 'oak_tree_isometric',
    'yellow_bells.png': 'sage_isometric',
    'boxwood.png': 'olive_tree_isometric',
    'oak_tree.png': 'oak_tree_isometric',
    'plumbago.png': 'sage_isometric',
    'fan_palm.png': 'agave_isometric',
    'photinia.png': 'olive_tree_isometric',
    'firethorn.png': 'sage_isometric',
    'citrus_tree.png': 'olive_tree_isometric',
    'mexican_bush_sage.png': 'sage_isometric',
    'rose_bush.png': 'sage_isometric',
    'pygmy_date_palm.png': 'agave_isometric',
    'variegated_euonymus.png': 'olive_tree_isometric',
    'jasmine.png': 'sage_isometric',
    'golden_barrel.png': 'cactus_barrel_isometric',
    'asparagus_fern.png': 'sage_isometric',
    'fig_tree.png': 'olive_tree_isometric',
    'gardenia.png': 'olive_tree_isometric',
    'podocarpus.png': 'olive_tree_isometric'
}

# Image IDs of the generated files (so we know which specific file to load from the brain directory)
TEMPLATE_FILES = {
    'olive_tree_isometric': 'olive_tree_isometric_1780585011494.png',
    'oak_tree_isometric': 'oak_tree_isometric_1780585026291.png',
    'slipper_plant_isometric': 'slipper_plant_isometric_1780585040920.png',
    'cactus_barrel_isometric': 'cactus_barrel_isometric_1780585056346.png',
    'agave_isometric': 'agave_isometric_1780585072851.png',
    'sage_isometric': 'sage_isometric_1780585089669.png'
}


def process_template(template_name):
    filename = TEMPLATE_FILES[template_name]
    path = os.path.join(BRAIN_DIR, filename)
    print(f"Processing template: {template_name} from {path}")
    
    # Load image and convert to RGB
    img = Image.open(path).convert('RGB')
    width, height = img.size
    
    # We will flood-fill the background starting from the corners
    # Let's use a copy for flood-fill marking
    flood_img = img.copy()
    draw = ImageDraw.Draw(flood_img)
    
    # Fill corners with a unique color: pure green (0, 255, 0)
    marker_color = (0, 255, 0)
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    for start_xy in corners:
        ImageDraw.floodfill(flood_img, start_xy, marker_color, thresh=25)
        
    # Now, process pixels to create the transparent outline sticker
    # Output is RGBA
    out_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    pixels_orig = img.load()
    pixels_flood = flood_img.load()
    pixels_out = out_img.load()
    
    # Dark line color for sketches (slate/charcoal: #121815)
    charcoal = (18, 24, 21, 255)
    white_fill = (255, 255, 255, 255)
    
    for x in range(width):
        for y in range(height):
            # Check if this pixel was filled with the green marker (background)
            if pixels_flood[x, y] == marker_color:
                # Background -> Transparent
                pixels_out[x, y] = (0, 0, 0, 0)
            else:
                # Foreground (plant body)
                r, g, b = pixels_orig[x, y]
                # Calculate luminance
                luminance = 0.299 * r + 0.587 * g + 0.114 * b
                if luminance < 140:
                    # Dark line -> charcoal stroke
                    pixels_out[x, y] = charcoal
                else:
                    # Light area inside plant contour -> solid white fill
                    pixels_out[x, y] = white_fill
                    
    # Crop to non-transparent bounding box
    bbox = out_img.getbbox()
    if bbox:
        out_img = out_img.crop(bbox)
        
    # Standardize size: max 360px within a 400x400 transparent canvas
    max_dimension = 360
    out_img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    
    # Paste centered onto 400x400 canvas
    canvas = Image.new('RGBA', (400, 400), (0, 0, 0, 0))
    px = (400 - out_img.width) // 2
    py = (400 - out_img.height) // 2
    canvas.paste(out_img, (px, py))
    
    return canvas

def main():
    print("Starting transparent plant sticker generation...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Process and cache the processed template images
    processed_templates = {}
    for template_name in TEMPLATE_FILES.keys():
        processed_templates[template_name] = process_template(template_name)
        
    print("\nCopying processed templates to plant filenames...")
    for target_name, template_name in FILENAME_MAPPING.items():
        sticker_img = processed_templates[template_name]
        dest_path = os.path.join(OUTPUT_DIR, target_name)
        sticker_img.save(dest_path, 'PNG')
        print(f"Saved {target_name} <- {template_name}")
        
    print("\nSuccessfully finished processing all plant stickers!")

if __name__ == '__main__':
    main()

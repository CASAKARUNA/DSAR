import os
from PIL import Image, ImageDraw, ImageOps

# Paths
BRAIN_DIR = '/Users/davidsardarizadeh/.gemini/antigravity-ide/brain/e75eb5d8-44fa-4876-9c65-e2a8fe7ce826'
OUTPUT_DIR = '/Users/davidsardarizadeh/Documents/antigravity/lively-franklin/assets/generated'

# Mapping of the target 33 plant filenames to their templates
FILENAME_MAPPING = {
    'slipper_plant.png': 'slipper_plant_template',
    'elephant_bush.png': 'shrub_template',
    'baja_fairy_duster.png': 'fern_template',
    'lantana.png': 'flowering_vine_template',
    'texas_sage.png': 'sage_template',
    'totem_pole.png': 'slipper_plant_template',
    'desert_spoon.png': 'agave_template',
    'queen_vic_agave.png': 'agave_template',
    'rosemary.png': 'sage_template',
    'bougainvillea.png': 'flowering_vine_template',
    'russian_sage.png': 'sage_template',
    'olive_tree.png': 'olive_tree_template',
    'pomegranate.png': 'olive_tree_template',
    'bottlebrush.png': 'sage_template',
    'smoke_bush.png': 'shrub_template',
    'yellow_bells.png': 'shrub_template',
    'boxwood.png': 'shrub_template',
    'oak_tree.png': 'oak_tree_template',
    'plumbago.png': 'flowering_vine_template',
    'fan_palm.png': 'palm_template',
    'photinia.png': 'shrub_template',
    'firethorn.png': 'fern_template',
    'citrus_tree.png': 'olive_tree_template',
    'mexican_bush_sage.png': 'sage_template',
    'rose_bush.png': 'flowering_vine_template',
    'pygmy_date_palm.png': 'palm_template',
    'variegated_euonymus.png': 'shrub_template',
    'jasmine.png': 'flowering_vine_template',
    'golden_barrel.png': 'cactus_barrel_template',
    'asparagus_fern.png': 'fern_template',
    'fig_tree.png': 'olive_tree_template',
    'gardenia.png': 'shrub_template',
    'podocarpus.png': 'shrub_template'
}

# Image IDs of the generated files (so we know which specific file to load from the brain directory)
TEMPLATE_FILES = {
    'olive_tree_template': 'olive_tree_template_1780583974252.png',
    'oak_tree_template': 'oak_tree_template_1780583987809.png',
    'slipper_plant_template': 'slipper_plant_template_1780583999891.png',
    'cactus_barrel_template': 'cactus_barrel_template_1780584014549.png',
    'agave_template': 'agave_template_1780584027541.png',
    'sage_template': 'sage_template_1780584042160.png',
    'shrub_template': 'shrub_template_1780584057511.png',
    'palm_template': 'palm_template_1780584071268.png',
    'flowering_vine_template': 'flowering_vine_template_1780584085608.png',
    'fern_template': 'fern_template_1780584099788.png'
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

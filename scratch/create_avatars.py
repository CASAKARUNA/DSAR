import os
import re
from PIL import Image, ImageDraw, ImageOps, ImageFont

def parse_db_js():
    # Read db.js and extract plant database using regex
    with open('db.js', 'r') as f:
        content = f.read()
        
    # Find all plant blocks: { "id": ..., "group": ..., "name": ..., "images": [...] }
    # Let's do a simple regex search
    blocks = re.findall(r'\{\s*"id":\s*(\d+),\s*"group":\s*"([^"]+)",\s*"name":\s*"([^"]+)",(?:.|\n)*?"images":\s*\[\s*([^\]]+?)\s*\]', content)
    
    plants = []
    for id_str, group, name, images_raw in blocks:
        # Clean image paths
        images = [img.strip().replace('"', '') for img in images_raw.split(',')]
        plants.append({
            'id': int(id_str),
            'group': group,
            'name': name,
            'image': images[0]
        })
    return plants

def make_circular_avatar(img_path, zone_color):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        # Return a colored circle as fallback
        fallback = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        draw = ImageDraw.Draw(fallback)
        draw.ellipse([4, 4, 123, 123], fill=zone_color)
        return fallback
        
    img = Image.open(img_path).convert('RGB')
    
    # Crop center square
    w, h = img.size
    size = min(w, h)
    left = (w - size) // 2
    top = (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
    
    # Resize to 120x120 to leave space for border
    img = img.resize((118, 118), Image.Resampling.LANCZOS)
    
    # Create circular mask
    mask = Image.new('L', (118, 118), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse((0, 0, 118, 118), fill=255)
    
    # Apply mask
    avatar = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    avatar.paste(img, (5, 5), mask)
    
    # Draw border
    draw = ImageDraw.Draw(avatar)
    draw.ellipse([3, 3, 124, 124], outline=zone_color, width=4)
    
    return avatar

def main():
    plants = parse_db_js()
    print(f"Parsed {len(plants)} plants from db.js")
    
    # Colors for zones
    zone_colors = {
        'A': (200, 122, 83),  # Terracotta/Gold
        'B': (141, 150, 136), # Sage Green
        'C': (74, 144, 226)   # Blue
    }
    
    # Ensure generated directory exists
    os.makedirs('assets/generated', exist_ok=True)
    
    # Generate individual avatars
    avatars = {}
    for p in plants:
        color = zone_colors.get(p['group'], (128, 128, 128))
        img_path = p['image']
        avatar = make_circular_avatar(img_path, color)
        out_path = f"assets/generated/avatar_{p['id']}.png"
        avatar.save(out_path)
        avatars[p['id']] = avatar
        
    print("Generated individual avatar files.")
    
    # Compile master sheets for Zone A, B, C individually (4x3 grids)
    font_path = '/System/Library/Fonts/Supplemental/Georgia.ttf'
    font = ImageFont.truetype(font_path, 14) if os.path.exists(font_path) else ImageFont.load_default()
    
    for zone in ['A', 'B', 'C']:
        zone_plants = [p for p in plants if p['group'] == zone]
        
        # Grid parameters: 4 columns, 3 rows (supports up to 12 plants per sheet)
        grid_w, grid_h = 4, 3
        cell_w, cell_h = 220, 220
        sheet_w = grid_w * cell_w
        sheet_h = grid_h * cell_h
        
        # Background: (#efe5cc)
        sheet = Image.new('RGB', (sheet_w, sheet_h), (239, 229, 204))
        draw = ImageDraw.Draw(sheet)
        
        for idx, p in enumerate(zone_plants):
            if idx >= grid_w * grid_h:
                break
                
            col_idx = idx % grid_w
            row_idx = idx // grid_w
            
            # Position
            cx = col_idx * cell_w + (cell_w - 128) // 2
            cy = row_idx * cell_h + (cell_h - 160) // 2
            
            # Paste avatar
            avatar = avatars[p['id']]
            sheet.paste(avatar, (cx, cy), avatar)
            
            # Draw label centered under the avatar
            label = p['name']
            bbox = draw.textbbox((0, 0), label, font=font)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
            label_x = col_idx * cell_w + (cell_w - lw) // 2
            label_y = cy + 138
            draw.text((label_x, label_y), label, fill=(18, 24, 21), font=font)
            
            # Draw subtle cell border
            draw.rectangle([col_idx * cell_w, row_idx * cell_h, (col_idx+1)*cell_w, (row_idx+1)*cell_h], outline=(141, 150, 136, 100), width=1)
            
        sheet_path = f"assets/generated/zone_{zone.lower()}_avatars.png"
        sheet.save(sheet_path)
        print(f"Generated master sheet for Zone {zone} at {sheet_path}")

if __name__ == '__main__':
    main()

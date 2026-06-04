from PIL import Image, ImageDraw, ImageFont
import math

def draw_compass_rose(draw, cx, cy, font):
    # Colors
    dark_color = (18, 24, 21)
    light_bg = (239, 229, 204)
    
    # Draw double circles
    draw.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], outline=dark_color, width=1)
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], outline=dark_color, width=1)
    
    # Helper to draw a shaded pointer point
    # tip: tip of pointer
    # base_cw: base corner clockwise
    # base_ccw: base corner counter-clockwise
    def draw_pointer(tip, base, left_side):
        if left_side:
            draw.polygon([cx, cy, tip[0], tip[1], base[0], base[1]], fill=dark_color)
        else:
            draw.polygon([cx, cy, tip[0], tip[1], base[0], base[1]], fill=light_bg, outline=dark_color)
            
    # North pointer (Points BOTTOM, i.e., cx, cy + 25)
    draw_pointer((cx, cy + 25), (cx - 5, cy + 5), left_side=True)
    draw_pointer((cx, cy + 25), (cx + 5, cy + 5), left_side=False)
    
    # West pointer (Points LEFT, i.e., cx - 32, cy)
    draw_pointer((cx - 32, cy), (cx - 6, cy - 6), left_side=True)
    draw_pointer((cx - 32, cy), (cx - 6, cy + 6), left_side=False)
    
    # South pointer (Points TOP, i.e., cx, cy - 25)
    draw_pointer((cx, cy - 25), (cx - 5, cy - 5), left_side=True)
    draw_pointer((cx, cy - 25), (cx + 5, cy - 5), left_side=False)
    
    # East pointer (Points RIGHT, i.e., cx + 25, cy)
    draw_pointer((cx + 25, cy), (cx + 5, cy - 5), left_side=True)
    draw_pointer((cx + 25, cy), (cx + 5, cy + 5), left_side=False)
    
    # Draw minor diagonal lines
    r_diag = 20
    for angle in [45, 135, 225, 315]:
        rad = math.radians(angle)
        dx = int(r_diag * math.cos(rad))
        dy = int(r_diag * math.sin(rad))
        draw.line([(cx, cy), (cx + dx, cy + dy)], fill=dark_color, width=1)
        
    # Draw letters:
    # N is Bottom
    draw.text((cx - 5, cy + 34), "N", fill=dark_color, font=font)
    # W is Left
    draw.text((cx - 44, cy - 10), "W", fill=dark_color, font=font)
    # S is Top
    draw.text((cx - 5, cy - 42), "S", fill=dark_color, font=font)
    # E is Right
    draw.text((cx + 34, cy - 10), "E", fill=dark_color, font=font)


def main():
    filenames = ['assets/karuna_house_blueprint.png', 'assets/karuna_house_blueprint_clean.png']
    for filename in filenames:
        try:
            img = Image.open(filename)
        except FileNotFoundError:
            print(f"Skipping missing file: {filename}")
            continue
        draw = ImageDraw.Draw(img)
        
        # Fonts
        font_labels = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', 13)
        font_labels_bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', 14)
        font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', 20)
        
        # Colors
        bg_light = (239, 229, 204)
        bg_dark_right = (84, 77, 61)
        text_dark = (18, 24, 21)
        text_light = (239, 229, 204)
        
        # Clear and rewrite title (y=30 to 65, x=28 to 900)
        draw.rectangle([28, 30, 900, 65], fill=bg_light)
        title_text = "GARDEN PLOT & HOUSE MAP: “DSAR KARUNA HOUSE” (MASTER BLUEPRINT)"
        bbox = draw.textbbox((0, 0), title_text, font=font_title)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((464 - tw/2, 48 - th/2 - 2), title_text, fill=text_dark, font=font_title)
        
        # 1. Clear top border (y=0 to 28, x=28 to 900)
        draw.rectangle([28, 0, 900, 27], fill=bg_light)
        
        # 2. Clear bottom border (y=965 to 1024, x=28 to 900)
        draw.rectangle([28, 965, 900, 1024], fill=bg_light)
        
        # 3. Clear left border (x=0 to 28, y=28 to 965)
        draw.rectangle([0, 28, 27, 965], fill=bg_light)
        
        # 4. Clear right border labels (x=980 to 1005, y=28 to 965)
        draw.rectangle([980, 28, 1005, 965], fill=bg_dark_right)
        
        # 5. Draw columns A to J at top and bottom
        col_w = 87.2
        cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        for i, col in enumerate(cols):
            cx_col = int(28 + i * col_w + col_w / 2)
            # Top label
            # Get bounding box of text to center it
            bbox = draw.textbbox((0, 0), col, font=font_labels_bold)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((cx_col - tw/2, 14 - th/2 - 2), col, fill=text_dark, font=font_labels_bold)
            
            # Bottom label
            bbox = draw.textbbox((0, 0), col, font=font_labels_bold)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((cx_col - tw/2, 980 - th/2 + 5), col, fill=text_dark, font=font_labels_bold)
            
        # 6. Draw rows 1 to 11 at left (numbers) and right (numbers)
        row_h_0 = 87
        row_h = 85
        rows = [str(r) for r in range(1, 12)]
        for j, row in enumerate(rows):
            if j == 0:
                cy_row = int(28 + row_h_0 / 2)
            else:
                cy_row = int(28 + row_h_0 + (j - 1) * row_h + row_h / 2)
                
            # Left label (dark text on light bg)
            bbox = draw.textbbox((0, 0), row, font=font_labels_bold)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((14 - tw/2, cy_row - th/2 - 2), row, fill=text_dark, font=font_labels_bold)
            
            # Right label (light text on dark bg)
            bbox = draw.textbbox((0, 0), row, font=font_labels_bold)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            # Draw vertically centered on right border x=980 to 1005
            draw.text((992 - tw/2, cy_row - th/2 - 2), row, fill=text_light, font=font_labels_bold)
            
        # 7. Clear and Draw Compass Rose
        # Clear compass rose area: x=785 to 880, y=105 to 195
        draw.rectangle([785, 105, 880, 195], fill=bg_light)
        draw_compass_rose(draw, cx=832, cy=150, font=font_labels_bold)
        
        # Save output
        img.save(filename)
        print(f"Corrected blueprint saved to {filename}")

if __name__ == '__main__':
    main()

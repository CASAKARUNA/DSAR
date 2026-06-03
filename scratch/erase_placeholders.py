from PIL import Image, ImageDraw
import os
import shutil

def get_cell_bounds(col_str, row_num):
    # Columns A-J -> 0-9
    cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    col_idx = cols.index(col_str)
    
    # Rows 1-11 -> 0-10
    row_idx = row_num - 1
    
    col_w = 87.2
    start_x = int(28 + col_idx * col_w)
    end_x = int(28 + (col_idx + 1) * col_w)
    
    row_h_0 = 87
    row_h = 85
    
    if row_idx == 0:
        start_y = 28
        end_y = 28 + row_h_0
    else:
        start_y = 28 + row_h_0 + (row_idx - 1) * row_h
        end_y = start_y + row_h
        
    return start_x, start_y, end_x, end_y

def find_cell_bg_color(img, sx, sy, ex, ey, margin=5):
    # Scan pixels in the cell excluding margins
    color_counts = {}
    for y in range(sy + margin, ey - margin):
        for x in range(sx + margin, ex - margin):
            p = img.getpixel((x, y))
            # Ignore dark line pixels (sum of RGB < 150)
            if sum(p) < 150:
                continue
            color_counts[p] = color_counts.get(p, 0) + 1
            
    if not color_counts:
        # Fallback to general light tan if no light color found
        return (239, 229, 204)
        
    # Find most common color
    most_common = max(color_counts, key=color_counts.get)
    return most_common

def main():
    blueprint_path = 'assets/karuna_house_blueprint.png'
    backup_path = 'assets/karuna_house_blueprint_original.png'
    
    # 1. Restore original first to clear previous black boxes
    if os.path.exists(backup_path):
        shutil.copy(backup_path, blueprint_path)
        print("Restored original blueprint from backup before processing.")
    else:
        shutil.copy(blueprint_path, backup_path)
        print(f"Created backup of original blueprint to {backup_path}")
        
    img = Image.open(blueprint_path)
    draw = ImageDraw.Draw(img)
    
    # List of placeholder cells to clear
    placeholders = [
        ('A', 1), ('H', 8), ('G', 3), ('C', 3), ('E', 8),
        ('I', 6), ('C', 7), ('B', 8), ('E', 9), ('B', 9), ('G', 10)
    ]
    
    margin = 4  # Keep margin to protect grid lines
    
    for col, row in placeholders:
        sx, sy, ex, ey = get_cell_bounds(col, row)
        bg_color = find_cell_bg_color(img, sx, sy, ex, ey, margin)
        
        # Draw a solid rectangle over the center of the cell to clear the plant icon
        draw.rectangle([sx + margin, sy + margin, ex - margin, ey - margin], fill=bg_color)
        print(f"Erased printed plant placeholder in cell {col}{row} with background color {bg_color}")
        
    # Save the modified image
    img.save(blueprint_path)
    print("Modified blueprint with clean cell erasures saved successfully!")

if __name__ == '__main__':
    main()

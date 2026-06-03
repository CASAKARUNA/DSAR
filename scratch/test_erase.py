from PIL import Image
import shutil

shutil.copy('assets/karuna_house_blueprint_original.png', 'assets/karuna_house_blueprint.png')
print("Restored original blueprint.")

img = Image.open('assets/karuna_house_blueprint.png')
cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

def get_cell_bounds(col_str, row_num):
    cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    col_idx = cols.index(col_str)
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


# Analyze E8 cell
sx, sy, ex, ey = get_cell_bounds('E', 8)
colors = {}
for y in range(sy + 5, ey - 5):
    for x in range(sx + 5, ex - 5):
        p = img.getpixel((x, y))
        colors[p] = colors.get(p, 0) + 1

# Sort colors by frequency
sorted_colors = sorted(colors.items(), key=lambda item: item[1], reverse=True)
print("Top 10 colors in E8:")
for c, freq in sorted_colors[:10]:
    print(f"Color: {c}, Freq: {freq}")

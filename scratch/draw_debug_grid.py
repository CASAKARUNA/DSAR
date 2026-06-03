from PIL import Image, ImageDraw

def draw_debug_grid(image_path, output_path):
    img = Image.open(image_path)
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Draw horizontal lines every 50 pixels
    for y in range(0, h, 50):
        draw.line([(0, y), (w, y)], fill='red', width=1)
        draw.text((5, y + 2), str(y), fill='red')
        
    # Draw vertical lines every 50 pixels
    for x in range(0, w, 50):
        draw.line([(x, 0), (x, h)], fill='red', width=1)
        draw.text((x + 2, 5), str(x), fill='red')
        
    img.save(output_path)

if __name__ == '__main__':
    draw_debug_grid('assets/karuna_house_blueprint.png', 'scratch/debug_grid.png')
    print("Debug grid saved to scratch/debug_grid.png")

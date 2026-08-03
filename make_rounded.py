from PIL import Image, ImageDraw

def make_rounded_icon(input_path, output_path):
    # Open the image and ensure it has an alpha channel
    img = Image.open(input_path).convert("RGBA")
    
    # Resize to a square (favicon size, e.g. 256x256)
    size = (256, 256)
    img = img.resize(size, Image.Resampling.LANCZOS)
    
    # Create a mask for the circle
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + size, fill=255)
    
    # Apply the mask
    rounded = Image.new('RGBA', size)
    rounded.paste(img, (0, 0), mask=mask)
    
    # Save the output
    rounded.save(output_path, "PNG")

make_rounded_icon("assets/logo.jpg", "assets/logo.png")
print("Saved rounded icon to assets/logo.png")

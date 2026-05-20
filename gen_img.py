from PIL import Image, ImageDraw, ImageFont
import os

# Crear imagen de producto por defecto (cinta aislante negra)
img = Image.new("RGB", (100, 100), color=(240, 240, 240))
draw = ImageDraw.Draw(img)

# Fondo gris claro
draw.rectangle([0, 0, 99, 99], fill=(240, 240, 240), outline=(180, 180, 180))

# Círculo exterior (cinta)
draw.ellipse([10, 10, 90, 90], fill=(30, 30, 30), outline=(10, 10, 10), width=2)

# Círculo interior (hueco)
draw.ellipse([35, 35, 65, 65], fill=(200, 200, 200), outline=(150, 150, 150), width=1)

# Texto pequeño
draw.text((50, 50), "SKU", fill=(80, 80, 80), anchor="mm")

img.save("/home/ubuntu/recepcion-mercancias/img/product_default.png")
print("Imagen generada correctamente.")

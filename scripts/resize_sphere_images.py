import os
import random
from PIL import Image
from pathlib import Path

def resize_images():
    # Create output directory if it doesn't exist
    output_dir = Path('static/sphere_images')
    output_dir.mkdir(exist_ok=True)
    
    # Get all jpg images from the source directory and its subdirectories
    source_dir = Path('static/images')
    print(f"Looking for images in: {source_dir.absolute()}")
    
    # Recursively find all jpg files
    image_files = []
    for ext in ['*.jpg', '*.jpeg']:
        image_files.extend(list(source_dir.rglob(ext)))
    
    print(f"Found {len(image_files)} images in source directory and subdirectories")
    
    if not image_files:
        print("No images found! Please check if the source directory is correct.")
        return
    
    # Randomly select 200 images
    selected_images = random.sample(image_files, min(200, len(image_files)))
    print(f"\nSelected {len(selected_images)} images for processing")
    
    # Process each image with sequential numbering
    for i, img_path in enumerate(selected_images):
        try:
            # Open and resize image
            with Image.open(img_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize image maintaining aspect ratio
                img.thumbnail((100, 100), Image.Resampling.LANCZOS)
                
                # Save to output directory with sequential numbering
                output_path = output_dir / f"{i}.jpg"
                img.save(output_path, 'JPEG', quality=85)
                
                print(f"Processed: {img_path.name} -> {output_path}")
        except Exception as e:
            print(f"Error processing {img_path.name}: {str(e)}")
    
    print(f"\nProcessing complete. Successfully processed {len(selected_images)} images.")
    print(f"Output directory: {output_dir.absolute()}")

if __name__ == '__main__':
    resize_images() 
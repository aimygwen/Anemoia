#!/usr/bin/env python3
import os
import re

# Paths
LOWPOLY_DIR = './lowpoly'
LOWPOLY_JS_PATH = './lowpoly.js'

def format_title(filename):
    # Strip extension
    name = os.path.splitext(filename)[0]
    # Replace underscores/dashes with spaces
    name = name.replace('_', ' ').replace('-', ' ')
    # Title Case
    return name.title()

def determine_category(filename):
    fn = filename.lower()
    
    # Keyword associations
    weapons = ["sword", "blade", "dagger", "axe", "bow", "hammer", "weapon", "shield"]
    creatures = ["fennec", "creature", "glider", "guardian", "beast", "spirit", "animal", "pet", "wolf", "kitling", "fox", "cub"]
    environments = ["tree", "grove", "island", "path", "sky", "floating", "vault", "birch", "landscape", "dirt", "wood"]
    blocks = ["ore", "crystal", "geode", "block", "spire", "stone", "brick", "mine", "crystal"]

    for w in weapons:
        if w in fn:
            return "weapons"
    for c in creatures:
        if c in fn:
            return "creatures"
    for e in environments:
        if e in fn:
            return "environments"
    for b in blocks:
        if b in fn:
            return "blocks"
            
    return "blocks" # Default fallback

def main():
    if not os.path.exists(LOWPOLY_DIR):
        print(f"Error: Dedicated directory '{LOWPOLY_DIR}' does not exist.")
        return

    # Scan for PNG files
    png_files = [f for f in os.listdir(LOWPOLY_DIR) if f.lower().endswith('.png')]
    # Sort files alphabetically
    png_files.sort()

    if not png_files:
        print(f"No PNG files found in '{LOWPOLY_DIR}'. Please add some assets first.")
        return

    print(f"Found {len(png_files)} asset files in '{LOWPOLY_DIR}'...")

    # Bento grid sizes pattern
    sizes = ["large", "tall", "normal", "wide", "tall", "large", "wide", "normal"]

    # Generate asset entries
    entries = []
    for idx, filename in enumerate(png_files, start=1):
        title = format_title(filename)
        category = determine_category(filename)
        size = sizes[(idx - 1) % len(sizes)]
        image_path = f"lowpoly/{filename}"
        
        # Simple generic descriptions based on category
        if category == "weapons":
            desc = f"A carefully modeled low-poly {title.lower()} featuring vibrant voxel accents."
        elif category == "creatures":
            desc = f"A friendly low-poly voxel {title.lower()} designed with game-ready rigging structure."
        elif category == "environments":
            desc = f"A picturesque sky-island environmental piece showcasing organic birch voxel styling."
        else:
            desc = f"A highly detailed {title.lower()} voxel block cluster ready for subterranean harvesting."

        entry = f"""        {{ 
            id: {idx}, 
            title: "{title}", 
            category: "{category}", 
            image: "{image_path}", 
            size: "{size}", 
            desc: "{desc}" 
        }}"""
        entries.append(entry)

    # Format the replacement array code
    new_array_content = "    const hytaleAssets = [\n" + ",\n".join(entries) + "\n    ];"

    # Read the current lowpoly.js content
    if not os.path.exists(LOWPOLY_JS_PATH):
        print(f"Error: '{LOWPOLY_JS_PATH}' not found.")
        return

    with open(LOWPOLY_JS_PATH, 'r', encoding='utf-8') as file:
        js_content = file.read()

    # Locate and replace the hytaleAssets array block
    pattern = r'const hytaleAssets\s*=\s*\[[\s\S]*?\];'
    if not re.search(pattern, js_content):
        print("Error: Could not locate the 'const hytaleAssets = [...];' declaration in lowpoly.js.")
        return

    updated_js_content = re.sub(pattern, new_array_content, js_content)

    # Write the updated content back to lowpoly.js
    with open(LOWPOLY_JS_PATH, 'w', encoding='utf-8') as file:
        file.write(updated_js_content)

    print(f"Success! lowpoly.js has been dynamically updated with all {len(png_files)} items.")

if __name__ == '__main__':
    main()

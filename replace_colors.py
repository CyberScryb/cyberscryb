import os
import re

# Directory to modify
target_dir = r"C:\claude\cyberscryb\content-site"

# Replacement pairs (case-insensitive for hex)
hex_replacements = [
    # Accent (#7c3aed) -> Volt Green (#ccff00)
    (r"#7[cC]3[aA][eE][dD]\b", "#ccff00"),
    (r"7[cC]3[aA][eE][dD]\b", "ccff00"),
    
    # Mid-Purple (#8b5cf6) -> Volt Mid-Lime (#a3e635)
    (r"#8[bB]5[cC][fF]6\b", "#a3e635"),
    (r"8[bB]5[cC][fF]6\b", "a3e635"),
    
    # Light-Purple (#a78bfa) -> Light Lime-Green (#d8ff33)
    (r"#[aA]78[bB][fF][aA]\b", "#d8ff33"),
    (r"[aA]78[bB][fF][aA]\b", "d8ff33"),
    
    # Dark Purple (#4c1d95) -> Dark Olive/Shadow (#3a4a00)
    (r"#4[cC]1[dD]95\b", "#3a4a00"),
    (r"4[cC]1[dD]95\b", "3a4a00"),
    
    # Purple-600/700 (#6d28d9) -> Olive-600 (#4f6300)
    (r"#6[dD]28[dD]9\b", "#4f6300"),
    (r"6[dD]28[dD]9\b", "4f6300"),
    
    # Purple-900 (#581c87) -> Darker Shadow (#202800)
    (r"#581[cC]87\b", "#202800"),
    (r"581[cC]87\b", "202800"),
]

rgba_replacements = [
    # 124, 58, 237 -> 204, 255, 0 (accent)
    (r"124,\s*58,\s*237", "204, 255, 0"),
    # 139, 92, 246 -> 163, 230, 53 (mid-lime)
    (r"139,\s*92,\s*246", "163, 230, 53"),
    # 167, 139, 250 -> 216, 255, 51 (light-lime)
    (r"167,\s*139,\s*250", "216, 255, 51"),
    # 76, 29, 149 -> 58, 74, 0 (dark)
    (r"76,\s*29,\s*149", "58, 74, 0"),
]

# Compile patterns
patterns = []
for pat, rep in hex_replacements:
    patterns.append((re.compile(pat), rep))
for pat, rep in rgba_replacements:
    patterns.append((re.compile(pat), rep))

extensions = ['.html', '.css', '.js', '.svg', '.json']

modified_count = 0
replacement_count = 0

for root, dirs, files in os.walk(target_dir):
    # Skip dot directories and node_modules
    dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
    
    for file in files:
        if not any(file.endswith(ext) for ext in extensions):
            continue
            
        file_path = os.path.join(root, file)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                continue
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            continue

        new_content = content
        file_replacements = 0
        
        for pattern, replacement in patterns:
            matches = len(pattern.findall(new_content))
            if matches > 0:
                new_content = pattern.sub(replacement, new_content)
                file_replacements += matches
                
        if file_replacements > 0:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}: replaced {file_replacements} occurrences")
                modified_count += 1
                replacement_count += file_replacements
            except Exception as e:
                print(f"Error writing {file_path}: {e}")

print(f"\nDone! Modified {modified_count} files, total replacements: {replacement_count}")

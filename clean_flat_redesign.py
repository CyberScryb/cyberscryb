import os
import re

# Target directories to modify
target_dirs = [
    r"C:\claude\cyberscryb\content-site",
]

replacements = [
    # Volt Green hex replacements (#ccff00) -> Electric Cobalt Blue (#0066ff)
    (r"#ccff00\b", "#0066ff"),
    (r"ccff00\b", "0066ff"),
    (r"#ccff00", "#0066ff"),
    
    # Mid-Lime (#a3e635) -> Bright Ice Blue (#3b82f6)
    (r"#a3e635\b", "#3b82f6"),
    (r"a3e635\b", "3b82f6"),
    
    # Light Lime (#d8ff33) -> Muted Blue (#60a5fa)
    (r"#d8ff33\b", "#60a5fa"),
    (r"d8ff33\b", "60a5fa"),
    
    # Dark Olive/Shadow (#3a4a00) -> Dark Cobalt Shadow (#1e3a8a)
    (r"#3a4a00\b", "#1e3a8a"),
    (r"3a4a00\b", "1e3a8a"),
    
    # Olive-600 (#4f6300) -> Darker Blue (#1e40af)
    (r"#4f6300\b", "#1e40af"),
    (r"4f6300\b", "1e40af"),
    
    # Darker Shadow (#202800) -> Near Black Blue (#0f172a)
    (r"#202800\b", "#0f172a"),
    (r"202800\b", "0f172a"),

    # Cyberpunk Cyan (#00d4ff / #00f0ff) -> Clean Blue (#0066ff)
    (r"#00d4ff\b", "#0066ff"),
    (r"00d4ff\b", "0066ff"),
    (r"#00f0ff\b", "#0066ff"),
    (r"00f0ff\b", "0066ff"),

    # RGB/RGBA Replacements
    (r"204,\s*255,\s*0", "0, 102, 255"),       # Volt -> Cobalt
    (r"0,\s*212,\s*255", "30, 64, 175"),      # Cyan -> Dark blue
    (r"163,\s*230,\s*53", "59, 130, 246"),    # Mid-lime -> Blue
    (r"58,\s*74,\s*0", "30, 58, 138"),        # Olive -> Navy
    (r"0,\s*240,\s*255", "0, 102, 255"),      # Cyan -> Cobalt
]

# Compile primary patterns
compiled_replacements = [(re.compile(p, re.IGNORECASE), r) for p, r in replacements]

# Sweeping linear-gradient replacements to clean flat colors
# Format: (pattern, replacement)
gradient_replacements = [
    (re.compile(r"linear-gradient\(135deg,\s*#ccff00,\s*#00d4ff\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(135deg,\s*#00d4ff,\s*#ccff00\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(135deg,\s*#d8ff33,\s*#00f0ff\)", re.IGNORECASE), "#3b82f6"),
    (re.compile(r"linear-gradient\(135deg,\s*#ccff00,\s*#00ff88\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(90deg,\s*#ccff00,\s*#00ff88\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(135deg,\s*#d8ff33,\s*#ccff00\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(135deg,\s*#ccff00,\s*#e63939\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(135deg,\s*rgba\(204,\s*255,\s*0,\s*0\.08\),\s*rgba\(0,\s*212,\s*255,\s*0\.08\)\)", re.IGNORECASE), "rgba(0, 102, 255, 0.08)"),
    (re.compile(r"linear-gradient\(135deg,\s*rgba\(204,\s*255,\s*0,\s*0\.06\),\s*rgba\(10,\s*10,\s*10,\s*0\.95\)\)", re.IGNORECASE), "#18181b"),
    (re.compile(r"linear-gradient\(90deg,\s*transparent,\s*#ccff00,\s*#3a4a00,\s*transparent\)", re.IGNORECASE), "#0066ff"),
    (re.compile(r"linear-gradient\(145deg,\s*#111111,\s*#0a0a0a\)", re.IGNORECASE), "#18181b"),
    (re.compile(r"linear-gradient\(145deg,\s*#1a1a1a,\s*#0f0f0f\)", re.IGNORECASE), "#18181b"),
    (re.compile(r"linear-gradient\(135deg,\s*#ccff00,\s*#00ffc4\)", re.IGNORECASE), "#0066ff"),
]

extensions = ['.html', '.css', '.js', '.svg', '.json']

modified_count = 0
replacement_count = 0

for target_dir in target_dirs:
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
            
            # Run gradient cleaner first
            for pattern, replacement in gradient_replacements:
                matches = len(pattern.findall(new_content))
                if matches > 0:
                    new_content = pattern.sub(replacement, new_content)
                    file_replacements += matches
            
            # Run primary color replacements
            for pattern, replacement in compiled_replacements:
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

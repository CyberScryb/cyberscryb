import os
import shutil
import subprocess
import sys

def safe_print(text):
    if not text:
        return
    encoding = sys.stdout.encoding or 'utf-8'
    try:
        print(text.encode(encoding, errors='replace').decode(encoding))
    except Exception:
        print(text.encode('ascii', errors='replace').decode('ascii'))

def sync_directories(src_dir, dst_dir):
    if not os.path.exists(dst_dir):
        os.makedirs(dst_dir)
        
    for item in os.listdir(src_dir):
        s = os.path.join(src_dir, item)
        d = os.path.join(dst_dir, item)
        if os.path.isdir(s):
            # Skip hidden/dot directories
            if item.startswith('.'):
                continue
            sync_directories(s, d)
        else:
            # Overwrite or copy if size/mtime differs
            if not os.path.exists(d) or os.path.getsize(s) != os.path.getsize(d) or os.path.getmtime(s) > os.path.getmtime(d):
                os.makedirs(os.path.dirname(d), exist_ok=True)
                shutil.copy2(s, d)
                print(f"Copied: {os.path.relpath(d, dst_dir)}")

def run_build():
    root = r"C:\claude\cyberscryb"
    src_dir = os.path.join(root, "content-site")
    dst_dir = os.path.join(root, "public")
    
    print("Step 1: Syncing content-site to public...")
    sync_directories(src_dir, dst_dir)
    
    print("\nStep 2: Generating pages via node generate-pages.js...")
    res = subprocess.run(["node", "generate-pages.js"], cwd=root, capture_output=True, text=True, encoding="utf-8")
    safe_print(res.stdout)
    if res.stderr:
        print("Generator warnings/errors:")
        safe_print(res.stderr)
        
    print("\nStep 3: Bumping version cache buster...")
    # Import bump_version inline or run it directly
    from bump_version import bump_version
    bump_version()
    
    print("\nBuild and Sync completed successfully!")

if __name__ == "__main__":
    run_build()

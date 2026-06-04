import os
import shutil

src_dir = r"C:\claude\cyberscryb\public"
dst_dir = r"C:\claude\cyberscryb\content-site"

def sync_recursive(src, dst):
    if not os.path.exists(dst):
        os.makedirs(dst)
    
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            sync_recursive(s, d)
        else:
            # Copy if doesn't exist, or size/mtime differs
            if not os.path.exists(d) or os.path.getsize(s) != os.path.getsize(d):
                shutil.copy2(s, d)
                print(f"Synced: {os.path.relpath(d, dst_dir)}")

print("Starting full sync from public/ to content-site/ ...")
sync_recursive(src_dir, dst_dir)
print("Full sync complete!")

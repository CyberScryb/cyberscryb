import os

def bump_version():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    target_folders = ["content-site", "public"]
    old_version = "20260531"
    new_version = "20260604"
    
    count = 0
    for folder in target_folders:
        path = os.path.join(root_dir, folder)
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith(('.html', '.js', '.css', '.json')):
                    file_path = os.path.join(root, file)
                    try:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                        except UnicodeDecodeError:
                            with open(file_path, 'r', encoding='latin-1') as f:
                                content = f.read()
                        
                        if old_version in content:
                            new_content = content.replace(old_version, new_version)
                            # Always write back using utf-8
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            print(f"Bumped version in: {file_path}")
                            count += 1
                    except Exception as e:
                        print(f"Error reading/writing {file_path}: {e}")
                        
    print(f"Completed! Bumped version query strings in {count} files.")

if __name__ == "__main__":
    bump_version()

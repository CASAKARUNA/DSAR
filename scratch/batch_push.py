import os
import subprocess
import sys

def get_untracked_and_modified_files():
    # Run git status to find files that need staging
    # Staged changes are empty right now. We want to find untracked files and modified files.
    result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
    files = []
    for line in result.stdout.splitlines():
        if line.strip():
            # Line format is 'XY path' or 'XY "path"'
            path = line[3:].strip().strip('"')
            # Check if it is a directory (has trailing slash in git output) or a file.
            # If it's a directory, walk and get all files inside.
            if os.path.isdir(path):
                for root, dirs, filenames in os.walk(path):
                    for filename in filenames:
                        files.append(os.path.join(root, filename))
            else:
                files.append(path)
    # Filter files that are in gitignore or in .git or are .DS_Store
    valid_files = []
    for f in files:
        if '.git' in f or '.DS_Store' in f:
            continue
        valid_files.append(f)
    return sorted(list(set(valid_files)))

def batch_push():
    files = get_untracked_and_modified_files()
    if not files:
        print("No files to commit and push.")
        return

    print(f"Found {len(files)} files to push.")
    batch_size = 15
    batches = [files[i:i + batch_size] for i in range(0, len(files), batch_size)]

    for idx, batch in enumerate(batches):
        print(f"\nProcessing batch {idx + 1}/{len(batches)} (contains {len(batch)} files)...")
        # Add files in batch
        subprocess.run(['git', 'add'] + batch, check=True)
        
        # Commit
        commit_msg = f"chore: upload assets batch {idx + 1} of {len(batches)}"
        subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
        
        # Push
        print(f"Pushing batch {idx + 1}...")
        push_res = subprocess.run(['git', 'push', 'origin', 'master'], capture_output=True, text=True)
        if push_res.returncode != 0:
            print(f"Error pushing batch {idx + 1}:")
            print(push_res.stderr)
            sys.exit(1)
        else:
            print(f"Batch {idx + 1} pushed successfully!")

if __name__ == '__main__':
    batch_push()

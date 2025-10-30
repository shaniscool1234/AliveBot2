import os
import subprocess

current_path = os.getcwd()
print(f"Current path: {current_path}")

file_name = "current_path.txt"
with open(file_name, "w") as f:
    f.write(current_path)

# Replace this path with wherever git.exe is installed on your system
git_path = r"C:\Program Files\Git\bin\git.exe"

try:
    subprocess.run([git_path, "add", file_name], check=True)
    subprocess.run([git_path, "commit", "-m", "Add current path info"], check=True)
    subprocess.run([git_path, "push"], check=True)
    print("Path info pushed to GitHub successfully!")
except subprocess.CalledProcessError as e:
    print(f"Git error: {e}")

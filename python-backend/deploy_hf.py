import sys
import os
from huggingface_hub import HfApi, whoami

def deploy(token: str, space_name: str = "minitool-bridge"):
    api = HfApi(token=token)
    try:
        user_info = whoami(token=token)
        username = user_info["name"]
        print(f"Logged in as: {username}")
    except Exception as e:
        print(f"Invalid token: {e}")
        return False

    repo_id = f"{username}/{space_name}"
    print(f"Creating / connecting to Space: {repo_id} (Docker SDK)...")
    
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True,
            private=False
        )
        print(f"Space {repo_id} ready!")
    except Exception as e:
        print(f"Error creating space: {e}")
        return False

    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Uploading files from {current_dir} to {repo_id}...")
    
    try:
        api.upload_folder(
            folder_path=current_dir,
            repo_id=repo_id,
            repo_type="space",
            ignore_patterns=["*.bat", "*.tmp", "__pycache__", "deploy_hf.py"]
        )
        print(f"\n=======================================================")
        print(f"DEPLOYMENT SUCCESSFUL!")
        print(f"Space URL: https://huggingface.co/spaces/{repo_id}")
        print(f"Live API URL: https://{username}-{space_name}.hf.space/v1/chat/completions")
        print(f"=======================================================")
        return True
    except Exception as e:
        print(f"Upload error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: py deploy_hf.py <HF_WRITE_TOKEN> [space_name]")
        sys.exit(1)
    token = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "minitool-bridge"
    deploy(token, name)

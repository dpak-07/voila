import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

def test_bedrock_mantle():
    env_path = Path(__file__).resolve().parent / '.env'
    load_dotenv(env_path)
    
    token = os.getenv("AWS_BEARER_TOKEN_BEDROCK")
    region = "ap-south-1"
    
    print(f"Token present: {bool(token)}")
    
    url = f"https://bedrock-mantle.{region}.api.aws/v1/chat/completions"
    model = "google.gemma-3-4b-it"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "can you do the agentig and gen ai stuff and are you capable to do it?"}
        ],
        "max_tokens": 50
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success! Response:")
            result = response.json()
            print(result["choices"][0]["message"]["content"])
        else:
            print(f"Failed response text: {response.text}")
    except Exception as e:
        print(f"Error calling endpoint: {e}")

if __name__ == "__main__":
    test_bedrock_mantle()

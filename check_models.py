import requests
import os
from dotenv import load_dotenv

# Load the API key from your .env file
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

url = "https://api.groq.com/openai/v1/models"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print("Fetching active models for your API key...\n")
response = requests.get(url, headers=headers)

# Print only the model IDs you actually have access to
if response.status_code == 200:
    for model in response.json().get("data", []):
        print(f"✅ {model['id']}")
else:
    print(f"Error fetching models: {response.text}")
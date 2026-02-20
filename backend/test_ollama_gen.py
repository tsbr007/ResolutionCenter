import asyncio
import httpx
import json

async def test_generation():
    url = "http://127.0.0.1:11434/api/generate"
    print(f"Testing generation at {url}...")
    
    prompt = "Why is the sky blue?"
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            print("Sending request...")
            response = await client.post(url, json=payload)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("Response received successfully")
                print(str(response.json())[:200] + "...")
            else:
                print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_generation())

import asyncio
import httpx

async def test_connection():
    url = "http://127.0.0.1:11434/api/tags"
    print(f"Testing connection to {url}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())

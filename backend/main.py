import json
import os
import glob
import asyncio
import subprocess
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid
import httpx

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load configuration
def load_config():
    config = {}
    try:
        # Try to find app.properties in parent directory
        prop_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.properties')
        with open(prop_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    config[key.strip()] = value.strip()
    except FileNotFoundError:
        pass
    
    # Defaults
    if "data.file.path" not in config: config["data.file.path"] = "backend/data.json"
    if "todo.storage.path" not in config: config["todo.storage.path"] = "backend/todo.json"
    if "todo.masterlist.path" not in config: config["todo.masterlist.path"] = "backend/masterlist.txt"
    if "notes.storage.path" not in config: config["notes.storage.path"] = "backend/notes"
    if "search.root.path" not in config: config["search.root.path"] = "backend"
    if "frequent.items.path" not in config: config["frequent.items.path"] = "backend/frequent_items.txt"
    if "templates.path" not in config: config["templates.path"] = "backend/templates"
    if "diary.storage.path" not in config: config["diary.storage.path"] = "backend/diary"

    # Ollama defaults (non-path values — no path resolution needed)
    if "ollama.host" not in config: config["ollama.host"] = "127.0.0.1"
    if "ollama.port" not in config: config["ollama.port"] = "11434"
    if "ollama.model" not in config: config["ollama.model"] = "llama3.2"
    if "ollama.startup.timeout" not in config: config["ollama.startup.timeout"] = "20"
    if "ollama.request.timeout" not in config: config["ollama.request.timeout"] = "120"
    if "ollama.health.timeout" not in config: config["ollama.health.timeout"] = "3"
    
    # Resolve relative paths relative to the project root (parent of backend)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for key in ["data.file.path", "todo.storage.path", "todo.masterlist.path", "notes.storage.path", "search.root.path", "frequent.items.path", "templates.path", "diary.storage.path"]:
        if not os.path.isabs(config[key]):
            config[key] = os.path.join(project_root, config[key])
            
    return config

config = load_config()

# Ensure directories exist
os.makedirs(os.path.dirname(config["data.file.path"]), exist_ok=True)
os.makedirs(os.path.dirname(config["todo.storage.path"]), exist_ok=True)
os.makedirs(config["notes.storage.path"], exist_ok=True)
os.makedirs(config["diary.storage.path"], exist_ok=True)

# Models
class Entry(BaseModel):
    id: Optional[str] = None
    problem: str
    solution: str
    app_name: str
    created_by: Optional[str] = None
    last_updated_by: Optional[str] = None
    creation_date: Optional[str] = None
    last_update_date: Optional[str] = None

class TodoItem(BaseModel):
    id: str
    context: str
    task: str
    duration: str # e.g., "1h 30m"
    completed: bool = False

class TodoList(BaseModel):
    current_day: List[TodoItem]
    next_day: List[TodoItem]
    pending: List[TodoItem]

class Note(BaseModel):
    title: str
    content: str

class DiaryEntry(BaseModel):
    date: str # YYYY-MM-DD
    content: str

class LogAnalysisRequest(BaseModel):
    log_content: str
    model: Optional[str] = None  # None = use value from app.properties

class LogAnalysisResponse(BaseModel):
    explanation: str
    solution: str

# Type alias for the multi-app structure
MultiAppTodos = dict[str, TodoList]

# --- Todo Endpoints ---

@app.get("/api/todos", response_model=MultiAppTodos)
async def get_todos():
    try:
        with open(config["todo.storage.path"], "r") as f:
            data = json.load(f)
            
        # Migration Logic: Check if it's the old format (flat dictionary with keys current_day etc.)
        if "current_day" in data and isinstance(data["current_day"], list):
            # Old format detected. Migrate to app1.
            migrated_data = {
                "app1": data,
                "app2": {"current_day": [], "next_day": [], "pending": []},
                "app3": {"current_day": [], "next_day": [], "pending": []}
            }
            # Save the migrated structure immediately
            with open(config["todo.storage.path"], "w") as f:
                json.dump(migrated_data, f, indent=4)
            return migrated_data
            
        # Ensure all apps exist
        defaults = {"current_day": [], "next_day": [], "pending": []}
        for app_name in ["app1", "app2", "app3"]:
            if app_name not in data:
                data[app_name] = defaults.copy()
                
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default structure if file not found
        return {
            "app1": {"current_day": [], "next_day": [], "pending": []},
            "app2": {"current_day": [], "next_day": [], "pending": []},
            "app3": {"current_day": [], "next_day": [], "pending": []}
        }

@app.post("/api/todos")
async def save_todos(todos: MultiAppTodos):
    try:
        # Convert models to dict for saving
        data_to_save = {k: v.dict() for k, v in todos.items()}
        with open(config["todo.storage.path"], "w") as f:
            json.dump(data_to_save, f, indent=4)
        return {"message": "Todos saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/todos/masterlist")
async def get_masterlist():
    try:
        with open(config["todo.masterlist.path"], "r") as f:
            lines = f.readlines()
        return [line.strip() for line in lines if line.strip()]
    except FileNotFoundError:
        return []

# --- Notes Endpoints ---

@app.post("/api/notes")
async def save_note(note: Note):
    try:
        filename = f"{note.title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
        filepath = os.path.join(config["notes.storage.path"], filename)
        
        with open(filepath, "w") as f:
            f.write(note.content)
            
        return {"message": "Note saved successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notes/recent")
async def get_recent_notes():
    try:
        notes_path = config["notes.storage.path"]
        recent_notes = []
        
        # Calculate date 30 days ago
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        if os.path.exists(notes_path):
            for filename in os.listdir(notes_path):
                if filename.endswith(".txt"):
                    filepath = os.path.join(notes_path, filename)
                    
                    # Get file modification time
                    mtime = os.path.getmtime(filepath)
                    mod_date = datetime.fromtimestamp(mtime)
                    
                    if mod_date >= thirty_days_ago:
                        try:
                            with open(filepath, "r", encoding="utf-8") as f:
                                content = f.read()
                                
                            # Extract title from filename (simple heuristic based on save format)
                            # Format: Title_YYYYMMDDHHMMSS.txt
                            # We can also just use the first line or the filename part before the last underscore
                            
                            # Attempt to parse title from filename
                            title_part = filename.rsplit('_', 1)[0]
                            title = title_part.replace('_', ' ')
                            
                            recent_notes.append({
                                "filename": filename,
                                "title": title,
                                "content": content,
                                "date": mod_date.isoformat()
                            })
                        except Exception:
                            continue # Skip unreadable files
                            
        # Sort by date descending
        recent_notes.sort(key=lambda x: x["date"], reverse=True)
        return recent_notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notes/search")
async def search_notes(q: str = Query(..., min_length=1)):
    try:
        results = []
        notes_path = config["notes.storage.path"]
        
        if not os.path.exists(notes_path):
            return []
            
        for filename in os.listdir(notes_path):
            if filename.endswith(".txt"):
                filepath = os.path.join(notes_path, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Extract title from filename
                    title_part = filename.rsplit('_', 1)[0]
                    title = title_part.replace('_', ' ')
                    
                    # Case-insensitive search in title or content
                    if q.lower() in title.lower() or q.lower() in content.lower():
                        # Create snippet from content
                        idx = content.lower().find(q.lower())
                        if idx == -1: # Match was in title
                            snippet = content[:100].replace("\n", " ") + "..."
                        else:
                            start = max(0, idx - 40)
                            end = min(len(content), idx + 40 + len(q))
                            snippet = "..." + content[start:end].replace("\n", " ") + "..."
                        
                        results.append({
                            "filename": filename,
                            "title": title,
                            "content": content,
                            "snippet": snippet
                        })
                except Exception:
                    continue

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Search Endpoints ---

@app.get("/api/search")
async def search(q: str = Query(..., min_length=1), folder_path: Optional[str] = Query(None), recursive: bool = Query(True)):
    results = []
    root_path = folder_path if folder_path and os.path.isdir(folder_path) else config["search.root.path"]
    
    try:
        # Determine iterator based on recursive flag
        if recursive:
            iterator = os.walk(root_path)
        else:
            # Only top level files
            try:
                files = [f for f in os.listdir(root_path) if os.path.isfile(os.path.join(root_path, f))]
                iterator = [(root_path, [], files)]
            except Exception:
                iterator = []

        # Walk through the directory
        for root, dirs, files in iterator:
            for file in files:
                if file.endswith((".json", ".txt", ".md", ".py", ".js", ".css", ".html")):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            
                        # Check filename
                        if q.lower() in file.lower():
                            results.append({
                                "file": file,
                                "path": filepath,
                                "match_type": "filename",
                                "snippet": ""
                            })
                            
                        # Check content
                        if q.lower() in content.lower():
                            # Find snippet
                            idx = content.lower().find(q.lower())
                            start = max(0, idx - 50)
                            end = min(len(content), idx + 50 + len(q))
                            snippet = "..." + content[start:end].replace("\n", " ") + "..."
                            
                            results.append({
                                "file": file,
                                "path": filepath,
                                "match_type": "content",
                                "snippet": snippet
                            })
                    except Exception:
                        continue # Skip unreadable files
                        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/browse")
async def browse_folders(path: Optional[str] = Query(None)):
    try:
        # Determine start path
        if path:
            start_path = path
        else:
            start_path = config["search.root.path"]
            
        # Validate path
        if not os.path.exists(start_path):
            # If provided path doesn't exist, try config default, else cwd
            start_path = config["search.root.path"]
            if not os.path.exists(start_path):
                start_path = os.getcwd()
        
        if not os.path.isdir(start_path):
             start_path = os.path.dirname(start_path)

        start_path = os.path.abspath(start_path)
        
        items = []
        try:
            with os.scandir(start_path) as it:
                for entry in it:
                    if entry.is_dir() and not entry.name.startswith('.'):
                        items.append(entry.name)
        except PermissionError:
            pass 
            
        items.sort()
        
        parent = os.path.dirname(start_path)
        # Check if we are at root
        if parent == start_path:
            parent = None
        
        return {
            "current_path": start_path,
            "parent_path": parent,
            "folders": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/frequent")
async def get_frequent_items():
    try:
        with open(config["frequent.items.path"], "r") as f:
            lines = f.readlines()
        return [line.strip() for line in lines if line.strip()]
    except FileNotFoundError:
        return []

@app.get("/api/templates")
async def get_templates():
    templates = []
    templates_path = config["templates.path"]
    
    if not os.path.exists(templates_path):
        return []
        
    try:
        for filename in os.listdir(templates_path):
            if filename.endswith(".md"):
                filepath = os.path.join(templates_path, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Create a friendly name from filename
                # e.g., "commit_checklist.md" -> "Commit Checklist"
                name = filename.replace(".md", "").replace("_", " ").title()
                
                templates.append({
                    "name": name,
                    "content": content
                })
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Work Diary Endpoints ---

@app.get("/api/diary/{date}")
async def get_diary_entry(date: str):
    try:
        # Validate date format roughly
        datetime.strptime(date, "%Y-%m-%d")
        
        # Extract YYYY-MM for subfolder
        year_month = date[:7]
        
        filename = f"{date}.txt"
        filepath = os.path.join(config["diary.storage.path"], year_month, filename)
        
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            return {"date": date, "content": content}
        else:
            return {"date": date, "content": ""}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/diary")
async def save_diary_entry(entry: DiaryEntry):
    try:
        # Validate date format roughly
        datetime.strptime(entry.date, "%Y-%m-%d")
        
        # Extract YYYY-MM for subfolder
        year_month = entry.date[:7]
        
        folder_path = os.path.join(config["diary.storage.path"], year_month)
        os.makedirs(folder_path, exist_ok=True)
        
        filename = f"{entry.date}.txt"
        filepath = os.path.join(folder_path, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(entry.content)
            
        return {"message": "Diary entry saved successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diary/month/{year_month}")
async def get_diary_month_entries(year_month: str):
    try:
        # Validate format YYYY-MM
        datetime.strptime(year_month, "%Y-%m")
        
        folder_path = os.path.join(config["diary.storage.path"], year_month)
        
        entries = []
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                if filename.endswith(".txt"):
                    # filename is YYYY-MM-DD.txt
                    date_str = filename.replace(".txt", "")
                    filepath = os.path.join(folder_path, filename)
                    
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                            
                        # Create preview (first 50 words)
                        words = content.split()
                        preview = " ".join(words[:50])
                        if len(words) > 50:
                            preview += "..."
                            
                        entries.append({
                            "date": date_str,
                            "preview": preview
                        })
                    except Exception:
                        # If read fails, still return date but empty preview
                        entries.append({
                            "date": date_str,
                            "preview": ""
                        })
        
        return entries
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid format. Use YYYY-MM")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diary-search")
async def search_diary(q: str = Query(..., min_length=1)):
    try:
        results = []
        diary_path = os.path.abspath(config["diary.storage.path"])
        
        if not os.path.exists(diary_path):
            return []
            
        # Walk through all year-month folders
        for root, dirs, files in os.walk(diary_path):
            for filename in files:
                if filename.endswith(".txt"):
                    filepath = os.path.join(root, filename)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        # Case-insensitive search
                        if q.lower() in content.lower():
                            # Extract date from filename (YYYY-MM-DD.txt)
                            date_str = filename.replace(".txt", "")
                            
                            # Create snippet
                            try:
                                idx = content.lower().find(q.lower())
                                if idx == -1:
                                    snippet = content[:50] + "..."
                                else:
                                    start = max(0, idx - 40)
                                    end = min(len(content), idx + 40 + len(q))
                                    snippet = "..." + content[start:end].replace("\n", " ") + "..."
                            except Exception:
                                snippet = "Match found"
                            
                            results.append({
                                "date": date_str,
                                "snippet": snippet
                            })
                    except Exception:
                        continue
        
        # Sort results by date descending
        results.sort(key=lambda x: x["date"], reverse=True)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ollama Integration ---

OLLAMA_URL = None  # Resolved from config at request time

async def _is_ollama_running() -> bool:
    """Return True if Ollama is already listening."""
    host = config.get("ollama.host", "127.0.0.1")
    port = config.get("ollama.port", "11434")
    url = f"http://{host}:{port}"
    health_timeout = float(config.get("ollama.health.timeout", "3"))
    try:
        async with httpx.AsyncClient(timeout=health_timeout) as client:
            r = await client.get(f"{url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False

async def _wait_for_ollama(timeout: int = None) -> bool:
    """Poll until Ollama is ready, or timeout expires."""
    if timeout is None:
        timeout = int(config.get("ollama.startup.timeout", "20"))
    for _ in range(timeout):
        if await _is_ollama_running():
            return True
        await asyncio.sleep(1)
    return False

@app.post("/api/analyze-logs", response_model=LogAnalysisResponse)
async def analyze_logs(request: LogAnalysisRequest):
    ollama_process = None
    host = config.get("ollama.host", "127.0.0.1")
    port = config.get("ollama.port", "11434")
    ollama_url = f"http://{host}:{port}"
    model = request.model or config.get("ollama.model", "llama3.2")
    request_timeout = float(config.get("ollama.request.timeout", "120"))
    startup_timeout = int(config.get("ollama.startup.timeout", "20"))
    try:
        # --- 1. Check if Ollama is running; start it if not ---
        already_running = await _is_ollama_running()
        if not already_running:
            try:
                ollama_process = subprocess.Popen(
                    ["ollama", "serve"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except FileNotFoundError:
                raise HTTPException(
                    status_code=500,
                    detail="Ollama is not installed or not on PATH. Please install Ollama."
                )

            ready = await _wait_for_ollama(timeout=startup_timeout)
            if not ready:
                if ollama_process:
                    ollama_process.terminate()
                raise HTTPException(
                    status_code=500,
                    detail="Ollama server did not start in time. Please start it manually."
                )

        # --- 2. Build prompt and call Ollama ---
        prompt = f"""
You are an expert software engineer. Analyze the following log trace/error message and provide:
1. A clear explanation of what went wrong.
2. A stepwise solution to fix it.

Format your response exactly as follows, with no other text:

EXPLANATION:
<explanation text here>

SOLUTION:
<solution text here>

Log Content:
{request.log_content}
"""

        async with httpx.AsyncClient(timeout=request_timeout) as client:
            response = await client.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Ollama API error: {response.text}"
                )

            result = response.json()
            generated_text = result.get("response", "")

        # --- 3. Parse EXPLANATION / SOLUTION sections ---
        explanation = ""
        solution = ""

        if "EXPLANATION:" in generated_text:
            parts = generated_text.split("EXPLANATION:")
            if len(parts) > 1:
                remaining = parts[1]
                if "SOLUTION:" in remaining:
                    explanation_part, solution_part = remaining.split("SOLUTION:", 1)
                    explanation = explanation_part.strip()
                    solution = solution_part.strip()
                else:
                    explanation = remaining.strip()

        if not explanation and not solution:
            explanation = "Could not parse explanation from model response."
            solution = generated_text

        return LogAnalysisResponse(explanation=explanation, solution=solution)

    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Ollama: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # --- 4. Shut down Ollama only if WE started it ---
        if ollama_process is not None:
            ollama_process.terminate()
            try:
                ollama_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                ollama_process.kill()

if __name__ == "__main__":
    import uvicorn
    # Read port from app.properties again for main execution
    port = 8000
    try:
        prop_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.properties')
        with open(prop_path, "r") as f:
            for line in f:
                if "BACKEND_PORT" in line:
                    port = int(line.split("=")[1].strip())
    except:
        pass
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

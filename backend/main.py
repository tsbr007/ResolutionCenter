import json
import os
import glob
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

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

# --- Problem Solver Endpoints ---

@app.get("/api/entries", response_model=List[Entry])
async def get_entries():
    try:
        with open(config["data.file.path"], "r") as f:
            data = json.load(f)
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return []

@app.post("/api/entries")
async def create_entry(entry: Entry):
    try:
        try:
            with open(config["data.file.path"], "r") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
        
        entry.id = str(uuid.uuid4())
        entry.creation_date = datetime.now().isoformat()
        entry.last_update_date = entry.creation_date
        
        data.append(entry.dict())
        
        with open(config["data.file.path"], "w") as f:
            json.dump(data, f, indent=4)
            
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/entries/{entry_id}")
async def update_entry(entry_id: str, entry_update: Entry):
    try:
        with open(config["data.file.path"], "r") as f:
            data = json.load(f)
            
        for i, entry in enumerate(data):
            if entry["id"] == entry_id:
                updated_entry = entry.copy()
                updated_entry.update(entry_update.dict(exclude_unset=True))
                updated_entry["last_update_date"] = datetime.now().isoformat()
                # Preserve original creation data if not provided
                if not entry_update.created_by:
                    updated_entry["created_by"] = entry["created_by"]
                if not entry_update.creation_date:
                    updated_entry["creation_date"] = entry["creation_date"]
                
                data[i] = updated_entry
                
                with open(config["data.file.path"], "w") as f:
                    json.dump(data, f, indent=4)
                return updated_entry
                
        raise HTTPException(status_code=404, detail="Entry not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Todo Endpoints ---

@app.get("/api/todos", response_model=TodoList)
async def get_todos():
    try:
        with open(config["todo.storage.path"], "r") as f:
            data = json.load(f)
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"current_day": [], "next_day": [], "pending": []}

@app.post("/api/todos")
async def save_todos(todos: TodoList):
    try:
        with open(config["todo.storage.path"], "w") as f:
            json.dump(todos.dict(), f, indent=4)
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
                    entries.append(date_str)
        
        return entries
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid format. Use YYYY-MM")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    uvicorn.run(app, host="0.0.0.0", port=port)

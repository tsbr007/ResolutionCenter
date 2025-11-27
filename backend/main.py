import json
import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Helper to read properties file
def read_properties(filepath):
    properties = {}
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    properties[key.strip()] = value.strip()
    return properties

# Load properties
PROPERTIES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.properties')
config = read_properties(PROPERTIES_FILE)
BACKEND_PORT = int(config.get('BACKEND_PORT', 8000))
FRONTEND_PORT = int(config.get('FRONTEND_PORT', 5173))
DATA_FILE = config.get('DATA_FILE', r"C:\Balaji\Career\KBASE\data.json")

# CORS configuration
origins = [
    f"http://localhost:{FRONTEND_PORT}",
    "http://localhost:5173", # Keep default just in case
    "http://localhost:3000",
]

# Add configurable frontend origin
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from datetime import datetime

class Entry(BaseModel):
    id: Optional[str] = None
    problem: str
    solution: str
    app_name: str = "default"
    created_by: str = "admin"
    last_updated_by: str = "admin"
    creation_date: Optional[str] = None
    last_update_date: Optional[str] = None

    @validator('problem')
    def validate_problem_length(cls, v):
        word_count = len(v.split())
        if word_count > 50:
            raise ValueError('Problem must be 50 words or less')
        return v

    @validator('solution')
    def validate_solution_length(cls, v):
        word_count = len(v.split())
        if word_count > 200:
            raise ValueError('Solution must be 200 words or less')
        return v

def read_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
            # Migration: Ensure all entries have IDs and new fields
            modified = False
            for entry in data:
                entry_modified = False
                if 'id' not in entry:
                    entry['id'] = str(uuid.uuid4())
                    entry_modified = True
                
                # Backfill new fields
                if 'app_name' not in entry:
                    entry['app_name'] = "default"
                    entry_modified = True
                if 'created_by' not in entry:
                    entry['created_by'] = "admin"
                    entry_modified = True
                if 'last_updated_by' not in entry:
                    entry['last_updated_by'] = "admin"
                    entry_modified = True
                if 'creation_date' not in entry:
                    entry['creation_date'] = datetime.now().isoformat()
                    entry_modified = True
                if 'last_update_date' not in entry:
                    entry['last_update_date'] = datetime.now().isoformat()
                    entry_modified = True
                
                if entry_modified:
                    modified = True
            
            if modified:
                save_data(data)
            return data
    except json.JSONDecodeError:
        return []

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

@app.get("/api/entries", response_model=List[Entry])
async def get_entries():
    return read_data()

@app.post("/api/entries", response_model=Entry)
async def create_entry(entry: Entry):
    data = read_data()
    
    # Check for duplicates
    for existing in data:
        if existing['problem'].lower() == entry.problem.lower():
            raise HTTPException(status_code=400, detail="Problem already exists")
    
    new_entry = entry.dict()
    new_entry['id'] = str(uuid.uuid4())
    
    # Set timestamps
    now = datetime.now().isoformat()
    new_entry['creation_date'] = now
    new_entry['last_update_date'] = now
    
    # Ensure defaults if not provided (though Pydantic handles this, dict() might have None if Optional)
    if not new_entry.get('app_name'): new_entry['app_name'] = "default"
    if not new_entry.get('created_by'): new_entry['created_by'] = "admin"
    if not new_entry.get('last_updated_by'): new_entry['last_updated_by'] = "admin"

    data.append(new_entry)
    save_data(data)
    return new_entry

@app.put("/api/entries/{entry_id}", response_model=Entry)
async def update_entry(entry_id: str, updated_entry: Entry):
    data = read_data()
    
    for i, existing in enumerate(data):
        if existing['id'] == entry_id:
            # Check for duplicates if problem is being changed
            if existing['problem'].lower() != updated_entry.problem.lower():
                for other in data:
                    if other['id'] != entry_id and other['problem'].lower() == updated_entry.problem.lower():
                        raise HTTPException(status_code=400, detail="Problem already exists")
            
            # Update fields
            data[i]['problem'] = updated_entry.problem
            data[i]['solution'] = updated_entry.solution
            data[i]['app_name'] = updated_entry.app_name
            data[i]['last_updated_by'] = updated_entry.last_updated_by
            
            # Update timestamp
            data[i]['last_update_date'] = datetime.now().isoformat()
            
            save_data(data)
            return data[i]
            
    raise HTTPException(status_code=404, detail="Entry not found")

if __name__ == "__main__":
    import uvicorn
    # Port is already loaded from properties at the top
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)

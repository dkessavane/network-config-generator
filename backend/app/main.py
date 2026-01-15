from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os

# --- MONGODB IMPORTS ---
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings  # Importing the settings we just created

app = FastAPI()

# --- DATABASE CONNECTION ---
# Initialize MongoDB client using settings from config.py
client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]
collection = db.get_collection("configs")

# CORS Configuration to allow your Vite Frontend (usually port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models to validate incoming requests from the Frontend
class InterfaceSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    channel_group: Optional[str] = ""

class ConfigSchema(BaseModel):
    hostname: str
    username: str
    userpassword: str
    secretpassword: str
    vlan_admin_id: str
    vlan_admin_name: str
    ip_admin: str
    subnet_admin: str
    po_uplink_id: str
    ip_gateway: str
    domain_name: str
    interfaces: List[InterfaceSchema]

# Jinja2 configuration pointing to your templates folder
current_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(current_dir, "templates")
env = Environment(loader=FileSystemLoader(template_path))

@app.post("/generate")
async def generate_config(data: ConfigSchema):
    try:
        # Load the master template that handles includes
        template = env.get_template("main_switch_config.j2")
        
        # Inject data (converting Pydantic object to dictionary)
        rendered = template.render(data.dict())
        
        # --- OPTIONAL: SAVE TO MONGO AUTOMATICALLY ---
        # await collection.insert_one(data.dict())
        
        return {"config": rendered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Route to save configuration specifically to MongoDB
@app.post("/save")
async def save_to_db(data: ConfigSchema):
    try:
        # Insert the validated data into the 'configs' collection
        result = await collection.insert_one(data.dict())
        return {"status": "success", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
# Route to fetch all saved configurations from MongoDB
@app.get("/history")
async def get_history():
    try:
        # We fetch all documents, but we convert the MongoDB '_id' (ObjectId) to string
        # because JSON doesn't like the original MongoDB ID format
        cursor = collection.find({})
        history = []
        async for document in cursor:
            document["_id"] = str(document["_id"]) # Convert ID to string
            history.append(document)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
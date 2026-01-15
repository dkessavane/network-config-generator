from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os
import ipaddress # Standard Python library for IP address validation

# --- MONGODB IMPORTS ---
from .config import settings 
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# --- DATABASE CONNECTION ---
client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]
collection = db.get_collection("configs")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS WITH NETWORK VALIDATION ---

class InterfaceSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    channel_group: Optional[str] = "" 

class ConfigSchema(BaseModel):
    hostname: str = Field(..., min_length=1)
    username: str
    userpassword: str
    secretpassword: str
    
    # ID Validation: VLAN (1-4094) and Port-Channel (1-255)
    vlan_admin_id: int = Field(..., ge=1, le=4094) 
    vlan_admin_name: str
    po_uplink_id: int = Field(..., ge=1, le=255)
    
    # IP Fields
    ip_admin: str
    subnet_admin: str
    ip_gateway: str
    domain_name: str
    interfaces: List[InterfaceSchema]

    # IP ADDRESS VALIDATOR (Ensures correct IPv4 format)
    @field_validator('ip_admin', 'ip_gateway')
    @classmethod
    def validate_ip_format(cls, v: str):
        try:
            ipaddress.IPv4Address(v)
            return v
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IPv4 address.")

    # SUBNET MASK VALIDATOR
    @field_validator('subnet_admin')
    @classmethod
    def validate_mask_format(cls, v: str):
        try:
            ipaddress.IPv4Address(v)
            return v
        except ValueError:
            raise ValueError(f"'{v}' is not a valid subnet mask.")

# --- JINJA2 LOGIC ---
current_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(current_dir, "templates")
env = Environment(loader=FileSystemLoader(template_path))

@app.post("/generate")
async def generate_config(data: ConfigSchema):
    try:
        template = env.get_template("main_switch_config.j2")
        # Use model_dump() for Pydantic v2 compatibility
        rendered = template.render(data.model_dump())
        return {"config": rendered}
    except Exception as e:
        # Return 422 for validation errors or 500 for template errors
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/save")
async def save_to_db(data: ConfigSchema):
    try:
        # Insert validated data into MongoDB
        result = await collection.insert_one(data.model_dump())
        return {"status": "success", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@app.get("/history")
async def get_history():
    try:
        # Fetch documents and convert ObjectId to string for JSON compatibility
        cursor = collection.find({})
        history = []
        async for document in cursor:
            document["_id"] = str(document["_id"])
            history.append(document)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
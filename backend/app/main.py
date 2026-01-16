from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os
import ipaddress 

from .config import settings 
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# --- DATABASE CONNECTION ---
client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]
collection = db.get_collection("configs")

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---

class InterfaceSchema(BaseModel):
    name: str
    port: str = Field(..., min_length=1) # REQUIRED: Interface port must be provided
    description: Optional[str] = ""
    channel_group: Optional[str] = "" 

class ConfigSchema(BaseModel):
    hostname: str = Field(..., min_length=1)
    username: str
    userpassword: str
    secretpassword: str
    
    # VLAN limits according to IEEE 802.1Q standard (1-4094)
    vlan_admin_id: int = Field(..., ge=1, le=4094) 
    vlan_admin_name: str
    # Port-Channel ID limits (usually 1-255 on most Cisco platforms)
    po_uplink_id: int = Field(..., ge=1, le=255)
    
    ip_admin: str
    subnet_admin: str
    ip_gateway: str
    domain_name: str
    interfaces: List[InterfaceSchema]

    # IP Format Validation
    @field_validator('ip_admin', 'ip_gateway')
    @classmethod
    def validate_ip_format(cls, v: str):
        try:
            ipaddress.IPv4Address(v)
            return v
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IPv4 address.")

    # Subnet Mask Validation
    @field_validator('subnet_admin')
    @classmethod
    def validate_mask_format(cls, v: str):
        try:
            ipaddress.IPv4Address(v)
            return v
        except ValueError:
            raise ValueError(f"'{v}' is not a valid subnet mask.")

# --- TEMPLATE ENGINE SETUP ---
current_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(current_dir, "templates")
env = Environment(loader=FileSystemLoader(template_path))

# --- ENDPOINTS ---

@app.post("/generate")
async def generate_config(data: ConfigSchema):
    """Generates the Cisco CLI configuration string using Jinja2 templates."""
    try:
        template = env.get_template("main_switch_config.j2")
        rendered = template.render(data.model_dump())
        return {"config": rendered}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/save")
async def save_to_db(data: ConfigSchema):
    """Saves the configuration object to MongoDB."""
    try:
        # data.model_dump() converts the Pydantic model (including interfaces) to a dict
        result = await collection.insert_one(data.model_dump())
        return {"status": "success", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@app.get("/history")
async def get_history():
    """Retrieves all previous configurations from the database."""
    try:
        cursor = collection.find({})
        history = []
        async for document in cursor:
            # Convert ObjectId to string for JSON serialization
            document["_id"] = str(document["_id"])
            history.append(document)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
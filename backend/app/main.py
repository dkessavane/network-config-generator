from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os
import ipaddress 
from .config import settings 
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# --- 1. LOGGING CONFIGURATION ---

logger = logging.getLogger("network-api")
logger.setLevel(settings.log_level)

# Console Handler
console_handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Future File Handler saved into the standard Linux path /var/log/ (sudo !!)
"""
log_file_path = "/var/log/network_app.log"
try:
    # Ensure the directory exists and is writable before activating
    file_handler = logging.FileHandler(log_file_path)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
except Exception as e:
    # Fail-safe: if the path is not accessible, we don't break the app
    pass
"""
app = FastAPI()

# --- DATABASE CONNECTION ---
client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]
collection = db.get_collection("configs")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---

class InterfaceSchema(BaseModel):
    name: str
    port: str = Field(..., min_length=2) # REQUIRED: Interface port must be provided
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
    interfaces: List[InterfaceSchema] = Field(..., min_length=2)

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
    """
    Receives network parameters, loads the Jinja2 template, 
    and returns the rendered Cisco CLI configuration.
    """
    logger.info(f"CLI generation request received for host: {data.hostname}")
    try:
        # Load the specific template for Cisco switches
        template = env.get_template("main_switch_config.j2")
        
        # Render the template using the validated Pydantic data
        rendered = template.render(data.model_dump())
        
        return {"config": rendered}
    except Exception as e:
        # Log the specific error to app.log for troubleshooting
        logger.error(f"Generation failed for {data.hostname}: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/save")
async def save_to_db(data: ConfigSchema):
    """
    Converts the validated Pydantic model into a dictionary 
    and persists it into the MongoDB 'configs' collection.
    """
    logger.info(f"Attempting to save configuration to DB for: {data.hostname}")
    try:
        # Convert Pydantic object to dict for MongoDB compatibility
        result = await collection.insert_one(data.model_dump())
        
        logger.info(f"Successfully saved {data.hostname} with ID: {result.inserted_id}")
        return {"status": "success", "id": str(result.inserted_id)}
    except Exception as e:
        # Log database connection or insertion issues
        logger.error(f"Database save error for {data.hostname}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@app.get("/history")
async def get_history():
    """
    Retrieves all stored configurations from MongoDB 
    and returns them as a list for the frontend history table.
    """
    logger.info("Fetching all configuration history from database")
    try:
        cursor = collection.find({})
        history = []
        async for document in cursor:
            # MongoDB ObjectIds are not JSON serializable by default, so we convert to string
            document["_id"] = str(document["_id"])
            history.append(document)
        return history
    except Exception as e:
        logger.error(f"Failed to fetch history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
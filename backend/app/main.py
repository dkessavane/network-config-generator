from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os

app = FastAPI()

# Configuration CORS pour autoriser ton Frontend Vite (port 5173 par défaut)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles de données pour valider ce qui vient du Frontend
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

# Configuration de Jinja2 vers ton dossier templates
current_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(current_dir, "templates")
env = Environment(loader=FileSystemLoader(template_path))

@app.post("/generate")
async def generate_config(data: ConfigSchema):
    try:
        # On charge le template maître qui fait les include 
        template = env.get_template("main_switch_config.j2")
        
        # On injecte les données (conversion de l'objet Pydantic en dictionnaire)
        rendered = template.render(data.dict())
        
        return {"config": rendered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import pandas as pd
import io
import nmap
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List

app = FastAPI()

# MongoDB connection setup
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["ntt_network_db"]
clients_collection = db.get_collection("clients")
devices_collection = db.get_collection("configs")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- CLIENT MANAGEMENT (TENANTS) ---

@app.get("/clients")
async def list_clients():
    """Returns all registered clients from the database"""
    cursor = clients_collection.find({})
    return [{**doc, "_id": str(doc["_id"])} async for doc in cursor]

@app.post("/clients")
async def create_client(data: dict = Body(...)):
    """Creates a new client. Name is mandatory"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required")
    result = await clients_collection.insert_one({"name": name})
    return {"_id": str(result.inserted_id)}

@app.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    """Deletes a client and all associated switch configurations"""
    await clients_collection.delete_one({"_id": ObjectId(client_id)})
    await devices_collection.delete_many({"client_id": client_id})
    return {"status": "deleted"}

# --- NETWORK TRACKER (NMAP) ---

@app.get("/clients/{client_id}/scan")
async def scan_network(client_id: str, subnet: str = Query(..., example="192.168.1.0/24")):
    """Uses Nmap binary to discover active hosts with open SSH ports"""
    nm = nmap.PortScanner()
    try:
        # Scanning port 22 (SSH) for discovery
        nm.scan(hosts=subnet, arguments='-p 22 --open')
        results = []
        for host in nm.all_hosts():
            if nm[host].has_tcp(22) and nm[host]['tcp'][22]['state'] == 'open':
                results.append({
                    "ip": host,
                    "status": "Online",
                    "vendor": nm[host].get('vendor', {})
                })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- STAGING & BULK OPERATIONS ---

@app.get("/history/{client_id}")
async def get_history(client_id: str):
    """Retrieves all switches for a specific tenant"""
    cursor = devices_collection.find({"client_id": client_id})
    return [{**doc, "_id": str(doc["_id"])} async for doc in cursor]

@app.put("/clients/{client_id}/save-all")
async def save_all(client_id: str, devices: List[dict] = Body(...)):
    """Updates all switches in a single batch operation"""
    for dev in devices:
        dev_id = dev.get("_id")
        if dev_id:
            data = {k: v for k, v in dev.items() if k != "_id"}
            await devices_collection.update_one({"_id": ObjectId(dev_id)}, {"$set": data})
    return {"message": "All devices updated"}
import pytest
from fastapi.testclient import TestClient
from app.main import app

# Initialize the FastAPI TestClient
client = TestClient(app)

# --- TEST DATA (Realistic inventory scenario) ---
VALID_DATA = {
    "hostname": "SW-ACCESS-STK01",
    "username": "netops",
    "userpassword": "SecurePassword!45",
    "secretpassword": "EnableSecret!90",
    "vlan_admin_id": 30,
    "vlan_admin_name": "ACCESS_DATA",
    "po_uplink_id": 10,
    "ip_admin": "172.16.30.10",
    "subnet_admin": "255.255.255.0",
    "ip_gateway": "172.16.30.254",
    "domain_name": "corporate.local",
    "interfaces": [
        {
            "name": "TenGigabitEthernet 1/0/49",
            "port": "1/0/49",
            "description": "Uplink_to_Aggregation_A",
            "channel_group": "10"
        },
        {
            "name": "TenGigabitEthernet 2/0/49",
            "port": "2/0/49",
            "description": "Uplink_to_Aggregation_B",
            "channel_group": "10"
        }
    ]
}

# --- ENDPOINT TESTS: /generate ---

def test_generate_config_success():
    """Verify that configuration generation works with valid data"""
    response = client.post("/generate", json=VALID_DATA)
    assert response.status_code == 200
    config_text = response.json()["config"]
    
    # Assert key values exist in the generated Cisco CLI config
    assert "hostname SW-ACCESS-STK01" in config_text
    assert "interface TenGigabitEthernet 1/0/49" in config_text
    assert "interface TenGigabitEthernet 2/0/49" in config_text
    assert "interface Port-channel 10" in config_text
    assert "ip address 172.16.30.10 255.255.255.0" in config_text

def test_error_invalid_ip():
    """Verify rejection of out-of-range IP address (Pydantic validation)"""
    bad_data = VALID_DATA.copy()
    bad_data["ip_admin"] = "172.16.30.999" # Invalid IP
    response = client.post("/generate", json=bad_data)
    assert response.status_code == 422
    assert "not a valid IPv4 address" in response.text

def test_error_invalid_vlan():
    """Verify rejection of VLAN ID outside valid range (1-4094)"""
    bad_data = VALID_DATA.copy()
    bad_data["vlan_admin_id"] = 5000
    response = client.post("/generate", json=bad_data)
    assert response.status_code == 422

def test_error_min_interfaces():
    """Verify business rule: Minimum 2 interfaces required"""
    bad_data = VALID_DATA.copy()
    bad_data["interfaces"] = [VALID_DATA["interfaces"][0]] # Only one interface provided
    response = client.post("/generate", json=bad_data)
    assert response.status_code == 422

# --- ENDPOINT TESTS: /history ---

def test_get_history():
    """Verify that the history route communicates correctly with MongoDB"""
    response = client.get("/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
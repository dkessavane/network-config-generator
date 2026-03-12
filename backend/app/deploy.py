import requests
from netmiko import ConnectHandler
from netmiko.exceptions import NetmikoTimeoutException, NetmikoAuthenticationException

# URL de ton API FastAPI
API_URL = "http://127.0.0.1:8000"

def get_configs_from_api():
    """Récupère la liste des configurations sauvegardées dans MongoDB via ton backend."""
    try:
        response = requests.get(f"{API_URL}/history")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching data from API: {e}")
        return []

def push_full_config(device):
    """Connexion SSH et injection de la configuration complète."""
    
    # Préparation des paramètres de connexion
    # On utilise les données que tu as saisies dans ton interface React
    switch_params = {
        'device_type': 'cisco_ios',  # ou 'juniper_junos' selon ton vendor
        'host': device['ip_admin'],
        'username': device['username'],
        'password': device['userpassword'],
        'secret': device['secretpassword'], # Pour le mode 'enable'
    }

    print(f"\n[+] Connecting to {device['hostname']} ({device['ip_admin']})...")

    try:
        # Établissement de la session SSH
        with ConnectHandler(**switch_params) as net_connect:
            # Passage en mode privilégié (enable)
            net_connect.enable()
            
            print(f"[*] Connection established. Pushing Full Config...")

            # Récupération du texte de la config (on pourrait aussi le générer via une route API dédiée)
            # Ici on simule l'envoi des commandes clés
            commands = [
                f"hostname {device['hostname']}",
                f"vlan {device['vlan_admin_id']}",
                f" name {device['vlan_admin_name']}",
                f"ip domain name {device['domain_name']}",
                "interface Port-channel 1",
                " switchport mode trunk",
                "exit",
                "do write memory" # Sauvegarde
            ]

            # Injection en masse
            output = net_connect.send_config_set(commands)
            print(f"[SUCCESS] Configuration applied to {device['hostname']}")
            # print(output) # Optionnel : pour voir le log du switch

    except NetmikoTimeoutException:
        print(f"[ERROR] Timeout: {device['hostname']} is not reachable.")
    except NetmikoAuthenticationException:
        print(f"[ERROR] Auth Failed: Check credentials for {device['hostname']}.")
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {e}")

# --- LANCEMENT ---
if __name__ == "__main__":
    devices = get_configs_from_api()
    
    if not devices:
        print("No devices found in database. Please save configs in the app first.")
    else:
        print(f"Found {len(devices)} devices. Starting deployment...")
        for device in devices:
            if device.get('ip_admin'):
                push_full_config(device)
            else:
                print(f"Skipping {device['hostname']} (No IP defined)")
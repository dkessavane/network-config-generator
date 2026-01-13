from jinja2 import Environment, FileSystemLoader
from getpass import getpass

def getUserInput():
    """Collect all required values from the user."""
    variables = {
        'hostname': input("Switch hostname: "),
        'username': input("Username: "),
        'userpassword': getpass("User password: "),
        'secretpassword': getpass("Enable secret password: "),
        'vlan_admin_id': input("Admin VLAN ID: "),
        'vlan_admin_name': input("Admin VLAN name: "),
        'ip_admin': input("Admin IP address: "),
        'subnet_admin': input("Admin subnet mask: "),
        'po_uplink_id': input("Port-channel uplink ID: "),
        'ip_gateway': input("Default gateway IP: "),
        'domain_name': input("Domain name: ")
    }

    # List of interfaces
    interfaces = []
    while True:
        try:
            num_interfaces = int(input("How many interfaces do you want to configure? "))
            if num_interfaces < 0:
                print("Please enter a positive number.")
                continue
            break
        except ValueError:
            print("Please enter a valid number.")

    for i in range(1, num_interfaces + 1):
        name = input(f"Interface {i} name: ")
        description = input(f"Interface {i} description (leave empty if none): ")
        channel_group = input(f"Interface {i} channel group (leave empty if none): ")

        interfaces.append({
            'name': name,
            'description': description if description else None,
            'channel_group': channel_group if channel_group else None
        })

    variables['interfaces'] = interfaces
    return variables


def renderConfig(variables):
    """Render the Jinja2 template."""
    env = Environment(loader=FileSystemLoader('.'))
    template = env.get_template('./templates/main_switch_config.j2')
    return template.render(**variables)


def saveConfig(config, filename='config_output.txt'):
    with open(filename, 'w') as f:
        f.write(config)


def main():
    variables = getUserInput()
    config = renderConfig(variables)
    print("\nGenerated Configuration:\n")
    print(config)
    saveConfig(config)
    print("\nConfiguration saved to config_output.txt")


if __name__ == "__main__":
    main()

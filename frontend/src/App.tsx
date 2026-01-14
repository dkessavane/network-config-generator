import React, { useState } from "react";
import { Plus, Trash2, Copy, Download, Check, Eye, EyeOff } from "lucide-react";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

function App() {
  // --- INITIAL STATES ---
  const [config, setConfig] = useState({
    hostname: "SW-CLIENTA-01",
    username: "admin",
    userpassword: "",
    secretpassword: "",
    vlan_admin_id: "10",
    vlan_admin_name: "ADMIN",
    ip_admin: "192.168.1.1",
    subnet_admin: "255.255.255.0",
    po_uplink_id: "1",
    ip_gateway: "192.168.1.254",
    domain_name: "network.local",
  });

  const [interfaces, setInterfaces] = useState([
    {
      name: "TenGigabitEthernet1/0/1",
      description: "Uplink to Core",
      channel_group: "1",
    },
  ]);

  const [copied, setCopied] = useState(false);

  // --- SEPARATE STATES FOR PASSWORD VISIBILITY ---
  // Independent toggles for each password field
  const [showUserPass, setShowUserPass] = useState(false);
  const [showSecretPass, setShowSecretPass] = useState(false);

  const fieldLabels = {
    hostname: "Hostname",
    username: "Username",
    userpassword: "User Password",
    secretpassword: "Enable Secret",
    vlan_admin_id: "Admin VLAN ID",
    vlan_admin_name: "Admin VLAN Name",
    ip_admin: "Admin IP Address",
    subnet_admin: "Subnet Mask",
    po_uplink_id: "Port-Channel ID",
    ip_gateway: "Default Gateway",
    domain_name: "Domain Name",
  };

  // --- HANDLERS ---
  const addInterface = () => {
    setInterfaces([...interfaces, { name: "", description: "", channel_group: "" }]);
  };

  const removeInterface = (index: number) => {
    setInterfaces(interfaces.filter((_, i) => i !== index));
  };

  const updateInterface = (index: number, field: string, value: string) => {
    const updated = [...interfaces];
    updated[index] = { ...updated[index], [field]: value } as any;
    setInterfaces(updated);
  };

  // Logic to build full config text for copy/preview
  const generateFullConfig = () => {
    let text = `hostname ${config.hostname}\n!\n`;
    text += `username ${config.username} privilege 15 secret ${config.userpassword || "********"}\n`;
    text += `enable secret ${config.secretpassword || "********"}\n!\n`;
    text += `vlan ${config.vlan_admin_id}\n name ${config.vlan_admin_name}\nexit\n!\n`;
    text += `interface Vlan${config.vlan_admin_id}\n description ${config.vlan_admin_name}\n`;
    text += ` ip address ${config.ip_admin} ${config.subnet_admin}\n no ip redirects\n no ip proxy-arp\n no ip route-cache\nexit\n!\n`;
    text += `interface Port-channel${config.po_uplink_id}\n switchport\n switchport mode trunk\n switchport nonegotiate\nexit\n!\n`;

    interfaces.forEach((iface) => {
      if (iface.name) {
        text += `interface ${iface.name}\n description ${iface.description}\n switchport\n switchport mode trunk\n switchport nonegotiate\n channel-protocol lacp\n`;
        if (iface.channel_group) text += ` channel-group ${config.po_uplink_id} mode active\n`;
        text += ` ip dhcp snooping trust\nexit\n!\n`;
      }
    });

    text += `ip default-gateway ${config.ip_gateway}\nip route 0.0.0.0 0.0.0.0 ${config.ip_gateway} name Default-route\n!\n`;
    text += `ip domain name ${config.domain_name}\nip ssh version 2\nline vty 0 4\n transport input ssh\n!\ncrypto key generate rsa modulus 2048\n!`;
    return text;
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(generateFullConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = async () => {
    const payload = { ...config, interfaces };
    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Backend Error");
      const data = await response.json();
      const blob = new Blob([data.config], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.hostname}_config.txt`;
      a.click();
    } catch (error) {
      alert("Error: FastAPI server is not running on port 8000.");
    }
  };

  return (
    <div className="h-screen bg-net-dark text-white p-8 font-sans relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0 h-full w-full">
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold italic">Network Lab</span>
          </div>
          <div className="flex gap-3">
            <button onClick={copyConfig} className="bg-slate-800 border border-slate-600 px-4 py-1 rounded-md text-sm flex items-center gap-2 hover:border-blue-400 transition-all">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={downloadConfig} className="bg-blue-600 border border-blue-500 px-4 py-1 rounded-md text-sm flex items-center gap-2 hover:border-blue-500 transition-all">
              <Download size={16} /> Download configuration
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch flex-1 min-h-0 pb-4">

          {/* LEFT COLUMN: Input Form */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-net-card/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2rem] shadow-2xl shrink-0">
              <p className="text-center text-gray-300 mb-6 text-sm uppercase tracking-widest font-bold">Variables</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(config).map(([key, value]) => {
                  // Determine visibility for each field
                  const isUserPass = key === "userpassword";
                  const isSecretPass = key === "secretpassword";
                  const isVisible = isUserPass ? showUserPass : isSecretPass ? showSecretPass : true;

                  return (
                    <div key={key} className="flex flex-col gap-1 relative">
                      <label className="text-[10px] text-gray-400 uppercase font-bold ml-1">
                        {fieldLabels[key as keyof typeof fieldLabels] || key}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={key.includes("password") && !isVisible ? "password" : "text"}
                          value={value}
                          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 outline-none transition-all text-gray-200 w-full pr-10"
                        />
                        {/* INDEPENDENT TOGGLES */}
                        {isUserPass && (
                          <button type="button" onClick={() => setShowUserPass(!showUserPass)} className="absolute right-3 text-gray-500 hover:text-blue-400 transition-colors">
                            {showUserPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                        {isSecretPass && (
                          <button type="button" onClick={() => setShowSecretPass(!showSecretPass)} className="absolute right-3 text-gray-500 hover:text-blue-400 transition-colors">
                            {showSecretPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-net-card/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2rem] shadow-2xl flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-300 text-xs uppercase tracking-widest font-bold font-mono">Interfaces</p>
                <button onClick={addInterface} className="bg-slate-800 border border-slate-600 px-4 py-1 rounded-md text-sm flex items-center gap-2 hover:border-blue-400 transition-all">
                  <Plus size={16} /> Add Interfaces
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {interfaces.map((iface, index) => (
                  <div key={index} className="bg-black/30 border border-slate-700 rounded-xl p-4 relative">
                    <button onClick={() => removeInterface(index)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <div className="grid grid-cols-1 gap-2 pr-8">
                      <input placeholder="Interface Name" value={iface.name} onChange={(e) => updateInterface(index, "name", e.target.value)} className="bg-transparent border-b border-slate-700 py-1 text-sm outline-none focus:border-blue-400 text-white font-mono" />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Description" value={iface.description} onChange={(e) => updateInterface(index, "description", e.target.value)} className="bg-transparent border-b border-slate-700 py-1 text-xs outline-none focus:border-blue-400 text-gray-400" />
                        <input placeholder="CH Group" value={iface.channel_group} onChange={(e) => updateInterface(index, "channel_group", e.target.value)} className="bg-transparent border-b border-slate-700 py-1 text-xs outline-none focus:border-blue-400 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Output Preview (Synchronized with left toggles) */}
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-black rounded-[2rem] p-6 shadow-2xl border border-slate-800 flex flex-col h-full overflow-hidden">
              <p className="text-green-400 text-center mb-4 font-mono text-sm uppercase tracking-widest shrink-0">OUTPUT</p>

              <div className="flex-1 bg-[#0d0d0d] p-8 rounded-xl font-mono text-sm leading-relaxed text-gray-300 overflow-y-auto border border-slate-900 custom-scrollbar">
                <div className="space-y-1 whitespace-pre-wrap">
                  <p>hostname {config.hostname}</p>
                  <p className="text-gray-700">!</p>
                  <p>
                    username {config.username} privilege 15 secret{" "}
                    <span className="text-red-500 font-bold">
                      {showUserPass ? (config.userpassword || "none") : "********"}
                    </span>
                  </p>
                  <p>
                    enable secret{" "}
                    <span className="text-red-500 font-bold">
                      {showSecretPass ? (config.secretpassword || "none") : "********"}
                    </span>
                  </p>
                  <p className="text-gray-700">!</p>

                  <p>vlan {config.vlan_admin_id}</p>
                  <p className="ml-5">name {config.vlan_admin_name}</p>
                  <p>exit</p>
                  <p className="text-gray-700">!</p>

                  <p>interface Vlan{config.vlan_admin_id}</p>
                  <p className="ml-5">description {config.vlan_admin_name}</p>
                  <p className="ml-5">ip address {config.ip_admin} {config.subnet_admin}</p>
                  <p className="ml-5">no ip redirects</p>
                  <p className="ml-5">no ip proxy-arp</p>
                  <p className="ml-5">no ip route-cache</p>
                  <p>exit</p>
                  <p className="text-gray-700">!</p>

                  <p>interface Port-channel{config.po_uplink_id}</p>
                  <p className="ml-5">switchport</p>
                  <p className="ml-5">switchport mode trunk</p>
                  <p className="ml-5">switchport nonegotiate</p>
                  <p>exit</p>
                  <p className="text-gray-700">!</p>

                  {interfaces.map((iface, i) => iface.name && (
                    <div key={i} className="py-1">
                      <p>interface {iface.name}</p>
                      <p className="ml-5">description {iface.description}</p>
                      <p className="ml-5">switchport</p>
                      <p className="ml-5">switchport mode trunk</p>
                      <p className="ml-5">switchport nonegotiate</p>
                      <p className="ml-5">channel-protocol lacp</p>
                      {iface.channel_group && <p className="ml-5">channel-group {config.po_uplink_id} mode active</p>}
                      <p className="ml-5">ip dhcp snooping trust</p>
                      <p>exit</p>
                      <p className="text-gray-700">!</p>
                    </div>
                  ))}

                  <p>ip default-gateway {config.ip_gateway}</p>
                  <p>ip route 0.0.0.0 0.0.0.0 {config.ip_gateway} name Default-route</p>
                  <p className="text-gray-700">!</p>

                  <p>ip domain name {config.domain_name}</p>
                  <p>ip ssh version 2</p>
                  <p>line vty 0 4</p>
                  <p className="ml-5">transport input ssh</p>
                  <p className="text-gray-700">!</p>
                  <p>crypto key generate rsa modulus 2048</p>
                  <p className="text-gray-700">!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
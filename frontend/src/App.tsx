import React, { useState } from "react";
import { Copy, Download, Check, Eye, EyeOff, History, X, Plus, Trash2 } from "lucide-react";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

function App() {
  // --- STATE ---
  const [config, setConfig] = useState({
    hostname: "SW-CLIENTA-01",
    username: "admin",
    userpassword: "",
    secretpassword: "",
    vlan_admin_id: 10,
    vlan_admin_name: "ADMIN",
    ip_admin: "192.168.1.1",
    subnet_admin: "255.255.255.0",
    po_uplink_id: 1,
    ip_gateway: "192.168.1.254",
    domain_name: "network.local",
  });

  const [interfaces, setInterfaces] = useState([
    { name: "TenGigabitEthernet", port: "1/0/1", description: "Uplink to Core 1", channel_group: "1" },
    { name: "TenGigabitEthernet", port: "1/0/2", description: "Uplink to Core 2", channel_group: "1" },
  ]);

  const [errors, setErrors] = useState<string[]>([]); // State to track empty required fields
  const [copied, setCopied] = useState(false);
  const [showUserPass, setShowUserPass] = useState(false);
  const [showSecretPass, setShowSecretPass] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  // --- DYNAMIC INTERFACES ---
  const addInterface = () => {
    setInterfaces([...interfaces, { 
      name: "TenGigabitEthernet", 
      port: "", 
      description: "", 
      channel_group: config.po_uplink_id.toString() 
    }]);
  };

  const removeInterface = (index: number) => {
    // Only allow deletion if index is greater than 1 (protecting first two default interfaces)
    if (index > 1) {
      setInterfaces(interfaces.filter((_, i) => i !== index));
    }
  };

  // --- HANDLERS ---
  const handleInputChange = (key: string, value: string) => {
    // If the user types, remove the error highlight from the field
    if (errors.includes(key)) {
      setErrors(errors.filter(e => e !== key));
    }

    let finalValue = value;
    // IP and Subnet mask validation (max 255 per octet, max 3 dots)
    if (key.includes("ip") || key.includes("subnet") || key === "ip_gateway") {
        let cleaned = value.replace(/[^0-9.]/g, "");
        cleaned = cleaned.replace(/\.\.+/g, ".");
        const parts = cleaned.split('.');
        const validatedParts = parts.map((part, index) => {
            if (index > 3) return null;
            const num = parseInt(part);
            if (num > 255) return "255";
            return part;
        }).filter(p => p !== null);
        cleaned = (validatedParts as string[]).join('.');
        const dotCount = (cleaned.match(/\./g) || []).length;
        if (dotCount > 3) {
            const tempParts = cleaned.split('.');
            cleaned = tempParts.slice(0, 4).join('.');
        }
        finalValue = cleaned;
    } 
    // ID validation (Numbers only, Max VLAN 4094, Max Po 255)
    else if (key === "vlan_admin_id" || key === "po_uplink_id") {
        finalValue = value.replace(/[^0-9]/g, ""); 
        const num = parseInt(finalValue);
        if (key === "vlan_admin_id" && num > 4094) finalValue = "4094";
        if (key === "po_uplink_id" && num > 255) finalValue = "255";
    } 
    // Hostname validation (No spaces)
    else if (key === "hostname") {
        finalValue = value.replace(/\s/g, "");
    }
    setConfig({ ...config, [key]: finalValue });
  };

  const updateInterface = (index: number, field: string, value: string) => {
    const updated = [...interfaces];
    // @ts-ignore
    updated[index][field] = value;
    setInterfaces(updated);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history");
      setHistory(await res.json());
      setShowHistory(true);
    } catch (e) { alert("API Offline"); }
  };

  const generateFullConfigText = () => {
    let text = `hostname ${config.hostname}\n!\n`;
    text += `username ${config.username} privilege 15 secret ${config.userpassword || "********"}\n`;
    text += `enable secret ${config.secretpassword || "********"}\n!\n`;
    text += `vlan ${config.vlan_admin_id}\n name ${config.vlan_admin_name}\nexit\n!\n`;
    text += `interface Vlan ${config.vlan_admin_id}\n description ${config.vlan_admin_name}\n ip address ${config.ip_admin} ${config.subnet_admin}\n no ip redirects\n no ip proxy-arp\n no ip route-cache\nexit\n!\n`;
    text += `interface Port-channel ${config.po_uplink_id}\n switchport\n switchport mode trunk\n switchport nonegotiate\nexit\n!\n`;
    interfaces.forEach((iface) => {
        text += `interface TenGigabitEthernet ${iface.port || "[PORT]"}\n description ${iface.description}\n switchport\n switchport mode trunk\n switchport nonegotiate\n channel-protocol lacp\n channel-group ${iface.channel_group || config.po_uplink_id} mode active\n ip dhcp snooping trust\nexit\n!\n`;
    });
    text += `ip default-gateway ${config.ip_gateway}\nip route 0.0.0.0 0.0.0.0 ${config.ip_gateway} name Default-route\n!\n`;
    text += `ip domain name ${config.domain_name}\nip ssh version 2\nline vty 0 4\n transport input ssh\n!\ncrypto key generate rsa modulus 2048\n!`;
    return text;
  };

  const handleDownloadAndSave = async () => {
    // 1. DETECTION OF EMPTY REQUIRED FIELDS
    const requiredFields = ['hostname', 'username', 'userpassword', 'secretpassword', 'ip_admin', 'subnet_admin', 'ip_gateway'];
    const newErrors = requiredFields.filter(field => !config[field as keyof typeof config]);

    if (newErrors.length > 0) {
      setErrors(newErrors); // Highlight fields in red
      return; // Stop execution
    }

    const payload = {
        ...config,
        vlan_admin_id: parseInt(config.vlan_admin_id.toString()) || 0,
        po_uplink_id: parseInt(config.po_uplink_id.toString()) || 0,
        interfaces: interfaces
    };

    try {
      // Save to database
      await fetch("http://127.0.0.1:8000/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
      });

      // Generate and download file
      const response = await fetch("http://127.0.0.1:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.config], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${config.hostname}_config.txt`; a.click();
      }
    } catch (e) { alert("API Error"); }
  };

  return (
    <div className="h-screen bg-net-dark text-white p-8 font-sans relative overflow-hidden flex flex-col">
      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col h-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold italic">Network Lab</span>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchHistory} className="bg-slate-800 border border-slate-600 px-4 py-1 rounded-md text-sm flex items-center gap-2 hover:border-blue-400 transition-all">
              <History size={16} /> History
            </button>
            <button onClick={() => { 
                navigator.clipboard.writeText(generateFullConfigText()); 
                setCopied(true); 
                setTimeout(() => setCopied(false), 2000); 
            }} className="bg-slate-800 border border-slate-600 px-4 py-1 rounded-md text-sm flex items-center gap-2">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button 
                onClick={handleDownloadAndSave} 
                className="bg-blue-600 border border-blue-500 px-4 py-1 rounded-md text-sm font-bold flex items-center gap-2 transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <Download size={16} /> Download & Save
            </button>
          </div>
        </div>

        {/* HISTORY MODAL */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6 text-xl font-bold">
                <span className="flex items-center gap-2"><History className="text-blue-400" /> History</span>
                <button onClick={() => setShowHistory(false)}><X /></button>
              </div>
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-4 mb-4 outline-none focus:border-blue-500" />
              <div className="overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {history.filter(h => h.hostname.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <div key={item._id} className="flex justify-between items-center p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
                    <div><p className="font-bold text-blue-300">{item.hostname}</p></div>
                    <button onClick={() => { 
                      const { _id, id, interfaces: savedIfaces, ...clean } = item;
                      setConfig(clean as any);
                      if (savedIfaces) setInterfaces([...savedIfaces]);
                      setShowHistory(false); 
                    }} className="bg-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700">LOAD</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch flex-1 min-h-0 pb-4">
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* VARIABLES WITH RED OUTLINE ON ERROR */}
            <div className="bg-net-card/50 border border-slate-700 p-8 rounded-[2rem] shadow-2xl shrink-0">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(config).map(([key, value]) => {
                  const isPass = key.includes("password");
                  const isVisible = key === "userpassword" ? showUserPass : showSecretPass;
                  const hasError = errors.includes(key); // Check if this specific field has an error

                  return (
                    <div key={key} className="flex flex-col gap-1 relative">
                      <label className={`text-[10px] uppercase font-bold ml-1 transition-colors ${hasError ? 'text-red-500' : 'text-gray-400'}`}>
                        {fieldLabels[key as keyof typeof fieldLabels] || key}
                      </label>
                      <div className="relative flex items-center group">
                        <input
                          type={isPass && !isVisible ? "password" : "text"}
                          value={value}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className={`bg-slate-900 border rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none text-gray-200 w-full transition-all 
                            ${hasError ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-700'} 
                            ${isPass ? 'pr-10' : ''}`}
                        />
                        {isPass && (
                          <button type="button" onClick={() => key === "userpassword" ? setShowUserPass(!showUserPass) : setShowSecretPass(!showSecretPass)} className={`absolute right-3 ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
                            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INTERFACES CARD */}
            <div className="bg-net-card/50 border border-slate-700 p-8 rounded-[2rem] shadow-2xl flex flex-col flex-1">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-300 text-xs uppercase tracking-widest font-bold font-mono">Interfaces</p>
                <button onClick={addInterface} className="bg-slate-800 border border-slate-600 px-3 py-1 rounded-md text-[10px] flex items-center gap-1 hover:border-blue-400 transition-all text-blue-400 font-bold">
                    <Plus size={12} /> ADD INTERFACES
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                {interfaces.map((iface, index) => (
                  <div key={index} className="bg-black/30 border border-slate-700 rounded-xl p-4 grid grid-cols-4 gap-3 items-center relative group">
                    {/* Delete button: Only visible for added links (index > 1) */}
                    {index > 1 && (
                      <button onClick={() => removeInterface(index)} className="absolute -top-2 -right-2 bg-red-900/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} className="text-red-200" />
                      </button>
                    )}
                    <div className="flex flex-col gap-1"><label className="text-[10px] text-gray-500 uppercase font-mono">Type</label><input disabled value="TenGigabitEthernet" className="bg-slate-800/50 border border-slate-800 rounded p-2 text-[10px] text-gray-500 font-bold" /></div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] text-blue-400 uppercase font-bold tracking-tighter">Port</label><input value={iface.port || ""} placeholder="1/0/1" onChange={(e) => updateInterface(index, "port", e.target.value)} className="bg-slate-900 border border-blue-900 rounded p-2 text-xs text-white outline-none focus:border-blue-400" /></div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] text-gray-500 uppercase">Desc</label><input value={iface.description || ""} onChange={(e) => updateInterface(index, "description", e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-400" /></div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] text-gray-500 uppercase">Group</label><input value={iface.channel_group || ""} onChange={(e) => updateInterface(index, "channel_group", e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-400" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OUTPUT VIEW */}
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-black rounded-[2rem] p-6 shadow-2xl border border-slate-800 flex flex-col h-full overflow-hidden">
              <p className="text-green-400 text-center mb-4 font-mono text-sm uppercase tracking-widest border-b border-green-900/30 pb-2">OUTPUT</p>
              <div className="flex-1 bg-[#0d0d0d] p-8 rounded-xl font-mono text-[13px] leading-relaxed text-gray-300 overflow-y-auto border border-slate-900 whitespace-pre-wrap custom-scrollbar">
                <p>hostname {config.hostname}</p>
                <p className="text-white">!</p>
                <p>username {config.username} privilege 15 secret <span className="text-red-500 font-bold">{showUserPass ? (config.userpassword || "none") : "********"}</span></p>
                <p>enable secret <span className="text-red-500 font-bold">{showSecretPass ? (config.secretpassword || "none") : "********"}</span></p>
                <p className="text-white">!</p>
                <p>vlan {config.vlan_admin_id}</p>
                <p className="ml-5">name {config.vlan_admin_name}</p>
                <p>exit</p>
                <p className="text-white">!</p>
                <p>interface Vlan{config.vlan_admin_id}</p>
                <p className="ml-5">description {config.vlan_admin_name}</p>
                <p className="ml-5">ip address {config.ip_admin} {config.subnet_admin}</p>
                <p className="ml-5">no ip redirects</p>
                <p className="ml-5">no ip proxy-arp</p>
                <p className="ml-5">no ip route-cache</p>
                <p>exit</p>
                <p className="text-white">!</p>
                <p>interface Port-channel{config.po_uplink_id}</p>
                <p className="ml-5">switchport</p>
                <p className="ml-5">switchport mode trunk</p>
                <p className="ml-5">switchport nonegotiate</p>
                <p>exit</p>
                <p className="text-white">!</p>
                {interfaces.map((iface, i) => (
                  <div key={i} className="mb-4">
                    <p>interface TenGigabitEthernet{iface.port || "[PORT]"}</p>
                    <p className="ml-5">description {iface.description}</p>
                    <p className="ml-5">switchport</p>
                    <p className="ml-5">switchport mode trunk</p>
                    <p className="ml-5">switchport nonegotiate</p>
                    <p className="ml-5">channel-protocol lacp</p>
                    <p className="ml-5">channel-group {iface.channel_group || config.po_uplink_id} mode active</p>
                    <p className="ml-5">ip dhcp snooping trust</p>
                    <p>exit</p>
                    <p className="text-white">!</p>
                  </div>
                ))}
                <p>ip default-gateway {config.ip_gateway}</p>
                <p>ip route 0.0.0.0 0.0.0.0 {config.ip_gateway} name Default-route</p>
                <p className="text-white">!</p>
                <p>ip domain name {config.domain_name}</p>
                <p>ip ssh version 2</p>
                <p>line vty 0 4</p>
                <p className="ml-5">transport input ssh</p>
                <p className="text-white">!</p>
                <p>crypto key generate rsa modulus 2048</p>
                <p className="text-white">!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
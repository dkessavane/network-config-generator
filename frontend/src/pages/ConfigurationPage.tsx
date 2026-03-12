import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Copy, Download, Terminal, Check, Save, ShieldCheck, 
  AlertCircle, Upload, Package, ChevronLeft, Building2, Search, Loader2, PlusCircle 
} from "lucide-react";
import axios from "axios";

const VALID_MASKS = [
  "255.0.0.0", "255.128.0.0", "255.192.0.0", "255.224.0.0", "255.240.0.0", "255.248.0.0", "255.252.0.0", "255.254.0.0", "255.255.0.0",
  "255.255.128.0", "255.255.192.0", "255.255.224.0", "255.255.240.0", "255.255.248.0", "255.255.252.0", "255.255.254.0", "255.255.255.0",
  "255.255.255.128", "255.255.255.192", "255.255.255.224", "255.255.255.240", "255.255.255.248", "255.255.255.252"
];

export default function ConfigurationPage() {
  const { clientId } = useParams();
  const [devices, setDevices] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Nmap Scan States
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);

  useEffect(() => {
    // Fetch current client name
    axios.get(`http://localhost:8000/clients`).then(res => {
      const current = res.data.find((c: any) => c._id === clientId);
      if (current) setClientName(current.name);
    });
    // Fetch switches for this tenant
    axios.get(`http://localhost:8000/history/${clientId}`).then(res => setDevices(res.data));
  }, [clientId]);

  const dev = devices[currentIndex] || null;

  // Run Nmap network discovery
  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await axios.get(`http://localhost:8000/clients/${clientId}/scan?subnet=${subnet}`);
      setScanResults(res.data);
    } catch (err) {
      alert("Nmap scan failed. Check if Nmap is installed on Ubuntu server.");
    }
    setIsScanning(false);
  };

  // Add a host found via Nmap to the current staging list
  const addDiscovered = (ip: string) => {
    const newSwitch = {
      client_id: clientId,
      hostname: `SW-AUTO-${ip.split('.').pop()}`,
      ip_admin: ip,
      subnet_admin: "255.255.255.0",
      ip_gateway: "0.0.0.0",
      vlan_id: 10,
      po_id: 1,
      username: "admin",
      password: "CiscoPassword123"
    };
    setDevices([...devices, newSwitch]);
    setScanResults(scanResults.filter(r => r.ip !== ip));
  };

  const handleBulkSave = async () => {
    setIsSaving(true);
    await axios.put(`http://localhost:8000/clients/${clientId}/save-all`, devices);
    setIsSaving(false);
    alert("Database updated successfully!");
  };

  // Logic to prevent invalid Cisco syntax during typing
  const validateInput = (f: string, v: string) => {
    if (v.includes(" ")) return;
    if (f === 'hostname' && /[^a-zA-Z0-9-_]/.test(v)) return;
    if (['ip_admin', 'subnet_admin', 'ip_gateway'].includes(f) && /[^0-9.]/.test(v)) return;
    
    const upd = [...devices]; 
    upd[currentIndex][f] = v; 
    setDevices(upd);
  };

  const getError = (f: string, v: string) => {
    if (!v) return "Required";
    if (f === 'subnet_admin' && !VALID_MASKS.includes(v)) return "Invalid Mask";
    if (f.includes('ip') && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v)) return "Format Error";
    return null;
  };

  const generateConfig = () => {
    if (!dev) return "";
    return `!
hostname ${dev.hostname}
!
service password-encryption
no ip domain-lookup
!
vlan ${dev.vlan_id || 10}
 name MANAGEMENT
!
interface Port-channel ${dev.po_id || 1}
 description UPLINK_AGGREGATION
 switchport mode trunk
 switchport nonegotiate
!
interface GigabitEthernet 1/0/1
 description UPLINK_PRIMARY
 switchport mode trunk
 channel-group ${dev.po_id || 1} mode active
!
interface GigabitEthernet 1/0/2
 description UPLINK_SECONDARY
 switchport mode trunk
 channel-group ${dev.po_id || 1} mode active
!
interface Vlan ${dev.vlan_id || 10}
 ip address ${dev.ip_admin} ${dev.subnet_admin}
 no shutdown
!
ip default-gateway ${dev.ip_gateway}
!
username ${dev.username} privilege 15 secret ${dev.password}
!
line vty 0 4
 transport input ssh
 login local
!
end`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-[#0b0f1a]">
      {/* SIDEBAR */}
      <div className="w-80 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col text-left shadow-xl z-20">
        
        {/* Navigation & Context */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 mb-4 transition-all">
            <ChevronLeft size={14}/> Back to Tenants
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Building2 size={18}/></div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold truncate">{clientName || "Loading..."}</h2>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">NTT Client</p>
            </div>
          </div>
        </div>

        {/* Nmap Discovery Section */}
        <div className="p-6 border-b dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
            <label className="text-[9px] font-black uppercase text-blue-600 mb-2 block tracking-widest">Network Tracker</label>
            <div className="flex gap-2 mb-3">
                <input value={subnet} onChange={e => setSubnet(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-2 text-[10px] outline-none" placeholder="192.168.1.0/24" />
                <button onClick={handleScan} disabled={isScanning} className="bg-blue-600 p-2 rounded-lg text-white hover:bg-blue-700">
                    {isScanning ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
                </button>
            </div>
            {scanResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700 mb-2 shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-green-500">{r.ip}</span>
                    <button onClick={() => addDiscovered(r.ip)} className="text-blue-600 hover:scale-110"><PlusCircle size={16}/></button>
                </div>
            ))}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-b dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={handleBulkSave} disabled={isSaving} className="bg-green-600 text-white rounded-xl py-3 text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-green-700 transition-all">
                   <Save size={12}/> {isSaving ? "Saving..." : "Save All"}
                </button>
                <label className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all">
                   <Upload size={12}/> Import <input type="file" className="hidden" onChange={e => e.target.files && (async (file) => {
                       const fd = new FormData(); fd.append('file', file);
                       await axios.post(`http://localhost:8000/clients/${clientId}/import`, fd);
                       axios.get(`http://localhost:8000/history/${clientId}`).then(res => setDevices(res.data));
                   })(e.target.files[0])} />
                </label>
            </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {devices.map((d, idx) => (
            <div key={idx} onClick={() => setCurrentIndex(idx)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${currentIndex === idx ? "bg-blue-600 text-white shadow-lg scale-[1.02]" : "dark:bg-slate-800/20 border-transparent hover:border-slate-300 dark:hover:border-slate-700"}`}>
              <p className="text-xs font-bold truncate">{d.hostname}</p>
              <p className="text-[10px] opacity-60 font-mono tracking-tighter">{d.ip_admin}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 flex flex-col p-10 overflow-y-auto">
        {dev ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Editor */}
            <div className="bg-white dark:bg-slate-900/40 border dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm text-left h-fit">
              <h3 className="text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 mb-10"><ShieldCheck size={14}/> Technical Staging</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                {['hostname', 'ip_admin', 'subnet_admin', 'ip_gateway', 'vlan_id', 'po_id', 'username', 'password'].map(f => {
                  const err = getError(f, dev[f]);
                  return (
                    <div key={f} className="relative text-left">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-2 block ml-1">{f.replace('_', ' ')}</label>
                      <input value={dev[f] || ""} onChange={(e) => validateInput(f, e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-5 py-4 text-sm outline-none transition-all ${err ? 'border-red-500 ring-4 ring-red-500/10' : 'dark:border-slate-700 focus:ring-4 ring-blue-500/10'}`} />
                      {err && <div className="absolute -bottom-6 left-1 text-[8px] font-bold text-red-500 uppercase flex items-center gap-1"><AlertCircle size={10}/> {err}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terminal */}
            <div className="bg-[#2d333b] dark:bg-black rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[600px] text-left transition-all duration-500 shadow-blue-900/10">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                <span className="font-mono text-[10px] font-bold text-green-500 uppercase tracking-widest text-left">Cisco IOS Staging Output</span>
                <div className="flex gap-4 text-slate-400">
                    <button onClick={() => { navigator.clipboard.writeText(generateConfig()); alert("Copied!"); }}>
                        <Copy size={20}/>
                    </button>
                    <button onClick={() => { const b = new Blob([generateConfig()], {type:'text/plain'}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`${dev.hostname}.txt`; a.click(); }}>
                        <Package size={20}/>
                    </button>
                </div>
              </div>
              <pre className="flex-1 font-mono text-[13px] text-slate-400 overflow-y-auto text-left leading-relaxed">
                {generateConfig()}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 italic font-black text-xs uppercase tracking-[0.3em]">
             <Terminal size={48} className="mb-4"/>
             Select or Discovery a switch
          </div>
        )}
      </div>
    </div>
  );
}
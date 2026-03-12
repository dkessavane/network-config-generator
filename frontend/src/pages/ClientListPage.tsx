// --- Client Management Page with Mandatory Validation ---

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Folder, ChevronRight, LayoutGrid } from "lucide-react";
import axios from "axios";

export default function ClientListPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const navigate = useNavigate();

  const fetchClients = () => {
    axios.get("http://localhost:8000/clients").then(res => setClients(res.data));
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async () => {
    if (!newClientName.trim()) return;
    await axios.post("http://localhost:8000/clients", { name: newClientName.trim() });
    setNewClientName("");
    fetchClients();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this client and all its switch configurations?")) {
      await axios.delete(`http://localhost:8000/clients/${id}`);
      fetchClients();
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-12 text-left">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Tenant Portal</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Network Staging Management</p>
        </div>
        <div className="flex gap-2">
          <input 
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="New Client Name..."
            className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm w-64"
          />
          <button 
            disabled={!newClientName.trim()}
            onClick={handleAdd} 
            className="bg-blue-600 disabled:bg-slate-300 text-white p-2 rounded-xl"
          >
            <Plus size={24}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {clients.map(c => (
          <div key={c._id} onClick={() => navigate(`/config/${c._id}`)} className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-8 rounded-[2.5rem] hover:border-blue-500 transition-all cursor-pointer relative group overflow-hidden text-left">
            <div className="flex justify-between items-start mb-6">
              <Folder size={32} className="text-blue-600"/>
              <button onClick={(e) => handleDelete(c._id, e)} className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={20}/>
              </button>
            </div>
            <h3 className="text-xl font-bold mb-2">{c.name}</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 group-hover:text-blue-500 transition-colors">
              Enter Workspace <ChevronRight size={14}/>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
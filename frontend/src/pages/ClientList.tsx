import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");

  const fetchClients = () => axios.get("http://localhost:8000/clients").then(res => setClients(res.data));
  useEffect(() => { fetchClients(); }, []);

  const handleImport = async (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    await axios.post(`http://localhost:8000/clients/${id}/import`, fd);
    alert("Importation des switchs terminée avec succès !");
  };

  return (
    <div className="p-10 max-w-6xl mx-auto text-left">
      <div className="flex justify-between items-center mb-10 text-left">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">Portails Clients</h1>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nouveau client..." className="border rounded-lg px-4 py-2 dark:bg-slate-800 dark:border-slate-700 text-black dark:text-white outline-none" />
          <button onClick={async () => { await axios.post("http://localhost:8000/clients", {name}); setName(""); fetchClients(); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">CRÉER</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {clients.map((c: any) => (
          <div key={c._id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border dark:border-slate-800 text-left">
            <Users className="text-blue-600 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-6">{c.name}</h3>
            <div className="flex flex-col gap-2">
              <label className="bg-slate-100 dark:bg-slate-800 py-3 rounded-xl text-center cursor-pointer font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                <Upload size={14} className="inline mr-2"/> Importer Excel NTT
                <input type="file" className="hidden" onChange={e => e.target.files && handleImport(c._id, e.target.files[0])} />
              </label>
              <Link to={`/config/${c._id}`} className="bg-blue-600 text-white py-3 rounded-xl text-center font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition">Gérer le Parc <ChevronRight size={14} className="inline"/></Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
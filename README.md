# Network Lab - Switch Config Generator

This project is a professional web-based tool designed to generate **Cisco Switch** configurations (IOS). It features a **React** frontend and a **FastAPI** backend with **MongoDB** persistence.

## 🚀 Key Features

* **Real-time CLI Preview**
  See the Cisco configuration update as you type.

* **Dynamic Interfaces**
  Add or remove TenGigabitEthernet links with LACP (EtherChannel) support.

* **Smart Validation**
  Real-time visual feedback for IPv4 addresses, subnet masks, and VLAN IDs.

* **Database Persistence**
  Save your configurations to **MongoDB** and reload them from the history modal.

* **Modular Templates**
  Uses **Jinja2** modular templates for clean and professional configuration files.

---

## 🛠️ Installation & Setup

### 1. Prerequisites

* **Node.js** v18+
* **Python** 3.9+
* **MongoDB** (local)

---

### 2. Backend Setup (FastAPI)

1. Go to the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate the virtual environment (**staging**):

   ```bash
   python -m venv staging
   # On Windows:
   staging\Scripts\activate
   # On macOS/Linux:
   source staging/bin/activate
   ```

3. Install required packages:

   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:

   ```bash
   uvicorn main:app --reload
   ```

---

### 3. Frontend Setup (React)

1. Go to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application:

   ```bash
   npm run dev
   ```

---

## 📂 Architecture

* `/frontend`
  React + Vite, Tailwind CSS, Lucide-React Icons

* `/backend`
  FastAPI, Motor (Async MongoDB), Pydantic validation

* `/backend/templates`
  Modular `.j2` snippets (VLAN, SSH, Interfaces, etc.) for better maintainability

# 🌐 Network Lab - Switch Config Generator

This project is a professional web-based tool designed to generate **Cisco Switch** configurations (IOS). It features a **React** frontend and a **FastAPI** backend with **MongoDB** persistence.

## 🚀 Key Features

* **Real-time CLI Preview**
  Instant Cisco configuration updates as you type.

* **Professional Quality Assurance**
  Automated integration tests using **Pytest** and **pytest-sugar** to ensure API reliability.

* **Advanced Logging System**
  Full traceability of generation requests and database events for easy troubleshooting.

* **Smart Validation**
  Strict enforcement of IPv4, VLAN, and Port-Channel standards via **Pydantic V2**.

* **Database Persistence**
  Configuration history management with **MongoDB** and **Motor** (Async driver).

---

## 🛠️ Installation & Setup

### 1. Prerequisites

* **Node.js** v18+
* **Python** 3.12+ (Recommended for Pydantic V2 support)
* **MongoDB** (Local instance running on port 27017)

---

### 2. Backend Setup (FastAPI)

1. Go to the backend directory:
```bash
cd backend

```


2. Create and activate the virtual environment (**staging**):
```bash
python -m venv staging
source staging/bin/activate # Linux/macOS

```


3. Install required packages:
```bash
pip install -r requirements.txt

```


4. Run the server:
```bash
uvicorn app.main:app --reload

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

## 🧪 Testing & Quality Assurance

The project includes an automated suite of integration tests to ensure API reliability.

To run the tests with a detailed output:

```bash
cd backend
python -m pytest -v

```

*Current coverage: Successful generation flow, IP/VLAN boundary testing, and minimum interface requirements.*

---

## 📂 Architecture & Structure

```text
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes, schemas and logic
│   │   └── config.py        # Settings and env variables
│   ├── templates/           # Jinja2 Cisco IOS modular snippets
│   │   ├── main_switch_config.j2  # Main template entry point
│   │   ├── vlan_config.j2         # VLAN & Admin interface setup
│   │   ├── ssh_config.j2          # VTY lines, crypto and local user
│   │   ├── basic_config.j2         # Contact info
│   │   ├── routing_config.j2         # Ip & gateway 
│   │   └── interface_config.j2    # Physical ports & EtherChannel (LACP)
│   ├── tests/               # Pytest integration tests
│   │   └── test_main.py
│   ├── .gitignore           # Python/Pytest ignore rules
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/                 # React components and hooks
│   ├── public/              # Static assets
│   ├── package.json         # Node.js dependencies
│   └── ...
└── README.md                # Project documentation

```

---
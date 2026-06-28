# 🔐 Secure Workspace Platform

A full-stack team collaboration platform engineered with enterprise-grade security features. Built using FastAPI, MongoDB, and React.

## 🌐 Live Demo
> 🚀 Coming soon after deployment.

---

## 📸 Screenshots
> Visual previews can be found directly inside the `/screenshots` directory.

---

## ✨ Features

* **JWT Authentication** – Access & refresh token lifecycle management with secure `bcrypt` password hashing.
* **Workspace Management** – Seamlessly create workspaces and invite members via an approval-based onboarding flow.
* **Role-Based Access Control (RBAC)** – Fine-grained authorization tiers mapping across Admin, Member, and Viewer roles.
* **Kanban Task Management** – Dynamic task pipeline (Todo → In Progress → Done) featuring native drag-and-drop mechanics.
* **Security Dashboard** – Real-time visualization of active login session history, historical activity audit logs, and calculated security health scores.
* **Encrypted File Processing** – Secure local handling and offloading via Cloudinary integrations for document and imagery storage.
* **Modern Interface** – Deep indigo responsive sidebar layout complete with micro-interactions, dark mode presets, and structured modals.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Python 3.13, FastAPI, Uvicorn |
| **Database** | MongoDB Atlas (via Motor async driver) |
| **Authentication** | JWT (`python-jose`), Passwords (`passlib` + `bcrypt`) |
| **Storage Engine** | Cloudinary API |
| **Deployment** | Vercel (Frontend Ecosystem), Render (Backend Engine) |

---

## 🏗️ Architecture

```text
secure-workspace/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── routers/       # API route handlers
│   │   ├── models/        # MongoDB collection models
│   │   ├── schemas/       # Pydantic validation schemas
│   │   ├── auth/          # JWT token & credential processing
│   │   ├── database/      # Async MongoDB driver setups
│   │   └── main.py        # Framework entry point
│   ├── .env.example
│   └── requirements.txt
└── frontend/              # React application
    ├── src/
    │   ├── components/    # Shared UI component ecosystem
    │   ├── pages/         # View & Route entry views
    │   ├── context/       # React State Context (AuthContext)
    │   ├── hooks/         # Architectural Custom hooks (useAuth)
    │   ├── service/       # Axios client integrations
    │   └── routes/        # Router access wrappers
    └── package.json
🚀 Local Setup                                                                                                                                                                                                                                  
Prerequisites
Python 3.10+

Node.js 18+

MongoDB Atlas Cluster (Free configuration tier sufficient)

Git CLI

Backend Environment Configuration
Navigate into the application space and initialize your virtual environment:

Bash
cd backend
python -m venv venv
Activate your ecosystem environment wrapper:

Bash
# Windows Git Bash
source venv/Scripts/activate

# macOS/Linux Terminal
source venv/bin/activate
Install dependencies and build runtime secrets:

Bash
pip install -r requirements.txt
cp .env.example .env
(Ensure you update .env with your dedicated cloud keys and database URLs)

Run the local development server instance:

Bash
uvicorn app.main:app --reload --port 8000
Frontend Environment Configuration
Open a new shell instance and change directories into the client root:

Bash
cd frontend
npm install
Configure local environment bindings:

Bash
cp .env.example .env
Boot up the Vite client pipeline:

Bash
npm run dev
🔑 Environment Secret Variables
backend/.env
Code snippet
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/secure-db
SECRET_KEY=your-highly-secure-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
frontend/.env
Code snippet
VITE_API_URL=http://localhost:8000
## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login and get tokens |
| PUT | `/api/auth/change-password` | Update password |
| GET | `/api/workspaces/` | Get all my workspaces |
| POST | `/api/workspaces/` | Create workspace |
| POST | `/api/workspaces/:id/invite` | Invite member |
| POST | `/api/workspaces/:id/accept-invite` | Accept invitation |
| GET | `/api/tasks/:workspace_id` | Get workspace tasks |
| POST | `/api/tasks/:workspace_id` | Create task |
| PUT | `/api/tasks/:workspace_id/:task_id` | Update task status |
| GET | `/api/security/logs` | Get login history |
| GET | `/api/security/stats` | Get security stats |

## 🔒 Security Features
- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens with short expiry (15 min access / 7 day refresh)
- Pending invitation system — members must accept before joining
- Activity logging for every login
- Role-based route protection on both frontend and backend

## 👨‍💻 Author
**Tuhi** — Full Stack Developer  
Built as a portfolio project demonstrating full-stack development skills.

## 📄 License
MIT
EOF

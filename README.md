# Enterprise Collaboration Platform

A full-stack, role-based task management and collaboration platform designed to streamline task delegation, complex approvals, and team workflows across different organizational levels.

## Features

* **AI-Powered Dashboard:** Dynamic intelligence engine that analyzes user workloads, highlights bottlenecks, and provides plain-English summaries alongside interactive analytics charts.
* **Role-Based Access Control (RBAC):** Strict permission enforcement and dynamic UI rendering for Administrators, Managers, and Employees.
* **Interactive Kanban Board:** Full drag-and-drop workflow (To-Do -> In Progress -> Review -> Done) with strict backend transition validation to enforce proper enterprise procedures.
* **Secure Document Management:** Attach files directly to specific tasks with automatic version control (`v1`, `v2`). Includes backend security validation to reject malicious file types.
* **Master Audit Trail:** Immutable system logging for enterprise accountability, tracking every task movement, comment, file upload, and approval action with timestamps and user IDs.
* **Enterprise Notification System:** Live inbox and sliding toast alerts keeping users instantly informed of task assignments, document uploads, and approval status changes.
* **Multi-Level Approval Engine:** Automated escalation workflows where Employees submit requests, Managers review/escalate, and Admins provide final authorization. Includes mandatory justification tracking.
* **Task Comments & Collaboration:** Context-aware messaging directly on task cards, featuring role-restricted "Internal Notes" visible only to management.
* **Secure Authentication:** JWT-based login and registration with bcrypt password hashing.
* **Task Delegation Engine:** Managers and Admins can create and assign tasks directly to specific employees.

## Tech Stack

**Backend**
* **Framework:** FastAPI (Python)
* **Database:** PostgreSQL (or MySQL / SQLite)
* **ORM:** SQLAlchemy
* **Security:** Passlib (Bcrypt), python-jose (JWT)
* **Enterprise Systems:** Python `logging` (Middleware), `shutil` & `os` (File Handling)

**Frontend**
* **Framework:** React.js
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Routing:** React Router DOM
* **State & Logic:** Axios, `@hello-pangea/dnd` (Drag & Drop)
* **Analytics:** Recharts
* **UI Components:** Lucide React (Icons), React Hot Toast (Notifications)

## Local Setup Instructions

### 1. Database Setup
1. Install PostgreSQL and pgAdmin.
2. Create a new database named `collab_db`.
3. Update the database URL in `backend/database.py` with your local PostgreSQL credentials.

### 2. Run the Backend
Navigate to the `backend` directory, activate the virtual environment, and start the server:

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```   
* The API will be available at: `http://localhost:8000`
* Interactive API Documentation: `http://localhost:8000/docs`

### 3. Run the Frontend

3. Run the Frontend
Open a new terminal, navigate to the frontend directory, install dependencies, and start the Vite development server:

Bash
cd frontend
npm install
npm run dev
The User Interface will be available at: http://localhost:5173

User Roles Reference
Admin: Full system access. Can view all users, monitor the master Activity/Audit log, write internal notes, and provide final authorization on escalated approval requests.

Manager: Can view, create, and assign tasks. Can write internal notes, and can approve, reject, or escalate employee requests to Admins.

Employee: Can only view tasks assigned directly to them, move tasks through the Kanban workflow, post public comments, upload/download task documents, and submit new approval requests.
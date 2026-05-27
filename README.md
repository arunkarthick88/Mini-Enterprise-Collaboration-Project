# Enterprise Collaboration Platform

A full-stack, role-based task management and SaaS collaboration platform designed to streamline task delegation, complex approvals, multi-tenant billing, and strict team workflows across different organizational levels.

## 🚀 Key Features

* **SLA & Workflow Governance (Phase 9):** Configure time-bound SLA rules with automated escalation milestones. Managers can set up vacation delegations, and users can manage granular notification preferences.
* **Real-Time WebSockets (Phase 5):** Live, multi-user Kanban board synchronization and instant system popup notifications without needing to refresh the page.
* **SaaS & Multi-Tenancy Billing (Phase 7):** Fully integrated Stripe payment processing, handling subscription tiers (Basic, Silver, Gold), automated organization provisioning, and AI-credit usage tracking.
* **AI-Powered Dashboard:** Dynamic intelligence engine that analyzes user workloads, highlights bottlenecks, and provides plain-English summaries alongside interactive analytics charts.
* **Master Compliance Audit Trail:** Immutable system logging for enterprise accountability. Features deep-dive JSON state tracking for previous and new data states, easily filterable by module, user, and date.
* **Multi-Level Approval Engine:** Automated escalation workflows where Employees submit requests, Managers review/escalate, and Admins provide final authorization.
* **Interactive Kanban Board:** Full drag-and-drop workflow (To-Do -> In Progress -> Review -> Done) with strict backend transition validation to enforce proper enterprise procedures.
* **Secure Document Management:** Attach files directly to specific tasks with automatic version control (`v1`, `v2`). Includes backend security validation to reject malicious file types.
* **Advanced Security & Performance:** Integrated API rate limiting, in-memory caching for heavy dashboard queries, JWT authentication, and secure password reset flows.

## 💻 Tech Stack

**Backend**
* **Framework:** FastAPI (Python)
* **Database & Migrations:** PostgreSQL, SQLAlchemy ORM, Alembic
* **Real-Time:** WebSockets
* **Security & Auth:** Passlib (Bcrypt), python-jose (JWT), SlowAPI (Rate Limiting)
* **Performance:** FastAPI-Cache2
* **Integrations:** Stripe Python SDK

**Frontend**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **State & Logic:** Axios, `@hello-pangea/dnd` (Drag & Drop)
* **Visuals & UI:** Recharts (Analytics), Lucide React (Icons), React Hot Toast
* **Billing:** Stripe Elements / Checkout

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
Admin: Full system access. Can configure SLA Rules, monitor the master JSON Audit log, oversee billing, write internal notes, and provide final authorization on escalated approval requests.

Manager: Can view, create, and assign tasks. Can write internal notes, approve/escalate employee requests, and schedule approval delegations during absences.

Employee: Can only view tasks assigned directly to them, move tasks through the Kanban workflow, post public comments, upload task documents, and submit new approval requests.
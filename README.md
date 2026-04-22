# Enterprise Collaboration Platform

A full-stack, role-based task management and collaboration platform designed to streamline task delegation and tracking across different organizational levels.

## Features (Phase 1)

* **Role-Based Access Control (RBAC):** Strict permission enforcement for Administrators, Managers, and Employees.
* **Secure Authentication:** JWT-based login and registration with bcrypt password hashing.
* **Task Delegation Engine:** Managers and Admins can create and assign tasks directly to specific employees.
* **Dynamic Workflows:** Employees receive personalized dashboards showing only their assigned tasks and can update statuses (To-Do -> In Progress -> Done).
* **RESTful API:** A robust, fully-documented Python backend.
* **Modern UI:** A responsive, clean interface built with React and Tailwind CSS.

## Tech Stack

**Backend**
* Framework: FastAPI (Python)
* Database: PostgreSQL
* ORM: SQLAlchemy
* Migrations: Alembic
* Security: Passlib (Bcrypt), python-jose (JWT)

**Frontend**
* Framework: React.js
* Build Tool: Vite
* Styling: Tailwind CSS
* Routing: React Router DOM
* HTTP Client: Axios

Local Setup Instructions
1. Database Setup
Install PostgreSQL and pgAdmin.

Create a new database named collab_db.

Update the database URL in backend/database.py with your local PostgreSQL credentials.

2. Run the Backend
Navigate to the backend directory, activate the virtual environment, and start the server:

Bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
The API will be available at: http://localhost:8000
Interactive API Documentation: http://localhost:8000/docs

3. Run the Frontend
Open a new terminal, navigate to the frontend directory, install dependencies, and start the Vite development server:

Bash
cd frontend
npm install
npm run dev
The User Interface will be available at: http://localhost:5173

User Roles Reference
Admin: Full system access. Can view all users, create tasks, assign tasks, and delete tasks.

Manager: Can view, create, assign, and delete tasks.

Employee: Can only view tasks assigned directly to them and update the task status.
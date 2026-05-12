import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- Import Toaster
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Approvals from './pages/Approvals';
import CreateTask from './pages/CreateTask';
import Users from './pages/Users';
import ActivityLog from './pages/ActivityLog';
import Notifications from './pages/Notifications';

function PrivateRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/" />;
}

export default function App() {
    return (
        <BrowserRouter>
            {/* The Toaster component handles sliding notifications across all pages */}
            <Toaster position="top-right" reverseOrder={false} /> 
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/kanban" element={<PrivateRoute><Kanban /></PrivateRoute>} />
                <Route path="/approvals" element={<PrivateRoute><Approvals /></PrivateRoute>} />
                <Route path="/create-task" element={<PrivateRoute><CreateTask /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
                <Route path="/activity" element={<PrivateRoute><ActivityLog /></PrivateRoute>} />
                <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            </Routes>
        </BrowserRouter>
    );
}
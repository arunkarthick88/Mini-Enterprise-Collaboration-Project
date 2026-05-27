import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; 
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Approvals from './pages/Approvals';
import CreateTask from './pages/CreateTask';
import Users from './pages/Users';
import ActivityLog from './pages/ActivityLog';
import Notifications from './pages/Notifications';
import Pricing from './pages/Pricing'; 

// --- PHASE 9: NEW GOVERNANCE PAGES ---
import SlaRules from './pages/SlaRules';
import SlaDashboard from './pages/SlaDashboard';
import ApprovalEscalations from './pages/ApprovalEscalations';
import ApprovalDelegations from './pages/ApprovalDelegations';
import NotificationPreferences from './pages/NotificationPreferences'; // <-- NEW IMPORT
// -------------------------------------

// --- PHASE 5: Global WebSocket Listener ---
function GlobalWebSocket() {
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) return;

        const user = JSON.parse(userStr);
        // Connect to the new Phase 5 WebSocket endpoint
        const socket = new WebSocket(`ws://localhost:8000/ws/${user.id}`);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // 1. Handle Personal Popups
            if (data.type === "NOTIFICATION") {
                toast.success(data.message, {
                    duration: 5000,
                    style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                    },
                });
            }
            
            // 2. Handle Live Kanban Refreshes
            if (data.type === "KANBAN_UPDATE") {
                // We broadcast a custom event to the browser window. 
                // We will update Kanban.jsx to listen for this!
                window.dispatchEvent(new Event('kanban_updated'));
            }
        };

        // Cleanup on unmount
        return () => {
            socket.close();
        };
    }, []); 

    return null; // This component doesn't render any UI itself
}
// ------------------------------------------

function PrivateRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/" />;
}

export default function App() {
    return (
        <BrowserRouter>
            {/* The Toaster component handles sliding notifications across all pages */}
            <Toaster position="top-right" reverseOrder={false} /> 
            
            {/* This invisible component listens for real-time WebSocket events */}
            <GlobalWebSocket />

            <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* PRIVATE ENTERPRISE ROUTES */}
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/kanban" element={<PrivateRoute><Kanban /></PrivateRoute>} />
                <Route path="/approvals" element={<PrivateRoute><Approvals /></PrivateRoute>} />
                <Route path="/create-task" element={<PrivateRoute><CreateTask /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
                <Route path="/activity" element={<PrivateRoute><ActivityLog /></PrivateRoute>} />
                <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
                <Route path="/pricing" element={<PrivateRoute><Pricing /></PrivateRoute>} /> 
                
                {/* --- PHASE 9: SLA & GOVERNANCE ROUTES --- */}
                <Route path="/sla-rules" element={<PrivateRoute><SlaRules /></PrivateRoute>} />
                <Route path="/sla-dashboard" element={<PrivateRoute><SlaDashboard /></PrivateRoute>} />
                <Route path="/approval-escalations" element={<PrivateRoute><ApprovalEscalations /></PrivateRoute>} />
                <Route path="/approval-delegations" element={<PrivateRoute><ApprovalDelegations /></PrivateRoute>} />
                <Route path="/notification-preferences" element={<PrivateRoute><NotificationPreferences /></PrivateRoute>} /> {/* <-- NEW ROUTE */}
            </Routes>
        </BrowserRouter>
    );
}
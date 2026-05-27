import { Link, useNavigate } from 'react-router-dom';
import { Bell, ShieldAlert, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function Navbar({ user, aiData }) {
    const navigate = useNavigate();
    const [showGovMenu, setShowGovMenu] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!user) return null;

    // Check roles for menu visibility based on your Phase 9 Spec
    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager' || isAdmin;
    const isAuditor = user.role === 'auditor' || isAdmin;

    return (
        <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md relative z-50">
            <div>
                <h1 className="text-2xl font-bold tracking-wide flex items-center gap-2">
                    TaskFlow <span className="bg-blue-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-widest text-blue-200 border border-blue-500">Enterprise</span>
                </h1>
                <p className="text-xs text-blue-200">{user.name} - {user.role.toUpperCase()}</p>
            </div>
            
            <div className="flex items-center gap-5 text-sm font-medium">
                {/* Standard Links */}
                <Link to="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
                <Link to="/kanban" className="hover:text-blue-200 transition">Kanban</Link>
                <Link to="/approvals" className="hover:text-blue-200 transition">Approvals</Link>
                
                {/* 🛡️ GOVERNANCE DROPDOWN (Phase 9) */}
                <div className="relative">
                    <button 
                        onClick={() => setShowGovMenu(!showGovMenu)}
                        className="flex items-center gap-1 hover:text-blue-200 transition bg-blue-700/50 px-3 py-1.5 rounded-lg"
                    >
                        <ShieldAlert size={16} /> Governance <ChevronDown size={14} />
                    </button>
                    
                    {showGovMenu && (
                        <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden text-gray-800 flex flex-col py-2">
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Workflow Settings</div>
                            
                            {(isManager || isAuditor) && <Link to="/sla-dashboard" className="px-4 py-2 hover:bg-gray-50 text-sm">SLA Dashboard</Link>}
                            {isAdmin && <Link to="/sla-rules" className="px-4 py-2 hover:bg-gray-50 text-sm">SLA Rules</Link>}
                            
                            {(isManager || isAuditor) && <Link to="/approval-escalations" className="px-4 py-2 hover:bg-gray-50 text-sm">Approval Escalations</Link>}
                            {isManager && <Link to="/approval-delegations" className="px-4 py-2 hover:bg-gray-50 text-sm">Approval Delegations</Link>}
                            
                            <div className="border-t border-gray-100 my-1"></div>
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</div>
                            
                            {isAuditor && <Link to="/audit-logs" className="px-4 py-2 hover:bg-gray-50 text-sm">Audit Logs</Link>}
                            <Link to="/notification-preferences" className="px-4 py-2 hover:bg-gray-50 text-sm">Notification Preferences</Link>
                        </div>
                    )}
                </div>

                {/* Billing & Notifications */}
                <Link to="/pricing" className="text-yellow-300 font-bold hover:text-yellow-100 transition ml-2">Upgrade</Link>
                
                <Link to="/notifications" className="relative cursor-pointer hover:text-blue-200 transition ml-2 flex items-center">
                    <Bell size={20} />
                    {aiData?.unread_notifications > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow">
                            {aiData.unread_notifications}
                        </span>
                    )}
                </Link>

                <button onClick={handleLogout} className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-1.5 rounded-lg transition ml-2 shadow-sm border border-blue-500">
                    Logout
                </button>
            </div>
        </nav>
    );
}
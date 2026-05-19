import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

export default function Navbar({ user, aiData }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!user) return null;

    return (
        <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
            <div>
                <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                <p className="text-xs text-blue-200">{user.name} - {user.role}</p>
            </div>
            <div className="flex items-center gap-5 text-sm font-medium">
                <Link to="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
                <Link to="/kanban" className="hover:text-blue-200 transition">Kanban</Link>
                <Link to="/approvals" className="hover:text-blue-200 transition">Approvals</Link>
                <Link to="/activity" className="hover:text-blue-200 transition">Activity</Link>
                <Link to="/create-task" className="hover:text-blue-200 transition">Create</Link>
                
                {/* SaaS Upgrade Link */}
                <Link to="/pricing" className="text-yellow-300 font-bold hover:text-yellow-100 transition">Upgrade</Link>
                
                {/* Admin/Manager Links */}
                {(user.role === 'admin' || user.role === 'manager') && (
                    <Link to="/users" className="hover:text-blue-200 transition">Users</Link>
                )}
                
                {/* Notification Bell (Only show red dot if aiData is passed and has unread) */}
                <Link to="/notifications" className="relative cursor-pointer hover:text-blue-200 transition ml-2 flex items-center">
                    <Bell size={20} />
                    {aiData?.unread_notifications > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow">
                            {aiData.unread_notifications}
                        </span>
                    )}
                </Link>

                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded transition ml-2">Logout</button>
            </div>
        </nav>
    );
}
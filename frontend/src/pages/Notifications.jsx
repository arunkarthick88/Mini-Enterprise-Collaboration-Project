import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, CheckCircle } from 'lucide-react';
import api from '../api';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications/');
            setNotifications(res.data);
        } catch (err) {
            navigate('/');
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchNotifications(); // Refresh list to remove the unread status
        } catch (err) {
            alert("Failed to update notification.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md mb-12">
                <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                <div className="flex items-center gap-5 text-sm font-medium">
                    <Link to="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
                    <Link to="/kanban" className="hover:text-blue-200 transition">Kanban</Link>
                    <Link to="/notifications" className="underline font-bold text-white">Notifications</Link>
                </div>
            </nav>

            <div className="max-w-3xl mx-auto p-4 space-y-4">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Bell size={24} /></div>
                    <h2 className="text-3xl font-bold text-gray-800">Your Inbox</h2>
                </div>
                
                {notifications.length === 0 ? (
                    <div className="text-center text-gray-400 italic py-12 bg-white rounded-2xl border border-gray-100">
                        You're all caught up! No notifications.
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className={`p-5 rounded-xl border flex items-center justify-between transition ${notif.is_read ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-blue-200 shadow-sm border-l-4 border-l-blue-500'}`}>
                            <div>
                                <p className={`text-sm ${notif.is_read ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>
                                    {notif.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                            </div>
                            {!notif.is_read && (
                                <button onClick={() => markAsRead(notif.id)} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                                    <CheckCircle size={14} /> Mark Read
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
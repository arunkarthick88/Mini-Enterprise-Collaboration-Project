import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/audit-logs/');
            setLogs(res.data);
        } catch (err) {
            if (err.response?.status === 403) {
                setError("Only administrators can view the master enterprise audit trail.");
            } else {
                setError("Failed to load activity logs.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md mb-12">
                <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                <div className="flex items-center gap-5 text-sm font-medium">
                    <Link to="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
                    <Link to="/kanban" className="hover:text-blue-200 transition">Kanban</Link>
                    <Link to="/approvals" className="hover:text-blue-200 transition">Approvals</Link>
                    <Link to="/activity" className="underline font-bold text-white">Activity</Link>
                    <Link to="/create-task" className="hover:text-blue-200 transition">Create</Link>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">Master Audit Trail</h2>
                
                {error ? (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-700 font-bold text-center">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center text-gray-400 italic py-8">No audit logs found.</div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                            <div>
                                <span className="font-black text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{log.action}</span>
                                <span className="text-gray-500 text-sm ml-3 font-medium">on {log.entity} #{log.entity_id}</span>
                                <p className="text-xs text-gray-400 mt-2">Performed by User ID: {log.user_id}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
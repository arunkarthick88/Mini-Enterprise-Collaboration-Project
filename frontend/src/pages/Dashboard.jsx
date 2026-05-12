import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, Bell } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [aiData, setAiData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

            const taskRes = await api.get('/tasks/');
            setTasks(taskRes.data);

            const appRes = await api.get('/approvals/');
            setApprovals(appRes.data);

            // Phase 3: Fetch the new AI Intelligence Data
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);
        } catch (err) {
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!user || !aiData) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Enterprise Dashboard...</div>;

    // --- CALCULATE ANALYTICS ---
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inReviewTasks = tasks.filter(t => t.status === 'review').length;
    const pendingApprovals = approvals.filter(a => a.status === 'pending').length;

    // Chart Data Preparation
    const barData = [
        { name: 'TODO', count: tasks.filter(t => t.status === 'todo').length },
        { name: 'IN PROGRESS', count: tasks.filter(t => t.status === 'in_progress').length },
        { name: 'REVIEW', count: tasks.filter(t => t.status === 'review').length },
        { name: 'DONE', count: tasks.filter(t => t.status === 'done').length }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            
            {/* TOP NAVBAR */}
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
                <div>
                    <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                    <p className="text-xs text-blue-200">{user.name} - {user.role}</p>
                </div>
                <div className="flex items-center gap-5 text-sm font-medium">
                    <Link to="/dashboard" className="underline hover:text-blue-200 transition">Dashboard</Link>
                    <Link to="/kanban" className="hover:text-blue-200 transition">Kanban</Link>
                    <Link to="/approvals" className="hover:text-blue-200 transition">Approvals</Link>
                    <Link to="/activity" className="hover:text-blue-200 transition">Activity</Link>
                    <Link to="/create-task" className="hover:text-blue-200 transition">Create</Link>
                    {(user.role === 'admin' || user.role === 'manager') && (
                        <Link to="/users" className="hover:text-blue-200 transition">Users</Link>
                    )}
                    
                    {/* NOTIFICATION BELL - FIXED WITH <Link> */}
                    <Link to="/notifications" className="relative cursor-pointer hover:text-blue-200 transition ml-2 flex items-center">
                        <Bell size={20} />
                        {aiData.unread_notifications > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow">
                                {aiData.unread_notifications}
                            </span>
                        )}
                    </Link>

                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded transition ml-2">Logout</button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-8">
                
                {/* HEADER SECTION */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
                        <p className="text-gray-500 mt-1">Enterprise Overview</p>
                    </div>
                </div>

                {/* 🤖 AI INSIGHT BANNER */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg mb-8 flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Sparkles size={24} className="text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-wider text-purple-200 uppercase mb-1">AI Assistant Summary</h3>
                        <p className="text-lg font-medium leading-relaxed">{aiData.ai_insight}</p>
                    </div>
                </div>

                {/* STAT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-white">
                    <div className="bg-purple-600 p-6 rounded-xl shadow-sm">
                        <p className="text-sm font-medium mb-2 opacity-90">Total Tasks</p>
                        <h3 className="text-4xl font-bold">{totalTasks}</h3>
                    </div>
                    <div className="bg-emerald-500 p-6 rounded-xl shadow-sm">
                        <p className="text-sm font-medium mb-2 opacity-90">Completed</p>
                        <h3 className="text-4xl font-bold">{completedTasks}</h3>
                    </div>
                    <div className="bg-amber-500 p-6 rounded-xl shadow-sm">
                        <p className="text-sm font-medium mb-2 opacity-90">Pending Approvals</p>
                        <h3 className="text-4xl font-bold">{pendingApprovals}</h3>
                    </div>
                    <div className="bg-blue-500 p-6 rounded-xl shadow-sm">
                        <p className="text-sm font-medium mb-2 opacity-90">In Review</p>
                        <h3 className="text-4xl font-bold">{inReviewTasks}</h3>
                    </div>
                </div>

                {/* CHARTS & RECENT ACTIVITY SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Task Distribution (Spans 2 columns) */}
                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Task Distribution</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* AI Recent Activity Feed */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            {aiData.recent_activity.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No recent activity found.</p>
                            ) : (
                                aiData.recent_activity.map((activity, idx) => (
                                    <div key={idx} className="border-l-2 border-blue-500 pl-3">
                                        <p className="text-xs font-bold text-gray-800">{activity.action}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(activity.time).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, AlertTriangle, Users, Crown } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar'; // <-- IMPORT THE NEW NAVBAR

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [aiData, setAiData] = useState(null);
    const [organization, setOrganization] = useState(null); // <-- State for Org/Billing details
    
    // --- PHASE 6: Insights State ---
    const [insights, setInsights] = useState(null);
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const userRes = await api.get('/auth/me');
            const currentUser = userRes.data;
            setUser(currentUser);

            // Fetch Organization details to get subscription status
            if (currentUser.organization_id) {
                const orgRes = await api.get(`/auth/organization/${currentUser.organization_id}`);
                setOrganization(orgRes.data);
            }

            const taskRes = await api.get('/tasks/');
            setTasks(taskRes.data);

            const appRes = await api.get('/approvals/');
            setApprovals(appRes.data);

            // Phase 3: Fetch the standard AI Summary
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            // Phase 6: Fetch Advanced Analytics for Managers/Admins
            if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                const insightsRes = await api.get('/dashboard/ai-insights');
                setInsights(insightsRes.data);
            }

        } catch (err) {
            console.error(err);
            localStorage.removeItem('token');
            navigate('/');
        }
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
        <div className="min-h-screen bg-gray-50 font-sans pb-12">
            
            {/* <-- UNIFIED NAVBAR --> */}
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-7xl mx-auto p-8">
                
                {/* HEADER SECTION with Subscription Badge */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
                        <p className="text-gray-500 mt-1">Enterprise Overview</p>
                    </div>
                    
                    {/* Display current subscription plan */}
                    {organization && organization.subscription_plan && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-2 rounded-xl shadow-sm">
                            <Crown size={18} className={`${organization.subscription_plan === 'gold' ? 'text-yellow-500' : organization.subscription_plan === 'silver' ? 'text-gray-400' : 'text-blue-500'}`} />
                            <span className="text-sm font-bold text-gray-700 capitalize">{organization.subscription_plan} Plan</span>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded ml-2">
                                {organization.ai_credits} AI Credits
                            </span>
                        </div>
                    )}
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

                {/* --- PHASE 6: ENTERPRISE ANALYTICS (Admin/Manager Only) --- */}
                {insights && (
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Enterprise Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Smart Assignment Guide */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Users size={18} className="text-blue-500"/> Smart Assignment Guide
                                </h4>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                    {insights.smart_assignment?.map(emp => (
                                        <div key={emp.user_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${emp.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {emp.active_tasks} Active • {emp.status}
                                            </span>
                                        </div>
                                    ))}
                                    {insights.smart_assignment?.length === 0 && <p className="text-sm text-gray-400 italic">No employees found.</p>}
                                </div>
                            </div>

                            {/* Delay Risk Detection */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-4 text-red-600 flex items-center gap-2">
                                    <AlertTriangle size={18} /> Delay Risk Detection
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {insights.critical_alerts?.map((alert, i) => {
                                        // Simple check to color code the fallback message vs actual risks
                                        const isRisk = alert.includes("🚨");
                                        return (
                                            <p key={i} className={`text-sm p-3 rounded-lg border-l-4 ${isRisk ? 'border-red-500 bg-red-50 text-red-800' : 'border-green-500 bg-green-50 text-green-800'}`}>
                                                {alert}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                            
                        </div>
                    </div>
                )}
                {/* -------------------------------------------------------- */}

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
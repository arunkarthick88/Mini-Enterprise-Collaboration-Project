import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, SLABadge, EmptyState, LoadingSpinner } from '../components/UI';

export default function SlaDashboard() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [activeRecords, setActiveRecords] = useState([]);
    const [breachedRecords, setBreachedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);

    // Filter controls
    const [filterModule, setFilterModule] = useState('all');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            const activeRes = await api.get('/sla/tracking/active');
            setActiveRecords(activeRes.data);

            const breachedRes = await api.get('/sla/tracking/breached');
            setBreachedRecords(breachedRes.data);
        } catch (err) {
            console.error("Failed to sync SLA compliance tracking records", err);
        } finally {
            setLoading(false);
        }
    };

    const triggerManualEvaluation = async () => {
        try {
            setEvaluating(true);
            await api.post('/sla/tracking/evaluate');
            // Refresh data arrays
            const activeRes = await api.get('/sla/tracking/active');
            setActiveRecords(activeRes.data);
            const breachedRes = await api.get('/sla/tracking/breached');
            setBreachedRecords(breachedRes.data);
        } catch (err) {
            alert("SLA verification execution failed.");
        } finally {
            setEvaluating(false);
        }
    };

    // Combine tracking items for comprehensive tabular auditing
    const combinedTracking = [...activeRecords, ...breachedRecords].filter(record => {
        return filterModule === 'all' || record.module_name === filterModule;
    });

    // Stat metric aggregations
    const activeCount = activeRecords.length;
    const breachCount = breachedRecords.length;
    const pipelineTotal = activeCount + breachCount;

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Governance Metrics...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-7xl mx-auto p-8">
                <PageHeader 
                    title="Workflow SLA Monitoring" 
                    subtitle="Live compliance auditing for ongoing tasks and governance workflows" 
                    actionButton={
                        <button 
                            onClick={triggerManualEvaluation}
                            disabled={evaluating}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"
                        >
                            <RefreshCw size={16} className={evaluating ? "animate-spin text-blue-500" : "text-gray-500"} />
                            {evaluating ? "Evaluating..." : "Run Compliance Check"}
                        </button>
                    }
                />

                {/* Analytical Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-white">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Monitored Pipeline Items</p>
                            <h3 className="text-4xl font-extrabold">{pipelineTotal}</h3>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl"><Layers size={24} /></div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Active Normal Status</p>
                            <h3 className="text-4xl font-extrabold">{activeCount}</h3>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl"><Clock size={24} /></div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Breached Escalation Alerts</p>
                            <h3 className="text-4xl font-extrabold">{breachCount}</h3>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl"><AlertTriangle size={24} /></div>
                    </div>
                </div>

                {/* Tracking Data Interface Container */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-gray-800">Operational SLA Queue</h3>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Module Group:</label>
                            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="border border-gray-200 rounded-xl p-2 text-sm bg-gray-50 text-gray-700 focus:outline-none">
                                <option value="all">Display All Workflows</option>
                                <option value="Task">Task Timelines</option>
                                <option value="Approval">Approval Lifecycles</option>
                            </select>
                        </div>
                    </div>

                    {combinedTracking.length === 0 ? (
                        <EmptyState message="No ongoing tracking streams are running for the selected module index." />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Module</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Record Code</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Compliance Status</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Monitored Since</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Target Resolution</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Breach / Incident Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinedTracking.map(record => (
                                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                        <td className="p-4 text-sm font-semibold text-gray-800">{record.module_name}s</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">REC-00{record.record_id}</td>
                                        <td className="p-4">
                                            <SLABadge status={record.status} />
                                        </td>
                                        <td className="p-4 text-xs text-gray-600">{new Date(record.start_time).toLocaleString()}</td>
                                        <td className="p-4 text-xs text-gray-700 font-medium">{new Date(record.due_time).toLocaleString()}</td>
                                        <td className="p-4 text-sm">
                                            {record.status === 'BREACHED' ? (
                                                <span className="text-red-600 font-medium text-xs flex items-center gap-1">
                                                    <ShieldAlert size={14} /> {record.breach_reason || "Deadline crossed"}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Within standard parameters</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
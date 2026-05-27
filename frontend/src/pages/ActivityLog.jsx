import { useState, useEffect } from 'react';
import { Search, Database, ArrowRight } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, LoadingSpinner } from '../components/UI';

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Phase 9 Filters
    const [filterModule, setFilterModule] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        fetchNavData();
        fetchLogs();
    }, [filterModule]);

    const fetchNavData = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);
        } catch (err) {
            console.error("Failed to load user nav data", err);
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const endpoint = filterModule 
                ? `/audit-logs/module/${filterModule}` 
                : `/audit-logs/`;
            const res = await api.get(endpoint);
            // Ensure compatibility with previous pagination schema if it exists
            const logData = res.data.items || res.data; 
            setLogs(logData);
            setError('');
        } catch (err) {
            if (err.response?.status === 403) {
                setError("Only administrators and auditors can view the master enterprise audit trail.");
            } else {
                setError("Failed to load activity logs.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-5xl mx-auto p-8 space-y-6">
                <PageHeader 
                    title="Master Compliance Audit Trail" 
                    subtitle="Immutable records of all enterprise workflow state changes" 
                />
                
                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter by exact Module Name (e.g. 'Task', 'Approval', 'SLA')" 
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-700 font-bold text-center">
                        {error}
                    </div>
                ) : logs.length === 0 && !isLoading ? (
                    <div className="text-center text-gray-400 italic py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                        No auditable events found matching current filters.
                    </div>
                ) : (
                    <div className={`space-y-3 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        {logs.map(log => (
                            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                {/* Log Header Row */}
                                <div 
                                    onClick={() => toggleExpand(log.id)}
                                    className="p-5 flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400">
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-black text-[10px] tracking-wider px-2 py-0.5 rounded uppercase ${
                                                    log.action?.includes('CREATE') ? 'bg-green-100 text-green-700' :
                                                    log.action?.includes('DELETE') ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-gray-800 font-bold text-sm">
                                                    {log.module_name || log.entity} #{log.record_id || log.entity_id}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Operator ID: <span className="font-bold text-gray-700">{log.user_id || "System"}</span> • {log.ip_address || "Internal IP"}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex items-center gap-4">
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Deep-Dive JSON Data (Phase 9) */}
                                {expandedLogId === log.id && (log.old_data || log.new_data) && (
                                    <div className="p-5 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Previous State</h4>
                                            <pre className="text-xs text-red-700 bg-red-50 p-3 rounded-lg overflow-x-auto border border-red-100">
                                                {log.old_data ? JSON.stringify(log.old_data, null, 2) : "Null / Created"}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2">New State</h4>
                                            <pre className="text-xs text-green-700 bg-green-50 p-3 rounded-lg overflow-x-auto border border-green-100">
                                                {log.new_data ? JSON.stringify(log.new_data, null, 2) : "Null / Deleted"}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
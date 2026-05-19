import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar'; // <-- 1. IMPORT THE NEW NAVBAR

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // <-- 2. ADD STATE FOR THE NAVBAR -->
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    
    const navigate = useNavigate();

    // Fetch User and AI data for Navbar when the component mounts
    useEffect(() => {
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
        fetchNavData();
    }, []);

    // Re-fetch logs whenever the page changes
    useEffect(() => {
        fetchLogs(currentPage);
    }, [currentPage]);

    const fetchLogs = async (page) => {
        setIsLoading(true);
        try {
            // We pass the page and size as query parameters
            const res = await api.get(`/audit-logs/?page=${page}&size=10`);
            setLogs(res.data.items);
            setTotalPages(res.data.total_pages);
            setError('');
        } catch (err) {
            if (err.response?.status === 403) {
                setError("Only administrators can view the master enterprise audit trail.");
            } else {
                setError("Failed to load activity logs.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            
            {/* <-- 3. REPLACE OLD <nav> WITH YOUR NEW COMPONENT --> */}
            <div className="mb-12">
                <Navbar user={user} aiData={aiData} />
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-2xl font-bold text-gray-800">Master Audit Trail</h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages}
                    </span>
                </div>
                
                {error ? (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-700 font-bold text-center">
                        {error}
                    </div>
                ) : logs.length === 0 && !isLoading ? (
                    <div className="text-center text-gray-400 italic py-8">No audit logs found.</div>
                ) : (
                    <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
                        {logs.map(log => (
                            <div key={log.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition mb-4">
                                <div>
                                    <span className="font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded uppercase">{log.action}</span>
                                    <span className="text-gray-500 text-sm ml-3 font-medium">{log.entity} <span className="text-gray-300">#{log.entity_id}</span></span>
                                    <p className="text-xs text-gray-400 mt-2">Performed by User ID: <span className="text-gray-600 font-bold">{log.user_id}</span></p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGINATION CONTROLS */}
                {!error && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                            Previous
                        </button>
                        
                        <div className="flex gap-2">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                                        currentPage === i + 1 
                                            ? "bg-blue-600 text-white shadow-md" 
                                            : "bg-white border border-gray-200 text-gray-500 hover:border-blue-400"
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || isLoading}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
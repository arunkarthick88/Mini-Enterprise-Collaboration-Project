import React, { useState, useEffect } from 'react';
import { Layers, Plus, Hash, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <-- ADDED
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, EmptyState } from '../components/UI';
import { toast } from 'react-hot-toast';

export default function Workspaces() {
    const navigate = useNavigate(); // <-- ADDED
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', visibility: 'PRIVATE' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);
            
            const wsRes = await api.get('/workspaces/');
            setWorkspaces(wsRes.data);
        } catch (err) {
            console.error("Failed to load workspaces", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/workspaces/', formData);
            toast.success("Workspace created!");
            setIsCreateOpen(false);
            setFormData({ name: '', description: '', visibility: 'PRIVATE' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create workspace");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Workspaces...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <PageHeader 
                    title="Collaboration Workspaces" 
                    subtitle="Isolated environments for teams and projects"
                    actionButton={
                        <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition">
                            <Plus size={16} /> New Workspace
                        </button>
                    }
                />

                {workspaces.length === 0 ? (
                    <EmptyState message="No workspaces have been created in your organization yet." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaces.map(ws => (
                            <div 
                                key={ws.id} 
                                onClick={() => navigate(`/workspaces/${ws.id}`)} 
                                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-inner">
                                            {ws.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 ${ws.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {ws.visibility === 'PUBLIC' ? <Hash size={12} /> : <Lock size={12} />} {ws.visibility}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{ws.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">{ws.description || "No description provided."}</p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 font-medium">
                                    <span>Created: {new Date(ws.created_at).toLocaleDateString()}</span>
                                    <button className="text-blue-600 font-bold hover:underline">Enter Workspace &rarr;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Workspace Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Layers className="text-blue-500" /> Create Workspace</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Workspace Name</label>
                                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Engineering Team" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" rows="3" placeholder="A space for devs..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Visibility</label>
                                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                    <option value="PRIVATE">Private (Invite Only)</option>
                                    <option value="PUBLIC">Public (Open to Organization)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
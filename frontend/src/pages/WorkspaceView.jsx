import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Users, Plus, Shield, MessageSquare } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, EmptyState, StatusBadge } from '../components/UI';
import { toast } from 'react-hot-toast';

export default function WorkspaceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState(null);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isChannelOpen, setIsChannelOpen] = useState(false);
    const [isMemberOpen, setIsMemberOpen] = useState(false);

    // Forms
    const [channelForm, setChannelForm] = useState({ name: '', description: '', type: 'PUBLIC' });
    const [memberForm, setMemberForm] = useState({ user_id: '', role: 'Member' });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            const wsRes = await api.get(`/workspaces/${id}`);
            setWorkspace(wsRes.data);

            const chRes = await api.get(`/workspaces/${id}/channels`);
            setChannels(chRes.data);

            const memRes = await api.get(`/workspaces/${id}/members`);
            setMembers(memRes.data);

            const usersRes = await api.get('/auth/users');
            setAllUsers(usersRes.data);
        } catch (err) {
            toast.error("Failed to load workspace details.");
            navigate('/workspaces');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChannel = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/channels/?workspace_id=${id}`, channelForm);
            toast.success("Channel created!");
            setIsChannelOpen(false);
            setChannelForm({ name: '', description: '', type: 'PUBLIC' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create channel");
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/workspaces/${id}/members`, memberForm);
            toast.success("Member added to workspace!");
            setIsMemberOpen(false);
            setMemberForm({ user_id: '', role: 'Member' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to add member");
        }
    };

    if (loading || !workspace) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Workspace...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <div className="mb-8">
                    <button onClick={() => navigate('/workspaces')} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-2 transition">
                        &larr; Back to Workspaces
                    </button>
                    <PageHeader 
                        title={workspace.name} 
                        subtitle={workspace.description || "No description provided."}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* CHANNELS COLUMN */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><MessageSquare size={18}/> Channels</h3>
                            <button onClick={() => setIsChannelOpen(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                <Plus size={14} /> Add Channel
                            </button>
                        </div>
                        
                        {channels.length === 0 ? (
                            <EmptyState message="No channels created yet." />
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {channels.map(ch => (
                                    <div key={ch.id} className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition">
                                        <div>
                                            <h4 className="font-bold text-gray-800 flex items-center gap-1"><Hash size={16} className="text-gray-400"/> {ch.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{ch.description}</p>
                                        </div>
                                        <StatusBadge status={ch.type.toLowerCase()} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MEMBERS COLUMN */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18}/> Members</h3>
                            <button onClick={() => setIsMemberOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                <Plus size={14} /> Invite
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {members.map(mem => (
                                <div key={mem.id} className="p-4 border-b border-gray-50 last:border-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">
                                            ID{mem.user_id}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{mem.role}</span>
                                    </div>
                                    {mem.role === 'Workspace Admin' && <Shield size={14} className="text-blue-500" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Channel Modal */}
            {isChannelOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Hash className="text-gray-400" /> Create Channel</h3>
                        <form onSubmit={handleCreateChannel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Channel Name</label>
                                <input required value={channelForm.name} onChange={e => setChannelForm({...channelForm, name: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. project-alpha" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Description</label>
                                <input value={channelForm.description} onChange={e => setChannelForm({...channelForm, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="What is this channel for?" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsChannelOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {isMemberOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="text-blue-500" /> Add Member</h3>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Select User</label>
                                <select required value={memberForm.user_id} onChange={e => setMemberForm({...memberForm, user_id: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                    <option value="" disabled>Choose a user in your tenant...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Role</label>
                                <select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                    <option value="Member">Standard Member</option>
                                    <option value="Moderator">Moderator</option>
                                    <option value="Viewer">Viewer (Read-Only)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsMemberOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Add to Workspace</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
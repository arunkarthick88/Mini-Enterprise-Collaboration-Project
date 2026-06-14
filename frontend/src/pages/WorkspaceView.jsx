import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Users, Plus, Shield, MessageSquare, Send, CheckSquare, FileText, Info } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, EmptyState, StatusBadge } from '../components/UI';
import { toast } from 'react-hot-toast';

export default function WorkspaceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Core Data State
    const [workspace, setWorkspace] = useState(null);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [isChannelOpen, setIsChannelOpen] = useState(false);
    const [isMemberOpen, setIsMemberOpen] = useState(false);
    
    // Message State
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Forms
    const [channelForm, setChannelForm] = useState({ name: '', description: '', type: 'PUBLIC' });
    const [memberForm, setMemberForm] = useState({ user_id: '', role: 'Member' });

    useEffect(() => {
        fetchData();
        // Set up a basic polling for messages (In production, replace with Phase 5 WebSockets)
        const pollInterval = setInterval(fetchMessages, 5000);
        return () => clearInterval(pollInterval);
    }, [id]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (activeTab === 'messages') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

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

            await fetchMessages();
        } catch (err) {
            toast.error("Failed to load workspace details.");
            navigate('/workspaces');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/workspaces/${id}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    // --- Action Handlers ---
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

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await api.post(`/workspaces/${id}/messages`, { content: newMessage, message_type: 'text' });
            setNewMessage('');
            fetchMessages();
        } catch (err) {
            toast.error("Failed to send message");
        }
    };

    if (loading || !workspace) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Workspace...</div>;

    // Helper to get user names for messages
    const getUserName = (userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.name : `User ${userId}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar user={user} aiData={aiData} />

            <div className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 flex flex-col h-full">
                
                {/* Header & Navigation */}
                <div className="mb-6">
                    <button onClick={() => navigate('/workspaces')} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-2 transition">
                        &larr; Back to Workspaces
                    </button>
                    <PageHeader 
                        title={workspace.name} 
                        subtitle={workspace.description || "Workspace Overview"}
                    />
                    
                    {/* Phase 10B Tab Navigation */}
                    <div className="flex border-b border-gray-200 mt-6 overflow-x-auto hide-scrollbar">
                        <button onClick={() => setActiveTab('overview')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <Info size={16}/> Overview
                        </button>
                        <button onClick={() => setActiveTab('messages')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <MessageSquare size={16}/> Chat
                        </button>
                        <button onClick={() => setActiveTab('tasks')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <CheckSquare size={16}/> Tasks
                        </button>
                        <button onClick={() => setActiveTab('documents')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <FileText size={16}/> Documents
                        </button>
                    </div>
                </div>

                {/* --- TAB CONTENT: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* CHANNELS COLUMN */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Hash size={18}/> Channels</h3>
                                <button onClick={() => setIsChannelOpen(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                    <Plus size={14} /> Add Channel
                                </button>
                            </div>
                            
                            {channels.length === 0 ? (
                                <EmptyState message="No channels created yet." />
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {channels.map(ch => (
                                        <div key={ch.id} onClick={() => navigate(`/channels/${ch.id}`)} className="p-4 border-b border-gray-50 last:border-0 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition">
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
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {getUserName(mem.user_id).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-gray-700 block">{getUserName(mem.user_id)}</span>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{mem.role}</span>
                                            </div>
                                        </div>
                                        {mem.role === 'Workspace Admin' && <Shield size={14} className="text-blue-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: MESSAGES --- */}
                {activeTab === 'messages' && (
                    <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden min-h-[500px]">
                        {/* Chat Feed */}
                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <MessageSquare size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-bold">No messages yet. Say hello to the workspace!</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {!isMe && <span className="text-xs font-bold text-gray-500">{getUserName(msg.sender_id)}</span>}
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl max-w-[70%] ${isMe ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a message to the workspace..." 
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl transition flex items-center justify-center shadow-sm"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: TASKS (Placeholder for now) --- */}
                {activeTab === 'tasks' && (
                    <EmptyState message="Workspace Tasks feature coming shortly..." />
                )}

                {/* --- TAB CONTENT: DOCUMENTS (Placeholder for now) --- */}
                {activeTab === 'documents' && (
                    <EmptyState message="Workspace Documents feature coming shortly..." />
                )}

            </div>

            {/* Modals remain exactly the same as Phase 10A */}
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
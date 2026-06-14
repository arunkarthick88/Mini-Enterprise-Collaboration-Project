import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Users, MessageSquare, Send, CheckSquare, FileText, Lock, LogIn, LogOut } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, EmptyState } from '../components/UI';
import { toast } from 'react-hot-toast';

export default function ChannelView() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Core Data State
    const [channel, setChannel] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [messages, setMessages] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('messages');
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchData();
        // Set up a basic polling for messages (In production, replace with Phase 5 WebSockets)
        const pollInterval = setInterval(() => {
            if (isMember) fetchMessages();
        }, 5000);
        return () => clearInterval(pollInterval);
    }, [id, isMember]);

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

            const usersRes = await api.get('/auth/users');
            setAllUsers(usersRes.data);

            // 1. Fetch Channel Info
            const chRes = await api.get(`/channels/${id}`);
            setChannel(chRes.data);

            // 2. Fetch Parent Workspace Info for context
            const wsRes = await api.get(`/workspaces/${chRes.data.workspace_id}`);
            setWorkspace(wsRes.data);

            // 3. Check if current user is a member by trying to fetch messages
            try {
                await fetchMessages();
                setIsMember(true);
            } catch (err) {
                if (err.response?.status === 403) {
                    setIsMember(false);
                }
            }

        } catch (err) {
            toast.error("Failed to load channel details.");
            navigate('/workspaces');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        const res = await api.get(`/channels/${id}/messages`);
        setMessages(res.data);
    };

    // --- Action Handlers ---
    const handleJoinChannel = async () => {
        try {
            await api.post(`/channels/${id}/join`);
            toast.success("Successfully joined the channel!");
            setIsMember(true);
            fetchMessages();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to join channel");
        }
    };

    const handleLeaveChannel = async () => {
        try {
            await api.post(`/channels/${id}/leave`);
            toast.success("You have left the channel.");
            setIsMember(false);
            setMessages([]);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to leave channel");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await api.post(`/channels/${id}/messages`, { content: newMessage, message_type: 'text' });
            setNewMessage('');
            fetchMessages();
        } catch (err) {
            toast.error("Failed to send message");
        }
    };

    if (loading || !channel) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Channel...</div>;

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
                    <button onClick={() => navigate(`/workspaces/${channel.workspace_id}`)} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-2 transition">
                        &larr; Back to {workspace?.name || 'Workspace'}
                    </button>
                    
                    <div className="flex justify-between items-start">
                        <PageHeader 
                            title={<span className="flex items-center gap-2"><Hash className="text-gray-400" /> {channel.name}</span>} 
                            subtitle={channel.description || "No description provided."}
                        />
                        {isMember ? (
                            <button onClick={handleLeaveChannel} className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                <LogOut size={14} /> Leave Channel
                            </button>
                        ) : null}
                    </div>
                    
                    {/* Phase 10B Tab Navigation */}
                    {isMember && (
                        <div className="flex border-b border-gray-200 mt-6 overflow-x-auto hide-scrollbar">
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
                    )}
                </div>

                {/* --- NON-MEMBER VIEW --- */}
                {!isMember ? (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="text-center max-w-sm">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock size={24} className="text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Join #{channel.name}</h3>
                            <p className="text-sm text-gray-500 mb-6">You need to join this channel to view messages, participate in conversations, and access tasks.</p>
                            <button onClick={handleJoinChannel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 w-full">
                                <LogIn size={18} /> Join Channel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* --- TAB CONTENT: MESSAGES --- */}
                        {activeTab === 'messages' && (
                            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden min-h-[500px]">
                                {/* Chat Feed */}
                                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                            <Hash size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-bold">Welcome to the beginning of #{channel.name}</p>
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
                                            placeholder={`Message #${channel.name}`} 
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
                            <EmptyState message="Channel Tasks feature coming shortly..." />
                        )}

                        {/* --- TAB CONTENT: DOCUMENTS (Placeholder for now) --- */}
                        {activeTab === 'documents' && (
                            <EmptyState message="Channel Documents feature coming shortly..." />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
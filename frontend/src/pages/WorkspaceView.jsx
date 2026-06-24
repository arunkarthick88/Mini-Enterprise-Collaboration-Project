import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Users, Plus, Shield, MessageSquare, Send, CheckSquare, FileText, Info, Briefcase, Calendar, BarChart2, Activity, CalendarPlus, Sparkles, Clock } from 'lucide-react';
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
    
    // Phase 10C Data State
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedTeamWorkload, setSelectedTeamWorkload] = useState(null);
    const [selectedProjectCalendar, setSelectedProjectCalendar] = useState(null);
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [activeProjectId, setActiveProjectId] = useState(null);

    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI Tab State
    const [activeTab, setActiveTab] = useState('overview');
    
    // Modal States
    const [isChannelOpen, setIsChannelOpen] = useState(false);
    const [isMemberOpen, setIsMemberOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    
    // --- PHASE 10C MEETING STATES ---
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [meetingSummary, setMeetingSummary] = useState(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    
    // Forms
    const [newMessage, setNewMessage] = useState('');
    const [channelForm, setChannelForm] = useState({ name: '', description: '', type: 'PUBLIC' });
    const [memberForm, setMemberForm] = useState({ user_id: '', role: 'Member' });
    const [teamForm, setTeamForm] = useState({ name: '', description: '', workspace_id: parseInt(id) });
    const [projectForm, setProjectForm] = useState({ name: '', description: '', priority: 'MEDIUM', workspace_id: parseInt(id), end_date: '' });
    const [meetingForm, setMeetingForm] = useState({ title: '', description: '', start_time: '', end_time: '' });

    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchData();
        const pollInterval = setInterval(fetchMessages, 5000);
        return () => clearInterval(pollInterval);
    }, [id]);

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

            const tenantId = userRes.data.tenant_id || 1;

            const [chRes, memRes, usersRes, teamsRes, projRes] = await Promise.all([
                api.get(`/workspaces/${id}/channels`),
                api.get(`/workspaces/${id}/members`),
                api.get('/auth/users'),
                api.get(`/tenants/${tenantId}/workspaces/${id}/teams/`).catch(() => ({ data: [] })),
                api.get(`/tenants/${tenantId}/workspaces/${id}/projects/`).catch(() => ({ data: [] }))
            ]);

            setChannels(chRes.data);
            setMembers(memRes.data);
            setAllUsers(usersRes.data);
            setTeams(teamsRes.data);
            setProjects(projRes.data);

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

    const fetchTeamWorkload = async (teamId) => {
        try {
            const tenantId = user?.tenant_id || 1;
            setActiveTeamId(teamId);
            const res = await api.get(`/tenants/${tenantId}/workspaces/${id}/teams/${teamId}/workload`);
            setSelectedTeamWorkload(res.data);
        } catch (err) {
            toast.error("Failed to fetch workload data.");
        }
    };

    const fetchProjectCalendar = async (projectId) => {
        try {
            const tenantId = user?.tenant_id || 1;
            setActiveProjectId(projectId);
            const res = await api.get(`/tenants/${tenantId}/workspaces/${id}/projects/${projectId}/calendar`);
            setSelectedProjectCalendar(res.data);
        } catch (err) {
            toast.error("Failed to fetch project calendar.");
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

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const tenantId = user?.tenant_id || 1;
            await api.post(`/tenants/${tenantId}/workspaces/${id}/teams/`, teamForm);
            toast.success("Enterprise Team created successfully!");
            setIsTeamModalOpen(false);
            setTeamForm({ name: '', description: '', workspace_id: parseInt(id) });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create team");
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const tenantId = user?.tenant_id || 1;
            const payload = { ...projectForm };
            if (payload.end_date) {
                payload.end_date = new Date(payload.end_date).toISOString();
            } else {
                delete payload.end_date;
            }

            await api.post(`/tenants/${tenantId}/workspaces/${id}/projects/`, payload);
            toast.success("Project launched successfully!");
            setIsProjectModalOpen(false);
            setProjectForm({ name: '', description: '', priority: 'MEDIUM', workspace_id: parseInt(id), end_date: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create project");
        }
    };

    // --- Phase 10C Meeting Handlers ---
    const handleScheduleMeeting = async (e) => {
        e.preventDefault();
        try {
            const tenantId = user?.tenant_id || 1;
            const payload = {
                project_id: activeProjectId,
                title: meetingForm.title,
                description: meetingForm.description,
                start_time: new Date(meetingForm.start_time).toISOString(),
                end_time: new Date(meetingForm.end_time).toISOString()
            };
            await api.post(`/tenants/${tenantId}/meetings/`, payload);
            toast.success("Meeting scheduled!");
            setIsMeetingModalOpen(false);
            setMeetingForm({ title: '', description: '', start_time: '', end_time: '' });
            fetchProjectCalendar(activeProjectId); // Refresh calendar
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to schedule meeting");
        }
    };

    const handleOpenMeetingDetails = async (event) => {
        if (event.type !== 'meeting') return; // Ignore tasks
        setSelectedMeeting(event);
        setMeetingSummary(null);
        try {
            const tenantId = user?.tenant_id || 1;
            const res = await api.get(`/tenants/${tenantId}/meetings/${event.id}/summary`);
            setMeetingSummary(res.data);
        } catch (err) {
            // 404 just means no summary generated yet, perfectly fine.
        }
    };

    const handleGenerateAiSummary = async () => {
        if (!selectedMeeting) return;
        setIsGeneratingSummary(true);
        try {
            const tenantId = user?.tenant_id || 1;
            const res = await api.post(`/tenants/${tenantId}/meetings/${selectedMeeting.id}/summary`);
            setMeetingSummary(res.data);
            toast.success("AI Summary generated!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate summary");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    if (loading || !workspace) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Workspace...</div>;

    const getUserName = (userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.name : `User ${userId}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar user={user} aiData={aiData} />

            <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col h-full">
                
                <div className="mb-6">
                    <button onClick={() => navigate('/workspaces')} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-2 transition">
                        &larr; Back to Workspaces
                    </button>
                    <PageHeader 
                        title={workspace.name} 
                        subtitle={workspace.description || "Workspace Overview"}
                    />
                    
                    <div className="flex border-b border-gray-200 mt-6 overflow-x-auto hide-scrollbar">
                        <button onClick={() => setActiveTab('overview')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <Info size={16}/> Overview
                        </button>
                        <button onClick={() => setActiveTab('messages')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <MessageSquare size={16}/> Chat
                        </button>
                        <button onClick={() => setActiveTab('teams')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <Users size={16}/> Teams & Workload
                        </button>
                        <button onClick={() => setActiveTab('projects')} className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'projects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <Briefcase size={16}/> Projects & Meetings
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

                {/* --- TAB CONTENT: TEAMS & WORKLOAD --- */}
                {activeTab === 'teams' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[500px]">
                        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={16}/> Enterprise Teams</h3>
                                <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                    <Plus size={14} /> Create Team
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {teams.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">No teams configured yet.</div>
                                ) : (
                                    teams.map(team => (
                                        <div 
                                            key={team.id} 
                                            onClick={() => fetchTeamWorkload(team.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition ${activeTeamId === team.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}
                                        >
                                            <h4 className="font-bold text-gray-900 text-sm">{team.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{team.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
                            {selectedTeamWorkload ? (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart2 size={20} className="text-blue-600"/> Live Workload Dashboard</h3>
                                    
                                    <div className="grid grid-cols-4 gap-4 mb-8">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Total Tasks</span>
                                            <span className="text-2xl font-black text-gray-800">{selectedTeamWorkload.metrics.total_tasks}</span>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <span className="text-[10px] uppercase font-bold text-green-600 block mb-1">Completed</span>
                                            <span className="text-2xl font-black text-green-700">{selectedTeamWorkload.metrics.completed_tasks}</span>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">Pending</span>
                                            <span className="text-2xl font-black text-blue-700">{selectedTeamWorkload.metrics.pending_tasks}</span>
                                        </div>
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <span className="text-[10px] uppercase font-bold text-red-600 block mb-1">Overdue</span>
                                            <span className="text-2xl font-black text-red-700">{selectedTeamWorkload.metrics.overdue_tasks}</span>
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Member Workload Distribution</h4>
                                    <div className="space-y-4">
                                        {Object.entries(selectedTeamWorkload.user_workload).map(([userId, stats]) => {
                                            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
                                            return (
                                                <div key={userId} className="bg-white border border-gray-200 p-4 rounded-xl">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-sm text-gray-800">{getUserName(parseInt(userId))}</span>
                                                        <span className="text-xs font-bold text-gray-500">{stats.completed} / {stats.total} Tasks Done</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {Object.keys(selectedTeamWorkload.user_workload).length === 0 && (
                                            <p className="text-sm text-gray-400 italic">No tasks currently assigned to members of this team.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <Activity size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-bold">Select a team from the left to view their live workload.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: PROJECTS & MEETINGS --- */}
                {activeTab === 'projects' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[500px]">
                        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Briefcase size={16}/> Active Projects</h3>
                                <button onClick={() => setIsProjectModalOpen(true)} className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                    <Plus size={14} /> New Project
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {projects.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">No projects created yet.</div>
                                ) : (
                                    projects.map(proj => (
                                        <div 
                                            key={proj.id} 
                                            onClick={() => fetchProjectCalendar(proj.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition ${activeProjectId === proj.id ? 'border-purple-500 bg-purple-50/50' : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{proj.name}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${proj.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{proj.status}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{proj.description}</p>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                                                <span>Priority: <span className={proj.priority === 'CRITICAL' ? 'text-red-500' : ''}>{proj.priority}</span></span>
                                                <span>Ends: {proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'TBD'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
                            {selectedProjectCalendar ? (
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-purple-600"/> Project Calendar & Events</h3>
                                        <button onClick={() => setIsMeetingModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2">
                                            <CalendarPlus size={16} /> Schedule Meeting
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {selectedProjectCalendar.calendar_events.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                                                <p className="text-sm font-bold">No upcoming meetings or task deadlines found for this project.</p>
                                            </div>
                                        ) : (
                                            selectedProjectCalendar.calendar_events.map((event, index) => (
                                                <div 
                                                    key={`${event.id}-${index}`} 
                                                    onClick={() => handleOpenMeetingDetails(event)}
                                                    className={`flex items-center p-4 border border-gray-100 rounded-xl transition ${event.type === 'meeting' ? 'hover:bg-purple-50 cursor-pointer hover:border-purple-200' : 'bg-gray-50/50'}`}
                                                >
                                                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 mr-4 ${event.type === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                                                        <span className="text-xs font-black uppercase">{new Date(event.start).toLocaleString('en-us', { month: 'short' })}</span>
                                                        <span className="text-lg font-black leading-none">{new Date(event.start).getDate()}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-800 text-sm">{event.title}</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {event.type === 'meeting' ? 'Meeting Scheduled' : 'Task SLA Deadline'}
                                                            {' • '} 
                                                            {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-gray-100 text-gray-600">{event.status}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <Briefcase size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-bold">Select a project from the left to view its timeline.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: TASKS & DOCUMENTS --- */}
                {activeTab === 'tasks' && <EmptyState message="Workspace Tasks feature coming shortly..." />}
                {activeTab === 'documents' && <EmptyState message="Workspace Documents feature coming shortly..." />}

            </div>

            {/* --- MODALS --- */}
            {/* Create Team Modal */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="text-blue-500" /> Create Enterprise Team</h3>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Team Name</label>
                                <input required value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. Backend API Team" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Description</label>
                                <textarea value={teamForm.description} onChange={e => setTeamForm({...teamForm, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="What is this team responsible for?" rows="3" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Create Team</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Briefcase className="text-purple-500" /> Launch New Project</h3>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Project Name</label>
                                <input required value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. Mobile App Redesign" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Description</label>
                                <textarea value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Project goals and scope..." rows="2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Priority</label>
                                    <select value={projectForm.priority} onChange={e => setProjectForm({...projectForm, priority: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Target End Date</label>
                                    <input type="date" value={projectForm.end_date} onChange={e => setProjectForm({...projectForm, end_date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700">Launch Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Schedule Meeting Modal */}
            {isMeetingModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarPlus className="text-purple-500" /> Schedule Meeting</h3>
                        <form onSubmit={handleScheduleMeeting} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Meeting Title</label>
                                <input required value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. Sprint Planning" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Agenda / Description</label>
                                <textarea value={meetingForm.description} onChange={e => setMeetingForm({...meetingForm, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="What will be discussed?" rows="2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Start Time</label>
                                    <input required type="datetime-local" value={meetingForm.start_time} onChange={e => setMeetingForm({...meetingForm, start_time: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">End Time</label>
                                    <input required type="datetime-local" value={meetingForm.end_time} onChange={e => setMeetingForm({...meetingForm, end_time: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsMeetingModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700">Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Meeting Summary Modal */}
            {selectedMeeting && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden">
                        
                        <button onClick={() => setSelectedMeeting(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition">
                            <Plus size={24} className="rotate-45" />
                        </button>

                        <div className="mb-6">
                            <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider bg-purple-50 px-2 py-1 rounded">Meeting Intelligence</span>
                            <h2 className="text-2xl font-black text-gray-900 mt-2">{selectedMeeting.title}</h2>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2"><Clock size={14} /> {new Date(selectedMeeting.start).toLocaleString()}</p>
                        </div>

                        {!meetingSummary ? (
                            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                                    <Sparkles size={28} className="text-purple-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">No Summary Generated</h3>
                                <p className="text-sm text-gray-500 mb-6 max-w-sm">Use our AI engine to automatically extract action items, decisions, and risks from the meeting notes.</p>
                                <button 
                                    onClick={handleGenerateAiSummary}
                                    disabled={isGeneratingSummary}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition disabled:opacity-50"
                                >
                                    {isGeneratingSummary ? 'Analyzing Notes...' : '✨ Generate AI Summary'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                    <h4 className="text-xs font-black uppercase text-blue-800 tracking-wider mb-2">Executive Summary</h4>
                                    <p className="text-sm text-blue-900 leading-relaxed">{meetingSummary.summary}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">Key Decisions</h4>
                                        <p className="text-sm text-gray-800 whitespace-pre-line">{meetingSummary.decisions}</p>
                                    </div>
                                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">Action Items</h4>
                                        <p className="text-sm text-gray-800 whitespace-pre-line">{meetingSummary.action_items}</p>
                                    </div>
                                </div>
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                    <h4 className="text-xs font-black uppercase text-red-800 tracking-wider mb-2">Identified Risks</h4>
                                    <p className="text-sm text-red-900 whitespace-pre-line">{meetingSummary.risks}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Existing Channel & Member Modals... */}
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
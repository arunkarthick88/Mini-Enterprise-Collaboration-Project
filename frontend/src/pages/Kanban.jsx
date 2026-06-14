import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, X, MessageSquare, Paperclip, Download, Loader2, Upload } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar'; 
import { toast } from 'react-hot-toast';

const COLUMNS = {
    todo: { name: 'To Do', color: 'border-gray-200 bg-gray-50' },
    in_progress: { name: 'In Progress', color: 'border-blue-200 bg-blue-50' },
    review: { name: 'Review', color: 'border-purple-200 bg-purple-50' },
    done: { name: 'Done', color: 'border-green-200 bg-green-50' }
};

export default function Kanban() {
    const [tasks, setTasks] = useState({ todo: [], in_progress: [], review: [], done: [] });
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const navigate = useNavigate();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [assigneeId, setAssigneeId] = useState('');

    // Modal, Comments & Docs State
    const [selectedTask, setSelectedTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    
    // --- Phase 10B: Document State ---
    const [documents, setDocuments] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [documentType, setDocumentType] = useState('REFERENCE');
    const [isUploading, setIsUploading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchUserAndTasks();
    }, []);

    // --- PHASE 5: LIVE KANBAN LISTENER ---
    useEffect(() => {
        const handleLiveUpdate = () => {
            fetchUserAndTasks();
        };

        // Listen for the custom event dispatched by App.jsx's WebSocket
        window.addEventListener('kanban_updated', handleLiveUpdate);
        
        // Cleanup listener when component unmounts
        return () => window.removeEventListener('kanban_updated', handleLiveUpdate);
    }, []);
    // -------------------------------------

    const fetchUserAndTasks = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            const taskRes = await api.get('/tasks/');
            
            const groupedTasks = { todo: [], in_progress: [], review: [], done: [] };
            taskRes.data.forEach(task => {
                if (groupedTasks[task.status]) {
                    groupedTasks[task.status].push(task);
                }
            });
            setTasks(groupedTasks);

            if (userRes.data.role === 'admin' || userRes.data.role === 'manager') {
                const usersRes = await api.get('/auth/users');
                setUsersList(usersRes.data);
            }
        } catch (err) {
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks/', { title, description, priority, assigned_to_id: assigneeId ? parseInt(assigneeId) : null });
            setTitle(''); setDescription(''); setPriority('medium'); setAssigneeId('');
            toast.success("Task created successfully");
            fetchUserAndTasks();
        } catch (err) { toast.error('Failed to create task.'); }
    };

    const handleDeleteTask = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this task?")) return;
        try {
            await api.delete(`/tasks/${id}`);
            toast.success("Task deleted");
            fetchUserAndTasks();
        } catch (err) { toast.error('Not authorized to delete this task.'); }
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return; 
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const taskId = parseInt(draggableId);

        // Optimistic UI update
        const newTasks = { ...tasks };
        const [movedTask] = newTasks[sourceCol].splice(source.index, 1);
        movedTask.status = destCol;
        newTasks[destCol].splice(destination.index, 0, movedTask);
        setTasks(newTasks);

        try {
            await api.patch(`/tasks/${taskId}`, { status: destCol });
        } catch (err) {
            toast.error("Failed to move task. Refreshing board.");
            fetchUserAndTasks(); 
        }
    };

    // --- MODAL LOGIC (Comments + Documents) ---
    const openTaskModal = async (task) => {
        setSelectedTask(task);
        fetchComments(task.id);
        fetchDocuments(task.id);
    };

    const fetchComments = async (taskId) => {
        try {
            const res = await api.get(`/tasks/${taskId}/comments`);
            setComments(res.data);
        } catch (err) { console.error("Could not fetch comments"); }
    };

    const fetchDocuments = async (taskId) => {
        try {
            const res = await api.get(`/tasks/${taskId}/documents`);
            setDocuments(res.data);
        } catch (err) { console.error("Could not fetch documents"); }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/tasks/${selectedTask.id}/comments`, { content: newComment, is_internal: isInternal });
            setNewComment('');
            setIsInternal(false);
            fetchComments(selectedTask.id);
        } catch (err) { toast.error('Failed to add comment.'); }
    };

    // --- PHASE 10B: UPLOAD LOGIC ---
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload || !selectedTask) return;

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('document_type', documentType);

        setIsUploading(true);
        try {
            await api.post(`/tasks/${selectedTask.id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Document uploaded successfully!");
            setFileToUpload(null);
            document.getElementById('task-file-upload').value = "";
            fetchDocuments(selectedTask.id); 
        } catch (err) {
            toast.error('Failed to upload document.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (docId, fileName) => {
        try {
            const res = await api.get(`/tasks/documents/${docId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error('Failed to download file.');
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            await api.delete(`/tasks/documents/${docId}`);
            toast.success("Document deleted");
            fetchDocuments(selectedTask.id);
        } catch (err) {
            toast.error("Failed to delete document");
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Kanban...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            
            <div className="mb-8">
                <Navbar user={user} aiData={aiData} />
            </div>

            <div className="max-w-7xl mx-auto px-8 pb-8">
                
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Kanban Board</h2>
                        <p className="text-gray-500 mt-1">Manage your enterprise workflow</p>
                    </div>
                </div>

                {/* CREATE TASK FORM */}
                {(user.role === 'admin' || user.role === 'manager') && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1">TASK TITLE</label>
                                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="What needs to be done?" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1">DESCRIPTION</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Brief details..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1">PRIORITY</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1">ASSIGN TO</label>
                                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white">
                                    <option value="">Unassigned</option>
                                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold p-2.5 rounded-lg hover:bg-blue-700 transition">
                                    <Plus size={18} /> Add Task
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* DRAG & DROP KANBAN BOARD */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {Object.entries(COLUMNS).map(([columnId, colData]) => (
                            <div key={columnId} className={`rounded-xl border ${colData.color} p-4 min-h-[500px] flex flex-col`}>
                                <h3 className="font-extrabold text-gray-700 mb-4 flex items-center justify-between">
                                    {colData.name} 
                                    <span className="bg-white px-2 py-0.5 rounded text-sm shadow-sm">{tasks[columnId].length}</span>
                               </h3>
                                
                                <Droppable droppableId={columnId}>
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                                            {tasks[columnId].map((task, index) => (
                                                <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => openTaskModal(task)}
                                                            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 group cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:border-blue-300 hover:shadow-md transition-all'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-bold text-gray-900 leading-tight">{task.title}</h4>
                                                                {(user.role === 'admin' || user.role === 'manager') && (
                                                                    <button onClick={(e) => handleDeleteTask(task.id, e)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {task.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>}
                                                            <div className="flex items-center justify-between mt-auto">
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                                                    task.priority === 'high' ? 'bg-red-100 text-red-700' : 
                                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                                                    'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                    {task.priority}
                                                                </span>
                                                                <div className="flex gap-2">
                                                                    <Paperclip size={14} className="text-gray-400" />
                                                                    <MessageSquare size={14} className="text-gray-400" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>

                {/* TASK DETAILS MODAL (Comments & Attachments) */}
                {selectedTask && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
                        <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
                            
                            {/* LEFT SIDE: Details & Attachments */}
                            <div className="w-1/2 p-6 border-r border-gray-100 bg-gray-50 flex flex-col overflow-y-auto">
                                <div className="mb-6">
                                    <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-1 block">TASK DETAILS</span>
                                    <h2 className="font-bold text-2xl text-gray-900 mb-2">{selectedTask.title}</h2>
                                    <p className="text-sm text-gray-600">{selectedTask.description || "No description provided."}</p>
                                </div>

                                {/* ATTACHMENTS SECTION */}
                                <div className="mt-auto pt-6 border-t border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                                        <Paperclip size={16}/> Documents & Deliverables
                                    </h3>
                                    
                                    <form onSubmit={handleFileUpload} className="flex flex-col gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                                        <input 
                                            id="task-file-upload"
                                            type="file" 
                                            required
                                            onChange={(e) => setFileToUpload(e.target.files[0])}
                                            className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                        <div className="flex gap-2">
                                            <select 
                                                value={documentType} 
                                                onChange={(e) => setDocumentType(e.target.value)}
                                                className="flex-1 text-xs border border-gray-200 rounded bg-gray-50 p-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="REFERENCE">Reference</option>
                                                <option value="DELIVERABLE">Final Deliverable</option>
                                                <option value="SPECIFICATION">Spec Document</option>
                                            </select>
                                            <button 
                                                type="submit" 
                                                disabled={!fileToUpload || isUploading}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center gap-1 transition"
                                            >
                                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12}/>} Upload
                                            </button>
                                        </div>
                                    </form>
                                    
                                    <div className="space-y-2">
                                        {documents.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic text-center py-4">No files attached yet.</p>
                                        ) : (
                                            documents.map(doc => (
                                                <div key={doc.id} className="bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                            <FileText size={14} />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-xs font-bold text-gray-800 truncate" title={doc.file_name}>{doc.file_name}</p>
                                                            <div className="flex gap-1.5 text-[10px] text-gray-400 mt-0.5 font-medium">
                                                                <span className="text-blue-600">{doc.document_type}</span>
                                                                <span>•</span>
                                                                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0 ml-2">
                                                        <button onClick={() => handleDownload(doc.id, doc.file_name)} title="Download" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                                                            <Download size={14}/>
                                                        </button>
                                                        {(user.role === 'admin' || doc.uploaded_by === user.id) && (
                                                            <button onClick={() => handleDeleteDoc(doc.id)} title="Delete" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Comments */}
                            <div className="w-1/2 flex flex-col bg-white">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Discussion</h3>
                                    <button onClick={() => setSelectedTask(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"><X size={20}/></button>
                                </div>

                                <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-gray-50/30">
                                    {comments.length === 0 ? (
                                        <div className="text-center text-gray-400 italic py-8 text-sm">No comments yet. Start the conversation!</div>
                                    ) : (
                                        comments.map(c => (
                                            <div key={c.id} className={`p-4 rounded-xl text-sm ${c.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-gray-800">User #{c.user_id}</span>
                                                    {c.is_internal && <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-bold uppercase">Internal Note</span>}
                                                </div>
                                                <p className="text-gray-600">{c.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-5 border-t border-gray-100">
                                    <form onSubmit={handleAddComment} className="flex flex-col gap-3">
                                        <textarea required value={newComment} onChange={e => setNewComment(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="Write a comment..." rows="2" />
                                        <div className="flex justify-between items-center">
                                            {(user.role === 'admin' || user.role === 'manager') ? (
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                                                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                                                    Mark as Internal Note
                                                </label>
                                            ) : <div></div>}
                                            <button type="submit" className="bg-gray-900 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition text-sm">Post</button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
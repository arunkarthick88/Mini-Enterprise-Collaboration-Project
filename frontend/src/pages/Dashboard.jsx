import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { LayoutDashboard, LogOut, Plus, Trash2, X, MessageSquare, ShieldCheck } from 'lucide-react';
import api from '../api';

const COLUMNS = {
    todo: { name: 'To Do', color: 'border-gray-200 bg-gray-50' },
    in_progress: { name: 'In Progress', color: 'border-blue-200 bg-blue-50' },
    review: { name: 'Review', color: 'border-purple-200 bg-purple-50' },
    done: { name: 'Done', color: 'border-green-200 bg-green-50' }
};

export default function Dashboard() {
    const [tasks, setTasks] = useState({ todo: [], in_progress: [], review: [], done: [] });
    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const navigate = useNavigate();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [assigneeId, setAssigneeId] = useState('');

    // Modal & Comments State
    const [selectedTask, setSelectedTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);

    useEffect(() => {
        fetchUserAndTasks();
    }, []);

    const fetchUserAndTasks = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

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
            fetchUserAndTasks();
        } catch (err) { alert('Failed to create task.'); }
    };

    const handleDeleteTask = async (id, e) => {
        e.stopPropagation(); // Prevents the modal from opening when clicking delete
        if (!window.confirm("Delete this task?")) return;
        try {
            await api.delete(`/tasks/${id}`);
            fetchUserAndTasks();
        } catch (err) { alert('Not authorized to delete this task.'); }
    };

    // --- KANBAN DRAG & DROP LOGIC ---
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return; 
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const taskId = parseInt(draggableId);

        const newTasks = { ...tasks };
        const [movedTask] = newTasks[sourceCol].splice(source.index, 1);
        movedTask.status = destCol;
        newTasks[destCol].splice(destination.index, 0, movedTask);
        setTasks(newTasks);

        try {
            await api.patch(`/tasks/${taskId}`, { status: destCol });
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to move task.");
            fetchUserAndTasks(); 
        }
    };

    // --- COMMENTS LOGIC ---
    const openTaskModal = async (task) => {
        setSelectedTask(task);
        fetchComments(task.id);
    };

    const fetchComments = async (taskId) => {
        try {
            const res = await api.get(`/tasks/${taskId}/comments`);
            setComments(res.data);
        } catch (err) { console.error("Could not fetch comments"); }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/tasks/${selectedTask.id}/comments`, { content: newComment, is_internal: isInternal });
            setNewComment('');
            setIsInternal(false);
            fetchComments(selectedTask.id);
        } catch (err) { alert('Failed to add comment.'); }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 text-white rounded-lg"><LayoutDashboard size={24} /></div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">Kanban Board</h1>
                            <p className="text-sm text-gray-500 font-medium">Enterprise Workflow • {user.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* APPROVALS LINK ADDED HERE */}
                        <Link to="/approvals" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-purple-600 transition bg-gray-50 px-3 py-2 rounded-lg border">
                            <ShieldCheck size={16} /> Approvals
                        </Link>

                        <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">{user.role}</span>
                        <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>

                {/* CREATE TASK FORM */}
                {(user.role === 'admin' || user.role === 'manager') && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1">TASK TITLE</label>
                                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="What needs to be done?" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1">DESCRIPTION</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Brief details..." />
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
                                                                <MessageSquare size={14} className="text-gray-400" />
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

                {/* TASK DETAILS & COMMENTS MODAL */}
                {selectedTask && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
                        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
                            
                            {/* Modal Header */}
                            <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                                <div>
                                    <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-1 block">TASK DETAILS</span>
                                    <h2 className="font-bold text-xl text-gray-900">{selectedTask.title}</h2>
                                    <p className="text-sm text-gray-600 mt-2">{selectedTask.description || "No description provided."}</p>
                                </div>
                                <button onClick={() => setSelectedTask(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition">
                                    <X size={20}/>
                                </button>
                            </div>

                            {/* Modal Body: Comments List */}
                            <div className="p-5 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
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

                            {/* Modal Footer: Add Comment Form */}
                            <div className="p-5 border-t border-gray-100 bg-white">
                                <form onSubmit={handleAddComment} className="flex flex-col gap-3">
                                    <textarea 
                                        required 
                                        value={newComment} 
                                        onChange={e => setNewComment(e.target.value)} 
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" 
                                        placeholder="Write a comment..." 
                                        rows="2"
                                    />
                                    <div className="flex justify-between items-center">
                                        {(user.role === 'admin' || user.role === 'manager') ? (
                                            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                                                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                                                Mark as Internal Note
                                            </label>
                                        ) : <div></div>}
                                        <button type="submit" className="bg-gray-900 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition text-sm">
                                            Post Comment
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
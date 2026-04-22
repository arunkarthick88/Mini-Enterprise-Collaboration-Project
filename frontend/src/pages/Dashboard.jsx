import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]); // Stores employees for the dropdown
    const navigate = useNavigate();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [assigneeId, setAssigneeId] = useState('');

    useEffect(() => {
        fetchUserAndTasks();
    }, []);

    const fetchUserAndTasks = async () => {
        try {
            // 1. Get current logged-in user
            const userRes = await api.get('/auth/me');
            const currentUser = userRes.data;
            setUser(currentUser);

            // 2. Get tasks relevant to this user
            const taskRes = await api.get('/tasks/');
            setTasks(taskRes.data);

            // 3. If Admin or Manager, fetch the list of users for the Assignment dropdown
            if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                const usersRes = await api.get('/auth/users');
                setUsersList(usersRes.data);
            }
        } catch (err) {
            console.error(err);
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks/', {
                title,
                description,
                priority,
                assigned_to_id: assigneeId ? parseInt(assigneeId) : null
            });
            
            // Clear the form
            setTitle('');
            setDescription('');
            setPriority('medium');
            setAssigneeId('');
            
            // Refresh the dashboard data
            fetchUserAndTasks();
        } catch (err) {
            alert('Failed to create task. Check console for details.');
        }
    };

    const handleStatusUpdate = async (id, currentStatus) => {
        const newStatus = currentStatus === 'todo' ? 'in_progress' : 'done';
        try {
            await api.patch(`/tasks/${id}`, { status: newStatus });
            fetchUserAndTasks();
        } catch (err) {
            alert('Update failed');
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await api.delete(`/tasks/${id}`);
            fetchUserAndTasks(); // Refresh the list
        } catch (err) {
            alert('Failed to delete task. You might not have permission.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Workspace...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                
                {/* HEADER */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">Task Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Welcome back, {user.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                            {user.role}
                        </span>
                        <button onClick={handleLogout} className="text-sm font-bold text-gray-500 hover:text-red-600 transition">
                            Logout
                        </button>
                    </div>
                </div>

                {/* CREATE TASK FORM (Only visible to Managers and Admins) */}
                {(user.role === 'admin' || user.role === 'manager') && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Delegate New Task</h2>
                        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Title</label>
                                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Task name..." />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Description</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Brief details..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Priority</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Assign To</label>
                                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">Unassigned</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700 transition h-[42px]">
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TASK LIST TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 italic">No tasks found. Create one above!</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{task.title}</div>
                                            <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                task.status === 'done' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                task.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                                'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                                {task.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 uppercase text-xs font-bold text-gray-500">{task.priority}</td>
                                        <td className="p-4 flex gap-2">
                                            {/* Status Update Button (For Everyone) */}
                                            {task.status !== 'done' && (
                                                <button onClick={() => handleStatusUpdate(task.id, task.status)} className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 transition shadow-sm">
                                                    Move to {task.status === 'todo' ? 'In Progress' : 'Done'}
                                                </button>
                                            )}

                                            {/* Delete Button (Only for Admins & Managers) */}
                                            {(user.role === 'admin' || user.role === 'manager') && (
                                                <button onClick={() => handleDeleteTask(task.id)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200 transition shadow-sm">
                                                    Delete
                                                </button>
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
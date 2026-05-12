import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function CreateTask() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [status, setStatus] = useState('todo');
    const [assigneeId, setAssigneeId] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            if (userRes.data.role === 'admin' || userRes.data.role === 'manager') {
                const usersRes = await api.get('/auth/users');
                setUsersList(usersRes.data);
            } else {
                navigate('/dashboard'); // Only management can create
            }
        } catch (err) { navigate('/'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks/', { 
                title, description, priority, status,
                assigned_to_id: assigneeId ? parseInt(assigneeId) : null 
            });
            navigate('/kanban');
        } catch (err) { alert('Failed to create task.'); }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md mb-12">
                <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/kanban">Kanban</Link>
                    <Link to="/approvals">Approvals</Link>
                    <Link to="/activity">Activity</Link>
                    <Link to="/create-task" className="underline">Create</Link>
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="bg-red-500 px-4 py-1.5 rounded">Logout</button>
                </div>
            </nav>

            <div className="max-w-xl mx-auto bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Task</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Task Title" />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Description" rows="4" />
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-3 border rounded-lg outline-none bg-white">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-3 border rounded-lg outline-none bg-white">
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                    </select>
                    <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-3 border rounded-lg outline-none bg-white">
                        <option value="">Assign to (optional)</option>
                        {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
                        Create Task
                    </button>
                </form>
            </div>
        </div>
    );
}
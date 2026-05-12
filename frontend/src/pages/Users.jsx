import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const me = await api.get('/auth/me');
            setCurrentUser(me.data);
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) { navigate('/'); }
    };

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md mb-12">
                <h1 className="text-2xl font-bold tracking-wide">TaskFlow</h1>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/kanban">Kanban</Link>
                    <Link to="/approvals">Approvals</Link>
                    <Link to="/activity">Activity</Link>
                    <Link to="/create-task">Create</Link>
                    <Link to="/users" className="underline">Users</Link>
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="bg-red-500 px-4 py-1.5 rounded">Logout</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800">All Users</h2>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-bold text-gray-600">Name</th>
                            <th className="p-4 font-bold text-gray-600">Email</th>
                            <th className="p-4 font-bold text-gray-600">Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                <td className="p-4 text-gray-800">{u.name}</td>
                                <td className="p-4 text-gray-600">{u.email}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${
                                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
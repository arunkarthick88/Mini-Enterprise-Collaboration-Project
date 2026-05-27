import React, { useState, useEffect } from 'react';
import { CalendarClock, XCircle } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, StatusBadge, EmptyState } from '../components/UI';

export default function ApprovalDelegations() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [delegations, setDelegations] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        delegatee_id: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

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

            // Get personal delegations
            const delRes = await api.get('/approval-delegations/me');
            setDelegations(delRes.data);

            const usersRes = await api.get('/auth/users');
            setUsers(usersRes.data);
        } catch (err) {
            console.error("Failed to load delegations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelegate = async (e) => {
        e.preventDefault();
        try {
            // Append time so it submits as full DateTime to backend
            const payload = {
                ...formData,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString()
            };
            await api.post('/approval-delegations', payload);
            setIsModalOpen(false);
            setFormData({ delegatee_id: '', start_date: '', end_date: '', reason: '' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to create delegation");
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Revoke this delegation early?")) return;
        try {
            await api.put(`/approval-delegations/${id}/cancel`);
            fetchData();
        } catch (err) {
            alert("Failed to cancel delegation");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Delegation Protocols...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <PageHeader 
                    title="Approval Delegations" 
                    subtitle="Temporarily re-route your approval authorities during absence" 
                    actionButton={
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition">
                            <CalendarClock size={16} /> Schedule Delegation
                        </button>
                    }
                />

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {delegations.length === 0 ? (
                        <EmptyState message="You have no active or historical delegations scheduled." />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Delegatee ID</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Timeframe</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Reason</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Status</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delegations.map(del => (
                                    <tr key={del.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 text-sm font-bold text-blue-600">User {del.delegatee_id}</td>
                                        <td className="p-4 text-xs text-gray-600 font-medium">
                                            {new Date(del.start_date).toLocaleDateString()} - {new Date(del.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{del.reason}</td>
                                        <td className="p-4"><StatusBadge status={del.is_active ? 'active' : 'cancelled'} /></td>
                                        <td className="p-4 text-right">
                                            {del.is_active && (
                                                <button onClick={() => handleCancel(del.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition" title="Revoke">
                                                    <XCircle size={16} />
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

            {/* Delegation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarClock className="text-blue-500" /> Schedule Hand-off</h3>
                        <form onSubmit={handleDelegate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Delegate Authority To</label>
                                <select required value={formData.delegatee_id} onChange={e => setFormData({...formData, delegatee_id: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                    <option value="" disabled>Select User</option>
                                    {users.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Start Date</label>
                                    <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">End Date</label>
                                    <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Reason for Leave/Hand-off</label>
                                <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" rows="2" placeholder="e.g. Out of office on annual leave"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">Confirm Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
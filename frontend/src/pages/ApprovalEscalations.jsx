import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, StatusBadge, EmptyState } from '../components/UI';

export default function ApprovalEscalations() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [escalations, setEscalations] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        approval_id: '',
        escalated_to: '',
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

            const escRes = await api.get('/approval-escalations');
            setEscalations(escRes.data);

            const usersRes = await api.get('/auth/users');
            setUsers(usersRes.data);
        } catch (err) {
            console.error("Failed to load escalations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEscalate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/approval-escalations', formData);
            setIsModalOpen(false);
            setFormData({ approval_id: '', escalated_to: '', reason: '' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to escalate approval");
        }
    };

    const handleResolve = async (id) => {
        if (!window.confirm("Mark this escalation as resolved?")) return;
        try {
            await api.put(`/approval-escalations/${id}/resolve`);
            fetchData();
        } catch (err) {
            alert("Failed to resolve");
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Cancel this escalation?")) return;
        try {
            await api.put(`/approval-escalations/${id}/cancel`);
            fetchData();
        } catch (err) {
            alert("Failed to cancel");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Escalation Queue...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <PageHeader 
                    title="Approval Escalations" 
                    subtitle="Monitor and route delayed or blocked approval workflows" 
                    actionButton={
                        <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition">
                            <ShieldAlert size={16} /> Force Escalate
                        </button>
                    }
                />

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {escalations.length === 0 ? (
                        <EmptyState message="No escalations in the current pipeline." />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">ID</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Approval Link</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Routing</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Reason</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Status</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {escalations.map(esc => (
                                    <tr key={esc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-mono text-xs text-gray-400">ESC-{esc.id}</td>
                                        <td className="p-4 font-mono text-xs text-blue-600 font-bold">APP-{esc.approval_id}</td>
                                        <td className="p-4 text-sm font-medium text-gray-700 flex items-center gap-2">
                                            User {esc.escalated_from} <ArrowRight size={14} className="text-gray-400" /> User {esc.escalated_to}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{esc.reason}</td>
                                        <td className="p-4"><StatusBadge status={esc.status} /></td>
                                        <td className="p-4 text-right">
                                            {esc.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleResolve(esc.id)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition" title="Resolve">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button onClick={() => handleCancel(esc.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition" title="Cancel">
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Escalate Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><ShieldAlert className="text-red-500" /> Escalate Approval</h3>
                        <form onSubmit={handleEscalate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Approval ID</label>
                                <input type="number" required value={formData.approval_id} onChange={e => setFormData({...formData, approval_id: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. 12" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Escalate To</label>
                                <select required value={formData.escalated_to} onChange={e => setFormData({...formData, escalated_to: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                    <option value="" disabled>Select User</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Reason for Escalation</label>
                                <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" rows="3"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition">Force Escalate</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
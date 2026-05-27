import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Filter } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, StatusBadge, ToggleSwitch, LoadingSpinner, EmptyState } from '../components/UI';

export default function SlaRules() {
    const [rules, setRules] = useState([]);
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterModule, setFilterModule] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        module_name: 'Task',
        priority: 'medium',
        allowed_hours: 24,
        escalation_enabled: false,
        escalation_after_hours: 12,
        is_active: true
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            const rulesRes = await api.get('/sla/rules');
            setRules(rulesRes.data);
        } catch (err) {
            console.error("Failed to load SLA rules data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (rule = null) => {
        if (rule) {
            setEditingId(rule.id);
            setFormData({
                module_name: rule.module_name,
                priority: rule.priority,
                allowed_hours: rule.allowed_hours,
                escalation_enabled: rule.escalation_enabled,
                escalation_after_hours: rule.escalation_after_hours || 0,
                is_active: rule.is_active
            });
        } else {
            setEditingId(null);
            setFormData({
                module_name: 'Task',
                priority: 'medium',
                allowed_hours: 24,
                escalation_enabled: false,
                escalation_after_hours: 12,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (formData.allowed_hours <= 0 || (formData.escalation_enabled && formData.escalation_after_hours <= 0)) {
            alert("Hours values must be greater than 0");
            return;
        }

        try {
            if (editingId) {
                await api.put(`/sla/rules/${editingId}`, formData);
            } else {
                await api.post('/sla/rules', formData);
            }
            setIsModalOpen(false);
            const res = await api.get('/sla/rules');
            setRules(res.data);
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to save SLA rule");
        }
    };

    const handleDisableRule = async (id) => {
        if (!window.confirm("Are you sure you want to disable this SLA rule?")) return;
        try {
            await api.delete(`/sla/rules/${id}`);
            const res = await api.get('/sla/rules');
            setRules(res.data);
        } catch (err) {
            alert("Failed to change rule status");
        }
    };

    // Filter Logic
    const filteredRules = rules.filter(rule => {
        const matchesModule = filterModule === 'all' || rule.module_name === filterModule;
        const matchesPriority = filterPriority === 'all' || rule.priority === filterPriority;
        return matchesModule && matchesPriority;
    });

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Governance Core...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <PageHeader 
                    title="SLA Rules Management" 
                    subtitle="Configure operational deadlines and governance constraints" 
                    actionButton={
                        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition">
                            <Plus size={16} /> Create SLA Rule
                        </button>
                    }
                />

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                        <Filter size={16} /> Filters:
                    </div>
                    <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="border border-gray-200 rounded-lg p-1.5 text-sm bg-gray-50 text-gray-700 focus:outline-none">
                        <option value="all">All Modules</option>
                        <option value="Task">Tasks</option>
                        <option value="Approval">Approvals</option>
                    </select>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-gray-200 rounded-lg p-1.5 text-sm bg-gray-50 text-gray-700 focus:outline-none">
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                {/* Rules Table */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {filteredRules.length === 0 ? (
                        <EmptyState message="No configuration rules match your active filters." />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Rule ID</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Module</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Target Priority</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Allowed Resolution</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Escalation Milestone</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Status</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRules.map(rule => (
                                    <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                        <td className="p-4 font-mono text-xs text-gray-400">#00{rule.id}</td>
                                        <td className="p-4 text-gray-800 font-semibold">{rule.module_name}s</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold capitalize ${
                                                rule.priority === 'high' ? 'bg-red-50 text-red-700' :
                                                rule.priority === 'medium' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>{rule.priority}</span>
                                        </td>
                                        <td className="p-4 text-gray-600 text-sm font-medium">{rule.allowed_hours} Hours</td>
                                        <td className="p-4 text-gray-600 text-sm">
                                            {rule.escalation_enabled ? (
                                                <span className="text-orange-600 font-medium">After {rule.escalation_after_hours} Hours</span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Disabled</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={rule.is_active ? "active" : "disabled"} />
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(rule)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Rule">
                                                <Edit2 size={16} />
                                            </button>
                                            {rule.is_active && (
                                                <button onClick={() => handleDisableRule(rule.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Disable Rule">
                                                    <Power size={16} />
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

            {/* Config Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800">{editingId ? "Modify SLA Rule" : "Define Operational SLA Rule"}</h3>
                        </div>
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Target Module</label>
                                <select value={formData.module_name} onChange={e => setFormData({...formData, module_name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="Task">Task Tracking</option>
                                    <option value="Approval">Approval Requests</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Severity / Priority</label>
                                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Allowed Time Window (Hours)</label>
                                <input type="number" min="1" value={formData.allowed_hours} onChange={e => setFormData({...formData, allowed_hours: parseInt(e.target.value) || 0})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                                <ToggleSwitch 
                                    label="Enable Automated Escalation" 
                                    enabled={formData.escalation_enabled} 
                                    onChange={() => setFormData({...formData, escalation_enabled: !formData.escalation_enabled})} 
                                />
                                {formData.escalation_enabled && (
                                    <div className="animate-in slide-in-from-top-2 duration-150">
                                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Trigger Escalation After (Hours)</label>
                                        <input type="number" min="1" value={formData.escalation_after_hours} onChange={e => setFormData({...formData, escalation_after_hours: parseInt(e.target.value) || 0})} className="w-full border border-gray-200 bg-white rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition">Save Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
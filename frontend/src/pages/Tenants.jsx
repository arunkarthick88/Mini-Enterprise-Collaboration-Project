import React, { useState, useEffect } from 'react';
import { Building2, Plus, UserPlus, ShieldCheck } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, StatusBadge, EmptyState } from '../components/UI';
import { toast } from 'react-hot-toast';

export default function Tenants() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isOnboardOpen, setIsOnboardOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState(null);

    // Forms
    const [createForm, setCreateForm] = useState({ name: '', contact_email: '', industry: '' });
    const [onboardForm, setOnboardForm] = useState({ name: '', email: '', password: '' });

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
            
            // Only Admins should fetch this
            if (userRes.data.role === 'admin') {
                const tenantRes = await api.get('/tenants/');
                setTenants(tenantRes.data);
            }
        } catch (err) {
            console.error("Failed to load tenants", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tenants/', createForm);
            toast.success("Tenant organization created!");
            setIsCreateOpen(false);
            setCreateForm({ name: '', contact_email: '', industry: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create tenant");
        }
    };

    const handleOnboardAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/tenants/${selectedTenantId}/onboard`, onboardForm);
            toast.success("Tenant Admin onboarded successfully!");
            setIsOnboardOpen(false);
            setOnboardForm({ name: '', email: '', password: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to onboard admin");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading SaaS Management...</div>;

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 pb-12">
                <Navbar user={user} aiData={aiData} />
                <div className="p-8 text-center mt-12">
                    <ShieldCheck size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">System Admin Access Required</h2>
                    <p className="text-gray-500 mt-2">You do not have permission to view the SaaS Tenant dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-6xl mx-auto p-8">
                <PageHeader 
                    title="SaaS Tenant Management" 
                    subtitle="Manage client organizations and multi-tenant isolation"
                    actionButton={
                        <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition">
                            <Plus size={16} /> Register Organization
                        </button>
                    }
                />

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {tenants.length === 0 ? (
                        <EmptyState message="No tenants registered on the platform yet." />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Organization</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Slug</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Contact</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase">Status</th>
                                    <th className="p-4 font-bold text-gray-600 text-xs uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => (
                                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                                                {t.name.charAt(0).toUpperCase()}
                                            </div>
                                            {t.name}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{t.slug}</td>
                                        <td className="p-4 text-sm text-gray-600">{t.contact_email}</td>
                                        <td className="p-4"><StatusBadge status={t.status.toLowerCase()} /></td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => { setSelectedTenantId(t.id); setIsOnboardOpen(true); }}
                                                className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1 ml-auto"
                                            >
                                                <UserPlus size={14} /> Onboard Admin
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Tenant Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Building2 className="text-blue-500" /> Register Client</h3>
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Company Name</label>
                                <input required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Acme Corp" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Billing/Contact Email</label>
                                <input type="email" required value={createForm.contact_email} onChange={e => setCreateForm({...createForm, contact_email: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="billing@acmecorp.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Industry (Optional)</label>
                                <input value={createForm.industry} onChange={e => setCreateForm({...createForm, industry: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Technology" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Create Tenant</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Onboard Admin Modal */}
            {isOnboardOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus className="text-green-500" /> Create Tenant Admin</h3>
                        <p className="text-xs text-gray-500 mb-4">This will generate the root administrator account for this tenant and initialize their default collaboration settings.</p>
                        <form onSubmit={handleOnboardAdmin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Admin Full Name</label>
                                <input required value={onboardForm.name} onChange={e => setOnboardForm({...onboardForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Admin Login Email</label>
                                <input type="email" required value={onboardForm.email} onChange={e => setOnboardForm({...onboardForm, email: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="admin@acmecorp.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Temporary Password</label>
                                <input type="password" required value={onboardForm.password} onChange={e => setOnboardForm({...onboardForm, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="••••••••" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsOnboardOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">Initialize Tenant</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
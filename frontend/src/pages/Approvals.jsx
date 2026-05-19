import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar'; // <-- IMPORT THE NEW NAVBAR

export default function Approvals() {
    const [approvals, setApprovals] = useState([]);
    
    // State for the Navbar
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    
    const navigate = useNavigate();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // Action State
    const [actionComment, setActionComment] = useState('');
    const [selectedApprovalId, setSelectedApprovalId] = useState(null);

    useEffect(() => {
        fetchUserAndApprovals();
    }, []);

    const fetchUserAndApprovals = async () => {
        try {
            // Fetch User
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            
            // Fetch AI Summary (for Navbar Notifications)
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);
            
            // Fetch Approvals
            const appRes = await api.get('/approvals/');
            setApprovals(appRes.data);
        } catch (err) {
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    const handleCreateApproval = async (e) => {
        e.preventDefault();
        try {
            await api.post('/approvals/', { title, description });
            setTitle(''); setDescription('');
            fetchUserAndApprovals();
        } catch (err) { alert('Failed to submit request.'); }
    };

    const handleAction = async (id, actionType) => {
        if (actionType === 'reject' && !actionComment.trim()) {
            alert('A comment is strictly required to reject an approval.');
            setSelectedApprovalId(id);
            return;
        }

        try {
            await api.patch(`/approvals/${id}/action`, { action: actionType, comment: actionComment || "Approved via dashboard" });
            setActionComment('');
            setSelectedApprovalId(null);
            fetchUserAndApprovals();
        } catch (err) {
            alert(err.response?.data?.detail || 'Action failed.');
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            
            {/* <-- UNIFIED NAVBAR --> */}
            <div className="mb-12">
                <Navbar user={user} aiData={aiData} />
            </div>

            <div className="max-w-5xl mx-auto px-8">
                
                {/* PAGE HEADER */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 text-white rounded-lg"><ShieldCheck size={24} /></div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">Approval Center</h1>
                            <p className="text-sm text-gray-500 font-medium">Multi-Level Authorization</p>
                        </div>
                    </div>
                </div>

                {/* CREATE APPROVAL FORM (Employees & Managers) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-lg font-bold mb-4 text-gray-800">Submit New Request</h2>
                    <form onSubmit={handleCreateApproval} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1">REQUEST TITLE</label>
                            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="E.g., Server Access, PTO" />
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-gray-600 mb-1">JUSTIFICATION / DETAILS</label>
                            <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="Why is this needed?" />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold p-2.5 rounded-lg hover:bg-purple-700 transition">
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>

                {/* APPROVALS LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {approvals.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 italic">No approval requests found.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Request</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Pending At</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvals.map(app => (
                                    <tr key={app.id} className="border-b border-gray-50 hover:bg-purple-50/30">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{app.title}</div>
                                            <div className="text-sm text-gray-500">{app.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-gray-500 uppercase">{app.status === 'pending' ? app.current_level : '--'}</td>
                                        <td className="p-4">
                                            {/* Action Buttons (Only show if pending and user has the right role) */}
                                            {app.status === 'pending' && (user.role === 'admin' || (user.role === 'manager' && app.current_level === 'manager')) && (
                                                <div className="flex flex-col gap-2">
                                                    {selectedApprovalId === app.id ? (
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Reason for rejection..." className="text-xs p-1.5 border rounded outline-none" value={actionComment} onChange={e => setActionComment(e.target.value)} />
                                                            <button onClick={() => handleAction(app.id, 'reject')} className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">Confirm</button>
                                                            <button onClick={() => setSelectedApprovalId(null)} className="text-gray-500 text-xs hover:underline">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAction(app.id, 'approve')} className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-200 transition">
                                                                <CheckCircle size={14}/> Approve
                                                            </button>
                                                            <button onClick={() => setSelectedApprovalId(app.id)} className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-200 transition">
                                                                <XCircle size={14}/> Reject
                                                            </button>
                                                        </div>
                                                    )}
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
        </div>
    );
}
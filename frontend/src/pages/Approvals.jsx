import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle, Paperclip, Download, Trash2, Upload, X } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar'; 
import { toast } from 'react-hot-toast';

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

    // --- PHASE 10B: Document State ---
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [activeApproval, setActiveApproval] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [documentType, setDocumentType] = useState('REFERENCE');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchUserAndApprovals();
    }, []);

    const fetchUserAndApprovals = async () => {
        try {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            
            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);
            
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
            toast.success('Approval request submitted successfully.');
            fetchUserAndApprovals();
        } catch (err) { 
            toast.error('Failed to submit request.'); 
        }
    };

    const handleAction = async (id, actionType) => {
        if (actionType === 'reject' && !actionComment.trim()) {
            toast.error('A comment is strictly required to reject an approval.');
            setSelectedApprovalId(id);
            return;
        }

        try {
            await api.patch(`/approvals/${id}/action`, { action: actionType, comment: actionComment || "Approved via dashboard" });
            setActionComment('');
            setSelectedApprovalId(null);
            toast.success(`Approval ${actionType}ed successfully.`);
            fetchUserAndApprovals();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Action failed.');
        }
    };

    // ==========================================
    // PHASE 10B: DOCUMENT HANDLERS
    // ==========================================

    const openDocumentModal = async (approval) => {
        setActiveApproval(approval);
        setIsDocModalOpen(true);
        fetchDocuments(approval.id);
    };

    const fetchDocuments = async (approvalId) => {
        try {
            const res = await api.get(`/approvals/${approvalId}/documents`);
            setDocuments(res.data);
        } catch (err) {
            toast.error("Failed to fetch documents");
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload || !activeApproval) return;
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('document_type', documentType);

        setIsUploading(true);
        try {
            await api.post(`/approvals/${activeApproval.id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Document uploaded successfully!");
            setFileToUpload(null);
            // Reset file input element visually
            document.getElementById('file-upload-input').value = "";
            fetchDocuments(activeApproval.id);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (doc) => {
        try {
            const res = await api.get(`/approvals/documents/${doc.id}/download`, { responseType: 'blob' });
            // Create a temporary link to trigger the browser download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.file_name);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            toast.error("Download failed. File might be missing from server.");
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            await api.delete(`/approvals/documents/${docId}`);
            toast.success("Document deleted");
            fetchDocuments(activeApproval.id);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete document");
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-purple-600">Loading Approvals...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            
            <div className="mb-12">
                <Navbar user={user} aiData={aiData} />
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-8">
                
                {/* PAGE HEADER */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 text-white rounded-lg"><ShieldCheck size={24} /></div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">Approval Center</h1>
                            <p className="text-sm text-gray-500 font-medium">Multi-Level Authorization & Documentation</p>
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Request</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Pending At</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Documents</th>
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
                                                <button onClick={() => openDocumentModal(app)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">
                                                    <Paperclip size={14} /> Evidence
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                {app.status === 'pending' && (user.role === 'admin' || (user.role === 'manager' && app.current_level === 'manager')) && (
                                                    <div className="flex flex-col gap-2">
                                                        {selectedApprovalId === app.id ? (
                                                            <div className="flex gap-2">
                                                                <input type="text" placeholder="Reason for rejection..." className="text-xs p-1.5 border rounded outline-none w-32" value={actionComment} onChange={e => setActionComment(e.target.value)} />
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
                        </div>
                    )}
                </div>
            </div>

            {/* --- PHASE 10B: DOCUMENTS MODAL --- */}
            {isDocModalOpen && activeApproval && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Paperclip size={18} className="text-purple-600"/> Supporting Documents
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">For Approval: <span className="font-bold text-gray-700">{activeApproval.title}</span></p>
                            </div>
                            <button onClick={() => setIsDocModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body: File Upload Form */}
                        <div className="p-6 bg-gray-50 border-b border-gray-100">
                            <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-3 items-center">
                                <input 
                                    id="file-upload-input"
                                    type="file" 
                                    required
                                    onChange={(e) => setFileToUpload(e.target.files[0])}
                                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                                />
                                <select 
                                    value={documentType} 
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="REFERENCE">Reference / Evidence</option>
                                    <option value="REQUIREMENT">Requirement Spec</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <button 
                                    type="submit" 
                                    disabled={!fileToUpload || isUploading}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2.5 px-4 rounded-lg transition"
                                >
                                    {isUploading ? "Uploading..." : <><Upload size={16}/> Upload</>}
                                </button>
                            </form>
                        </div>

                        {/* Modal Body: Document List */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {documents.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 py-8 italic border-2 border-dashed border-gray-100 rounded-xl">
                                    No documents have been attached to this approval yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-gray-800 truncate" title={doc.file_name}>{doc.file_name}</p>
                                                    <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                                                        <span className="font-semibold text-purple-600">{doc.document_type}</span>
                                                        <span>•</span>
                                                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0 ml-4">
                                                <button onClick={() => handleDownload(doc)} title="Download" className="p-2 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 rounded-lg transition">
                                                    <Download size={16} />
                                                </button>
                                                {(user.role === 'admin' || doc.uploaded_by === user.id) && (
                                                    <button onClick={() => handleDeleteDoc(doc.id)} title="Delete" className="p-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-lg transition">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import api from '../api'; // Assuming you have an Axios/fetch instance setup here

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    workflow_type: 'TASK',
    description: '',
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await api.get('/workflows/');
      setWorkflows(response.data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    try {
      await api.post('/workflows/', formData);
      setShowModal(false);
      setFormData({ name: '', workflow_type: 'TASK', description: '' });
      fetchWorkflows(); // Refresh list
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Are you sure you want to disable this workflow?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      fetchWorkflows();
    } catch (error) {
      console.error('Error disabling workflow:', error);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Workflow Automation</h1>
          <p className="text-gray-600 mt-2">Manage automated platform rules and triggers.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
        >
          + Create Workflow
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading workflows...</p>
      ) : workflows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100">
          <h3 className="text-xl font-medium text-gray-700">No workflows active</h3>
          <p className="text-gray-500 mt-2">Create your first automation rule to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((wf) => (
            <div key={wf.id} className={`bg-white rounded-xl shadow-sm border p-6 ${wf.is_active ? 'border-gray-200' : 'border-red-200 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">
                  {wf.workflow_type}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${wf.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {wf.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{wf.name}</h3>
              <p className="text-gray-600 text-sm mb-6 h-10 overflow-hidden">{wf.description}</p>
              
              <div className="flex justify-between items-center border-t pt-4">
                <button className="text-sm text-blue-600 font-medium hover:underline">View Rules</button>
                {wf.is_active && (
                  <button onClick={() => handleDisable(wf.id)} className="text-sm text-red-600 font-medium hover:underline">
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Create New Workflow</h2>
            </div>
            
            <form onSubmit={handleCreateWorkflow} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Overdue Task Escalation"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select 
                  value={formData.workflow_type}
                  onChange={(e) => setFormData({...formData, workflow_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="TASK">Task</option>
                  <option value="APPROVAL">Approval</option>
                  <option value="PROJECT">Project</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Briefly describe what this workflow does..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg"
                >
                  Save Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
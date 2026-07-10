import React, { useState, useEffect } from 'react';
import api from '../api'; 

export default function NotificationRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    event_type: 'Task Assigned',
    notification_type: 'IN_APP',
    is_active: true
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      // The trailing slash depends on your exact FastAPI configuration, 
      // but usually /notification-rules or /notification-rules/ works based on previous routers
      const response = await api.get('/notification-rules');
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching notification rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notification-rules', formData);
      setShowModal(false);
      setFormData({ event_type: 'Task Assigned', notification_type: 'IN_APP', is_active: true });
      fetchRules(); // Refresh the list
    } catch (error) {
      console.error('Error creating notification rule:', error);
      alert('Failed to create notification rule');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Are you sure you want to disable this rule?')) return;
    try {
      await api.delete(`/notification-rules/${id}`);
      fetchRules();
    } catch (error) {
      console.error('Error disabling rule:', error);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notification Engine</h1>
          <p className="text-gray-600 mt-2">Configure how and when users are alerted across the platform.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
        >
          + Add New Rule
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading rules...</p>
      ) : rules.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100">
          <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-700">No active rules</h3>
          <p className="text-gray-500 mt-2">Create your first notification rule to standardize tenant alerts.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <th className="p-4 font-semibold">Event Trigger</th>
                <th className="p-4 font-semibold">Delivery Method</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                  <td className="p-4 font-medium text-gray-800">{rule.event_type}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rule.notification_type === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {rule.notification_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-2 text-sm ${rule.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {rule.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {rule.is_active && (
                      <button 
                        onClick={() => handleDisable(rule.id)}
                        className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                      >
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE RULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Add Notification Rule</h2>
            </div>
            
            <form onSubmit={handleCreateRule} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">When this happens...</label>
                <select 
                  value={formData.event_type}
                  onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="Task Assigned">Task Assigned</option>
                  <option value="Task Overdue">Task Overdue</option>
                  <option value="Approval Pending">Approval Pending</option>
                  <option value="Approval Rejected">Approval Rejected</option>
                  <option value="Meeting Reminder">Meeting Reminder</option>
                  <option value="Project Created">Project Created</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliver alert via...</label>
                <select 
                  value={formData.notification_type}
                  onChange={(e) => setFormData({...formData, notification_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="IN_APP">In-App Notification Only</option>
                  <option value="EMAIL">Email & In-App Notification</option>
                </select>
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
                  className="px-4 py-2 bg-purple-600 text-white font-medium hover:bg-purple-700 rounded-lg"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
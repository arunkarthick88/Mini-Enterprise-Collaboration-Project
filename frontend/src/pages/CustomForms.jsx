import React, { useState, useEffect } from 'react';
import api from '../api';

export default function CustomForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    request_type: 'OTHER',
    is_active: true
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms');
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/forms', formData);
      setShowModal(false);
      setFormData({ name: '', description: '', request_type: 'OTHER', is_active: true });
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Disable this form? Users will no longer be able to submit it.')) return;
    try {
      await api.delete(`/forms/${id}`);
      fetchForms();
    } catch (error) {
      console.error('Error disabling form:', error);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Custom Form Builder</h1>
          <p className="text-gray-600 mt-2">Design intake forms for standardizing company requests.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
        >
          + Build New Form
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading forms...</p>
      ) : forms.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100">
          <h3 className="text-xl font-medium text-gray-700">No custom forms</h3>
          <p className="text-gray-500 mt-2">Create forms to standardize HR, IT, and Finance requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div key={form.id} className={`bg-white rounded-xl shadow-sm border p-6 ${form.is_active ? 'border-gray-200' : 'border-red-200 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-800 rounded uppercase">
                  {form.request_type}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${form.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {form.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{form.name}</h3>
              <p className="text-gray-600 text-sm mb-6 h-10 overflow-hidden">{form.description}</p>
              
              <div className="flex justify-between items-center border-t pt-4">
                <button className="text-sm text-teal-600 font-medium hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Fields
                </button>
                {form.is_active && (
                  <button onClick={() => handleDisable(form.id)} className="text-sm text-red-500 font-medium hover:underline">
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
              <h2 className="text-xl font-bold text-gray-800">Create Form Template</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                <input 
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="e.g., Remote Work Request"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Category</label>
                <select 
                  value={formData.request_type}
                  onChange={(e) => setFormData({...formData, request_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="LEAVE">Leave / Time Off</option>
                  <option value="PURCHASE">Purchase / Expense</option>
                  <option value="ACCESS">System Access</option>
                  <option value="LICENSE">Software License</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows="3" value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Describe when employees should use this form..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg">Create Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
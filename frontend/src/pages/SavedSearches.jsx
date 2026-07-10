import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function SavedSearches() {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const response = await api.get('/saved-searches');
      setSavedSearches(response.data);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved search?')) return;
    try {
      await api.delete(`/saved-searches/${id}`);
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  const handleExecuteSearch = (queryData) => {
    // Navigate back to the global search page, passing the saved query in the URL state or query params.
    // For simplicity, we'll navigate and the user can type it, but in a full app you'd parse this into the search bar.
    if(queryData && queryData.keyword) {
        alert(`Executing search for: ${queryData.keyword}`);
        navigate('/search');
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Saved Searches</h1>
          <p className="text-gray-600 mt-2">Quickly access your most frequent enterprise queries.</p>
        </div>
        <button 
          onClick={() => navigate('/search')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
        >
          Go to Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading saved searches...</p>
      ) : savedSearches.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="text-xl font-medium text-gray-700">No saved searches</h3>
          <p className="text-gray-500 mt-2">Perform a global search and save it to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedSearches.map((search) => (
            <div key={search.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative group">
              <h3 className="text-xl font-bold text-gray-800 mb-2 pr-8">{search.name}</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-6">
                <p className="text-sm font-mono text-gray-600 truncate">
                  Keyword: {search.query_json?.keyword || 'N/A'}
                </p>
              </div>
              
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => handleExecuteSearch(search.query_json)}
                  className="text-blue-600 font-medium hover:underline text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  Run Query
                </button>
                <button 
                  onClick={() => handleDelete(search.id)}
                  className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
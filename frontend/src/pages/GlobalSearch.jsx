import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || query.trim().length < 2) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/search/global?query=${encodeURIComponent(query)}`);
      setResults(response.data);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    const searchName = prompt('Enter a name for this saved search:');
    if (!searchName) return;
    
    setSaving(true);
    try {
      await api.post('/saved-searches', {
        name: searchName,
        query_json: { keyword: query }
      });
      alert('Search saved successfully!');
      // Navigate to saved searches page to see it
      navigate('/saved-searches'); 
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Enterprise Search</h1>
          <p className="text-gray-600">Search across all your projects, tasks, and teams instantly.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative flex items-center mb-8 shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-32 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            placeholder="Search for 'Q3 Roadmap', 'Authentication API'..."
          />
          <button 
            type="submit" 
            disabled={loading || query.length < 2}
            className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results Area */}
        {results && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Search Results</h2>
              <button 
                onClick={handleSaveSearch}
                disabled={saving}
                className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save this Search'}
              </button>
            </div>

            {/* Projects Results */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Projects ({results.projects.length})</h3>
              {results.projects.length === 0 ? <p className="text-sm text-gray-400 italic">No projects found.</p> : (
                <div className="grid gap-3">
                  {results.projects.map(p => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-300">
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks Results */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Tasks ({results.tasks.length})</h3>
              {results.tasks.length === 0 ? <p className="text-sm text-gray-400 italic">No tasks found.</p> : (
                <div className="grid gap-3">
                  {results.tasks.map(t => (
                    <div key={t.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-300">
                      <span className="font-medium text-gray-800">{t.title}</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase">{t.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teams Results */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Teams ({results.teams.length})</h3>
              {results.teams.length === 0 ? <p className="text-sm text-gray-400 italic">No teams found.</p> : (
                <div className="grid gap-3">
                  {results.teams.map(tm => (
                    <div key={tm.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-300">
                      <span className="font-medium text-gray-800">{tm.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
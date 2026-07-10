import React, { useState, useEffect } from 'react';
import api from '../api';

export default function KnowledgeBase() {
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Forms
  const [categoryName, setCategoryName] = useState('');
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, artRes] = await Promise.all([
        api.get('/knowledge/categories'),
        api.get('/knowledge/articles')
      ]);
      setCategories(catRes.data);
      setArticles(artRes.data);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/knowledge/categories', { name: categoryName, description: '' });
      setCategoryName('');
      setShowCategoryModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCreateArticle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/knowledge/articles', articleForm);
      setArticleForm({ title: '', content: '', category_id: '' });
      setShowArticleModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating article:', error);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    try {
      await api.delete(`/knowledge/articles/${id}`);
      setSelectedArticle(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading Knowledge Base...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen flex gap-8">
      {/* Sidebar: Categories */}
      <div className="w-64 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Categories</h2>
          <button onClick={() => setShowCategoryModal(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        <div className="space-y-2">
          {categories.length === 0 ? <p className="text-sm text-gray-400 italic">No categories yet.</p> : null}
          {categories.map(cat => (
            <div key={cat.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm font-medium text-gray-700 cursor-pointer hover:border-blue-300">
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Articles */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {selectedArticle ? (
          /* Article Reading View */
          <div className="p-8 relative">
            <button onClick={() => setSelectedArticle(null)} className="absolute top-4 left-4 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
              &larr; Back to articles
            </button>
            <div className="absolute top-4 right-4 space-x-3">
              <button onClick={() => handleDeleteArticle(selectedArticle.id)} className="text-sm text-red-500 hover:underline">Delete</button>
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">
                {categories.find(c => c.id === selectedArticle.category_id)?.name || 'Uncategorized'}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{selectedArticle.title}</h1>
              <p className="text-sm text-gray-400 mb-8 border-b pb-4">Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}</p>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>
          </div>
        ) : (
          /* Article Directory View */
          <div className="p-8">
            <div className="flex justify-between items-center border-b pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Company Wiki</h1>
                <p className="text-gray-500">Internal documentation and policies.</p>
              </div>
              <button onClick={() => setShowArticleModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                + Write Article
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.length === 0 ? <p className="text-gray-400 col-span-2">No articles written yet.</p> : null}
              {articles.map(art => (
                <div 
                  key={art.id} 
                  onClick={() => setSelectedArticle(art)}
                  className="p-5 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="text-xs text-blue-600 font-bold mb-2 uppercase">
                    {categories.find(c => c.id === art.category_id)?.name || 'Uncategorized'}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{art.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{art.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleCreateCategory} className="bg-white p-6 rounded-xl w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">New Category</h2>
            <input 
              autoFocus required type="text" placeholder="e.g., Engineering" value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full border rounded p-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
            </div>
          </form>
        </div>
      )}

      {showArticleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleCreateArticle} className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">Write New Article</h2>
            <input 
              required type="text" placeholder="Article Title" value={articleForm.title}
              onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
              className="w-full border rounded p-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
            <select 
              required value={articleForm.category_id}
              onChange={(e) => setArticleForm({...articleForm, category_id: e.target.value})}
              className="w-full border rounded p-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea 
              required rows="10" placeholder="Write your content here... (Markdown support can be added later!)" value={articleForm.content}
              onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
              className="w-full border rounded p-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowArticleModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Publish</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
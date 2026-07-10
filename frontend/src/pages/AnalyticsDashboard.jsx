import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AnalyticsDashboard() {
  const [data, setData] = useState({
    tasks: null,
    projects: null,
    approvals: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all three analytics endpoints concurrently for speed
      const [tasksRes, projectsRes, approvalsRes] = await Promise.all([
        api.get('/analytics/tasks'),
        api.get('/analytics/projects'),
        api.get('/analytics/approvals')
      ]);

      setData({
        tasks: tasksRes.data,
        projects: projectsRes.data,
        approvals: approvalsRes.data
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to download JSON as a CSV file
  const handleExport = async (endpoint, filename) => {
    try {
      const response = await api.get(endpoint);
      const reportData = response.data;
      
      if (!reportData || reportData.length === 0) {
        alert("No data available to export.");
        return;
      }

      // Convert JSON to CSV
      const headers = Object.keys(reportData[0]);
      const csvRows = [];
      
      // Add Headers
      csvRows.push(headers.join(','));
      
      // Add Rows
      for (const row of reportData) {
        const values = headers.map(header => {
          const val = row[header] === null || row[header] === undefined ? "" : row[header];
          // Escape quotes and wrap in quotes to handle commas in strings
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error(`Error exporting ${filename}:`, error);
      alert("Failed to export report.");
    }
  };

  // Helper component to render beautiful progress bars for statuses
  const StatusBreakdown = ({ breakdown, total, colorClass }) => {
    if (!breakdown || Object.keys(breakdown).length === 0) return <p className="text-sm text-gray-400">No data available</p>;
    
    return (
      <div className="mt-4 space-y-3">
        {Object.entries(breakdown).map(([status, count]) => {
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={status}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                <span className="text-gray-500">{count} ({percentage}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${colorClass}`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading Analytics...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics & Reports</h1>
          <p className="text-gray-600 mt-2">Platform-wide insights and exportable CSV reports.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleExport('/reports/tasks', 'Task_Report.csv')}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Tasks
          </button>
          <button 
            onClick={() => handleExport('/reports/projects', 'Project_Report.csv')}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Projects
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tasks Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Task Overview</h2>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
          </div>
          <div className="mb-6 border-b pb-4">
            <span className="text-4xl font-extrabold text-gray-900">{data.tasks?.total_tasks || 0}</span>
            <span className="text-gray-500 ml-2 font-medium">Total Tasks</span>
          </div>
          <StatusBreakdown breakdown={data.tasks?.status_breakdown} total={data.tasks?.total_tasks} colorClass="bg-blue-500" />
        </div>

        {/* Projects Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Project Overview</h2>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
          </div>
          <div className="mb-6 border-b pb-4">
            <span className="text-4xl font-extrabold text-gray-900">{data.projects?.total_projects || 0}</span>
            <span className="text-gray-500 ml-2 font-medium">Total Projects</span>
          </div>
          <StatusBreakdown breakdown={data.projects?.status_breakdown} total={data.projects?.total_projects} colorClass="bg-purple-500" />
        </div>

        {/* Approvals Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Approval Overview</h2>
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="mb-6 border-b pb-4">
            <span className="text-4xl font-extrabold text-gray-900">{data.approvals?.total_approvals || 0}</span>
            <span className="text-gray-500 ml-2 font-medium">Total Requests</span>
          </div>
          <StatusBreakdown breakdown={data.approvals?.status_breakdown} total={data.approvals?.total_approvals} colorClass="bg-green-500" />
        </div>

      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { PageHeader, ToggleSwitch, LoadingSpinner } from '../components/UI';

export default function NotificationPreferences() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [prefs, setPrefs] = useState({
        in_app_enabled: true,
        email_enabled: true,
        task_notifications: true,
        approval_notifications: true,
        escalation_notifications: true,
        document_notifications: true
    });

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

            const aiRes = await api.get('/dashboard/ai-summary');
            setAiData(aiRes.data);

            const prefsRes = await api.get('/notifications/preferences/me');
            setPrefs(prefsRes.data);
        } catch (err) {
            console.error("Failed to load user preferences", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/notifications/preferences/me', prefs);
            setMessage('Preferences updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            alert("Failed to save preferences.");
        } finally {
            setSaving(false);
        }
    };

    const togglePref = (key) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Configuration...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-3xl mx-auto p-8">
                <PageHeader 
                    title="Alert Preferences" 
                    subtitle="Manage how and when you receive system notifications" 
                />

                {message && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2 font-medium">
                        <CheckCircle size={18} /> {message}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8 space-y-8">
                    
                    {/* Delivery Methods */}
                    <section>
                        <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4 border-b border-gray-100 pb-2">Delivery Methods</h3>
                        <div className="space-y-1">
                            <ToggleSwitch 
                                label="In-App Real-Time Alerts (Popup/Inbox)" 
                                enabled={prefs.in_app_enabled} 
                                onChange={() => togglePref('in_app_enabled')} 
                            />
                            <ToggleSwitch 
                                label="Daily Email Summaries (External)" 
                                enabled={prefs.email_enabled} 
                                onChange={() => togglePref('email_enabled')} 
                            />
                        </div>
                    </section>

                    {/* Module Subscriptions */}
                    <section>
                        <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <AlertCircle size={16} /> Notification Categories
                        </h3>
                        <div className="space-y-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <ToggleSwitch 
                                label="Task Assignments & Updates" 
                                enabled={prefs.task_notifications} 
                                onChange={() => togglePref('task_notifications')} 
                            />
                            <ToggleSwitch 
                                label="Approval Requests & Responses" 
                                enabled={prefs.approval_notifications} 
                                onChange={() => togglePref('approval_notifications')} 
                            />
                            <ToggleSwitch 
                                label="Governance Escalations (SLA)" 
                                enabled={prefs.escalation_notifications} 
                                onChange={() => togglePref('escalation_notifications')} 
                            />
                            <ToggleSwitch 
                                label="Document Version Changes" 
                                enabled={prefs.document_notifications} 
                                onChange={() => togglePref('document_notifications')} 
                            />
                        </div>
                    </section>

                    <div className="pt-6 flex justify-end">
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                        >
                            <Save size={16} /> {saving ? "Saving..." : "Save Preferences"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
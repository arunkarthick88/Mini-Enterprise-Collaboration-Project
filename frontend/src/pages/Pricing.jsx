import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Shield, Crown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar'; // <-- IMPORT THE NEW NAVBAR

export default function Pricing() {
    const [user, setUser] = useState(null);
    const [aiData, setAiData] = useState(null); // <-- Add AI Data state for Navbar
    const [loadingPlan, setLoadingPlan] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNavData = async () => {
            try {
                // Fetch User
                const userRes = await api.get('/auth/me');
                setUser(userRes.data);
                
                // Fetch AI Summary for Navbar
                const aiRes = await api.get('/dashboard/ai-summary');
                setAiData(aiRes.data);
            } catch (err) {
                navigate('/');
            }
        };
        fetchNavData();
    }, [navigate]);

    const handleSubscribe = async (planType) => {
        setLoadingPlan(planType);
        try {
            const res = await api.post(`/billing/create-checkout-session?plan_type=${planType}`);
            window.location.href = res.data.checkout_url;
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Failed to initiate checkout");
            setLoadingPlan(null);
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Pricing...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-12">
            
            {/* <-- UNIFIED NAVBAR --> */}
            <Navbar user={user} aiData={aiData} />

            <div className="max-w-7xl mx-auto p-8 pt-12">
                
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Supercharge Your Enterprise</h2>
                    <p className="text-lg text-gray-600">Unlock advanced AI analytics, higher API limits, and priority support with our premium plans.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    
                    {/* BASIC PLAN */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col opacity-75">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Basic</h3>
                            <p className="text-sm text-gray-500 mt-1">For small teams getting started.</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Standard Kanban Board</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Up to 10 Users</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> 100 AI Insights / Month</li>
                        </ul>
                        <button disabled className="w-full py-3 px-4 bg-gray-100 text-gray-500 font-bold rounded-xl cursor-not-allowed">
                            Current Plan
                        </button>
                    </div>

                    {/* SILVER PLAN */}
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 p-8 flex flex-col relative transform scale-105 z-10">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <span className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
                        </div>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Shield size={20} className="text-blue-500"/> Silver</h3>
                            <p className="text-sm text-gray-500 mt-1">For growing enterprises.</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-gray-900">₹100</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Advanced Kanban & Approval Workflows</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Up to 50 Users</li>
                            <li className="flex items-center gap-3 text-sm text-gray-800 font-bold"><Zap size={18} className="text-yellow-500"/> 500 AI Insights / Month</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Automated Delay Risk Detection</li>
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('silver')}
                            disabled={loadingPlan !== null}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex justify-center items-center gap-2"
                        >
                            {loadingPlan === 'silver' ? <Loader2 size={20} className="animate-spin" /> : "Upgrade to Silver"}
                        </button>
                    </div>

                    {/* GOLD PLAN */}
                    <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8 flex flex-col text-white">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Crown size={20} className="text-yellow-400"/> Gold</h3>
                            <p className="text-sm text-gray-400 mt-1">Unlimited power for massive scale.</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold">₹500</span>
                            <span className="text-gray-400">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={18} className="text-green-400"/> Everything in Silver</li>
                            <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={18} className="text-green-400"/> Unlimited Users</li>
                            <li className="flex items-center gap-3 text-sm font-bold text-yellow-400"><Zap size={18}/> 5000 AI Insights / Month</li>
                            <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={18} className="text-green-400"/> Smart Auto-Assignment Engine</li>
                            <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={18} className="text-green-400"/> Priority 24/7 Support</li>
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('gold')}
                            disabled={loadingPlan !== null}
                            className="w-full py-3 px-4 bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-xl transition flex justify-center items-center gap-2"
                        >
                            {loadingPlan === 'gold' ? <Loader2 size={20} className="animate-spin text-gray-900" /> : "Upgrade to Gold"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
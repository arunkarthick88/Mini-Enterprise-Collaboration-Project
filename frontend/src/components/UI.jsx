import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// --- PAGE HEADER ---
export const PageHeader = ({ title, subtitle, actionButton }) => (
    <div className="flex justify-between items-end mb-6">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actionButton && <div>{actionButton}</div>}
    </div>
);

// --- SLA BADGE ---
export const SLABadge = ({ status }) => {
    if (!status) return <span className="text-gray-400 text-xs italic">No SLA</span>;
    
    const styles = {
        ACTIVE: "bg-blue-100 text-blue-700 border-blue-200",
        COMPLETED_WITHIN_SLA: "bg-green-100 text-green-700 border-green-200",
        BREACHED: "bg-red-100 text-red-700 border-red-200 font-bold",
        ESCALATED: "bg-orange-100 text-orange-700 border-orange-200"
    };
    
    const icons = {
        ACTIVE: <Clock size={12} />,
        COMPLETED_WITHIN_SLA: <CheckCircle size={12} />,
        BREACHED: <AlertTriangle size={12} />,
        ESCALATED: <AlertTriangle size={12} />
    };

    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-gray-100 text-gray-600"}`}>
            {icons[status]} {status.replace(/_/g, ' ')}
        </span>
    );
};

// --- STATUS BADGE ---
export const StatusBadge = ({ status }) => {
    const isGood = ['done', 'approved', 'active', 'resolved'].includes(status?.toLowerCase());
    const isWarn = ['review', 'pending', 'in_progress'].includes(status?.toLowerCase());
    const isBad = ['rejected', 'cancelled', 'disabled'].includes(status?.toLowerCase());

    return (
        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
            isGood ? 'bg-green-100 text-green-700' :
            isWarn ? 'bg-yellow-100 text-yellow-700' :
            isBad ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
        }`}>
            {status}
        </span>
    );
};

// --- TOGGLE SWITCH ---
export const ToggleSwitch = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button 
            type="button"
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// --- LOADING & EMPTY STATES ---
export const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
);

export const EmptyState = ({ message }) => (
    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
        <p className="text-gray-400 italic">{message}</p>
    </div>
);
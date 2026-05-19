import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Grabs the token from the URL
    
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!token) {
            setError("No reset token found in the URL. Please request a new link.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post('/auth/reset-password', { token, new_password: newPassword });
            setMessage("Password reset successful! Redirecting to login...");
            setTimeout(() => navigate('/'), 3000); // Send them back to login after 3 seconds
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired token.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-96">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Set New Password</h2>
                <p className="text-center text-sm text-gray-500 mb-6">Please enter your new secure password.</p>

                {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium border border-green-200 text-center">{message}</div>}
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold border border-red-200 text-center">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input 
                        type="password" 
                        placeholder="New Password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} 
                        required 
                        minLength={6}
                        className="w-full mb-6 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" 
                    />
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || message} // Disable if already successful
                        className="w-full bg-emerald-600 text-white font-bold p-3 rounded-lg hover:bg-emerald-700 transition shadow-sm disabled:bg-emerald-400"
                    >
                        {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    <Link to="/" className="text-blue-600 font-bold hover:underline">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}
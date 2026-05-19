import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.message);
            setEmail(''); // Clear the input
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-96">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Forgot Password</h2>
                <p className="text-center text-sm text-gray-500 mb-6">Enter your email and we will send you a reset link.</p>

                {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium border border-green-200 text-center">{message}</div>}
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold border border-red-200 text-center">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Enterprise Email Address" 
                        value={email}
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="w-full mb-6 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" 
                    />
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:bg-blue-400"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Remembered your password? <Link to="/" className="text-blue-600 font-bold hover:underline">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}
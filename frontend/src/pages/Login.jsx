import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google'; // <-- NEW
import api from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); 
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const res = await api.post('/auth/login', params);
            
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('refresh_token', res.data.refresh_token); 
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password.');
        }
    };

    // --- NEW: Handle Google Login Response ---
    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        try {
            // Send the Google token to our backend
            const res = await api.post('/auth/google-login', {
                token: credentialResponse.credential
            });
            
            // Save our custom TaskFlow tokens just like a normal login
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('refresh_token', res.data.refresh_token);
            navigate('/dashboard');
        } catch (err) {
            setError('Google login failed. Please try again.');
        }
    };
    // -----------------------------------------

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-96">
                <form onSubmit={handleLogin}>
                    <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Enterprise Login</h2>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center font-bold border border-red-200">
                            {error}
                        </div>
                    )}

                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="w-full mb-4 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" 
                    />
                    
                    <div>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            className="w-full mb-2 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" 
                        />
                        
                        <div className="flex justify-end mb-6">
                            <Link to="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline transition">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition shadow-sm">
                        Login
                    </button>
                </form>

                {/* --- NEW: Google Login Section --- */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google widget failed to load.')}
                            theme="outline"
                            size="large"
                            text="continue_with"
                            shape="rectangular"
                        />
                    </div>
                </div>
                {/* ----------------------------------- */}

                <p className="text-center text-sm text-gray-500 mt-6">
                    Need an account? <Link to="/register" className="text-blue-600 font-bold hover:underline transition">Register here</Link>
                </p>
            </div>
        </div>
    );
}
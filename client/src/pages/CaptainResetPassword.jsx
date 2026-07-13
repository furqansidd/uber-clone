import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const CaptainResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(`${backendUrl}/auth/captain/reset-password`, {
        token,
        new_password: password
      });
      setMessage(res.data.message || 'Password has been reset successfully.');
      setTimeout(() => {
        navigate('/captain/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-[#1a1c1c] min-h-screen flex flex-col justify-between">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/captain/login')}
            className="w-12 h-12 flex items-center justify-center hover:bg-[#f4f3f3]/50 transition-colors duration-200 rounded-full cursor-pointer"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-black font-bold">arrow_back</span>
          </button>
          <span className="text-xl font-bold text-black tracking-tight">DriveNow</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col px-4 pt-32 pb-8 max-w-md mx-auto w-full">
        {/* Header Section */}
        <section className="mb-8 text-left">
          <h2 className="text-[26px] font-bold text-black mb-1">Reset Password</h2>
          <p className="text-sm text-[#5d5f5f]">Enter your new password below.</p>
        </section>

        {/* Status Alerts */}
        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 border border-green-200 text-left" role="status">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black" htmlFor="password">New Password</label>
            <div className="relative border border-[#cfc4c5] rounded-xl overflow-hidden bg-white focus-within:border-black transition-all">
              <input 
                className="w-full h-14 px-4 bg-transparent border-none focus:ring-0 focus:outline-none text-[#1a1c1c] text-sm" 
                id="password" 
                placeholder="Min. 8 characters" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black" htmlFor="confirmPassword">Confirm New Password</label>
            <div className="relative border border-[#cfc4c5] rounded-xl overflow-hidden bg-white focus-within:border-black transition-all">
              <input 
                className="w-full h-14 px-4 bg-transparent border-none focus:ring-0 focus:outline-none text-[#1a1c1c] text-sm" 
                id="confirmPassword" 
                placeholder="Re-enter your new password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              className="w-full h-[56px] bg-black text-white font-bold rounded-lg flex items-center justify-center active:scale-98 transition-all hover:bg-neutral-800 cursor-pointer disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/captain/login')}
            className="text-black font-bold hover:underline cursor-pointer bg-transparent border-none p-0 text-sm"
          >
            Back to Captain Login
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-grow"></div>
      </main>
    </div>
  );
};

export default CaptainResetPassword;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const CaptainLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(`${backendUrl}/auth/captain/login`, formData);

      login(res.data.token, 'captain', res.data.captain);
      navigate('/captain-home');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
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
            onClick={() => navigate('/')}
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
          <h2 className="text-[26px] font-bold text-black mb-1">Sign in as Captain</h2>
          <p className="text-sm text-[#5d5f5f]">Sign in to access your Captain dashboard.</p>
        </section>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black" htmlFor="email">Email Address</label>
            <div className="relative border border-[#cfc4c5] rounded-xl overflow-hidden bg-white focus-within:border-black transition-all">
              <input 
                className="w-full h-14 px-4 bg-transparent border-none focus:ring-0 focus:outline-none text-[#1a1c1c] text-sm" 
                id="email" 
                placeholder="captain@example.com" 
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-black" htmlFor="password">Password</label>
              <button
                type="button"
                onClick={() => navigate('/captain/forgot-password')}
                className="text-xs font-semibold text-[#5d5f5f] hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative border border-[#cfc4c5] rounded-xl overflow-hidden bg-white focus-within:border-black transition-all">
              <input 
                className="w-full h-14 px-4 bg-transparent border-none focus:ring-0 focus:outline-none text-[#1a1c1c] text-sm" 
                id="password" 
                placeholder="Enter your password" 
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
              />
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5d5f5f] hover:text-black cursor-pointer bg-transparent border-none p-0" 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle Password Visibility"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Login Button */}
          <div className="pt-4">
            <button 
              className="w-full h-[56px] bg-black text-white font-bold rounded-lg flex items-center justify-center active:scale-98 transition-all hover:bg-neutral-800 cursor-pointer disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#5d5f5f]">
            New here?{' '}
            <button 
              onClick={() => navigate('/captain/signup')}
              className="text-black font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              Register as Captain
            </button>
          </p>
        </div>

        {/* Spacer to push secondary button to bottom */}
        <div className="flex-grow min-h-[40px]"></div>

        {/* Sign in as Rider (Secondary Action) */}
        <div className="mt-8">
          <button 
            onClick={() => navigate('/login')}
            className="w-full h-[56px] bg-white border border-[#cfc4c5] text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-[#f4f3f3] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-sm">Sign in as Rider</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default CaptainLogin;

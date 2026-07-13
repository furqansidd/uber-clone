import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const RiderSignup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
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

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('All fields are required.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(`${backendUrl}/auth/signup`, formData);
      
      login(res.data.token, 'rider', res.data.user);
      navigate('/rider-home');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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

      <main className="flex-grow flex flex-col justify-center px-4 py-12 mt-16 max-w-md mx-auto w-full">
        {/* Header Section */}
        <section className="mb-8 text-left">
          <h1 className="text-[26px] md:text-3 text-black font-bold mb-1">Create account</h1>
          <p className="text-sm text-[#5d5f5f]">Enter your details to start your journey with DriveNow.</p>
        </section>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* First and Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-black" htmlFor="first_name">First name</label>
              <input 
                className="h-[56px] px-4 border border-[#cfc4c5] rounded-xl bg-white focus:border-black focus:ring-0 focus:outline-none transition-all" 
                id="first_name" 
                placeholder="John" 
                type="text"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-black" htmlFor="last_name">Last name</label>
              <input 
                className="h-[56px] px-4 border border-[#cfc4c5] rounded-xl bg-white focus:border-black focus:ring-0 focus:outline-none transition-all" 
                id="last_name" 
                placeholder="Doe" 
                type="text"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black" htmlFor="email">Email address</label>
            <input 
              className="h-[56px] px-4 border border-[#cfc4c5] rounded-xl bg-white focus:border-black focus:ring-0 focus:outline-none transition-all" 
              id="email" 
              placeholder="name@example.com" 
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black" htmlFor="password">Password</label>
            <div className="relative">
              <input 
                className="w-full h-[56px] px-4 border border-[#cfc4c5] rounded-xl bg-white focus:border-black focus:ring-0 focus:outline-none transition-all" 
                id="password" 
                placeholder="Min. 8 characters" 
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
              />
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5d5f5f] hover:text-black cursor-pointer" 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle Password Visibility"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Legal Agreement */}
          <p className="text-xs text-[#4c4546] leading-relaxed py-1">
            By creating an account, you agree to DriveNow's 
            <a className="underline font-semibold text-black ml-1" href="#terms">Terms of Service</a> and 
            <a className="underline font-semibold text-black ml-1" href="#privacy">Privacy Policy</a>.
          </p>

          {/* CTA Section */}
          <div className="pt-4 space-y-4">
            <button 
              className="w-full h-[56px] bg-black text-white font-bold rounded-xl active:scale-95 transition-transform duration-200 cursor-pointer disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Create account'}
            </button>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-sm text-[#5d5f5f]">Already have an account?</span>
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-black font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Log in
              </button>
            </div>
          </div>
        </form>

        {/* Social Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="h-[1px] flex-grow bg-[#cfc4c5]"></div>
          <span className="text-xs font-semibold text-[#5d5f5f]">OR</span>
          <div className="h-[1px] flex-grow bg-[#cfc4c5]"></div>
        </div>

        {/* Secondary Login Options */}
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/captain/signup')}
            className="w-full h-[56px] bg-white border border-[#cfc4c5] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#f4f3f3] transition-colors duration-200 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-black">steering</span>
            <span className="text-sm">Register as Captain</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default RiderSignup;

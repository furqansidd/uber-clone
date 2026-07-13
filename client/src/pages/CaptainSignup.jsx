import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CaptainSignup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    vehicle_type: 'bike',
    plate_number: '',
    capacity: 1,
    vehicle_color: '',
    terms_accepted: false,
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [id]: type === 'checkbox' ? checked : value
    });
  };

  const handleVehicleTypeChange = (type) => {
    setFormData({ ...formData, vehicle_type: type });
  };

  const handleCapacityChange = (e) => {
    const val = e.target.value;
    let capacityNum = 1;
    if (val.includes('2')) capacityNum = 2;
    else if (val.includes('4')) capacityNum = 4;
    else if (val.includes('6')) capacityNum = 6;
    setFormData({ ...formData, capacity: capacityNum });
  };

  const handleColorClick = (color) => {
    setFormData({ ...formData, vehicle_color: color });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    if (!formData.full_name || !formData.phone_number || !formData.plate_number || !formData.vehicle_color || !formData.email || !formData.password) {
      setError('All fields are required.');
      return;
    }

    if (!formData.terms_accepted) {
      setError('You must accept the terms of service.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Plate number validation: alphanumeric with optional hyphen
    const plateRegex = /^[A-Z0-9-]+$/i;
    if (!plateRegex.test(formData.plate_number)) {
      setError('Invalid plate number format (e.g. ABC-1234).');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.post(`${backendUrl}/auth/captain/signup`, formData);
      navigate('/captain/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-4 py-2">
        <button 
          type="button"
          onClick={() => navigate('/signup')}
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#eeeeee]/50 transition-colors cursor-pointer"
          aria-label="Back to User Signup"
        >
          <span className="material-symbols-outlined text-black font-bold">arrow_back</span>
        </button>
        <span className="text-xl font-bold text-black tracking-tight">DriveNow</span>
        <div className="w-12"></div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pt-20 pb-20 px-4 max-w-md mx-auto w-full text-left">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-black mb-1">Become a Captain</h1>
          <p className="text-sm text-[#5d5f5f]">Complete your profile to start earning with DriveNow.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-black uppercase tracking-wider">Personal Information</h2>
            
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-[#f9f9f9] text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="full_name">Full Name</label>
              <input 
                id="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full h-[56px] border border-[#cfc4c5] rounded-xl px-4 focus:border-black focus:ring-0 outline-none text-sm transition-all bg-white" 
                placeholder="e.g. John Doe" 
                type="text"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-[#f9f9f9] text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="phone_number">Phone Number</label>
              <input 
                id="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full h-[56px] border border-[#cfc4c5] rounded-xl px-4 focus:border-black focus:ring-0 outline-none text-sm transition-all bg-white" 
                placeholder="e.g. 5550123" 
                type="tel"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-[#f9f9f9] text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="email">Email Address</label>
              <input 
                id="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-[56px] border border-[#cfc4c5] rounded-xl px-4 focus:border-black focus:ring-0 outline-none text-sm transition-all bg-white" 
                placeholder="captain@example.com" 
                type="email"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-[#f9f9f9] text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="password">Password</label>
              <input 
                id="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-[56px] border border-[#cfc4c5] rounded-xl px-4 focus:border-black focus:ring-0 outline-none text-sm transition-all bg-white" 
                placeholder="Min. 8 characters" 
                type="password"
              />
            </div>
          </section>

          {/* Vehicle Detail Card */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-black uppercase tracking-wider">Vehicle Details</h2>
            <div className="bg-white p-4 rounded-[20px] border border-[#cfc4c5] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] space-y-4">
              
              {/* Segmented Control for Vehicle Type */}
              <div className="flex bg-[#eeeeee] rounded-lg p-1">
                {['bike', 'rickshaw', 'car'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleVehicleTypeChange(type)}
                    className={`flex-1 text-center py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      formData.vehicle_type === type ? 'bg-black text-white' : 'text-black'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="plate_number">Plate Number</label>
                  <input 
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={handleChange}
                    className="w-full h-[48px] border border-[#cfc4c5] rounded-lg px-3 focus:border-black focus:ring-0 outline-none text-sm transition-all uppercase" 
                    placeholder="ABC-1234" 
                    type="text"
                  />
                </div>
                
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="capacity">Capacity</label>
                  <select 
                    id="capacity"
                    onChange={handleCapacityChange}
                    className="w-full h-[48px] border border-[#cfc4c5] rounded-lg px-3 focus:border-black focus:ring-0 outline-none text-sm transition-all bg-white"
                  >
                    <option>1 person</option>
                    <option>2 people</option>
                    <option>4 people</option>
                    <option>6+ people</option>
                  </select>
                </div>

                <div className="relative col-span-2">
                  <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-[#5d5f5f] uppercase" htmlFor="vehicle_color">Vehicle Color</label>
                  <div className="flex items-center gap-2 mt-2">
                    {['Black', 'White', 'Red', 'Grey'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorClick(color)}
                        className={`w-8 h-8 rounded-full border border-gray-300 ring-2 transition-all cursor-pointer ${
                          formData.vehicle_color === color ? 'ring-black' : 'ring-transparent'
                        }`}
                        style={{
                          backgroundColor: color === 'Black' ? '#000000' :
                                           color === 'White' ? '#ffffff' :
                                           color === 'Red' ? '#ba1a1a' : '#888888'
                        }}
                        aria-label={color}
                      />
                    ))}
                    <input 
                      id="vehicle_color"
                      value={formData.vehicle_color}
                      onChange={handleChange}
                      className="flex-grow h-[40px] border-b border-[#cfc4c5] bg-transparent px-2 focus:border-black focus:ring-0 outline-none text-sm transition-all" 
                      placeholder="Other color..." 
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Terms & Consent */}
          <div className="flex items-start gap-3 py-1">
            <input 
              id="terms_accepted" 
              checked={formData.terms_accepted}
              onChange={handleChange}
              className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-black focus:ring-black cursor-pointer" 
              type="checkbox"
            />
            <label className="text-xs text-[#5d5f5f]" htmlFor="terms_accepted">
              I agree to DriveNow's Captain Terms of Service and Privacy Policy. I confirm all vehicle details provided are accurate.
            </label>
          </div>

          {/* Submit Action Button */}
          <div className="sticky bottom-4 left-0 w-full pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-[56px] bg-black text-white font-bold rounded-lg active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Submitting...' : 'Submit Registration'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CaptainSignup;

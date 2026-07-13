import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';

const ConfirmRide = () => {
  const navigate = useNavigate();
  const { token, role } = useAuth();

  const [confirmDetails, setConfirmDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || role !== 'rider') {
      navigate('/login');
      return;
    }

    const stored = sessionStorage.getItem('confirmDetails');
    if (!stored) {
      navigate('/rider-home');
      return;
    }

    setConfirmDetails(JSON.parse(stored));
  }, [token, role, navigate]);

  const handleConfirmRide = async () => {
    if (!confirmDetails) return;

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const payload = {
        pickup_address: confirmDetails.pickup.address,
        pickup_coordinates: confirmDetails.pickup.coordinates,
        destination_address: confirmDetails.destination.address,
        destination_coordinates: confirmDetails.destination.coordinates,
        vehicle_type: confirmDetails.vehicle_type
      };

      const res = await axios.post(`${backendUrl}/rides/request`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Save ride details in session storage
      sessionStorage.setItem('activeRide', JSON.stringify(res.data.ride));
      navigate('/searching-driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!confirmDetails) {
    return <div className="p-4">Loading details...</div>;
  }

  const { pickup, destination, vehicle_type, fare } = confirmDetails;

  const vehicleLabels = {
    bike: { name: 'DriveNow Bike', seats: '1', icon: 'motorcycle' },
    rickshaw: { name: 'DriveNow Rickshaw', seats: '3', icon: 'electric_rickshaw' },
    car: { name: 'DriveNow Comfort', seats: '4', icon: 'directions_car' }
  };

  const labelInfo = vehicleLabels[vehicle_type] || vehicleLabels.car;

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickup} destination={destination} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <button 
          onClick={() => navigate('/vehicle-selection')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform cursor-pointer"
          aria-label="Back"
        >
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-black text-[18px]">verified_user</span>
          <span className="text-sm font-semibold text-black">Safety Toolkit</span>
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-sm bg-white">
          <img 
            className="w-full h-full object-cover" 
            alt="User avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDP8Bsdi48kUoa3nDc8x6WrS4ZE0fQP3oY5Q3PUtsP3XfxolArJCXQMhEWssL5r5yyyg_a2YecoE3XO0oJhfRWhfyMj1zT5cQXPtqyXAKwxDZWw-wDOjbG1498I0-UCGo2gyDldLyeP7TS_dr0oHt132QT_KZsM1h-y5cB9S9M20wTqyJvczxcCfwv0_hvEctiingzdgE1oYR6mZHfgddwaqTv1YcI9q48dM4nubgTtBgMIxNvefYlgQQ"
          />
        </div>
      </header>

      {/* Confirm Ride Panel */}
      <section className="fixed bottom-0 left-0 w-full z-50 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] flex flex-col pb-6 px-4">
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-3">
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
        </div>

        <div className="pb-2">
          {/* Header */}
          <div className="mb-4 text-left">
            <h2 className="text-lg font-bold text-black">Confirm your ride</h2>
          </div>

          {error && (
            <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
              {error}
            </div>
          )}

          {/* Vehicle Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative h-20 w-full flex justify-center items-center">
              <span className="material-symbols-outlined text-6xl text-black">{labelInfo.icon}</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-lg font-bold text-black block">{labelInfo.name}</span>
              <span className="text-xs text-[#5d5f5f]">Seats {labelInfo.seats} • 3 min away</span>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-[#f4f3f3] rounded-xl p-4 mb-4 border border-[#cfc4c5]/30 text-left">
            <div className="flex items-start gap-3 relative">
              <div className="flex flex-col items-center pt-1.5 h-full shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                <div className="w-[1px] h-10 border-l border-dashed border-[#cfc4c5] my-1"></div>
                <div className="w-2.5 h-2.5 bg-black"></div>
              </div>
              <div className="flex flex-col gap-4 w-full min-w-0">
                {/* Pickup */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[#5d5f5f] uppercase tracking-wider">Pickup</span>
                  <span className="text-sm font-semibold text-black truncate">{pickup.address}</span>
                </div>
                {/* Destination */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[#5d5f5f] uppercase tracking-wider">Destination</span>
                  <span className="text-sm font-semibold text-black truncate">{destination.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fare and Payment Row */}
          <div className="flex justify-between items-center py-4 border-t border-[#cfc4c5]/20 mb-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-[#eeeeee] flex items-center justify-center">
                <span className="material-symbols-outlined text-black">payments</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#5d5f5f]">Payment Method</span>
                <span className="text-sm font-bold text-black">Cash</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-black">${fare.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleConfirmRide}
            disabled={loading}
            className="w-full h-[56px] bg-black text-white rounded-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Requesting Ride...' : `Confirm ${vehicle_type.charAt(0).toUpperCase() + vehicle_type.slice(1)}`}
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmRide;

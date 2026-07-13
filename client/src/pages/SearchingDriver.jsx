import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';

const SearchingDriver = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || role !== 'rider') {
      navigate('/login');
      return;
    }

    const stored = sessionStorage.getItem('activeRide');
    if (!stored) {
      navigate('/rider-home');
      return;
    }

    const parsedRide = JSON.parse(stored);
    setActiveRide(parsedRide);

    // Connect and join socket room for the ride
    if (socket) {
      socket.emit('join_ride', { ride_id: parsedRide._id });

      // Listen for matched event
      socket.on('ride_matched', (data) => {
        // Save the updated ride (with captain) in session
        sessionStorage.setItem('activeRide', JSON.stringify(data.ride));
        navigate('/driver-matched');
      });

      // Listen for cancellation
      socket.on('ride_cancelled', () => {
        sessionStorage.removeItem('activeRide');
        navigate('/rider-home');
      });
    }

    return () => {
      if (socket) {
        socket.off('ride_matched');
        socket.off('ride_cancelled');
      }
    };
  }, [token, role, socket, navigate]);

  const handleCancelRequest = async () => {
    if (!activeRide) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.delete(`${backendUrl}/rides/${activeRide._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      sessionStorage.removeItem('activeRide');
      navigate('/rider-home');
    } catch (err) {
      setError('Failed to cancel request. Please try again.');
    }
  };

  if (!activeRide) {
    return <div className="p-4">Loading request details...</div>;
  }

  // Parse pickup and destination from Point format
  const pickupPoint = {
    address: activeRide.pickup_address,
    coordinates: activeRide.pickup_coordinates ? {
      longitude: activeRide.pickup_coordinates.coordinates[0],
      latitude: activeRide.pickup_coordinates.coordinates[1]
    } : null
  };

  const destPoint = {
    address: activeRide.destination_address,
    coordinates: activeRide.destination_coordinates ? {
      longitude: activeRide.destination_coordinates.coordinates[0],
      latitude: activeRide.destination_coordinates.coordinates[1]
    } : null
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <button 
          onClick={() => navigate('/rider-home')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md active:scale-95 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-black font-bold">menu</span>
        </button>
        <div className="bg-white px-4 py-2 rounded-full shadow-md">
          <span className="text-lg font-bold text-black tracking-tight">DriveNow</span>
        </div>
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md overflow-hidden">
          <img 
            className="w-full h-full object-cover" 
            alt="User Avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuNA38sdDlfcTncpo0Rzkk2J5SRr_yu7H_Nh2H3uIuGa2UBmyZrMZ2qLXFW6VRCZH8wDTtCbfr8anmijbTU--iKKwq31z0NXEZQmGYzdqW26CSnHLIAEYAp3TYaY1UbqfKH7r-s2xeVIs4_TEeaKdURH5YJHpSg9pw4TAcvNV1kmwCtbGzq5sXb2aMArQ05rUsE7tnHYnDPNgN5R8zGe8SFChbmt7RVfhSMN9L0tyzX59CpzW6_mH1Zw"
          />
        </div>
      </header>

      {/* Pulsing Visual Marker */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute w-full h-full rounded-full bg-black/20 animate-ping"></div>
          <div className="relative w-4 h-4 bg-black rounded-full ring-4 ring-white"></div>
        </div>
      </div>

      {/* Bottom Sheet Panel */}
      <div className="fixed bottom-0 left-0 w-full z-50 max-w-lg mx-auto left-0 right-0">
        <div className="bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] px-4 pb-8 pt-3 flex flex-col items-center">
          {/* Drag Handle */}
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full mb-6"></div>

          {/* Searching Spinner */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#eeeeee] animate-spin border-t-black"></div>
            <span className="material-symbols-outlined text-4xl text-black">local_taxi</span>
          </div>

          <h1 className="text-[26px] font-bold text-black mb-6 text-center">Looking for a Driver</h1>

          {error && (
            <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] w-full text-left" role="alert">
              {error}
            </div>
          )}

          {/* Trip Details Card */}
          <div className="w-full border border-[#cfc4c5] rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-black bg-white"></div>
                <div className="w-[1px] h-8 bg-[#cfc4c5] my-1"></div>
                <div className="w-2.5 h-2.5 bg-black rounded-sm"></div>
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <div className="min-w-0">
                  <p className="text-[#5d5f5f] text-[10px] font-bold uppercase tracking-wider">Pickup</p>
                  <p className="text-sm font-semibold text-black truncate">{activeRide.pickup_address}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[#5d5f5f] text-[10px] font-bold uppercase tracking-wider">Destination</p>
                  <p className="text-sm font-semibold text-black truncate">{activeRide.destination_address}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#cfc4c5] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#5d5f5f]">
                <span className="material-symbols-outlined">payments</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Personal • Cash</span>
              </div>
              <div className="text-lg font-bold text-black">${activeRide.fare?.total?.toFixed(2)}</div>
            </div>
          </div>

          {/* Cancel Action */}
          <button 
            onClick={handleCancelRequest}
            className="text-black font-bold py-2 px-6 hover:opacity-70 transition-opacity active:scale-95 cursor-pointer bg-transparent border-none text-sm"
          >
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchingDriver;

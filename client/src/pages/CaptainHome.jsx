import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';

const CaptainHome = () => {
  const navigate = useNavigate();
  const { token, role, socket, logout } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ latitude: 40.7580, longitude: -73.9855 });

  // Get current location on mount
  useEffect(() => {
    if (!token || role !== 'captain') {
      navigate('/captain/login');
      return;
    }

    if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function') {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          (err) => console.log('Geolocation not available, using default coordinates.')
        );
      } catch (e) {
        console.log('Error accessing geolocation', e);
      }
    }
  }, [token, role, navigate]);

  // Listen to ride offers via Socket
  useEffect(() => {
    if (socket && isOnline) {
      socket.on('ride_offer', (data) => {
        // Save the ride offer and timeout in session storage
        sessionStorage.setItem('rideOffer', JSON.stringify(data.ride));
        sessionStorage.setItem('offerTimeout', data.timeout_seconds || 15);
        navigate('/incoming-request');
      });
    }

    return () => {
      if (socket) {
        socket.off('ride_offer');
      }
    };
  }, [socket, isOnline, navigate]);

  const handleToggleOnline = async () => {
    setLoading(true);
    setError('');

    const newOnlineStatus = !isOnline;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.post(
        `${backendUrl}/captains/status`,
        {
          is_online: newOnlineStatus,
          latitude: location.latitude,
          longitude: location.longitude
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setIsOnline(newOnlineStatus);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/captain/login');
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] flex flex-col min-h-screen relative overflow-hidden justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={null} destination={null} captainLocation={isOnline ? location : null} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-black">directions_car</span>
          <h1 className="text-lg font-bold text-black">DriveNow</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors cursor-pointer bg-white shadow-md text-[#5d5f5f]"
          aria-label="Log Out"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {/* Online/Offline Toggle Header (Floating) */}
      <div className="relative z-10 px-4 py-3 mt-16 flex justify-center">
        <button 
          onClick={handleToggleOnline}
          disabled={loading}
          className={`shadow-[0px_4px_20px_rgba(0,0,0,0.08)] rounded-full px-6 py-2 flex items-center gap-4 border-2 transition-all cursor-pointer bg-white disabled:opacity-50 ${
            isOnline ? 'border-black' : 'border-[#cfc4c5]'
          }`}
          data-testid="status-toggle"
        >
          <span className={`text-sm font-bold uppercase tracking-wider ${isOnline ? 'text-black font-extrabold' : 'text-[#5d5f5f]'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <div className={`w-14 h-8 rounded-full p-1 flex items-center relative transition-colors duration-300 ${isOnline ? 'bg-black' : 'bg-[#e2e2e2]'}`}>
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm border border-[#cfc4c5] transition-transform duration-300 ${
              isOnline ? 'translate-x-6' : 'translate-x-0'
            }`}></div>
          </div>
        </button>
      </div>

      {error && (
        <div className="relative z-10 mx-4 bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm border border-[#ffdad6]" role="alert">
          {error}
        </div>
      )}

      {/* Empty State Bottom Sheet */}
      <div className="mt-auto relative z-20 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] pt-2 pb-8">
        <div className="flex justify-center mb-4">
          <div className="w-8 h-1 bg-[#eeeeee] rounded-full"></div>
        </div>
        
        <div className="px-6 py-4 flex flex-col items-center text-center">
          <div className="w-40 h-40 mb-4 flex items-center justify-center bg-[#eeeeee] rounded-full">
            <span className="material-symbols-outlined text-6xl text-[#5d5f5f]">sports_motorsports</span>
          </div>
          <h2 className="text-lg font-bold text-black mb-1">
            {isOnline ? 'Waiting for ride requests' : 'You are offline'}
          </h2>
          <p className="text-sm text-[#5d5f5f] max-w-[280px]">
            {isOnline ? 'Keep the app open and stay nearby popular coordinates.' : 'Go online to start receiving ride requests from nearby passengers.'}
          </p>
        </div>

        {/* Stats Strip */}
        <div className="mx-4 border border-[#cfc4c5] rounded-xl overflow-hidden bg-[#f9f9f9]">
          <div className="flex divide-x divide-[#cfc4c5] h-20 items-center">
            <div className="flex-1 flex flex-col items-center justify-center p-2">
              <div className="flex items-center gap-1 mb-1 text-[#5d5f5f]">
                <span className="material-symbols-outlined text-[18px]">local_taxi</span>
                <span className="text-[10px] font-bold">Rides</span>
              </div>
              <span className="text-lg font-bold text-black">0</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-2">
              <div className="flex items-center gap-1 mb-1 text-[#5d5f5f]">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="text-[10px] font-bold">Hours</span>
              </div>
              <span className="text-lg font-bold text-black">0.0</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-2">
              <div className="flex items-center gap-1 mb-1 text-[#5d5f5f]">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span className="text-[10px] font-bold">Earnings</span>
              </div>
              <span className="text-lg font-bold text-black">$0.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainHome;

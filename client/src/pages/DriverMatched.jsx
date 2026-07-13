import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';
import ChatModal from '../components/ChatModal';

const DriverMatched = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

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

    // Default to the captain's location if stored
    if (parsedRide.captain && parsedRide.captain.location) {
      setCaptainLocation({
        longitude: parsedRide.captain.location.coordinates[0],
        latitude: parsedRide.captain.location.coordinates[1]
      });
    }

    if (socket) {
      socket.emit('join_ride', { ride_id: parsedRide._id });

      // Listen for socket events
      socket.on('driver_location_update', (coords) => {
        setCaptainLocation(coords);
      });

      socket.on('ride_arrived', (data) => {
        sessionStorage.setItem('activeRide', JSON.stringify(data.ride));
        navigate('/rider-tracking');
      });

      socket.on('ride_cancelled', () => {
        sessionStorage.removeItem('activeRide');
        navigate('/rider-home');
      });
    }

    return () => {
      if (socket) {
        socket.off('driver_location_update');
        socket.off('ride_arrived');
        socket.off('ride_cancelled');
      }
    };
  }, [token, role, socket, navigate]);

  const handleCancelRide = async () => {
    if (!activeRide) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.delete(`${backendUrl}/rides/${activeRide._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      sessionStorage.removeItem('activeRide');
      navigate('/rider-home');
    } catch (err) {
      setError('Failed to cancel ride. Please try again.');
    }
  };

  if (!activeRide) {
    return <div className="p-4">Loading match details...</div>;
  }

  // Parse pickup and destination coordinates
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

  const captain = activeRide.captain;

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} captainLocation={captainLocation} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setChatOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md cursor-pointer"
            aria-label="Toggle Side Drawer"
          >
            <span className="material-symbols-outlined text-black font-bold">menu</span>
          </button>
          <span className="text-xl font-bold text-black tracking-tight">DriveNow</span>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white">
          <img 
            className="w-full h-full object-cover" 
            alt="User avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2e8gDLqtWJQFmn84WiMKyQkBe-mRDemrgURGa0qyACyczZcalpfeCXP_8axKHldY03rjfQVwSCOqypGL_ErKuAhJcMaY2zFMf1WnBwkJJbKbNRxIYX5GRvnl8CgCNhvebwKVko0wCRCLLLEcX-vu4sEzjfPLqy5MlW_0UDF7w7Od3awq8k2N--kGPuuWES83y8dZQzudVWIOG1CCzBwhu7GTKcx-G2zBpICcWFvCgdqnHCA7diVf2aQ"
          />
        </div>
      </header>

      {/* Driver Location Marker info */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="bg-black text-white px-3 py-1.5 rounded-lg shadow-lg font-bold text-sm mb-2 relative">
          Captain is arriving
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-500 transform translate-y-0 pb-6 px-4">
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-4">
          <div className="w-8 h-1 bg-[#eeeeee] rounded-full"></div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm border border-[#ffdad6]" role="alert">
              {error}
            </div>
          )}

          {/* Driver Info Header */}
          <div className="flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#cfc4c5] shadow-sm bg-white">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Captain avatar" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8f-FWCQsj9axFEPX_v8Wmz8S97tvprHIeSRgRLfbg9-vEgIYWsPfvFu2yJPtb5-iAsYCG9QvAIxLS9SiJknx_71WGLg9zYY70HIXlL6zWe9tnaZK6q2Z67mqEvakC2rO4wh1XwOKs7spySeTuhPUGMxe_GzxsYf1hFGWwQaU4v8fQINiTI1kEPx2Y8SbyR8lzq_xAzrZmCzt4JO3RHCX1RWra2CzwKlfTrb5WyNGo3FIyR_m1WArU7Q"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="text-lg font-bold text-black">{captain?.full_name || 'Captain John Doe'}</h2>
                  <div className="flex items-center bg-[#eeeeee] px-2 py-[2px] rounded-full">
                    <span className="material-symbols-outlined text-[14px] text-black">star</span>
                    <span className="text-xs font-bold ml-[2px]">{captain?.rating || '4.9'}</span>
                  </div>
                </div>
                <p className="text-sm text-[#5d5f5f]">{captain?.vehicle_color || 'Black'} • {captain?.vehicle_type || 'Car'}</p>
                <p className="text-lg font-bold text-black tracking-widest mt-1 uppercase">{captain?.plate_number || 'ABC-1234'}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#5d5f5f] uppercase tracking-widest font-bold mb-1">Your OTP</span>
              <div className="bg-white text-black px-4 py-2 rounded-xl text-lg font-bold border-2 border-black" data-testid="otp-display">
                {activeRide.otp_code}
              </div>
            </div>
          </div>

          {/* Action Quick Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={() => setChatOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-white border border-[#cfc4c5] rounded-xl font-bold text-black active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined">chat</span>
              <span>Message</span>
            </button>
            <a 
              href={`tel:${captain?.phone_number || '5550123'}`}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-white border border-[#cfc4c5] rounded-xl font-bold text-black active:scale-95 transition-transform cursor-pointer no-underline"
            >
              <span className="material-symbols-outlined">call</span>
              <span>Call</span>
            </a>
          </div>

          {/* Route Summary */}
          <div className="bg-white border border-[#cfc4c5] rounded-2xl p-4 text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-black bg-white"></div>
                  <div className="w-[1px] h-8 bg-[#cfc4c5] my-1"></div>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-[#5d5f5f] block uppercase tracking-wider">Pickup</span>
                  <span className="text-sm font-semibold text-black truncate block">{activeRide.pickup_address}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 bg-black rounded-sm shrink-0"></div>
                <div className="min-w-0">
                  <span className="text-[10px] text-[#5d5f5f] block uppercase tracking-wider">Destination</span>
                  <span className="text-sm font-semibold text-black truncate block">{activeRide.destination_address}</span>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-[#cfc4c5] my-3"></div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#5d5f5f]">
                <span className="material-symbols-outlined">payments</span>
                <span className="text-sm">Personal • Cash</span>
              </div>
              <span className="text-lg font-bold text-black">${activeRide.fare?.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Cancel Actions */}
          <div className="flex items-center justify-between py-1">
            <button 
              onClick={handleCancelRide}
              className="text-red-600 font-bold flex items-center gap-1 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer bg-transparent border-none text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">cancel</span>
              <span>Cancel Ride</span>
            </button>
            <button className="text-black font-bold flex items-center gap-1 px-4 py-2 bg-[#eeeeee] rounded-lg transition-colors cursor-not-allowed text-sm" disabled>
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <span>Safety Toolkit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {chatOpen && (
        <ChatModal 
          rideId={activeRide._id} 
          onClose={() => setChatOpen(false)} 
          socket={socket} 
          token={token} 
        />
      )}
    </div>
  );
};

export default DriverMatched;

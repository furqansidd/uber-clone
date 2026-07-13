import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';
import ChatModal from '../components/ChatModal';
import { useLocationStream } from '../hooks/useLocationStream';

const CaptainActiveTrip = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (!token || role !== 'captain') {
      navigate('/captain/login');
      return;
    }

    const stored = sessionStorage.getItem('activeRide');
    if (!stored) {
      navigate('/captain-home');
      return;
    }

    setActiveRide(JSON.parse(stored));
  }, [token, role, navigate]);

  // Stream locations to socket room while trip is ongoing
  useLocationStream(
    socket,
    activeRide?._id,
    activeRide?.status === 'ongoing'
  );

  const handleCompleteRide = async () => {
    if (!activeRide) return;

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(
        `${backendUrl}/rides/${activeRide._id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Show success animation overlay momentarily
      setShowSuccessOverlay(true);

      setTimeout(() => {
        sessionStorage.setItem('completedRide', JSON.stringify(res.data.ride));
        sessionStorage.removeItem('activeRide');
        navigate('/ride-summary');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete ride.');
      setLoading(false);
    }
  };

  if (!activeRide) {
    return <div className="p-4">Loading active trip...</div>;
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

  const stops = (activeRide.stops || []).map((stop) => ({
    address: stop.address,
    coordinates: stop.coordinates ? {
      longitude: stop.coordinates.coordinates[0],
      latitude: stop.coordinates.coordinates[1]
    } : null
  }));

  const rider = activeRide.rider;

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} stops={stops} />
      </div>

      {/* Top Instructions Banner */}
      <div className="fixed top-0 left-0 w-full z-40 px-4 pt-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-black text-white rounded-xl p-4 flex items-center justify-between shadow-lg text-left">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-3xl text-white">turn_right</span>
              </div>
              <div>
                <p className="text-xl font-bold text-white">450m</p>
                <p className="text-xs text-white/80">Turn right onto Park Avenue</p>
              </div>
            </div>
            <button className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-white">volume_up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 w-full z-30 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] px-4 pb-6 pt-3 border-t border-[#cfc4c5]">
        {/* Drag Handle */}
        <div className="w-8 h-1 bg-[#cfc4c5] rounded-full mx-auto mb-4"></div>

        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
            {error}
          </div>
        )}

        {/* Rider Info Header */}
        <div className="flex items-center justify-between mb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                className="w-14 h-14 rounded-full object-cover border border-[#cfc4c5]" 
                alt="Rider Avatar" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6ZZAonnF_RQXE-nYCzYDw-lDFiU_IVL-WRzSpPbySbBK1o6QH1l7a1HkUCVqqLrRuN-VIqS4l6VaUPznqyWsOTWNuzyISSs6cKK8Ifq9R2G63HdcMq6wfVTf8Y7qmJVFcw0xPg6jh_U0DB3L8nP34v0aGkK-z03CJmkLNDbRRtJSwPtBIsiA2Lea2lGmCL1OOtxV34Ykb_3MsEo4LK9ou13Az6lxF2S-dVkVwaVCwmZej1TmFtzoikw"
              />
              <div className="absolute -bottom-1 -right-1 bg-black text-white w-6 h-6 rounded-full flex items-center justify-center border border-white">
                <span className="text-[10px] font-bold">4.9</span>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">{rider?.first_name || 'Sarah Miller'}</h2>
              <div className="flex items-center gap-1 text-[#5d5f5f]">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <p className="text-xs truncate max-w-[200px]">{activeRide.destination_address}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <a 
              href={`tel:${rider?.phone_number || '5550123'}`}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-[#cfc4c5] hover:bg-[#eeeeee] transition-colors cursor-pointer text-black"
            >
              <span className="material-symbols-outlined">call</span>
            </a>
            <button 
              onClick={() => setChatOpen(true)}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-[#cfc4c5] hover:bg-[#eeeeee] transition-colors cursor-pointer bg-white text-black"
            >
              <span className="material-symbols-outlined">chat_bubble</span>
            </button>
          </div>
        </div>

        {/* Trip Details Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-left">
          <div className="p-4 rounded-xl border border-[#cfc4c5] bg-[#f9f9f9]">
            <p className="text-[10px] text-[#5d5f5f] uppercase tracking-wider mb-1">Distance</p>
            <p className="text-lg font-bold text-black">2.4 km</p>
          </div>
          <div className="p-4 rounded-xl border border-[#cfc4c5] bg-[#f9f9f9]">
            <p className="text-[10px] text-[#5d5f5f] uppercase tracking-wider mb-1">Earnings</p>
            <p className="text-lg font-bold text-black">${activeRide.fare?.total?.toFixed(2)}</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button 
          onClick={handleCompleteRide}
          disabled={loading}
          className="w-full h-[56px] bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg cursor-pointer disabled:opacity-50"
        >
          <span>Complete Ride</span>
          <span className="material-symbols-outlined text-white">check_circle</span>
        </button>
      </div>

      {/* Success Splash Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white" data-testid="success-splash">
          <div className="p-6 bg-white rounded-full mb-6">
            <span className="material-symbols-outlined text-black text-6xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Ride Completed</h1>
          <p className="text-sm text-white/70">You've earned ${activeRide.fare?.total?.toFixed(2)} for this trip.</p>
        </div>
      )}

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

export default CaptainActiveTrip;

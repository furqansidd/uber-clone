import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';
import ChatModal from '../components/ChatModal';

const RiderTracking = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Stop addition inputs
  const [showStopInput, setShowStopInput] = useState(false);
  const [stopAddress, setStopAddress] = useState('');

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

    if (parsedRide.captain && parsedRide.captain.location) {
      setCaptainLocation({
        longitude: parsedRide.captain.location.coordinates[0],
        latitude: parsedRide.captain.location.coordinates[1]
      });
    }

    if (socket) {
      socket.emit('join_ride', { ride_id: parsedRide._id });

      // Connect to event listeners
      socket.on('driver_location_update', (coords) => {
        setCaptainLocation(coords);
      });

      socket.on('ride_updated', (data) => {
        setActiveRide(data.ride);
        sessionStorage.setItem('activeRide', JSON.stringify(data.ride));
      });

      socket.on('ride_started', (data) => {
        setActiveRide(data.ride);
        sessionStorage.setItem('activeRide', JSON.stringify(data.ride));
      });

      socket.on('ride_completed', (data) => {
        sessionStorage.setItem('completedRide', JSON.stringify(data.ride));
        sessionStorage.removeItem('activeRide');
        navigate('/ride-summary');
      });

      socket.on('ride_cancelled', () => {
        sessionStorage.removeItem('activeRide');
        navigate('/rider-home');
      });
    }

    return () => {
      if (socket) {
        socket.off('driver_location_update');
        socket.off('ride_updated');
        socket.off('ride_started');
        socket.off('ride_completed');
        socket.off('ride_cancelled');
      }
    };
  }, [token, role, socket, navigate]);

  const handleShare = async () => {
    if (!activeRide) return;
    const shareData = {
      title: 'Track my SwiftRide',
      text: `I'm on my way using SwiftRide! Tracking ID: ${activeRide._id}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(`Track my SwiftRide here: ${window.location.href}`);
        alert('Tracking link copied to clipboard!');
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const handleAddStopSubmit = async (e) => {
    e.preventDefault();
    if (!stopAddress.trim() || !activeRide) return;

    setError('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const payload = {
        address: stopAddress,
        coordinates: { latitude: 40.7579, longitude: -73.9855 } // Standard mid-journey NYC stop coordinates
      };

      const res = await axios.post(`${backendUrl}/rides/${activeRide._id}/stops`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveRide(res.data.ride);
      sessionStorage.setItem('activeRide', JSON.stringify(res.data.ride));
      setStopAddress('');
      setShowStopInput(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add stop.');
    }
  };

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
      setError('Failed to cancel ride.');
    }
  };

  if (!activeRide) {
    return <div className="p-4">Loading tracking details...</div>;
  }

  // Parse pickup, destination, and stops coordinates
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

  const captain = activeRide.captain;

  // Derive status label
  let statusText = 'Driver is arriving';
  if (activeRide.status === 'driver_arrived') statusText = 'Driver has arrived!';
  else if (activeRide.status === 'ongoing') statusText = 'Ongoing Trip';

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} stops={stops} captainLocation={captainLocation} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <button 
          onClick={() => navigate('/rider-home')}
          className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#cfc4c5] hover:bg-[#eeeeee] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-black font-bold">arrow_back</span>
        </button>
        <div className="bg-white px-4 py-2 rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#cfc4c5] flex items-center gap-2">
          <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-black" data-testid="status-text">{statusText}</span>
        </div>
        <button 
          onClick={handleShare}
          className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#cfc4c5] hover:bg-[#eeeeee] transition-colors cursor-pointer"
          aria-label="Share Ride"
        >
          <span className="material-symbols-outlined text-black font-bold">share</span>
        </button>
      </header>

      {/* Persistent Bottom Sheet */}
      <section className="fixed bottom-0 left-0 w-full z-30 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] px-4 pb-6 pt-3 border-t border-[#cfc4c5]">
        {/* Drag Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
        </div>

        {error && (
          <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6] text-left" role="alert">
            {error}
          </div>
        )}

        {/* Add Stop Input overlay style */}
        {showStopInput && (
          <form onSubmit={handleAddStopSubmit} className="mb-4 p-4 border border-[#cfc4c5] rounded-xl bg-[#f9f9f9] text-left">
            <h3 className="text-xs font-bold text-black mb-2 uppercase">Add Stop Location</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter stop address..." 
                value={stopAddress}
                onChange={(e) => setStopAddress(e.target.value)}
                className="flex-grow h-11 border border-[#cfc4c5] rounded-lg px-3 text-sm bg-white"
                autoFocus
              />
              <button type="submit" className="bg-black text-white px-4 rounded-lg text-xs font-bold cursor-pointer">
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setShowStopInput(false)}
                className="border border-[#cfc4c5] px-3 rounded-lg text-xs font-bold bg-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between mb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                className="w-14 h-14 rounded-full object-cover border border-[#cfc4c5]" 
                alt="Captain Avatar" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-bGtpLuThtm43SWA11RCyv5-P_vkuR_2sWQkx70YjuqGKXxuP7QxVBhm9IjlyVPmcchhvAbZLU-09ycmnVnY5omRkW5n-PMkP47GgfLd-UzU9jmMmWvsW6g3iz4TFZs-kZMcBIl1V8Y28C3KUf1yPjApjSWWmlXFr2BYhNUwkwD_lAJ8ngcsGudiwlnCmswObk17SG3QLCS8oE6ehQ-qsIxd9sMsX7KSNbGob67-8cUBBhg6Zm7B_eQ"
              />
              <div className="absolute -bottom-1 -right-1 bg-black text-white w-6 h-6 rounded-full flex items-center justify-center border border-white">
                <span className="text-[10px] font-bold">{captain?.rating || '4.9'}</span>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">{captain?.full_name || 'Captain John Doe'}</h2>
              <p className="text-sm text-[#5d5f5f]">{captain?.vehicle_color || 'Black'} • {captain?.vehicle_type || 'Tesla Model 3'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-black tracking-widest uppercase">{captain?.plate_number || 'ABC-1234'}</p>
            <p className="text-[10px] text-[#5d5f5f] font-bold uppercase tracking-wider">License Plate</p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <a 
            href={`tel:${captain?.phone_number || '5550123'}`}
            className="flex flex-col items-center gap-1 no-underline cursor-pointer"
          >
            <div className="w-14 h-14 bg-[#eeeeee] rounded-full flex items-center justify-center border border-[#cfc4c5] hover:bg-[#f4f3f3] transition-colors">
              <span className="material-symbols-outlined text-black">call</span>
            </div>
            <span className="text-xs font-bold text-black">Call</span>
          </a>
          
          <button 
            onClick={() => setChatOpen(true)}
            className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none"
          >
            <div className="w-14 h-14 bg-[#eeeeee] rounded-full flex items-center justify-center border border-[#cfc4c5] hover:bg-[#f4f3f3] transition-colors">
              <span className="material-symbols-outlined text-black">chat_bubble</span>
            </div>
            <span className="text-xs font-bold text-black">Message</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-not-allowed bg-transparent border-none" disabled>
            <div className="w-14 h-14 bg-[#eeeeee] rounded-full flex items-center justify-center border border-[#cfc4c5] opacity-50">
              <span className="material-symbols-outlined text-black">security</span>
            </div>
            <span className="text-xs font-bold text-[#cfc4c5]">Safety</span>
          </button>

          <button 
            onClick={() => setShowStopInput(true)}
            className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none"
          >
            <div className="w-14 h-14 bg-[#eeeeee] rounded-full flex items-center justify-center border border-[#cfc4c5] hover:bg-[#f4f3f3] transition-colors">
              <span className="material-symbols-outlined text-black">add_circle</span>
            </div>
            <span className="text-xs font-bold text-black">Add Stop</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#cfc4c5] mb-4"></div>

        {/* Ride Stats / Fare */}
        <div className="flex items-center justify-between mb-4 bg-[#f4f3f3] p-4 rounded-xl border border-[#cfc4c5]">
          <div className="flex items-center gap-3 text-left">
            <span className="material-symbols-outlined text-[#5d5f5f]">payments</span>
            <div>
              <p className="text-xs text-[#5d5f5f]">Est. Fare</p>
              <p className="text-lg font-bold text-black" data-testid="tracking-fare">${activeRide.fare?.total?.toFixed(2)}</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-[#cfc4c5]"></div>
          <div className="flex items-center gap-3 text-left">
            <span className="material-symbols-outlined text-[#5d5f5f]">schedule</span>
            <div>
              <p className="text-xs text-[#5d5f5f]">ETA</p>
              <p className="text-lg font-bold text-black">3 mins</p>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button 
          onClick={handleCancelRide}
          className="w-full h-[56px] bg-white border border-[#cfc4c5] text-black font-bold rounded-xl hover:bg-[#f4f3f3] transition-colors active:scale-[0.98] cursor-pointer"
        >
          Cancel Ride
        </button>
      </section>

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

export default RiderTracking;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';

const IncomingRequest = () => {
  const navigate = useNavigate();
  const { token, role } = useAuth();

  const [rideOffer, setRideOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || role !== 'captain') {
      navigate('/captain/login');
      return;
    }

    const storedOffer = sessionStorage.getItem('rideOffer');
    const storedTimeout = sessionStorage.getItem('offerTimeout');

    if (!storedOffer) {
      navigate('/captain-home');
      return;
    }

    setRideOffer(JSON.parse(storedOffer));
    setTimeLeft(Number(storedTimeout) || 15);
  }, [token, role, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleDecline();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleAccept = async () => {
    if (!rideOffer) return;

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(
        `${backendUrl}/rides/${rideOffer._id}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      sessionStorage.setItem('activeRide', JSON.stringify(res.data.ride));
      sessionStorage.removeItem('rideOffer');
      sessionStorage.removeItem('offerTimeout');
      navigate('/captain-confirmation');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept ride.');
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!rideOffer) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.post(
        `${backendUrl}/rides/${rideOffer._id}/decline`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err) {
      console.error('Failed to decline ride offer in backend:', err);
    } finally {
      sessionStorage.removeItem('rideOffer');
      sessionStorage.removeItem('offerTimeout');
      navigate('/captain-home');
    }
  };

  if (!rideOffer) {
    return <div className="p-4">Loading request details...</div>;
  }

  // Parse pickup and destination format
  const pickupPoint = {
    address: rideOffer.pickup_address,
    coordinates: rideOffer.pickup_coordinates ? {
      longitude: rideOffer.pickup_coordinates.coordinates[0],
      latitude: rideOffer.pickup_coordinates.coordinates[1]
    } : null
  };

  const destPoint = {
    address: rideOffer.destination_address,
    coordinates: rideOffer.destination_coordinates ? {
      longitude: rideOffer.destination_coordinates.coordinates[0],
      latitude: rideOffer.destination_coordinates.coordinates[1]
    } : null
  };

  // Percent for countdown progress bar
  const progressPercent = (timeLeft / 15) * 100;

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-black font-bold">menu</span>
          <h1 className="text-lg font-bold text-black">DriveNow</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
          <img 
            className="w-full h-full object-cover" 
            alt="Captain Avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAv3axwBcApvaVd0lAuEsHRU-eSOozoaOqywCjrZcIDLXRDg26ydOp4y9lDMKAlTHy4snQEQYpAtizy_sqgd0xVrrosIpcvs3Er0GRpE-kGwWP5KTBT8rNqjghaiaFDmr8zA9ZVGj3amo0lVLNocLy719qBmL5zivTA5-HZfEoe3xRpzfF_7tql-taNa_yGKGdG-dku30seDsCT8NOu-iagLgeE2fMGBLrBEPIoYQjOhlw2C6ySRd9Cg"
          />
        </div>
      </header>

      {/* Urgency Timer Bar */}
      <div className="fixed top-[64px] left-4 right-4 z-50 h-1 bg-[#cfc4c5]/30 rounded-full overflow-hidden">
        <div 
          className="h-full bg-black transition-all duration-1000 ease-linear" 
          style={{ width: `${progressPercent}%` }}
          data-testid="timer-bar"
        ></div>
      </div>

      {/* Main Slide-up Panel */}
      <div className="fixed bottom-0 left-0 w-full z-50">
        <div className="bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] flex flex-col pb-6 px-4">
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-3">
            <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
          </div>

          <div className="pb-2 text-left">
            {error && (
              <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6]" role="alert">
                {error}
              </div>
            )}

            {/* Header: Rider Profile */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-black p-0.5 bg-white">
                    <img 
                      className="w-full h-full rounded-full object-cover" 
                      alt="Rider avatar" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6ZZAonnF_RQXE-nYCzYDw-lDFiU_IVL-WRzSpPbySbBK1o6QH1l7a1HkUCVqqLrRuN-VIqS4l6VaUPznqyWsOTWNuzyISSs6cKK8Ifq9R2G63HdcMq6wfVTf8Y7qmJVFcw0xPg6jh_U0DB3L8nP34v0aGkK-z03CJmkLNDbRRtJSwPtBIsiA2Lea2lGmCL1OOtxV34Ykb_3MsEo4LK9ou13Az6lxF2S-dVkVwaVCwmZej1TmFtzoikw"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    4.9 ★
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-black">{rideOffer.rider?.first_name || 'Sarah Jenkins'}</h2>
                  <p className="text-xs text-[#5d5f5f]">Rider since 2022 • New Request</p>
                </div>
              </div>
              <div>
                <span className="inline-block px-3 py-1 bg-[#dfe0e0] text-black rounded-full text-xs font-bold uppercase">
                  {rideOffer.vehicle_type}
                </span>
              </div>
            </div>

            {/* Stats Blocks */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#f4f3f3] p-4 rounded-xl border border-[#cfc4c5] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black">
                  <span className="material-symbols-outlined">straighten</span>
                </div>
                <div>
                  <p className="text-[10px] text-[#5d5f5f] uppercase">Distance</p>
                  <p className="text-lg font-bold text-black">2.4 mi</p>
                </div>
              </div>
              <div className="bg-[#f4f3f3] p-4 rounded-xl border border-[#cfc4c5] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="text-[10px] text-[#5d5f5f] uppercase">Fare</p>
                  <p className="text-lg font-bold text-black">${rideOffer.fare?.total?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Route Details */}
            <div className="relative bg-white border border-[#cfc4c5] rounded-xl p-4 mb-6">
              <div className="absolute left-[27px] top-[36px] bottom-[36px] w-[1px] border-l border-dashed border-[#cfc4c5]"></div>
              <div className="flex items-start gap-3 mb-4 relative">
                <div className="w-6 h-6 rounded-full bg-black flex-shrink-0 flex items-center justify-center z-10 border-4 border-white shadow-sm">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#5d5f5f] uppercase tracking-tight">Pickup</p>
                  <p className="text-sm font-semibold text-black truncate">{rideOffer.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 relative">
                <div className="w-6 h-6 rounded-lg bg-black flex-shrink-0 flex items-center justify-center z-10 border-4 border-white shadow-sm">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#5d5f5f] uppercase tracking-tight">Destination</p>
                  <p className="text-sm font-semibold text-black truncate">{rideOffer.destination_address}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleAccept}
                disabled={loading}
                className="w-full h-14 bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
              >
                <span>ACCEPT RIDE ({timeLeft}s)</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button 
                onClick={handleDecline}
                className="w-full h-14 bg-white border border-[#cfc4c5] text-black font-bold rounded-lg flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              >
                DECLINE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingRequest;

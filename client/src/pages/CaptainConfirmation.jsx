import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Map from '../components/Map';
import { useLocationStream } from '../hooks/useLocationStream';

const CaptainConfirmation = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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

  // Stream location updates to socket room
  useLocationStream(
    socket,
    activeRide?._id,
    activeRide?.status === 'driver_arriving' || activeRide?.status === 'driver_arrived'
  );

  const handleArrived = async () => {
    if (!activeRide) return;

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(
        `${backendUrl}/rides/${activeRide._id}/arrived`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setActiveRide(res.data.ride);
      sessionStorage.setItem('activeRide', JSON.stringify(res.data.ride));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleConfirmRide = async () => {
    if (!activeRide) return;

    const otpCode = otp.join('');
    if (otpCode.length < 4) {
      setError('Please enter the full 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(
        `${backendUrl}/rides/${activeRide._id}/start`,
        { otp_code: otpCode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      sessionStorage.setItem('activeRide', JSON.stringify(res.data.ride));
      navigate('/captain-trip');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
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
      navigate('/captain-home');
    } catch (err) {
      setError('Failed to cancel ride.');
    }
  };

  if (!activeRide) {
    return <div className="p-4">Loading ride confirmation...</div>;
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
        <div className="w-10 h-10 rounded-full bg-[#eeeeee] overflow-hidden border-2 border-[#cfc4c5]">
          <img 
            className="w-full h-full object-cover" 
            alt="Captain Avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuABmyNiBAMXdqXqs1awRqH_tgLKoJ9rDjQN-6tNN3nkqZaPJaZaTIzVEZOGWw5s8hBdjRS0MATb8pZRsaj43MwRSV6388HkxSPHhj9KCphrZV-T7a27qFIz3vv0290HkGAjNd5d83eW8UMEtVUUjpBPBMIzKoswb56vieeS6AEaL-P64XopmrfPH7AIXH5xxCUmG4IYsZjjQXS4fJqe0z75Pd6txsYGyy9ripYK3tozslu8MJC_hC7tcA"
          />
        </div>
      </header>

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] pb-6 px-4">
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
        </div>

        <div className="pb-2 text-left">
          {error && (
            <div className="bg-red-50 text-[#ba1a1a] p-3 rounded-lg text-sm mb-4 border border-[#ffdad6]" role="alert">
              {error}
            </div>
          )}

          {/* Rider Profile Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-[#cfc4c5]">
              <img 
                className="w-full h-full object-cover" 
                alt="Rider Avatar" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX6d5uXVxL9WhHWPKsorGXdg0sEL5KvjQ7XofBE5sqWVZ6d2V8m9P_qg0afKn_O6oScndA2DI84oCAgY8lSB9oBlflB6aNOWcBIPzFlC-8dkiWj4sqrfzzZjIbnN3Jg-KnVuPFeCpHX212Gye-WjaeNsCtB_PzfODWhq5Dt4c_D1wNjuESPoAbLsxugd_UNYA2bDEqkpfg0KvCEGLi1tsWaLEdzBA5p7a8USbwo44hkoycrM6r-c6vcw"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-black">{activeRide.rider?.first_name || 'Sarah Jenkins'}</h2>
              <p className="text-xs text-[#5d5f5f] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">star</span>
                <span>4.9 Rating</span>
              </p>
            </div>
          </div>

          {/* Route Details */}
          <div className="relative space-y-4 mb-6">
            <div className="absolute left-[11px] top-6 bottom-6 w-[1px] bg-[#cfc4c5]"></div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-black bg-white z-10">location_on</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#5d5f5f] uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-semibold text-black truncate">{activeRide.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-black bg-white z-10">flag</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#5d5f5f] uppercase tracking-wider">Destination</p>
                <p className="text-sm font-semibold text-black truncate">{activeRide.destination_address}</p>
              </div>
            </div>
          </div>

          {/* OTP Input Section (only shown if driver has arrived) */}
          {activeRide.status === 'driver_arrived' ? (
            <div className="mb-6">
              <p className="text-sm text-black font-semibold mb-3 text-center">Enter Rider's Verification Code</p>
              <div className="flex justify-between gap-3 max-w-[280px] mx-auto">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 border border-[#cfc4c5] rounded-lg text-center font-bold text-lg text-black focus:border-black focus:ring-0 bg-transparent transition-all"
                    placeholder="•"
                    data-testid={`otp-input-${i}`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="space-y-4">
            {activeRide.status === 'driver_arriving' ? (
              <button 
                onClick={handleArrived}
                disabled={loading}
                className="w-full h-14 bg-black text-white font-bold rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating status...' : 'MARK AS ARRIVED'}
              </button>
            ) : (
              <button 
                onClick={handleConfirmRide}
                disabled={loading}
                className="w-full h-14 bg-black text-white font-bold rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Starting trip...' : 'Confirm Ride'}
              </button>
            )}

            <div className="text-center">
              <button 
                onClick={handleCancelRide}
                className="text-sm text-[#5d5f5f] hover:text-black transition-colors underline cursor-pointer bg-transparent border-none"
              >
                Cancel Ride
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainConfirmation;

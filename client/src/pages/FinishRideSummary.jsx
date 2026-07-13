import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Map from '../components/Map';
import ChatModal from '../components/ChatModal';

const FinishRideSummary = () => {
  const navigate = useNavigate();
  const { token, role, socket } = useAuth();

  const [completedRide, setCompletedRide] = useState(null);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const stored = sessionStorage.getItem('completedRide');
    if (!stored) {
      navigate(role === 'captain' ? '/captain-home' : '/rider-home');
      return;
    }

    setCompletedRide(JSON.parse(stored));
  }, [token, role, navigate]);

  const handleFinish = () => {
    sessionStorage.removeItem('completedRide');
    navigate(role === 'captain' ? '/captain-home' : '/rider-home');
  };

  const handleReportIssue = () => {
    alert('Coming soon');
  };

  if (!completedRide) {
    return <div className="p-4">Loading summary...</div>;
  }

  // Parse pickup and destination coordinates
  const pickupPoint = {
    address: completedRide.pickup_address,
    coordinates: completedRide.pickup_coordinates ? {
      longitude: completedRide.pickup_coordinates.coordinates[0],
      latitude: completedRide.pickup_coordinates.coordinates[1]
    } : null
  };

  const destPoint = {
    address: completedRide.destination_address,
    coordinates: completedRide.destination_coordinates ? {
      longitude: completedRide.destination_coordinates.coordinates[0],
      latitude: completedRide.destination_coordinates.coordinates[1]
    } : null
  };

  const stops = (completedRide.stops || []).map((stop) => ({
    address: stop.address,
    coordinates: stop.coordinates ? {
      longitude: stop.coordinates.coordinates[0],
      latitude: stop.coordinates.coordinates[1]
    } : null
  }));

  const rider = completedRide.rider;
  const fare = completedRide.fare || { base_fare: 5.0, distance_fare: 2.0, time_fare: 1.0, taxes_fees: 0.5, total: 8.5 };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={pickupPoint} destination={destPoint} stops={stops} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleFinish}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#cfc4c5] hover:bg-[#eeeeee] transition-colors cursor-pointer text-black"
            aria-label="Back"
          >
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-black">Finish Ride</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#cfc4c5] bg-white shadow-sm">
          <img 
            className="w-full h-full object-cover" 
            alt="Captain avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7Rv7IhNoUTBIRcKEcLAatcA75nUTgPNfX_QFKBeKsZB_-eW9_R_JPPmyLUaqBEXiahmaGz7idEoC8GpuK8T0ZA6Ithfq9RJjDulII3-JrY3rj2s-0wxpYpzEqwy5UcFWPe2A3pL8diGqZpNDt1KjqnUFMuD22xgfzM90NADCIyTSma3c4ozHZukE2JW0R5fKrul563izGrZOtTNKC90XkLOXVjciX9UylLIPs8EgUK2IFnAjl-YPmLg"
          />
        </div>
      </header>

      {/* Slide-up Finish Ride Panel */}
      <section className="fixed bottom-0 left-0 w-full z-40 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] pt-2 pb-6 px-4 max-h-[90dvh] overflow-y-auto">
        {/* Drag Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
        </div>

        <div className="text-left">
          {/* Summary Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] text-[#5d5f5f] uppercase tracking-wider font-bold mb-1">Ride Completed</p>
              <h2 className="text-[26px] font-bold text-black leading-tight">You've Arrived</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#5d5f5f] font-bold">Total Fare</p>
              <p className="text-[26px] font-bold text-black" data-testid="completed-fare">${fare.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Bento-style Ride Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 bg-white border border-[#cfc4c5] rounded-xl flex flex-col gap-1">
              <span className="material-symbols-outlined text-[#5d5f5f]">schedule</span>
              <div>
                <p className="text-[10px] text-[#5d5f5f] font-bold uppercase">Duration</p>
                <p className="text-sm font-bold text-black">24 mins</p>
              </div>
            </div>
            <div className="p-4 bg-white border border-[#cfc4c5] rounded-xl flex flex-col gap-1">
              <span className="material-symbols-outlined text-[#5d5f5f]">route</span>
              <div>
                <p className="text-[10px] text-[#5d5f5f] font-bold uppercase">Distance</p>
                <p className="text-sm font-bold text-black">8.2 miles</p>
              </div>
            </div>
          </div>

          {/* Timeline Route details */}
          <div className="p-4 bg-white border border-[#cfc4c5] rounded-xl mb-4">
            <div className="flex gap-3 items-start relative">
              <div className="flex flex-col items-center mt-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-black bg-white"></div>
                <div className="w-[1px] h-10 bg-[#cfc4c5] my-1"></div>
                <div className="w-2.5 h-2.5 bg-black rounded-sm"></div>
              </div>
              <div className="flex-grow space-y-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[10px] text-[#5d5f5f]">Pickup • 14:20</p>
                  <p className="text-sm text-black font-semibold truncate">{completedRide.pickup_address}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#5d5f5f]">Dropoff • 14:44</p>
                  <p className="text-sm text-black font-semibold truncate">{completedRide.destination_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fare Breakdown (Accordion Style) */}
          <div className="mb-4 border border-[#cfc4c5] rounded-xl overflow-hidden bg-white">
            <button 
              onClick={() => setShowFareBreakdown(!showFareBreakdown)}
              className="w-full flex justify-between items-center p-4 hover:bg-[#f9f9f9] transition-colors border-none bg-transparent cursor-pointer"
            >
              <span className="text-sm font-bold text-black">Fare Breakdown</span>
              <span className={`material-symbols-outlined transition-transform duration-300 ${showFareBreakdown ? 'rotate-180' : 'rotate-0'}`}>
                expand_more
              </span>
            </button>
            
            {showFareBreakdown && (
              <div className="px-4 pb-4 space-y-2 border-t border-[#cfc4c5]/20 pt-3" data-testid="fare-breakdown-details">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5d5f5f]">Base Fare</span>
                  <span className="text-black font-semibold">${(fare.base_fare || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#5d5f5f]">Distance Fare</span>
                  <span className="text-black font-semibold">${(fare.distance_fare || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#5d5f5f]">Time Fare</span>
                  <span className="text-black font-semibold">${(fare.time_fare || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#5d5f5f]">Taxes &amp; Fees</span>
                  <span className="text-black font-semibold">${(fare.taxes_fees || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#cfc4c5]/30 flex justify-between">
                  <span className="text-xs font-bold text-black uppercase">Paid via Cash</span>
                  <span className="text-xs font-bold text-black">${fare.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Rider Summary Section (only if captain) */}
          {role === 'captain' && (
            <div className="p-4 bg-[#f9f9f9] border border-[#cfc4c5] rounded-xl flex items-center justify-between gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex-shrink-0">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Rider Summary Avatar" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzBe0PgV9zees-JCtHeJ7qfHTjWx4Cl0n9HnrvVsBCn6hrRq48Litqm0XC8j3KilrAE_xr_8pDNHbSZJ0hwEWRSRbskEwFT1wvp0kiEm_ZFOdM32D1-gQL1FNk0jjv6xtdS_e8omrkQ947oA5BWO4yrHfPrfsEKjm76Kefq9BtTAlN1mwNP8fQUIkfXhpTC8sdfhAxyTdS9TLnGN7xeJjyhb7IkFhypIYpFetsFVzVVoYVOnnDhz1Cnw"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-bold text-black truncate">{rider?.first_name || 'Alex Rivera'}</p>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-yellow-500">star</span>
                  <span className="text-xs text-[#5d5f5f]">4.9 • Member since 2021</span>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#cfc4c5] hover:scale-105 transition-transform cursor-pointer text-black"
                aria-label="Rider Chat"
              >
                <span className="material-symbols-outlined">chat_bubble</span>
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <button 
            onClick={handleFinish}
            className="w-full h-[56px] bg-black text-white rounded-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Finish Ride</span>
            <span className="material-symbols-outlined">check_circle</span>
          </button>
          
          <button 
            onClick={handleReportIssue}
            className="w-full h-[56px] mt-3 bg-white border border-[#cfc4c5] text-black rounded-lg font-bold flex items-center justify-center hover:bg-[#f9f9f9] transition-colors cursor-pointer"
          >
            Report an Issue
          </button>
        </div>
      </section>

      {/* Chat Overlay */}
      {chatOpen && (
        <ChatModal 
          rideId={completedRide._id} 
          onClose={() => setChatOpen(false)} 
          socket={socket} 
          token={token} 
        />
      )}
    </div>
  );
};

export default FinishRideSummary;

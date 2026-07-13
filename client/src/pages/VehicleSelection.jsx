import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { estimateFare } from '../utils/fareEstimator';
import Map from '../components/Map';

const VehicleSelection = () => {
  const navigate = useNavigate();
  const { token, role } = useAuth();
  
  const [tripDetails, setTripDetails] = useState(null);
  const [selectedType, setSelectedType] = useState('bike');
  const [estimates, setEstimates] = useState({});

  useEffect(() => {
    if (!token || role !== 'rider') {
      navigate('/login');
      return;
    }

    const stored = sessionStorage.getItem('tripDetails');
    if (!stored) {
      navigate('/rider-home');
      return;
    }

    const parsed = JSON.parse(stored);
    setTripDetails(parsed);

    // Calculate estimates for each type
    const pCoords = parsed.pickup.coordinates;
    const dCoords = parsed.destination.coordinates;
    
    const bikeEst = estimateFare(pCoords, dCoords, 'bike');
    const rickshawEst = estimateFare(pCoords, dCoords, 'rickshaw');
    const carEst = estimateFare(pCoords, dCoords, 'car');

    setEstimates({
      bike: bikeEst,
      rickshaw: rickshawEst,
      car: carEst
    });
  }, [token, role, navigate]);

  const handleConfirm = () => {
    if (!tripDetails) return;
    
    // Save selected vehicle and price to session
    const selectedEstimate = estimates[selectedType];
    const confirmDetails = {
      ...tripDetails,
      vehicle_type: selectedType,
      fare: selectedEstimate
    };
    sessionStorage.setItem('confirmDetails', JSON.stringify(confirmDetails));
    navigate('/confirm-ride');
  };

  if (!tripDetails || !estimates.bike) {
    return <div className="p-4">Loading details...</div>;
  }

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Map pickup={tripDetails.pickup} destination={tripDetails.destination} />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <button 
          onClick={() => navigate('/rider-home')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.08)] text-black cursor-pointer"
          aria-label="Back"
        >
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <div className="bg-white px-4 py-2 rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)]">
          <span className="text-lg font-bold text-black tracking-tight">DriveNow</span>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-[#eeeeee]">
          <img 
            className="w-full h-full object-cover" 
            alt="User avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuANhfDrzDuONmhOLR2pIeBUTl78Y57V-0fC-zNc5iV2kJo5zoABof0IEJwkIjrTB19ZSi1G6GDEgsbCCb3674Scr6UJIS962VHKk9kzkNJ7V4dYhrHc-cCZC1NuTmtqsextd60BgbFRjZH59__xZsRWwvvdAaee2u3Kibb7EO7dIK_Vp3GIhUFNfOXbxGO6F7fimyDOqHRCeeC4Z9hylCenCNWjxwiCVlJsuzAuSRKVEITvQ_YViyrOmA"
          />
        </div>
      </header>

      {/* Floating Destination Chip */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
        <div className="bg-white border border-[#cfc4c5] p-4 rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-4 text-left">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-black"></div>
            <div className="w-[1px] h-6 border-l border-dashed border-[#cfc4c5]"></div>
            <div className="w-2 h-2 bg-black"></div>
          </div>
          <div className="flex-grow min-w-0">
            <div className="text-[10px] font-bold text-[#5d5f5f] uppercase">Pick-up</div>
            <div className="text-sm font-semibold text-black truncate">{tripDetails.pickup.address}</div>
            <div className="h-[1px] bg-[#cfc4c5] my-1"></div>
            <div className="text-[10px] font-bold text-[#5d5f5f] uppercase">Drop-off</div>
            <div className="text-sm font-semibold text-black truncate">{tripDetails.destination.address}</div>
          </div>
        </div>
      </div>

      {/* Vehicle Selection Bottom Sheet */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.12)] pt-2 pb-6 px-4">
        {/* Drag Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-1 rounded-full bg-[#eeeeee]"></div>
        </div>

        <h1 className="text-lg font-bold text-black mb-4 text-left">Choose a Vehicle</h1>

        {/* Ride Selection Cards */}
        <div className="space-y-3">
          {/* Bike Card */}
          <div 
            onClick={() => setSelectedType('bike')}
            className={`flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer transition-all duration-200 text-left ${
              selectedType === 'bike' ? 'border-black border-2 shadow-md' : 'border-[#cfc4c5] hover:border-black'
            }`}
            data-testid="bike-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-[#eeeeee] rounded-lg">
                <span className="material-symbols-outlined text-4xl">motorcycle</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-black">Bike</span>
                  <span className="material-symbols-outlined text-sm">person</span>
                  <span className="text-xs font-bold text-black">1</span>
                </div>
                <div className="text-xs text-[#5d5f5f]">2 mins away</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">${estimates.bike.total.toFixed(2)}</div>
              <div className="text-[10px] uppercase font-bold text-[#5d5f5f] tracking-widest">Economy</div>
            </div>
          </div>

          {/* Rickshaw Card */}
          <div 
            onClick={() => setSelectedType('rickshaw')}
            className={`flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer transition-all duration-200 text-left ${
              selectedType === 'rickshaw' ? 'border-black border-2 shadow-md' : 'border-[#cfc4c5] hover:border-black'
            }`}
            data-testid="rickshaw-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-[#eeeeee] rounded-lg">
                <span className="material-symbols-outlined text-4xl">electric_rickshaw</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-black">Rickshaw</span>
                  <span className="material-symbols-outlined text-sm">person</span>
                  <span className="text-xs font-bold text-black">3</span>
                </div>
                <div className="text-xs text-[#5d5f5f]">5 mins away</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">${estimates.rickshaw.total.toFixed(2)}</div>
            </div>
          </div>

          {/* Car Card */}
          <div 
            onClick={() => setSelectedType('car')}
            className={`flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer transition-all duration-200 text-left ${
              selectedType === 'car' ? 'border-black border-2 shadow-md' : 'border-[#cfc4c5] hover:border-black'
            }`}
            data-testid="car-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-[#eeeeee] rounded-lg">
                <span className="material-symbols-outlined text-4xl">directions_car</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-black">Car</span>
                  <span className="material-symbols-outlined text-sm">person</span>
                  <span className="text-xs font-bold text-black">4</span>
                </div>
                <div className="text-xs text-[#5d5f5f]">4 mins away</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">${estimates.car.total.toFixed(2)}</div>
              <div className="bg-black text-white text-[10px] px-2 rounded-full font-bold inline-block">FASTER</div>
            </div>
          </div>
        </div>

        {/* Payment Method Summary */}
        <div className="mt-6 flex items-center justify-between py-2 border-t border-[#cfc4c5]">
          <div className="flex items-center gap-3 text-[#5d5f5f]">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-xs font-bold uppercase tracking-wider">Personal • Cash</span>
          </div>
          {/* Cash is non-interactive: Change button does nothing or displays fixed info */}
          <div className="text-black text-sm font-bold underline cursor-not-allowed">Cash Only</div>
        </div>

        {/* Primary Action Button */}
        <button 
          onClick={handleConfirm}
          className="w-full h-14 bg-black text-white rounded-xl font-bold mt-4 active:scale-95 transition-transform cursor-pointer"
        >
          Confirm Ride
        </button>
      </div>
    </div>
  );
};

export default VehicleSelection;

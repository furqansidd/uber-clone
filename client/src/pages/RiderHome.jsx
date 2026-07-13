import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Map from '../components/Map';

const RiderHome = () => {
  const navigate = useNavigate();
  const { token, role, user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('Current Location');
  const [destinationAddress, setDestinationAddress] = useState('');
  
  // Enforce auth guards
  useEffect(() => {
    if (!token || role !== 'rider') {
      navigate('/login');
    }
  }, [token, role, navigate]);

  const recentLocations = [
    { title: 'Central Station', address: '401 7th Ave, New York, NY', type: 'history', coords: { latitude: 40.7505, longitude: -73.9934 } },
    { title: 'Home', address: 'Brooklyn Heights, NY', type: 'home', coords: { latitude: 40.6960, longitude: -73.9933 } },
    { title: 'Office', address: 'Financial District, NY', type: 'work', coords: { latitude: 40.7074, longitude: -74.0113 } },
    { title: 'Grand Central Terminal', address: '89 E 42nd St, New York, NY', type: 'star', coords: { latitude: 40.7527, longitude: -73.9772 } },
  ];

  const handleSelectLocation = (loc) => {
    // Save selections to sessionStorage/state to pass to Vehicle Selection (Screen 8)
    const tripDetails = {
      pickup: {
        address: pickupAddress,
        coordinates: { latitude: 40.7588, longitude: -73.9851 } // Times Square
      },
      destination: {
        address: loc.address || loc.title,
        coordinates: loc.coords || { latitude: 40.7829, longitude: -73.9654 } // Central Park
      }
    };
    sessionStorage.setItem('tripDetails', JSON.stringify(tripDetails));
    navigate('/vehicle-selection');
  };

  const handleDestinationSubmit = (e) => {
    if (e.key === 'Enter' && destinationAddress.trim()) {
      handleSelectLocation({ address: destinationAddress, title: destinationAddress });
    }
  };

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative">
      {/* Map Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Map pickup={null} destination={null} />
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 py-2 bg-transparent">
        <button 
          onClick={toggleDrawer}
          className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)] transition-colors active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-black font-bold">menu</span>
        </button>
        <div className="bg-white px-4 py-2 rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)]">
          <span className="text-lg font-bold text-black tracking-tight">DriveNow</span>
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-white shadow-[0px_4px_20px_rgba(0,0,0,0.08)] overflow-hidden bg-white">
          <img 
            className="w-full h-full object-cover" 
            alt="Rider avatar" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2ovWG0ZYH-nA4OxCtkw2kPCI21mgkK1mlu4c-8UvtE7wrpprnEta7PvYsdp2NPt899Z8goHviBa29IJ1hTFYI0B3PC9fDJY8BUzSeO5oYVehyXQO_2LCTUcptlj62qNu8mO4x6BCSR79sw95KOSm_X91sQ1nV6amSZQ8RgxSmslsAaXTdibfNERljPZNKIy7bpucGp1Dys5INehdh1OI8D4ccU0GCgIMsadczTOSkVldpWv2mwSR2Rw"
          />
        </div>
      </header>

      {/* Locate Me Floating Button */}
      <button className="fixed right-4 bottom-[420px] z-10 w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#cfc4c5] active:scale-95 transition-transform cursor-pointer">
        <span className="material-symbols-outlined text-black">my_location</span>
      </button>

      {/* Main Content Panel (Bottom Sheet Style) */}
      <main className="fixed bottom-0 left-0 w-full z-20 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] flex flex-col h-[400px]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-[#cfc4c5] rounded-full"></div>
        </div>

        {/* Address Input Group */}
        <div className="px-4 pt-1 pb-4">
          <div className="relative bg-white border border-[#cfc4c5] rounded-xl p-4 flex flex-col gap-4 text-left">
            {/* Connector Line */}
            <div className="absolute left-[23px] top-[36px] bottom-[36px] w-[2px] border-l border-dashed border-[#7e7576]"></div>
            
            {/* Pickup Input */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full border-2 border-black flex-shrink-0"></div>
              <div className="flex-grow">
                <p className="text-[10px] font-bold text-[#5d5f5f] uppercase">Pick-up location</p>
                <input 
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-semibold text-black focus:outline-none" 
                  type="text" 
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>
            </div>
            
            <div className="h-[1px] bg-[#cfc4c5] ml-6"></div>
            
            {/* Dropoff Input */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-black flex-shrink-0"></div>
              <div className="flex-grow">
                <p className="text-[10px] font-bold text-[#5d5f5f] uppercase">Destination</p>
                <input 
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-black focus:outline-none placeholder:text-[#cfc4c5]" 
                  placeholder="Where do you want to go?" 
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  onKeyDown={handleDestinationSubmit}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Suggestions */}
        <div className="flex-grow overflow-y-auto px-4 pb-4">
          <div className="space-y-1">
            {recentLocations.map((loc, idx) => (
              <div 
                key={idx}
                onClick={() => handleSelectLocation(loc)}
                className="flex items-center gap-3 p-3 hover:bg-[#f4f3f3] transition-colors rounded-lg group cursor-pointer border-b border-[#cfc4c5] last:border-none text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-[#f4f3f3] rounded-full group-hover:bg-white">
                  <span className="material-symbols-outlined text-[#5d5f5f]">
                    {loc.type === 'history' ? 'history' :
                     loc.type === 'home' ? 'home' :
                     loc.type === 'work' ? 'work' : 'star'}
                  </span>
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-semibold text-black">{loc.title}</p>
                  <p className="text-xs text-[#5d5f5f]">{loc.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Side Navigation Drawer */}
      {drawerOpen && (
        <>
          <div 
            onClick={toggleDrawer}
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
          />
          <aside className="fixed top-0 left-0 h-full w-80 bg-white z-[70] transition-transform duration-300 border-r border-[#cfc4c5] shadow-lg flex flex-col p-4 text-left">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-white">
                  <img 
                    className="w-full h-full object-cover" 
                    alt="Rider avatar" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxNetQkD1A9gFf0LXHYOMJLpg_y6a8qArCLlkq05sa2gC-tK4CnZBYa6XdBkEkOPUzqp2dtaqYLcqlh4ZqzWwS0AEplQXaAajDbmqGpSOdR9u4ccgTAh2A_VSiUP6DdeIBczEQzrv8HdemiktL5DDbgpJ9TnrGOD6sbWIEi-Qd3pl2cB1wYRSMpDKWzKVBY42pI3jLWuL05XkSzeHZGOrsN8H629_On9CcBQ3jMGygCsQo-6Ah0dNppw"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-black">
                    {user ? `${user.first_name} ${user.last_name}` : 'Rider Account'}
                  </span>
                  <span className="text-xs text-[#5d5f5f]">Rating: {user?.rating || '5.0'} ★</span>
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-1 flex-grow">
              <button className="flex items-center gap-3 p-3 text-black hover:bg-[#f4f3f3] transition-all rounded-lg cursor-pointer bg-transparent border-none text-left w-full">
                <span className="material-symbols-outlined text-[#5d5f5f]">person</span>
                <span className="text-sm font-semibold">Profile</span>
              </button>
              <button className="flex items-center gap-3 p-3 text-black hover:bg-[#f4f3f3] transition-all rounded-lg cursor-pointer bg-transparent border-none text-left w-full">
                <span className="material-symbols-outlined text-[#5d5f5f]">receipt_long</span>
                <span className="text-sm font-semibold">History</span>
              </button>
              {/* Wallet tab is visible but non-functional placeholder */}
              <button className="flex items-center gap-3 p-3 text-[#5d5f5f] hover:bg-[#f4f3f3]/50 transition-all rounded-lg cursor-not-allowed bg-transparent border-none text-left w-full" disabled>
                <span className="material-symbols-outlined text-[#cfc4c5]">payments</span>
                <span className="text-sm font-semibold">Wallet (Placeholder)</span>
              </button>
              <button 
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 transition-all rounded-lg cursor-pointer bg-transparent border-none text-left w-full mt-auto"
              >
                <span className="material-symbols-outlined text-red-600">logout</span>
                <span className="text-sm font-semibold">Log out</span>
              </button>
            </nav>
          </aside>
        </>
      )}

      {/* Bottom Nav Bar (Static/Interactive) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 pt-2 bg-white border-t border-[#cfc4c5] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col items-center justify-center text-black font-bold cursor-pointer">
          <span className="material-symbols-outlined">local_taxi</span>
          <span className="text-xs">Ride</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#5d5f5f] cursor-pointer">
          <span className="material-symbols-outlined">history</span>
          <span className="text-xs">Activity</span>
        </div>
        {/* Wallet nav tab: visible but non-functional placeholder */}
        <div className="flex flex-col items-center justify-center text-[#cfc4c5] cursor-not-allowed">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-xs">Wallet</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#5d5f5f] cursor-pointer">
          <span className="material-symbols-outlined">person</span>
          <span className="text-xs">Account</span>
        </div>
      </nav>
    </div>
  );
};

export default RiderHome;

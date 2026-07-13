import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  const [nearbyDriversCount] = useState(12);
  const [estimatedWaitTime] = useState('4.2 min wait');

  const handleContinue = () => {
    navigate('/login');
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-hidden min-h-screen relative flex flex-col justify-between">
      {/* Hero Background Layer */}
      <div className="relative w-full h-[707px] overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center" 
          style={{ 
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCFj2EWrb_PnogOx9nt61KzwRSGiYIC5MDiw1q7kj66vGiSY7SEfYJeUhAEmlFEGLhmABUGcHhIlkOcI9y_SSX9pe_u-s_L862XCg6sDKSZRhUafAY3pQuj1p24fx7_2bTIrX5wWGRBNFUhvPWeukjojtj6rYQCJEuXvw-3ZccPRPsdYtMcWjPLGKslGG8Nm534jQeJaXEGmdTlmr29Y2TftpgGKQnkhekxQ9ClF7FryKIRwI0VpmCUbw')" 
          }}
        />
        {/* Gradient Overlay for Contrast */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
        
        {/* Logo Area */}
        <div className="absolute top-0 left-0 z-20 p-4 flex items-center gap-2">
          <div className="bg-white p-2 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '24px' }}>directions_car</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">DriveNow</span>
        </div>
      </div>

      {/* Main Content Container (Bottom Panel) */}
      <main className="fixed bottom-0 left-0 w-full h-[282px] z-30 bg-white rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] flex flex-col items-center">
        {/* Drag Handle Indicator */}
        <div className="w-8 h-[4px] bg-[#cfc4c5] rounded-full mt-3 mb-4 opacity-50"></div>
        <div className="w-full px-4 flex flex-col gap-6 h-full pb-8 justify-between">
          {/* Headline Section */}
          <div className="space-y-1 pt-1 text-left">
            <h1 className="text-[26px] font-bold leading-8 tracking-tight text-black">Get Started</h1>
            <p className="text-sm text-[#5d5f5f]">Ready for a seamless travel experience? Let's get you where you need to go.</p>
          </div>
          
          {/* Primary Action */}
          <div className="w-full space-y-4">
            <button 
              onClick={handleContinue}
              className="w-full h-[56px] bg-black text-white font-bold rounded-lg flex items-center justify-center active:scale-[0.98] transition-transform duration-150 cursor-pointer"
            >
              <span className="text-sm font-semibold">Continue</span>
            </button>
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] flex-1 bg-[#cfc4c5]"></div>
              <span className="text-xs font-semibold text-[#5d5f5f]">OR</span>
              <div className="h-[1px] flex-1 bg-[#cfc4c5]"></div>
            </div>
            <div className="flex justify-between gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="flex-1 h-[56px] bg-white border border-[#cfc4c5] rounded-lg flex items-center justify-center gap-2 hover:bg-[#f4f3f3] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-black">mail</span>
                <span className="text-sm font-semibold">Email</span>
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="flex-1 h-[56px] bg-white border border-[#cfc4c5] rounded-lg flex items-center justify-center gap-2 hover:bg-[#f4f3f3] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-black">account_circle</span>
                <span className="text-sm font-semibold">Social</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic wait / driver badge */}
      <div className="fixed top-1/4 right-4 z-20 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md p-4 rounded-[20px] border border-white/20 flex flex-col gap-1 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-white text-[12px] font-medium tracking-wide" data-testid="wait-time">{estimatedWaitTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-white text-[12px] font-medium tracking-wide" data-testid="drivers-count">Nearby drivers: {nearbyDriversCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;

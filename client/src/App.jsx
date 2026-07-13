import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Import pages
import Landing from './pages/Landing';
import RiderLogin from './pages/RiderLogin';
import RiderSignup from './pages/RiderSignup';
import CaptainLogin from './pages/CaptainLogin';
import CaptainSignup from './pages/CaptainSignup';
import CaptainForgotPassword from './pages/CaptainForgotPassword';
import CaptainResetPassword from './pages/CaptainResetPassword';
import RiderHome from './pages/RiderHome';
import VehicleSelection from './pages/VehicleSelection';
import ConfirmRide from './pages/ConfirmRide';
import SearchingDriver from './pages/SearchingDriver';
import DriverMatched from './pages/DriverMatched';
import RiderTracking from './pages/RiderTracking';
import CaptainHome from './pages/CaptainHome';
import IncomingRequest from './pages/IncomingRequest';
import CaptainConfirmation from './pages/CaptainConfirmation';
import CaptainActiveTrip from './pages/CaptainActiveTrip';
import FinishRideSummary from './pages/FinishRideSummary';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing / Auth */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<RiderLogin />} />
          <Route path="/signup" element={<RiderSignup />} />
          <Route path="/captain/login" element={<CaptainLogin />} />
          <Route path="/captain/signup" element={<CaptainSignup />} />
          <Route path="/captain/forgot-password" element={<CaptainForgotPassword />} />
          <Route path="/captain/reset-password" element={<CaptainResetPassword />} />

          {/* Rider Journeys */}
          <Route path="/rider-home" element={<RiderHome />} />
          <Route path="/vehicle-selection" element={<VehicleSelection />} />
          <Route path="/confirm-ride" element={<ConfirmRide />} />
          <Route path="/searching-driver" element={<SearchingDriver />} />
          <Route path="/driver-matched" element={<DriverMatched />} />
          <Route path="/rider-tracking" element={<RiderTracking />} />

          {/* Captain Journeys */}
          <Route path="/captain-home" element={<CaptainHome />} />
          <Route path="/incoming-request" element={<IncomingRequest />} />
          <Route path="/captain-confirmation" element={<CaptainConfirmation />} />
          <Route path="/captain-trip" element={<CaptainActiveTrip />} />
          
          {/* Summary / Shared */}
          <Route path="/ride-summary" element={<FinishRideSummary />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

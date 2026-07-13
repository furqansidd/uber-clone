import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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
          {/* ── Public / Auth ──────────────────────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<RiderLogin />} />
          <Route path="/signup" element={<RiderSignup />} />
          <Route path="/captain/login" element={<CaptainLogin />} />
          <Route path="/captain/signup" element={<CaptainSignup />} />
          <Route path="/captain/forgot-password" element={<CaptainForgotPassword />} />
          <Route path="/captain/reset-password" element={<CaptainResetPassword />} />

          {/* ── Rider Journey (requires role="rider" token) ─────────────────── */}
          <Route
            path="/rider-home"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle-selection"
            element={
              <ProtectedRoute requiredRole="rider">
                <VehicleSelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/confirm-ride"
            element={
              <ProtectedRoute requiredRole="rider">
                <ConfirmRide />
              </ProtectedRoute>
            }
          />
          <Route
            path="/searching-driver"
            element={
              <ProtectedRoute requiredRole="rider">
                <SearchingDriver />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver-matched"
            element={
              <ProtectedRoute requiredRole="rider">
                <DriverMatched />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-tracking"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderTracking />
              </ProtectedRoute>
            }
          />

          {/* ── Captain Journey (requires role="captain" token) ──────────────── */}
          <Route
            path="/captain-home"
            element={
              <ProtectedRoute requiredRole="captain">
                <CaptainHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incoming-request"
            element={
              <ProtectedRoute requiredRole="captain">
                <IncomingRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain-confirmation"
            element={
              <ProtectedRoute requiredRole="captain">
                <CaptainConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain-trip"
            element={
              <ProtectedRoute requiredRole="captain">
                <CaptainActiveTrip />
              </ProtectedRoute>
            }
          />

          {/* ── Summary / Shared (captain-facing per ui-contract.md Screen 16) ─ */}
          <Route
            path="/ride-summary"
            element={
              <ProtectedRoute requiredRole="captain">
                <FinishRideSummary />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

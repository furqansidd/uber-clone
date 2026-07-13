import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// ─── AuthContext mock factory ─────────────────────────────────────────────────
// We parameterize auth state per test to cover all redirect scenarios.

let mockAuthState = { token: null, role: null };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────
const Protected = ({ requiredRole }) => (
  <MemoryRouter initialEntries={['/protected']}>
    <Routes>
      <Route
        path="/protected"
        element={
          <ProtectedRoute requiredRole={requiredRole}>
            <div data-testid="protected-content">Secret Content</div>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<div data-testid="rider-login">Rider Login</div>} />
      <Route path="/captain/login" element={<div data-testid="captain-login">Captain Login</div>} />
    </Routes>
  </MemoryRouter>
);

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ProtectedRoute', () => {
  it('redirects unauthenticated user to /login for rider routes', () => {
    mockAuthState = { token: null, role: null };

    render(<Protected requiredRole="rider" />);

    expect(screen.getByTestId('rider-login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects wrong role (captain) to /login when rider route is required', () => {
    mockAuthState = { token: 'some-token', role: 'captain' };

    render(<Protected requiredRole="rider" />);

    expect(screen.getByTestId('rider-login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when rider is authenticated with correct role', () => {
    mockAuthState = { token: 'rider-token', role: 'rider' };

    render(<Protected requiredRole="rider" />);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('rider-login')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /captain/login for captain routes', () => {
    mockAuthState = { token: null, role: null };

    render(<Protected requiredRole="captain" />);

    expect(screen.getByTestId('captain-login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects wrong role (rider) to /captain/login when captain route is required', () => {
    mockAuthState = { token: 'rider-token', role: 'rider' };

    render(<Protected requiredRole="captain" />);

    expect(screen.getByTestId('captain-login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when captain is authenticated with correct role', () => {
    mockAuthState = { token: 'captain-token', role: 'captain' };

    render(<Protected requiredRole="captain" />);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('captain-login')).not.toBeInTheDocument();
  });
});

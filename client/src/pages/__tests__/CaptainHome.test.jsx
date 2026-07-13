import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import CaptainHome from '../CaptainHome';

// Mock axios
vi.mock('axios');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock Socket.io-client
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('../../context/AuthContext', () => {
  return {
    useAuth: () => ({
      token: 'captain-token',
      role: 'captain',
      socket: mockSocket,
      login: vi.fn(),
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

describe('Captain Home Screen (Screen 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should render offline initially and handle online toggling', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        message: 'Status updated successfully',
        captain: { is_online: true }
      }
    });

    render(
      <BrowserRouter>
        <CaptainHome />
      </BrowserRouter>
    );

    // Initial label
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('You are offline')).toBeInTheDocument();

    // Click toggle button
    const toggle = screen.getByTestId('status-toggle');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/captains/status'),
        { is_online: true, latitude: 40.7580, longitude: -73.9855 },
        expect.any(Object)
      );
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Waiting for ride requests')).toBeInTheDocument();
    });
  });

  it('should handle ride_offer socket events when online and navigate', async () => {
    // Render and simulate online status
    axios.post.mockResolvedValueOnce({
      data: {
        captain: { is_online: true }
      }
    });

    render(
      <BrowserRouter>
        <CaptainHome />
      </BrowserRouter>
    );

    // Go online
    fireEvent.click(screen.getByTestId('status-toggle'));

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    // Verify socket handler is registered
    expect(mockSocket.on).toHaveBeenCalledWith('ride_offer', expect.any(Function));

    // Manually trigger ride_offer handler
    const offerCallback = mockSocket.on.mock.calls.find(c => c[0] === 'ride_offer')[1];
    offerCallback({
      ride: { _id: 'ride333', pickup_address: 'Point A', destination_address: 'Point B' },
      timeout_seconds: 15
    });

    expect(sessionStorage.getItem('offerTimeout')).toBe('15');
    expect(JSON.parse(sessionStorage.getItem('rideOffer'))._id).toBe('ride333');
    expect(mockNavigate).toHaveBeenCalledWith('/incoming-request');
  });
});

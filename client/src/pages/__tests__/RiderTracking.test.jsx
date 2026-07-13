import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import RiderTracking from '../RiderTracking';

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
      token: 'test-token',
      role: 'rider',
      socket: mockSocket,
      login: vi.fn(),
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

// Mock Web Share and Clipboard APIs
const mockWriteText = vi.fn().mockResolvedValue(true);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true
});

describe('Rider Tracking Screen (Screen 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    
    const mockRide = {
      _id: 'ride222',
      pickup_address: 'Start Point',
      destination_address: 'End Point',
      status: 'driver_arriving',
      fare: { total: 24.50 },
      stops: [],
      captain: {
        full_name: 'John Doe',
        rating: 4.9,
        vehicle_color: 'Black',
        vehicle_type: 'car',
        plate_number: 'ABC-1234',
        phone_number: '5551212'
      }
    };
    sessionStorage.setItem('activeRide', JSON.stringify(mockRide));
  });

  it('should render tracking details and show status text', () => {
    render(
      <BrowserRouter>
        <RiderTracking />
      </BrowserRouter>
    );

    expect(screen.getByTestId('status-text')).toHaveTextContent('Driver is arriving');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ABC-1234')).toBeInTheDocument();
    expect(screen.getByTestId('tracking-fare')).toHaveTextContent('$24.50');
  });

  it('should trigger add stop and update active ride state in place', async () => {
    // Mock the add stop API call
    axios.post.mockResolvedValueOnce({
      data: {
        ride: {
          _id: 'ride222',
          pickup_address: 'Start Point',
          destination_address: 'End Point',
          status: 'driver_arriving',
          fare: { total: 32.80 },
          stops: [{ address: 'Times Square Stop', coordinates: { type: 'Point', coordinates: [-73.9855, 40.7579] } }]
        }
      }
    });

    render(
      <BrowserRouter>
        <RiderTracking />
      </BrowserRouter>
    );

    // Open add stop input
    const addStopBtn = screen.getByRole('button', { name: /Add Stop/i });
    fireEvent.click(addStopBtn);

    // Enter stop location and submit
    const input = screen.getByPlaceholderText('Enter stop address...');
    fireEvent.change(input, { target: { value: 'Times Square Stop' } });

    const submitBtn = screen.getByRole('button', { name: /^Add$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rides/ride222/stops'),
        {
          address: 'Times Square Stop',
          coordinates: { latitude: 40.7579, longitude: -73.9855 }
        },
        expect.any(Object)
      );
      // Fare updated in place
      expect(screen.getByTestId('tracking-fare')).toHaveTextContent('$32.80');
      // Inputs closed
      expect(screen.queryByPlaceholderText('Enter stop address...')).not.toBeInTheDocument();
    });
  });

  it('should register socket events and navigate to summary on complete', () => {
    render(
      <BrowserRouter>
        <RiderTracking />
      </BrowserRouter>
    );

    expect(mockSocket.on).toHaveBeenCalledWith('ride_completed', expect.any(Function));

    // Trigger ride_completed socket event
    const completedCallback = mockSocket.on.mock.calls.find(c => c[0] === 'ride_completed')[1];
    completedCallback({ ride: { _id: 'ride222', status: 'completed' } });

    expect(mockNavigate).toHaveBeenCalledWith('/ride-summary');
  });

  it('should copy share details to clipboard on share click', async () => {
    render(
      <BrowserRouter>
        <RiderTracking />
      </BrowserRouter>
    );

    const shareBtn = screen.getByRole('button', { name: /Share Ride/i });
    fireEvent.click(shareBtn);

    expect(mockWriteText).toHaveBeenCalled();
  });
});

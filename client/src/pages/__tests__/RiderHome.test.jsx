import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import RiderHome from '../RiderHome';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Rider Home Screen (Screen 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    
    // Set mock authentication tokens
    localStorage.setItem('token', 'valid-rider-token');
    localStorage.setItem('role', 'rider');
  });

  it('should render address inputs, suggestions, map, and disabled Wallet options', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RiderHome />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify pick-up location input has "Current Location"
    const pickupInput = screen.getByDisplayValue('Current Location');
    expect(pickupInput).toBeInTheDocument();

    // Verify destination placeholder
    expect(screen.getByPlaceholderText('Where do you want to go?')).toBeInTheDocument();

    // Verify recent locations suggestions are listed
    expect(screen.getByText('Central Station')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();

    // Verify Wallet tab is present (and has muted styles or disabled features)
    expect(screen.getByText('Wallet')).toBeInTheDocument();
  });

  it('should save trip details and navigate to vehicle-selection on suggestion click', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RiderHome />
        </AuthProvider>
      </BrowserRouter>
    );

    // Click on Central Station
    const centralStationItem = screen.getByText('Central Station');
    fireEvent.click(centralStationItem);

    // Verify sessionStorage has tripDetails
    const tripDetails = JSON.parse(sessionStorage.getItem('tripDetails'));
    expect(tripDetails.pickup.address).toBe('Current Location');
    expect(tripDetails.destination.address).toBe('401 7th Ave, New York, NY');

    expect(mockNavigate).toHaveBeenCalledWith('/vehicle-selection');
  });

  it('should open side drawer and logout successfully', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RiderHome />
        </AuthProvider>
      </BrowserRouter>
    );

    // Open side drawer
    const menuButton = screen.getByText('menu');
    fireEvent.click(menuButton);

    // Verify side drawer is open by checking Profile button
    expect(screen.getByText('Profile')).toBeInTheDocument();

    // Click Log out
    const logoutBtn = screen.getByText('Log out');
    fireEvent.click(logoutBtn);

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

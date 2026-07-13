import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Landing from '../Landing';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Landing Screen (Screen 2)', () => {
  it('should render wait time, nearby drivers, and action buttons', () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>
    );

    // Verify Title & Description
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText(/Ready for a seamless travel experience/)).toBeInTheDocument();

    // Verify dynamic data fields
    expect(screen.getByTestId('wait-time')).toHaveTextContent('4.2 min wait');
    expect(screen.getByTestId('drivers-count')).toHaveTextContent('Nearby drivers: 12');

    // Verify Buttons are visible
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Social/i })).toBeInTheDocument();
  });

  it('should navigate to login when Continue is clicked', () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>
    );

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

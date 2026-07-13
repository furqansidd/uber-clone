import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null); // 'rider' or 'captain'
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.io connection when token exists
  useEffect(() => {
    if (token && role) {
      const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const socketConn = io(socketUrl);
      
      socketConn.on('connect', () => {
        socketConn.emit('authenticate', { token, role });
      });

      setSocket(socketConn);

      return () => {
        socketConn.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [token, role]);

  const login = (newToken, newRole, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    setToken(newToken);
    setRole(newRole);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, user, setUser, socket, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

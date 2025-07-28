import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io('http://localhost:3001');

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to server');
        
        // Join appropriate room based on user role
        newSocket.emit('join-room', user.role);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from server');
      });

      // Listen for new request notifications (for lecturers)
      newSocket.on('new-request', (data) => {
        if (user.role === 'lecturer') {
          toast(`New equipment request from ${data.studentName}`, {
            icon: '🔔',
            duration: 5000,
          });
        }
      });

      // Listen for request updates (for students)
      newSocket.on('request-updated', (data) => {
        if (data.userId === user.id) {
          toast(data.message, {
            icon: data.status === 'approved' ? '✅' : '❌',
            duration: 5000,
          });
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    isConnected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

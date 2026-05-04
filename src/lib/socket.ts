import { Server } from 'socket.io';
import { Server as NetServer } from 'http';

// Extend the NodeJS global type to include our socket.io instance
declare global {
  var io: Server | undefined;
}

export const initSocketServer = (httpServer: NetServer) => {
  if (!(httpServer as any).io) {
    console.log('Initializing Socket.io server...');
    const ioInstance = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*', // Allow all origins for now, adjust in production
        methods: ['GET', 'POST'],
      },
    });

    ioInstance.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
    (httpServer as any).io = ioInstance;
    global.io = ioInstance; // Make it globally accessible
  }
  return (httpServer as any).io;
};

// Function to get the existing Socket.io instance from the global object
export const getIo = (): Server | undefined => {
  return global.io;
};

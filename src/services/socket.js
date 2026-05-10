import { io } from 'socket.io-client';

const SOCKET_URL = 'https://kribigo-backend.onrender.com';
let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
  socket.on('connect', () => console.log('🔌 Connected:', socket.id));
  socket.on('disconnect', () => console.log('🔌 Disconnected'));
  socket.on('connect_error', (e) => console.log('🔌 Error:', e.message));
  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { socket?.disconnect(); socket = null; }

export function joinAsRider(user_id) {
  if (socket?.connected) {
    socket.emit('user:join', { user_id });
  } else {
    socket?.once('connect', () => socket.emit('user:join', { user_id }));
  }
}

export function joinAsDriver(driver_id, vehicle_type) {
  console.log('🚗 Joining as driver:', driver_id, vehicle_type);
  if (socket?.connected) {
    socket.emit('driver:join', { driver_id, vehicle_type });
    console.log('🚗 driver:join emitted immediately');
  } else {
    socket?.once('connect', () => {
      socket.emit('driver:join', { driver_id, vehicle_type });
      console.log('🚗 driver:join emitted after connect');
    });
  }
}

export function onNewRideRequest(callback) {
  ['moto', 'economie', 'confort'].forEach(type => {
    socket?.on(`drivers:new_request:${type}`, (data) => {
      console.log(`🚗 New request on drivers:new_request:${type}`, data);
      callback(data);
    });
  });
}

export function offNewRideRequest() {
  ['moto', 'economie', 'confort'].forEach(type => {
    socket?.off(`drivers:new_request:${type}`);
  });
}

export function sendEnRoute(trip_id, user_id, eta_minutes) {
  socket?.emit('driver:en_route', { trip_id, user_id, eta_minutes });
}

export function onDriverEnRoute(callback) {
  socket?.on('trip:driver_en_route', callback);
}

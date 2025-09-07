const { io } = require('socket.io-client');

// ---------------- CUSTOMER ----------------
const customerSocket = io('http://localhost:3000', {
  query: { role: 'customer', userId: 'cust1' },
});

customerSocket.on('message', msg => {
  console.log('[Customer] received:', msg);
});

customerSocket.on('error', err => {
  console.error('[Customer] error:', err);
});

setTimeout(() => {
  console.log('[Customer] sending: Hello!');
  customerSocket.emit('customerMessage', 'Hello from customer!');
}, 2000);

// ---------------- AGENT ----------------
const agentSocket = io('http://localhost:3000', {
  query: { role: 'agent', agentId: 'agent1' },
});

agentSocket.on('agentConnected', data => {
  console.log('[Agent] connected:', data);
});

agentSocket.on('assignedToRoom', data => {
  console.log('[Agent] assigned to room:', data);

  // Save roomId for later use
  agentSocket.currentRoomId = data.roomId;

  // Auto-send a message after assignment
  setTimeout(() => {
    console.log('[Agent] sending: Hello, I am your agent!');
    agentSocket.emit('agentMessage', {
      roomId: data.roomId,
      message: 'Hello, I am your agent!',
    });
  }, 3000);
});

agentSocket.on('message', msg => {
  console.log('[Agent] received:', msg);
});

agentSocket.on('roomClosed', data => {
  console.log('[Agent] room closed:', data);
  agentSocket.currentRoomId = null;
});

agentSocket.on('agentStatusUpdate', data => {
  console.log('[Agent] status update:', data);
});

agentSocket.on('error', err => {
  console.error('[Agent] error:', err);
});

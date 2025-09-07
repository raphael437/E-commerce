const Agent = require('../models/Agent');

function socketHandler(io) {
  io.on('connection', async socket => {
    const { role, agentId, userId } = socket.handshake.query;
    console.log(
      `User connected: ${socket.id}, role: ${role}, agentId: ${agentId}, userId: ${userId}`
    );

    // ----------------- AGENT CONNECT -----------------
    if (role === 'agent' && agentId) {
      console.log(`Agent ${agentId} connected with socket ${socket.id}`);

      try {
        // Mark agent active + store socketId
        await Agent.update(
          { status: 'active', socketId: socket.id },
          { where: { id: agentId } }
        );

        socket.emit('agentConnected', {
          message: 'You are now connected and active.',
          socketId: socket.id,
        });

        io.emit('agentStatusUpdate', { agentId, status: 'active' });

        socket.on('agentMessage', async ({ roomId, message }) => {
          io.to(roomId).emit('message', {
            from: 'agent',
            text: message,
            timestamp: new Date(),
          });
        });

        socket.on('disconnect', async () => {
          console.log(`Agent ${agentId} disconnected`);
          await Agent.update(
            { status: 'offline', socketId: null },
            { where: { id: agentId } }
          );

          io.emit('agentStatusUpdate', { agentId, status: 'offline' });
        });
      } catch (err) {
        console.error('Error handling agent connection:', err);
        socket.emit('error', { message: 'Failed to connect as agent' });
      }
    }

    // ----------------- CUSTOMER CONNECT -----------------
    if (role === 'customer') {
      const roomId = `room-${socket.id}`;
      socket.join(roomId);

      socket.emit('message', {
        from: 'system',
        text: 'Welcome! An agent will join you shortly.',
        timestamp: new Date(),
      });

      try {
        const agent = await Agent.findOne({ where: { status: 'active' } });

        if (agent && agent.socketId) {
          io.sockets.sockets.get(agent.socketId)?.join(roomId);

          await Agent.update({ status: 'busy' }, { where: { id: agent.id } });

          io.to(roomId).emit('message', {
            from: 'system',
            text: `Agent ${agent.name} has joined the chat.`,
            timestamp: new Date(),
          });

          io.to(agent.socketId).emit('assignedToRoom', {
            roomId,
            customerId: userId || 'anonymous',
          });

          socket.on('customerMessage', msg => {
            io.to(roomId).emit('message', {
              from: 'customer',
              text: msg,
              timestamp: new Date(),
            });
          });

          socket.on('disconnect', async () => {
            console.log(`Customer in ${roomId} disconnected`);
            io.to(roomId).emit('message', {
              from: 'system',
              text: 'Customer disconnected. Closing room.',
              timestamp: new Date(),
            });

            await Agent.update(
              { status: 'active' },
              { where: { id: agent.id } }
            );
            io.to(agent.socketId).emit('roomClosed', { roomId });
          });
        } else {
          socket.emit('message', {
            from: 'system',
            text: 'No agents available right now. Please try later.',
            timestamp: new Date(),
          });
        }
      } catch (err) {
        console.error('Error handling customer connection:', err);
        socket.emit('error', { message: 'Failed to connect to chat' });
      }
    }
  });
}

module.exports = socketHandler;

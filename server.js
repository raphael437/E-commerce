const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');
const { createServer } = require('http');
const { Server } = require('socket.io');
const sequelize = require('./config/db');
const socketHandler = require('./socket/socketHandler');

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize sockets
socketHandler(io);

// Sync DB + start server
const PORT = process.env.PORT || 3000;

const syncDatabase = async () => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: false }); // Changed to false to preserve data
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Database connected successfully');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }
};
syncDatabase();

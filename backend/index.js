require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const caseRoutes = require('./routes/caseRoutes');
const juniorRoutes = require('./routes/juniorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/cases', caseRoutes);
app.use('/api/juniors', juniorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

const dns = require('dns');
// Configure reliable public DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const path = require('path');
const fs = require('fs');

// Database Connection with Auto-Local Fallback
async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/layerdb';

  // If Atlas / Remote URL is provided, connect directly
  if (mongoUri.includes('mongodb+srv://') || !mongoUri.includes('127.0.0.1')) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB Connected to Atlas/Remote Cluster successfully: ' + mongoUri.split('@')[1]?.split('?')[0]);
      return;
    } catch (err) {
      console.error('❌ Remote MongoDB connection error:', err.message);
    }
  }

  // Try standard local MongoDB
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Local MongoDB Connected successfully (Port 27017)');
  } catch (err) {
    console.log('ℹ️ Local MongoDB service not running. Starting Embedded Local MongoDB Server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const dbPath = path.join(__dirname, 'data', 'db');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }

      let mongod;
      try {
        mongod = await MongoMemoryServer.create({
          instance: {
            dbPath: dbPath,
            storageEngine: 'wiredTiger',
            dbName: 'layerdb',
          },
        });
        console.log(`📁 Local Data Directory: ${dbPath}`);
      } catch (lockErr) {
        // If directory lock was held during hot-reload, start in-memory instance
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'layerdb',
          },
        });
      }

      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ Local MongoDB started & Connected successfully!');
      
      process.on('SIGINT', async () => {
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(0);
      });
    } catch (embeddedErr) {
      console.error('❌ Failed to start local MongoDB engine:', embeddedErr.message);
    }
  }
}

connectDB();

// Basic route
app.get('/', (req, res) => {
  res.send('Layer App Backend API is running (JavaScript)');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
});


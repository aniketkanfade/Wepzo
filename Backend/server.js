require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { loadPersistedFromMongo } = require('./lib/memoryStore');

const app = express();
const PORT = process.env.PORT || 5000;
const WEBSITE_MODULE = String(process.env.WEBSITE_MODULE || '').trim().toLowerCase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
if (WEBSITE_MODULE) {
  app.use((req, _res, next) => {
    req.headers['x-website-module'] = WEBSITE_MODULE;
    next();
  });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads/website-modules', express.static(path.join(__dirname, 'uploads', 'website-modules')));
app.use('/api/main-admin', require('./routes/orderAdminAuth'));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Wepzo backend is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WEPZO API is running' });
});

async function startWithMongo() {
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const componentRoutes = require('./routes/components');
  const moduleRoutes = require('./routes/modules');
  const planRoutes = require('./routes/plans');
  const websiteRoutes = require('./routes/websites');
  const accessRoutes = require('./routes/access');
  const roleRoutes = require('./routes/roles');
  const exportRoutes = require('./routes/export');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/components', componentRoutes);
  app.use('/api/modules', moduleRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/websites', websiteRoutes);
  app.use('/api/access', accessRoutes);
  // Store APIs served by memoryApi (/api/stores) — avoid Mongo route conflict
  app.use('/api/roles', roleRoutes);
  app.use('/api/export', exportRoutes);
}

async function bootstrap() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required; local-file storage is disabled.');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
  console.log('MongoDB connected');
  await require('./models/PlatformData').createIndexes();
  await loadPersistedFromMongo();
  await require('./models/ShopperState').syncIndexes();

  app.use('/api/website-auth', require('./routes/websiteAuth'));
  const memoryApi = require('./routes/memoryApi');
  app.use('/api', memoryApi);
  await startWithMongo();

  app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT} (all network interfaces)`));
}

bootstrap().catch(error => {
  console.error('Backend startup failed:', error.message);
  process.exitCode = 1;
});

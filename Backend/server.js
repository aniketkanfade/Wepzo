require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { seedMemory } = require('./lib/memoryStore');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

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

async function startWithMemory() {
  await seedMemory();
  const memoryApi = require('./routes/memoryApi');
  app.use('/api', memoryApi);
}

async function bootstrap() {
  await startWithMemory();

  mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
    .then(async () => {
      console.log('MongoDB connected (optional extra routes)');
      await startWithMongo();
    })
    .catch(() => console.log('MongoDB not available - memory mode only'));

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

bootstrap();

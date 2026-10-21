require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PERSIST_KEYS } = require('../lib/memoryStore');
const { STATE_COLLECTION } = require('../lib/mongoStateStore');

const sourcePath = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, '..', 'data', 'wepzo-store.json');
const migrationId = 'local-json-v1';

async function migrate() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set it in Backend/.env before migrating.');
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Memory-store source file not found: ${sourcePath}`);
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const source = JSON.parse(sourceText);
  const unknownKeys = Object.keys(source).filter(key => !PERSIST_KEYS.includes(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Source contains state fields that are not persisted by the backend: ${unknownKeys.join(', ')}`);
  }

  const sourceHash = crypto.createHash('sha256').update(sourceText).digest('hex');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const collection = mongoose.connection.db.collection(STATE_COLLECTION);
  const markerId = `migration:${migrationId}`;
  const completed = await collection.findOne({ _id: markerId });
  if (completed) {
    if (completed.sourceHash !== sourceHash) {
      throw new Error('A migration marker exists for a different source file. Refusing to overwrite MongoDB state.');
    }
    console.log('This exact local JSON snapshot was already migrated; no data was changed.');
    return;
  }

  const sourceKeys = Object.keys(source);
  const totalRecords = Object.values(source).reduce(
    (total, value) => total + (Array.isArray(value) ? value.length : 0),
    0,
  );
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existingDocuments = await collection.find(
        { _id: { $in: sourceKeys } },
        { session },
      ).toArray();
      const existingByKey = new Map(existingDocuments.map(document => [document._id, document.value]));
      const operations = sourceKeys.map(key => ({
        updateOne: {
          filter: { _id: key },
          update: {
            $set: {
              value: mergeStateValue(source[key], existingByKey.get(key)),
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
      await collection.bulkWrite(operations, { ordered: true, session });
      await collection.insertOne({
        _id: markerId,
        sourceHash,
        migratedKeys: sourceKeys.length,
        migratedRecords: totalRecords,
        mode: 'merge-existing-wins',
        completedAt: new Date(),
      }, { session });
    });
  } finally {
    await session.endSession();
  }

  const migrated = await collection.countDocuments({ _id: { $in: sourceKeys } });
  if (migrated !== sourceKeys.length) {
    throw new Error(`Migration verification failed: expected ${sourceKeys.length} state records, found ${migrated}.`);
  }
  console.log(`Migration complete: ${migrated} state sections and ${totalRecords} array records stored in MongoDB.`);
}

function recordKey(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  for (const key of ['_id', 'id', 'websiteKey', 'storeId', 'productId', 'zoneId']) {
    if (record[key] != null && String(record[key]).trim()) return `${key}:${record[key]}`;
  }
  if (record.slug) {
    return `slug:${record.websiteId || ''}:${record.moduleId || record.moduleSlug || ''}:${record.slug}`;
  }
  return null;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function mergeStateValue(sourceValue, databaseValue) {
  if (databaseValue === undefined) return sourceValue;
  if (Array.isArray(sourceValue) && Array.isArray(databaseValue)) {
    const merged = [...databaseValue];
    const keys = new Set(merged.map(recordKey).filter(Boolean));
    const exactRecords = new Set(merged.map(canonical));
    sourceValue.forEach(record => {
      const key = recordKey(record);
      const exact = canonical(record);
      if ((key && keys.has(key)) || exactRecords.has(exact)) return;
      merged.push(record);
      if (key) keys.add(key);
      exactRecords.add(exact);
    });
    return merged;
  }
  if (sourceValue && databaseValue
    && typeof sourceValue === 'object' && typeof databaseValue === 'object'
    && !Array.isArray(sourceValue) && !Array.isArray(databaseValue)) {
    const merged = { ...sourceValue, ...databaseValue };
    Object.keys(sourceValue).forEach(key => {
      if (databaseValue[key] !== undefined) {
        merged[key] = mergeStateValue(sourceValue[key], databaseValue[key]);
      }
    });
    return merged;
  }
  return databaseValue;
}

migrate()
  .catch(error => {
    console.error('MongoDB state migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

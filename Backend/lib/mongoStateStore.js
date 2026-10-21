const mongoose = require('mongoose');

const STATE_COLLECTION = 'wepzo_app_state';

function stateCollection() {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB must be connected before accessing application state.');
  }
  return mongoose.connection.db.collection(STATE_COLLECTION);
}

async function loadState(keys) {
  const documents = await stateCollection().find({ _id: { $in: keys } }).toArray();
  if (documents.length === 0) return null;
  return Object.fromEntries(documents.map(({ _id, value }) => [_id, value]));
}

async function saveState(state) {
  const operations = Object.entries(state).map(([key, value]) => ({
    updateOne: {
      filter: { _id: key },
      update: { $set: { value, updatedAt: new Date() } },
      upsert: true,
    },
  }));
  if (operations.length > 0) {
    await stateCollection().bulkWrite(operations, { ordered: true });
  }
}

module.exports = { STATE_COLLECTION, loadState, saveState };

const express = require('express');
const Store = require('../models/Store');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'main_admin' ? {} : { ownerId: req.user._id };
    const stores = await Store.find(filter).populate('ownerId', 'name email').sort({ createdAt: -1 });
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin', 'store_admin'), async (req, res) => {
  try {
    const store = await Store.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/access', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const { accessSections } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { accessSections },
      { new: true }
    );
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.json({ message: 'Store deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

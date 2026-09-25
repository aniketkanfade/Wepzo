const express = require('express');
const Module = require('../models/Module');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const modules = await Module.find({ status: 'active' }).populate('components');
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id).populate('components');
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const mod = await Module.create(req.body);
    res.status(201).json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const mod = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

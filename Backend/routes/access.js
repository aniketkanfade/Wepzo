const express = require('express');
const AccessSection = require('../models/AccessSection');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const sections = await AccessSection.find({ status: 'active' }).sort({ category: 1, name: 1 });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const section = await AccessSection.create(req.body);
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const section = await AccessSection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    await AccessSection.findByIdAndDelete(req.params.id);
    res.json({ message: 'Access section deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

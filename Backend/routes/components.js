const express = require('express');
const Component = require('../models/Component');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { moduleType, type, status } = req.query;
    const filter = {};
    if (moduleType) filter.moduleType = moduleType;
    if (type) filter.type = type;
    if (status) filter.status = status;
    else filter.status = 'active';

    const components = await Component.find(filter).sort({ type: 1, name: 1 });
    res.json(components);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) return res.status(404).json({ message: 'Component not found' });
    res.json(component);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const component = await Component.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(component);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const component = await Component.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!component) return res.status(404).json({ message: 'Component not found' });
    res.json(component);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    await Component.findByIdAndDelete(req.params.id);
    res.json({ message: 'Component deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

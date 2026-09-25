const express = require('express');
const Plan = require('../models/Plan');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const plans = await Plan.find({ status: 'active' }).sort({ price: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/all', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const plan = await Plan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

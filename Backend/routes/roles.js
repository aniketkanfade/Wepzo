const express = require('express');
const Role = require('../models/Role');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ type: 1, name: 1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const role = await Role.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/assign/:userId', auth, requireRole('main_admin'), async (req, res) => {
  try {
    const { roleId, accessSections } = req.body;
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: role.type, accessSections: accessSections || role.accessSections },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('main_admin'), async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const Website = require('../models/Website');
const Component = require('../models/Component');
const { auth } = require('../middleware/auth');

const router = express.Router();

const calcTotal = (components, domainPrice = 0) =>
  components.reduce((sum, c) => sum + (c.price || 0), 0) + domainPrice;

router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'main_admin' ? {} : { userId: req.user._id };
    const websites = await Website.find(filter)
      .populate('components.componentId')
      .sort({ updatedAt: -1 });
    res.json(websites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id).populate('components.componentId');
    if (!website) return res.status(404).json({ message: 'Website not found' });
    if (req.user.role !== 'main_admin' && website.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, moduleType } = req.body;
    const website = await Website.create({
      name: name || 'Untitled Website',
      moduleType: moduleType || 'general',
      userId: req.user._id
    });
    res.status(201).json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });
    if (req.user.role !== 'main_admin' && website.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    Object.assign(website, req.body);
    if (req.body.components) {
      website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    }
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/components', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    const { componentId, config } = req.body;
    const component = await Component.findById(componentId);
    if (!component) return res.status(404).json({ message: 'Component not found' });

    website.components.push({
      componentId,
      config: config || component.defaultConfig,
      order: website.components.length,
      price: component.price
    });
    website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    await website.save();

    const populated = await Website.findById(website._id).populate('components.componentId');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/components/:compIndex', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    website.components.splice(parseInt(req.params.compIndex), 1);
    website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    await website.save();

    const populated = await Website.findById(website._id).populate('components.componentId');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/domain', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    const { domainName, type } = req.body;
    const baseDomain = process.env.BASE_DOMAIN || 'wepzo.com';
    const domainPrice = type === 'subdomain' ? 500 : type === 'custom' ? 2000 : 0;

    website.domain = {
      type: type || 'subdomain',
      name: domainName,
      fullDomain: type === 'subdomain' ? `${domainName}.${baseDomain}` : domainName,
      price: domainPrice,
      status: 'pending'
    };
    website.totalAmount = calcTotal(website.components, domainPrice);
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/publish', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    website.status = 'published';
    website.publishedAt = new Date();
    if (website.domain) website.domain.status = 'active';
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Website.findByIdAndDelete(req.params.id);
    res.json({ message: 'Website deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

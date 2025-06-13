const express = require('express');
const Announcement = require('../models/Announcement');
const validator = require('validator');
const router = express.Router();

function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ message: 'Unauthorized' });
}
function isAdmin(req, res, next) {
  if (req.session.role === 'admin') return next();
  res.status(403).json({ message: 'Forbidden' });
}

// Post announcement (admin only)
router.post('/post', isAuthenticated, isAdmin, async (req, res) => {
  const { message } = req.body;
  if (!validator.isLength(message, { min: 2, max: 500 })) return res.status(400).json({ message: 'Invalid message.' });
  const announcement = new Announcement({
    message: validator.escape(message),
    creator: req.session.userId
  });
  await announcement.save();
  res.json({ message: 'Announcement posted.' });
});

// List announcements (public)
router.get('/', async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 }).populate('creator', 'username');
  res.json(announcements);
});

module.exports = router; 
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const validator = require('validator');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!validator.isAlphanumeric(username) || !validator.isLength(password, { min: 4 })) {
    return res.status(400).json({ message: 'Invalid credentials.' });
  }
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'Invalid credentials.' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'Invalid credentials.' });
  req.session.userId = user._id;
  req.session.role = user.role;
  res.json({ role: user.role, mustChangePassword: user.mustChangePassword });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});

// Change password
router.post('/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!validator.isLength(newPassword, { min: 6 })) {
    return res.status(400).json({ message: 'Password too short.' });
  }
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ message: 'Unauthorized.' });
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.status(400).json({ message: 'Old password incorrect.' });
  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password changed.' });
});

// Check current session
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await User.findById(req.session.userId).select('username role');
  res.json({ loggedIn: true, role: user.role, mustChangePassword: req.session.mustChangePassword, username: user.username });
});

module.exports = router; 
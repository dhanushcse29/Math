const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
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

// List all students
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  const students = await User.find({ role: 'student' }).select('-password');
  res.json(students);
});

// Create student account
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!validator.isAlphanumeric(username) || !validator.isLength(password, { min: 4 })) {
    return res.status(400).json({ message: 'Invalid input.' });
  }
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ message: 'Username exists.' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash, role: 'student', mustChangePassword: true });
  await user.save();
  res.json({ message: 'Student created.' });
});

// Reset student password
router.post('/reset-password', isAuthenticated, isAdmin, async (req, res) => {
  const { username, newPassword } = req.body;
  if (!validator.isAlphanumeric(username) || !validator.isLength(newPassword, { min: 4 })) {
    return res.status(400).json({ message: 'Invalid input.' });
  }
  const user = await User.findOne({ username, role: 'student' });
  if (!user) return res.status(404).json({ message: 'Student not found.' });
  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = true;
  await user.save();
  res.json({ message: 'Password reset.' });
});

module.exports = router; 
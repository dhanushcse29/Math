const express = require('express');
const multer = require('multer');
const Material = require('../models/Material');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const validator = require('validator');
const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') cb(null, true);
    else cb(new Error('Only PDF or text files allowed'));
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ message: 'Unauthorized' });
}
function isAdmin(req, res, next) {
  if (req.session.role === 'admin') return next();
  res.status(403).json({ message: 'Forbidden' });
}

// Upload material (admin only)
router.post('/upload', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
  const { title, description } = req.body;
  if (!validator.isLength(title, { min: 2, max: 100 })) return res.status(400).json({ message: 'Invalid title.' });
  const type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'text';
  const material = new Material({
    title: validator.escape(title),
    description: validator.escape(description || ''),
    filePath: req.file.filename,
    uploader: req.session.userId,
    type
  });
  await material.save();
  res.json({ message: 'Material uploaded.' });
});

// List materials (students and admin)
router.get('/', isAuthenticated, async (req, res) => {
  const materials = await Material.find().sort({ createdAt: -1 });
  res.json(materials);
});

// Download material
router.get('/download/:id', isAuthenticated, async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) return res.status(404).json({ message: 'Not found' });
  const file = path.join(__dirname, '../../uploads', material.filePath);
  if (!fs.existsSync(file)) return res.status(404).json({ message: 'File missing' });
  res.download(file, material.title + (material.type === 'pdf' ? '.pdf' : '.txt'));
});

module.exports = router; 
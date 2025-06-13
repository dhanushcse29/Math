# Mathhelp Web Application

A modern, secure web app for maths teachers and students. Built with Node.js, Express, MongoDB, and plain HTML/CSS/JS.

## Features
- Secure login for students and admin (teacher)
- Admin dashboard for uploading study materials, managing students, and posting announcements
- Students can view/download only their materials
- Passwords are hashed, sessions are secure
- Responsive, clean UI with vanilla JS

## Setup

### 1. Clone and Install
```
npm install
```

### 2. Environment Variables
Create `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/mathhelp
SESSION_SECRET=your_secret_key
PORT=5000
```

### 3. Run MongoDB
Make sure MongoDB is running locally.

### 4. Start the Server
```
node backend/server.js
```

### 5. Access the App
Open [http://localhost:5000](http://localhost:5000) in your browser.

## Default Admin
Create an admin user directly in the database with role `admin` to get started.

## Folder Structure
- `backend/` - Node.js/Express API and models
- `frontend/` - Static HTML, CSS, JS
- `uploads/` - Uploaded study materials

## Security
- All sensitive routes are protected
- Passwords are hashed with bcrypt
- Inputs are validated and sanitized

---
MIT License 
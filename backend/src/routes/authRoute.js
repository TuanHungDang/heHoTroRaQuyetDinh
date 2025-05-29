const express = require('express');
const {
    createUserController,
    handleLogin,
    verifyEmailController,
} = require('../controllers/authController');
const routerAPI = express.Router();

// Authentication Routes
// Public endpoints that don't require authentication
routerAPI.post('/register', createUserController);  // Handle user registration
routerAPI.post('/login', handleLogin);             // Handle user login

// Email Verification Routes
routerAPI.get('/verify/:token', verifyEmailController); // Verify user's email with token

module.exports = routerAPI;
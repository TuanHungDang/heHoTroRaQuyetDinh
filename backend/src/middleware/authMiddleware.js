require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/authModel');

const authenticateToken = async (req, res, next) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token not found'
            });
        }

        // Verify token
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Kiểm tra user trong database
            const user = await User.findOne({ email: decoded.email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Lưu thông tin user vào request
            req.user = {
                id: user._id,
                email: user.email,
                name: user.name
            };

            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = { authenticateToken };
const {createUserService, loginService, verifyToken } = require("../services/authService");
const User = require("../models/authModel");
const jwt = require('jsonwebtoken');


const verifyEmailController = async (req, res) => {
    try {
        const { token } = req.params;
        console.log("Token nhận được:", token); // Debug
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Thông tin giải mã:", decoded); // Debug
        
        // Thêm bước kiểm tra decoded._id
        if (!decoded._id) {
            return res.status(400).json({ msg: "Token không hợp lệ: thiếu _id" });
        }
        
        const user = await User.findById(decoded._id);
        
        if (!user) {
            console.log("Không tìm thấy user với _id:", decoded._id);
            return res.status(404).json({ msg: "Không tìm thấy user" });
        }

        console.log("Trạng thái isVerified trước:", user.isVerified); // Debug
        
        user.isVerified = true;
        await user.save();
        
        console.log("Trạng thái isVerified sau:", user.isVerified); // Debug
        
        return res.status(200).redirect('http://localhost:5173/login'); // hoặc domain frontend thật của bạn

    } catch (error) {
        console.error("Lỗi xác thực chi tiết:", error);
        return res.status(400).json({ 
            success: false,
            msg: "Token không hợp lệ hoặc đã hết hạn" 
        });
    }
};

let createUserController = async (req, res) => {
    try {
        const {name, email, password} = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }
        
        const data = await createUserService(name, email, password);
        
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Email already exists or registration failed"
            });
        }
        
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                email: data.email,
                name: data.name
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

let handleLogin = async (req, res) => {
    try {
        const {email, password} = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
        
        const data = await loginService(email, password);
        
        if (!data) {
            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
        
        if (data.EC !== 0) {
            return res.status(401).json({
                success: false,
                message: data.EM || "Authentication failed"
            });
        }
        
        return res.status(200).json({
            success: true,
            access_token: data.access_token,
            user: data.user
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

module.exports = {
    createUserController, handleLogin, verifyEmailController
};
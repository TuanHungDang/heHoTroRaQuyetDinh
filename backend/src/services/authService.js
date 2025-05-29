require('dotenv').config();
const User = require('../models/authModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const saltRounds = 10;

// ✅ Gửi email xác thực
const sendVerificationEmail = async (email, userId) => {
    try {
        const token = jwt.sign({
            _id: userId 
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const verificationLink = `${process.env.CLIENT_URL}/v1/api/verify/${token}`;

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.MAIL_USERNAME,
            to: email,
            subject: 'Xác thực tài khoản',
            html: `
                <p>Chào bạn,</p>
                <p>Vui lòng nhấn vào liên kết bên dưới để xác thực tài khoản của bạn:</p>
                <a href="${verificationLink}" style="padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none;">Xác thực tài khoản</a>
                <p>Liên kết có hiệu lực trong vòng 1 giờ.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Đã gửi email xác thực đến: ${email}`);
    } catch (error) {
        console.log('❌ Gửi email thất bại:', error);
    }
};


const createUserService = async (name, email, password) => {
    try {
        const user = await User.findOne({ email });
        if (user) {
            console.log(`⚠️ Email đã tồn tại: ${email}`);
            return null;
        }

        const hashPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await User.create({
            name,
            email,
            password: hashPassword,
            isVerified: false
        });

        await sendVerificationEmail(email, newUser._id);

        return newUser;
    } catch (error) {
        console.log(error);
        return null;
    }
};


const loginService = async (email, password) => {
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return {
                EC: 1,
                EM: "Email/password bị sai"
            };
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return {
                EC: 2,
                EM: "Email/password bị sai"
            };
        }

        if (!user.isVerified) {
            return {
                EC: 3,
                EM: "Tài khoản chưa xác thực email"
            };
        }

        const payload = {
            email: user.email,
            name: user.name
        };

        const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        return {
            EC: 0,
            access_token,
            user: {
                email: user.email,
                name: user.name
            }
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};


const verifyToken = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
};

module.exports = {
    createUserService,
    loginService,
    verifyToken,
    sendVerificationEmail
};

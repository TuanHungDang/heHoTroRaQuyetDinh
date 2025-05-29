const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isVerified: { 
        type: Boolean, 
        default: false 
    }
});

const User = mongoose.model('user', userSchema);

module.exports = User;
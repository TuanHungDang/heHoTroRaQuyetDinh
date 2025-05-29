const mongoose = require('mongoose');

const laptopDetailSchema = new mongoose.Schema({
    'Hiệu năng': { type: Number, required: true },
    'Màn hình & Độ phân giải': { type: Number, required: true },
    'GPU': { type: Number, required: true },
    'Bàn phím & Touchpad': { type: Number, required: true },
    'Pin & Di động': { type: Number, required: true },
    'Cổng kết nối': { type: Number, required: true },
    'Giá': { type: Number, required: true },
    'Thương hiệu': { type: Number, required: true }
}, { _id: false });

const finalResultSchema = new mongoose.Schema({
    Tên: { 
        type: String, 
        required: true,
        trim: true 
    },
    AHPScore: { 
        type: String, 
        required: true 
    },
    details: laptopDetailSchema
}, { _id: false });

const ahpResultSchema = new mongoose.Schema({
    finalResults: {
        type: [finalResultSchema],
        required: true,
        validate: {
            validator: function(arr) {
                return arr && arr.length > 0;
            },
            message: 'Ít nhất một kết quả laptop là bắt buộc'
        }
    },
    criteriaWeights: {
        type: [String],
        required: true,
        validate: {
            validator: function(arr) {
                return arr && arr.length === 8;
            },
            message: 'Phải có đúng 8 trọng số tiêu chí'
        }
    },
    criteriaLabels: {
        type: [String],
        required: true,
        default: [
            'Hiệu năng',
            'Màn hình & Độ phân giải', 
            'GPU',
            'Bàn phím & Touchpad',
            'Pin & Di động',
            'Cổng kết nối',
            'Giá',
            'Thương hiệu'
        ]
    },
    CR: { 
        type: String, 
        required: true 
    },
    CI: { 
        type: String, 
        required: false 
    },
    lambdaMax: { 
        type: String, 
        required: false 
    },
    consistencyStatus: {
        type: String,
        enum: ['Acceptable', 'Inconsistent'],
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field for best recommendation
ahpResultSchema.virtual('bestRecommendation').get(function() {
    if (this.finalResults && this.finalResults.length > 0) {
        const best = this.finalResults[0];
        return {
            name: best.Tên,
            score: parseFloat(best.AHPScore),
            isConsistent: this.consistencyStatus === 'Acceptable'
        };
    }
    return null;
});

// Virtual field for ranking
ahpResultSchema.virtual('ranking').get(function() {
    return this.finalResults.map((laptop, index) => ({
        rank: index + 1,
        name: laptop.Tên,
        score: parseFloat(laptop.AHPScore)
    }));
});

// Index for better query performance
ahpResultSchema.index({ createdAt: -1 });
ahpResultSchema.index({ consistencyStatus: 1 });

// Pre-save middleware to update updatedAt
ahpResultSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to find consistent results
ahpResultSchema.statics.findConsistent = function() {
    return this.find({ consistencyStatus: 'Acceptable' });
};

// Static method to find recent results
ahpResultSchema.statics.findRecent = function(days = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    return this.find({ createdAt: { $gte: dateLimit } });
};

// Instance method to get criteria weights as numbers
ahpResultSchema.methods.getCriteriaWeightsAsNumbers = function() {
    return this.criteriaWeights.map(w => parseFloat(w));
};

// Instance method to get formatted results
ahpResultSchema.methods.getFormattedResults = function() {
    return this.finalResults.map((laptop, index) => ({
        rank: index + 1,
        name: laptop.Tên,
        score: parseFloat(laptop.AHPScore),
        details: laptop.details
    }));
};

module.exports = mongoose.model('AHPResult', ahpResultSchema);
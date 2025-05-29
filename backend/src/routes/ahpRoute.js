const express = require('express');
const { 
    calculate, 
    getAllResults, 
    getResultById, 
    deleteResult 
} = require('../controllers/ahpController');

const routerAPI = express.Router();

// Middleware to parse JSON
routerAPI.use(express.json({ limit: '10mb' }));

// POST /api/ahp/calculate - Tính toán AHP
routerAPI.post('/calculate', calculate);

// GET /api/ahp/results - Lấy tất cả kết quả (có phân trang)
routerAPI.get('/results', getAllResults);

// GET /api/ahp/results/:id - Lấy kết quả theo ID
routerAPI.get('/results/:id', getResultById);

// DELETE /api/ahp/results/:id - Xóa kết quả theo ID
routerAPI.delete('/results/:id', deleteResult);

// GET /api/ahp/health - Health check endpoint
routerAPI.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AHP API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            calculate: 'POST /api/ahp/calculate',
            getAllResults: 'GET /api/ahp/results',
            getResultById: 'GET /api/ahp/results/:id',
            deleteResult: 'DELETE /api/ahp/results/:id'
        }
    });
});

// Middleware xử lý lỗi 404 cho routes không tồn tại
routerAPI.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint không tồn tại',
        requestedPath: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'POST /api/ahp/calculate',
            'GET /api/ahp/results',
            'GET /api/ahp/results/:id',
            'DELETE /api/ahp/results/:id',
            'GET /api/ahp/health'
        ]
    });
});

module.exports = routerAPI;
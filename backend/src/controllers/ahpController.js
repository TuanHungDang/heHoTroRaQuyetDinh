const { calculateAHP } = require('../services/ahpService');
const AHPResult = require('../models/ahpResult');

const calculate = async (req, res) => {
    try {
        const { laptops, criteriaComparison } = req.body;
        
        // Validate input data
        if (!laptops || !Array.isArray(laptops) || laptops.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Dữ liệu laptop không hợp lệ. Cần ít nhất 1 laptop.',
                expectedFormat: {
                    laptops: [
                        {
                            "Tên": "string",
                            "Hiệu năng": "number",
                            "Màn hình & Độ phân giải": "number",
                            "GPU": "number",
                            "Bàn phím & Touchpad": "number",
                            "Pin & Di động": "number",
                            "Cổng kết nối": "number",
                            "Giá": "number",
                            "Thương hiệu": "number"
                        }
                    ]
                }
            });
        }

        if (!criteriaComparison || !Array.isArray(criteriaComparison)) {
            return res.status(400).json({ 
                success: false,
                error: 'Ma trận so sánh tiêu chí không hợp lệ',
                expectedFormat: {
                    criteriaComparison: "8x8 matrix array (có thể chỉ điền nửa trên)",
                    example: [
                        [1, 2, 3, 4, 5, 6, 7, 8],
                        [0, 1, 2, 3, 4, 5, 6, 7],
                        [0, 0, 1, 2, 3, 4, 5, 6],
                        "... (nửa dưới sẽ được tự động điền)"
                    ]
                }
            });
        }

        // Validate laptop data structure
        const requiredFields = [
            'Tên', 'Hiệu năng', 'Màn hình & Độ phân giải', 'GPU', 
            'Bàn phím & Touchpad', 'Pin & Di động', 'Cổng kết nối', 'Giá', 'Thương hiệu'
        ];

        for (let i = 0; i < laptops.length; i++) {
            const laptop = laptops[i];
            for (const field of requiredFields) {
                if (laptop[field] === undefined || laptop[field] === null) {
                    return res.status(400).json({
                        success: false,
                        error: `Laptop thứ ${i + 1} thiếu trường "${field}"`,
                        missingField: field,
                        laptopIndex: i
                    });
                }
                
                // Validate numeric fields
                if (field !== 'Tên' && (isNaN(laptop[field]) || laptop[field] <= 0)) {
                    return res.status(400).json({
                        success: false,
                        error: `Trường "${field}" của laptop thứ ${i + 1} phải là số dương`,
                        invalidField: field,
                        laptopIndex: i,
                        currentValue: laptop[field]
                    });
                }
            }
        }

        // Validate criteria comparison matrix dimensions
        if (criteriaComparison.length !== 8) {
            return res.status(400).json({
                success: false,
                error: 'Ma trận so sánh phải có 8 hàng (8 tiêu chí)',
                currentRows: criteriaComparison.length,
                expectedRows: 8
            });
        }

        for (let i = 0; i < criteriaComparison.length; i++) {
            if (!Array.isArray(criteriaComparison[i]) || criteriaComparison[i].length !== 8) {
                return res.status(400).json({
                    success: false,
                    error: `Hàng ${i + 1} của ma trận so sánh phải có 8 cột`,
                    rowIndex: i,
                    currentColumns: criteriaComparison[i]?.length || 0,
                    expectedColumns: 8
                });
            }
        }

        // Validate upper triangular values (chỉ kiểm tra nửa trên)
        for (let i = 0; i < criteriaComparison.length; i++) {
            for (let j = i; j < criteriaComparison[i].length; j++) {
                const value = criteriaComparison[i][j];
                
                if (i === j) {
                    // Đường chéo chính có thể là 1 hoặc để trống (sẽ được tự động điền = 1)
                    if (value !== undefined && value !== null && value !== 1) {
                        console.warn(`Cảnh báo: Đường chéo chính tại [${i}][${j}] nên bằng 1, hiện tại là ${value}`);
                    }
                } else {
                    // Nửa trên phải có giá trị hợp lệ (> 0)
                    if (value !== undefined && value !== null && value !== 0) {
                        if (isNaN(value) || value <= 0) {
                            return res.status(400).json({
                                success: false,
                                error: `Giá trị so sánh tại [${i + 1}][${j + 1}] phải là số dương`,
                                position: `[${i + 1}][${j + 1}]`,
                                currentValue: value
                            });
                        }
                    }
                }
            }
        }

        // Perform AHP calculation
        const result = calculateAHP(laptops, criteriaComparison);

        // Save result to database
        const ahpResult = new AHPResult({
            finalResults: result.finalResults.map(r => ({ 
                Tên: r.Tên, 
                AHPScore: r.AHPScore.toString(),
                details: {
                    'Hiệu năng': r['Hiệu năng'],
                    'Màn hình & Độ phân giải': r['Màn hình & Độ phân giải'],
                    'GPU': r['GPU'],
                    'Bàn phím & Touchpad': r['Bàn phím & Touchpad'],
                    'Pin & Di động': r['Pin & Di động'],
                    'Cổng kết nối': r['Cổng kết nối'],
                    'Giá': r['Giá'],
                    'Thương hiệu': r['Thương hiệu']
                }
            })),
            criteriaWeights: result.criteriaWeights.map(w => w.toString()),
            criteriaLabels: result.criteriaLabels,
            CR: result.CR.toString(),
            CI: result.CI.toString(),
            lambdaMax: result.lambdaMax.toString(),
            consistencyStatus: result.consistencyStatus
        });

        await ahpResult.save();

        res.status(200).json({ 
            success: true,
            message: 'Tính toán AHP hoàn thành và đã lưu thành công.',
            data: {
                ...result,
                recommendation: {
                    bestChoice: result.finalResults[0]?.Tên,
                    bestScore: result.finalResults[0]?.AHPScore,
                    ranking: result.finalResults.map((laptop, index) => ({
                        rank: index + 1,
                        name: laptop.Tên,
                        score: laptop.AHPScore
                    }))
                }
            },
            savedId: ahpResult._id,
            note: "Ma trận so sánh đã được tự động hoàn thiện từ nửa trên"
        });

    } catch (error) {
        console.error('Error in AHP calculation:', error);
        res.status(500).json({ 
            success: false,
            error: 'Lỗi server khi tính toán AHP',
            details: error.message
        });
    }
};

const getAllResults = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalResults = await AHPResult.countDocuments();
        const results = await AHPResult.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: results,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalResults / limit),
                totalResults,
                hasNextPage: page < Math.ceil(totalResults / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error getting AHP results:', error);
        res.status(500).json({ 
            success: false,
            error: 'Lỗi server khi lấy kết quả AHP',
            details: error.message
        });
    }
};

const getResultById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AHPResult.findById(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy kết quả AHP với ID này'
            });
        }

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting AHP result by ID:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server khi lấy kết quả AHP',
            details: error.message
        });
    }
};

const deleteResult = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AHPResult.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy kết quả AHP với ID này'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Đã xóa kết quả AHP thành công',
            deletedId: id
        });
    } catch (error) {
        console.error('Error deleting AHP result:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server khi xóa kết quả AHP',
            details: error.message
        });
    }
};

module.exports = { 
    calculate, 
    getAllResults, 
    getResultById, 
    deleteResult 
};
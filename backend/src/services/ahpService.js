function calculateWeights(matrix) {
    const n = matrix.length;
    const colSums = Array(n).fill(0);

    // Tính tổng các cột
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            colSums[j] += matrix[i][j];
        }
    }

    // Chuẩn hóa ma trận
    const normalizedMatrix = matrix.map(row => 
        row.map((val, j) => val / colSums[j])
    );
    
    // Tính trọng số (trung bình cộng các hàng)
    const weights = normalizedMatrix.map(row => 
        row.reduce((a, b) => a + b, 0) / n
    );

    // Tính lambda max
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
        let rowSum = 0;
        for (let j = 0; j < n; j++) {
            rowSum += matrix[i][j] * weights[j];
        }
        lambdaMax += rowSum / weights[i];
    }
    lambdaMax /= n;

    // Tính chỉ số nhất quán (CI) và tỷ lệ nhất quán (CR)
    const CI = (lambdaMax - n) / (n - 1);
    const RI_TABLE = { 
        1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 
        6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45 
    };
    const RI = RI_TABLE[n] || 1.45;
    const CR = RI === 0 ? 0 : CI / RI; // Tránh chia cho 0

    return { weights, CR, CI, lambdaMax };
}

/**
 * Hoàn thiện ma trận so sánh từ nửa trên (upper triangular)
 * @param {Array} upperTriangular - Ma trận nửa trên hoặc ma trận đầy đủ
 * @returns {Array} Ma trận đầy đủ với đường chéo = 1 và nửa dưới = 1/nửa_trên
 */
function completeComparisonMatrix(upperTriangular) {
    const n = upperTriangular.length;
    const completeMatrix = Array.from({ length: n }, () => Array(n).fill(1));

    // Điền đường chéo chính = 1
    for (let i = 0; i < n; i++) {
        completeMatrix[i][i] = 1;
    }

    // Điền nửa trên và tính nửa dưới
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const value = upperTriangular[i][j];
            
            // Kiểm tra giá trị hợp lệ
            if (value === undefined || value === null || isNaN(value) || value <= 0) {
                throw new Error(`Giá trị so sánh tại vị trí [${i}][${j}] không hợp lệ: ${value}`);
            }
            
            completeMatrix[i][j] = value;
            completeMatrix[j][i] = 1 / value;
        }
    }

    return completeMatrix;
}

/**
 * Kiểm tra và chuẩn hóa ma trận so sánh đầu vào
 * @param {Array} inputMatrix - Ma trận đầu vào (có thể là nửa trên hoặc đầy đủ)
 * @returns {Array} Ma trận đầy đủ đã được chuẩn hóa
 */
function validateAndNormalizeMatrix(inputMatrix) {
    if (!Array.isArray(inputMatrix) || inputMatrix.length === 0) {
        throw new Error('Ma trận so sánh không hợp lệ');
    }

    const n = inputMatrix.length;
    
    // Kiểm tra ma trận vuông
    for (let i = 0; i < n; i++) {
        if (!Array.isArray(inputMatrix[i]) || inputMatrix[i].length !== n) {
            throw new Error(`Hàng ${i} của ma trận không hợp lệ - ma trận phải là ma trận vuông ${n}x${n}`);
        }
    }

    // Kiểm tra xem đây có phải ma trận đầy đủ hay chỉ nửa trên
    let isUpperTriangularOnly = true;
    let hasLowerTriangularValues = false;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            const lowerValue = inputMatrix[i][j];
            const upperValue = inputMatrix[j][i];
            
            // Nếu có giá trị ở nửa dưới khác 0, 1, null, undefined
            if (lowerValue !== undefined && lowerValue !== null && 
                lowerValue !== 0 && lowerValue !== 1) {
                hasLowerTriangularValues = true;
                
                // Kiểm tra tính nhất quán nếu cả hai nửa đều có giá trị
                if (upperValue !== undefined && upperValue !== null && upperValue !== 0) {
                    const expectedLowerValue = 1 / upperValue;
                    const tolerance = 0.001;
                    
                    if (Math.abs(lowerValue - expectedLowerValue) > tolerance) {
                        console.warn(`Cảnh báo: Giá trị tại [${i}][${j}] = ${lowerValue} không nhất quán với [${j}][${i}] = ${upperValue}`);
                    }
                }
            }
        }
    }

    // Nếu không có giá trị ở nửa dưới, coi như chỉ nhập nửa trên
    if (!hasLowerTriangularValues) {
        console.log('Phát hiện ma trận nửa trên - tự động điền nửa dưới');
        return completeComparisonMatrix(inputMatrix);
    }

    // Nếu đã có đầy đủ, kiểm tra và chuẩn hóa lại
    console.log('Phát hiện ma trận đầy đủ - kiểm tra tính nhất quán');
    return completeComparisonMatrix(inputMatrix);
}

function calculateAHP(laptops, criteriaComparison) {
    const criteria = [
        'Hiệu năng', 
        'Màn hình & Độ phân giải', 
        'GPU', 
        'Bàn phím & Touchpad', 
        'Pin & Di động', 
        'Cổng kết nối', 
        'Giá', 
        'Thương hiệu'
    ];

    // Validate input
    if (!laptops || !Array.isArray(laptops) || laptops.length === 0) {
        throw new Error('Dữ liệu laptop không hợp lệ');
    }

    if (!criteriaComparison || !Array.isArray(criteriaComparison)) {
        throw new Error('Ma trận so sánh tiêu chí không hợp lệ');
    }

    if (criteriaComparison.length !== criteria.length) {
        throw new Error(`Ma trận so sánh phải có ${criteria.length}x${criteria.length} phần tử`);
    }

    // Chuẩn hóa ma trận so sánh tiêu chí (tự động điền nửa dưới nếu cần)
    const normalizedCriteriaMatrix = validateAndNormalizeMatrix(criteriaComparison);

    // Tính trọng số các tiêu chí
    const { weights: criteriaWeights, CR, CI, lambdaMax } = calculateWeights(normalizedCriteriaMatrix);

    console.log(`CR: ${CR.toFixed(4)}`);
    if (CR > 0.1) {
        console.log("⚠️ Cảnh báo: Tỷ lệ nhất quán cao (>0.1), hãy xem xét lại các so sánh!");
    }

    // Tính trọng số cho từng tiêu chí của các laptop
    const altWeights = {};
    
    criteria.forEach(criterion => {
        const n = laptops.length;
        const matrix = Array.from({ length: n }, () => Array(n).fill(1));
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let value;
                
                // Kiểm tra xem laptop có thuộc tính này không
                if (laptops[i][criterion] === undefined || laptops[j][criterion] === undefined) {
                    console.warn(`Thiếu dữ liệu cho tiêu chí ${criterion}`);
                    value = 1; // Mặc định bằng nhau nếu thiếu dữ liệu
                } else {
                    value = laptops[i][criterion] / laptops[j][criterion];
                    
                    // Đối với giá, giá thấp hơn thì tốt hơn
                    if (criterion === 'Giá') {
                        value = 1 / value;
                    }
                }
                
                matrix[i][j] = value;
                matrix[j][i] = 1 / value;
            }
        }
        
        altWeights[criterion] = calculateWeights(matrix).weights;
    });

    // Tính điểm AHP cuối cùng
    const finalResults = laptops.map((laptop, index) => {
        let score = 0;
        criteria.forEach((criterion, i) => {
            score += altWeights[criterion][index] * criteriaWeights[i];
        });
        
        return { 
            ...laptop, 
            AHPScore: parseFloat(score.toFixed(4))
        };
    });

    // Sắp xếp theo điểm AHP từ cao đến thấp
    finalResults.sort((a, b) => b.AHPScore - a.AHPScore);

    return {
        criteriaWeights: criteriaWeights.map(w => parseFloat(w.toFixed(4))),
        criteriaLabels: criteria,
        finalResults,
        CR: parseFloat(CR.toFixed(4)),
        CI: parseFloat(CI.toFixed(4)),
        lambdaMax: parseFloat(lambdaMax.toFixed(4)),
        consistencyStatus: CR <= 0.1 ? 'Acceptable' : 'Inconsistent',
        normalizedCriteriaMatrix: normalizedCriteriaMatrix // Trả về ma trận đã chuẩn hóa để debug
    };
}

module.exports = { calculateAHP, calculateWeights, completeComparisonMatrix, validateAndNormalizeMatrix };
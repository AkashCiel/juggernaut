const { body, validationResult } = require('express-validator');

// Validation rules for report generation
const validateReportRequest = [
    body('topics')
        .optional()
        .isArray({ min: 1, max: 20 })
        .withMessage('Topics must be an array with 1-20 items'),
    body('topics.*')
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each topic must be a string between 1-100 characters')
        .matches(/^[a-zA-Z0-9\s\-_.,]+$/)
        .withMessage('Topics can only contain letters, numbers, spaces, hyphens, underscores, dots, and commas'),
    body('recipients')
        .optional()
        .isArray({ max: 50 })
        .withMessage('Recipients must be an array with max 50 items'),
    body('recipients.*')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Each recipient must be a valid email address'),
    body('maxPapers')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('maxPapers must be an integer between 1-100')
];

// Validation rules for test endpoints
const validateArxivTest = [
    body('topics')
        .optional()
        .isArray({ min: 1, max: 5 })
        .withMessage('Topics must be an array with 1-5 items'),
    body('topics.*')
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each topic must be a string between 1-100 characters'),
    body('maxPapers')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('maxPapers must be an integer between 1-20')
];

const validateSummaryTest = [
    body('papers')
        .isArray({ min: 1, max: 50 })
        .withMessage('Papers must be an array with 1-50 items'),
    body('papers.*.title')
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Paper title must be a string between 1-500 characters'),
    body('papers.*.authors')
        .optional()
        .isArray()
        .withMessage('Authors must be an array'),
    body('papers.*.summary')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Paper summary must be a string with max 5000 characters'),
    body('apiKey')
        .isString()
        .trim()
        .isLength({ min: 1 })
        .withMessage('API key is required')
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

module.exports = {
    validateReportRequest,
    validateArxivTest,
    validateSummaryTest,
    handleValidationErrors
}; 
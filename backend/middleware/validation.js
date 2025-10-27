const { body, validationResult } = require('express-validator');


// Validation rules for user registration
const validateUserRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be a valid email address')
        .isLength({ max: 254 })
        .withMessage('Email must be less than 254 characters'),
    body('topics')
        .optional()
        .isArray({ min: 1, max: 15 })
        .withMessage('Topics must be an array with 1-15 items'),
    body('topics.*')
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each topic must be a string between 1-100 characters')
        .matches(/^[a-zA-Z0-9\s\-_.,]+$/)
        .withMessage('Topics can only contain letters, numbers, spaces, hyphens, underscores, dots, and commas')
        .custom((value, { req }) => {
            // Check for duplicate topics (case-insensitive)
            const topics = req.body.topics || [];
            const lowerTopics = topics.map(t => t.toLowerCase());
            const lowerValue = value.toLowerCase();
            const count = lowerTopics.filter(t => t === lowerValue).length;
            if (count > 1) {
                throw new Error(`Duplicate topic: ${value}`);
            }
            return true;
        })
];


// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
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
    validateUserRegistration,
    handleValidationErrors
}; 
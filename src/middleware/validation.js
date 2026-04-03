// Validation middleware for request bodies
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const data = req.body;

    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (!data[field] || data[field] === '') {
          errors.push(`${field} is required`);
        }
      });
    }

    // Check field types and constraints
    if (schema.fields) {
      Object.keys(schema.fields).forEach(field => {
        const fieldSchema = schema.fields[field];
        const value = data[field];

        if (value !== undefined) {
          // Type validation
          if (fieldSchema.type && typeof value !== fieldSchema.type) {
            errors.push(`${field} must be of type ${fieldSchema.type}`);
          }

          // Length validation
          if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors.push(`${field} must be at least ${fieldSchema.minLength} characters`);
          }

          if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors.push(`${field} must not exceed ${fieldSchema.maxLength} characters`);
          }

          // Pattern validation
          if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
          }

          // Enum validation
          if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            errors.push(`${field} must be one of: ${fieldSchema.enum.join(', ')}`);
          }

          // Number validation
          if (fieldSchema.type === 'number') {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
              errors.push(`${field} must be at least ${fieldSchema.min}`);
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
              errors.push(`${field} must not exceed ${fieldSchema.max}`);
            }
            if (fieldSchema.positive && value <= 0) {
              errors.push(`${field} must be positive`);
            }
          }
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  register: {
    required: ['name', 'email', 'password'],
    fields: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 50
      },
      email: {
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        type: 'string',
        minLength: 6,
        maxLength: 100
      },
      role: {
        type: 'string',
        enum: ['user', 'admin'],
        optional: true
      }
    }
  },
  login: {
    required: ['email', 'password'],
    fields: {
      email: {
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        type: 'string'
      }
    }
  },
  createFinancialRecord: {
    required: ['amount', 'type', 'category', 'date', 'userId'],
    fields: {
      amount: {
        type: 'number',
        positive: true
      },
      type: {
        type: 'string',
        enum: ['income', 'expense']
      },
      category: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      date: {
        type: 'string',
        pattern: /^\d{4}-\d{2}-\d{2}$/
      },
      notes: {
        type: 'string',
        maxLength: 500,
        optional: true
      },
      userId: {
        type: 'number',
        min: 1
      }
    }
  },
  updateFinancialRecord: {
    fields: {
      amount: {
        type: 'number',
        positive: true
      },
      type: {
        type: 'string',
        enum: ['income', 'expense']
      },
      category: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      date: {
        type: 'string',
        pattern: /^\d{4}-\d{2}-\d{2}$/
      },
      notes: {
        type: 'string',
        maxLength: 500
      },
      userId: {
        type: 'number',
        min: 1
      }
    }
  }
};

// Query parameter validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const query = req.query;

    if (schema.fields) {
      Object.keys(schema.fields).forEach(field => {
        const fieldSchema = schema.fields[field];
        const value = query[field];

        if (value !== undefined) {
          // Type validation for numbers
          if (fieldSchema.type === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              errors.push(`${field} must be a valid number`);
            } else {
              req.query[field] = numValue; // Convert to number
              
              if (fieldSchema.min !== undefined && numValue < fieldSchema.min) {
                errors.push(`${field} must be at least ${fieldSchema.min}`);
              }
              if (fieldSchema.max !== undefined && numValue > fieldSchema.max) {
                errors.push(`${field} must not exceed ${fieldSchema.max}`);
              }
              if (fieldSchema.positive && numValue <= 0) {
                errors.push(`${field} must be positive`);
              }
            }
          }

          // Date validation
          if (fieldSchema.type === 'date') {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              errors.push(`${field} must be a valid date`);
            }
          }

          // Enum validation
          if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            errors.push(`${field} must be one of: ${fieldSchema.enum.join(', ')}`);
          }
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }

    next();
  };
};

const querySchemas = {
  financialRecords: {
    fields: {
      userId: { type: 'number', min: 1 },
      type: { enum: ['income', 'expense'] },
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 }
    }
  }
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas,
  querySchemas
};

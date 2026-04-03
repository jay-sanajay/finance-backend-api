const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger configuration options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Backend API',
      version: '1.0.0',
      description: 'A comprehensive financial management API with authentication, role-based access control, and analytics',
      contact: {
        name: 'API Support',
        email: 'support@finance-backend.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['viewer', 'analyst', 'admin'],
              description: 'User role for access control',
              example: 'analyst'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Account status',
              example: 'active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Record ID'
            },
            amount: {
              type: 'number',
              minimum: 0.01,
              description: 'Transaction amount',
              example: 1500.00
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Transaction type',
              example: 'income'
            },
            category: {
              type: 'string',
              description: 'Transaction category',
              example: 'Salary'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Transaction date (YYYY-MM-DD)',
              example: '2024-01-15'
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Additional notes about the transaction',
              example: 'Monthly salary payment'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID'
            },
            user: {
              $ref: '#/components/schemas/User',
              description: 'User information (populated)'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of error messages (if any)'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Email is required', 'Password must be at least 6 characters']
            },
            code: {
              type: 'string',
              description: 'Application error code',
              example: 'VALIDATION_FAILED'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        AuthRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password',
              example: 'password123'
            }
          }
        },
        RegisterRequest: {
          allOf: [
            { $ref: '#/components/schemas/AuthRequest' },
            {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  minLength: 2,
                  maxLength: 50,
                  description: 'User full name',
                  example: 'John Doe'
                },
                role: {
                  type: 'string',
                  enum: ['viewer', 'analyst', 'admin'],
                  description: 'User role (defaults to viewer)',
                  example: 'analyst'
                }
              }
            }
          ]
        },
        CreateRecordRequest: {
          type: 'object',
          required: ['amount', 'type', 'category', 'date', 'userId'],
          properties: {
            amount: {
              type: 'number',
              minimum: 0.01,
              description: 'Transaction amount',
              example: 1500.00
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Transaction type',
              example: 'income'
            },
            category: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Transaction category',
              example: 'Salary'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Transaction date (YYYY-MM-DD)',
              example: '2024-01-15'
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Additional notes about the transaction',
              example: 'Monthly salary payment'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID',
              example: '507f1f77bcf86cd799439011'
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              description: 'Current page number'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            totalRecords: {
              type: 'integer',
              description: 'Total number of records'
            },
            limit: {
              type: 'integer',
              description: 'Records per page'
            },
            hasNextPage: {
              type: 'boolean',
              description: 'Whether there is a next page'
            },
            hasPrevPage: {
              type: 'boolean',
              description: 'Whether there is a previous page'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './index.js'
  ]
};

// Generate swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Custom swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3498db }
  `,
  customSiteTitle: 'Finance Backend API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = { swaggerSpec, swaggerUi, swaggerUiOptions };

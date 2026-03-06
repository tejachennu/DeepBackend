const swaggerJsdoc = require('swagger-jsdoc');

const getSwaggerSpec = () => {
    const port = process.env.PORT || 3001;

    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Auth & Organization Management API',
                version: '1.0.0',
                description: `
A comprehensive authentication and organization management API featuring:
- Email/password signup with OTP verification
- Google OAuth 2.0 login
- Role-based access control (RBAC)
- Organization management

## Authentication
Most endpoints require a JWT Bearer token. Obtain a token by:
1. Signing up via \`POST /api/auth/signup\`
2. Verifying your email via \`POST /api/auth/verify-otp\`
3. Logging in via \`POST /api/auth/login\` or Google OAuth

Include the token in requests:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Roles
- **Super Admin**: Full system access
- **Admin**: Manage users, roles, organizations
- **Organization Admin**: Manage their own organization
- **Staff, Volunteer, Sponsor**: Limited access
            `,
                contact: {
                    name: 'API Support'
                }
            },
            servers: [
                {
                    url: `http://localhost:${port}`,
                    description: 'Development server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter JWT token obtained from login'
                    }
                },
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            userId: { type: 'integer', example: 1 },
                            fullName: { type: 'string', example: 'John Doe' },
                            email: { type: 'string', format: 'email', example: 'john@example.com' },
                            username: { type: 'string', example: 'johndoe' },
                            mobileNumber: { type: 'string', example: '9876543210' },
                            status: { type: 'string', enum: ['Active', 'Inactive', 'Blocked'] },
                            isEmailVerified: { type: 'boolean' },
                            roleName: { type: 'string', example: 'Staff' },
                            roleCode: { type: 'string', example: 'STAFF' },
                            organizationName: { type: 'string', example: 'NGO Foundation' },
                            lastLogin: { type: 'string', format: 'date-time' },
                            createdDate: { type: 'string', format: 'date-time' }
                        }
                    },
                    Role: {
                        type: 'object',
                        properties: {
                            roleId: { type: 'integer', example: 1 },
                            roleName: { type: 'string', example: 'Admin' },
                            roleCode: { type: 'string', example: 'ADMIN' },
                            description: { type: 'string', example: 'Administrative access' },
                            isActive: { type: 'boolean', example: true },
                            createdDate: { type: 'string', format: 'date-time' }
                        }
                    },
                    Organization: {
                        type: 'object',
                        properties: {
                            organizationId: { type: 'integer', example: 1 },
                            organizationName: { type: 'string', example: 'Hope Foundation' },
                            organizationType: { type: 'string', enum: ['Orphanage', 'School', 'NGO', 'Shelter Home'] },
                            registrationNumber: { type: 'string', example: 'NGO-2024-001' },
                            contactPersonName: { type: 'string', example: 'Jane Smith' },
                            contactMobile: { type: 'string', example: '9876543210' },
                            contactEmail: { type: 'string', format: 'email' },
                            address: { type: 'string' },
                            city: { type: 'string', example: 'Mumbai' },
                            state: { type: 'string', example: 'Maharashtra' },
                            pincode: { type: 'string', example: '400001' },
                            totalBeneficiaries: { type: 'integer', example: 150 },
                            isActive: { type: 'boolean' },
                            createdDate: { type: 'string', format: 'date-time' }
                        }
                    },
                    SignupRequest: {
                        type: 'object',
                        required: ['email', 'password', 'fullName'],
                        properties: {
                            email: { type: 'string', format: 'email', example: 'user@example.com' },
                            password: { type: 'string', minLength: 8, example: 'Password@123' },
                            fullName: { type: 'string', example: 'John Doe' },
                            username: { type: 'string', example: 'johndoe' },
                            mobileNumber: { type: 'string', example: '9876543210' }
                        }
                    },
                    LoginRequest: {
                        type: 'object',
                        required: ['email', 'password'],
                        properties: {
                            email: { type: 'string', format: 'email', example: 'user@example.com' },
                            password: { type: 'string', example: 'Password@123' }
                        }
                    },
                    OTPVerifyRequest: {
                        type: 'object',
                        required: ['email', 'otp'],
                        properties: {
                            email: { type: 'string', format: 'email', example: 'user@example.com' },
                            otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' }
                        }
                    },
                    SuccessResponse: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            message: { type: 'string' },
                            data: { type: 'object' }
                        }
                    },
                    ErrorResponse: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            message: { type: 'string' },
                            errors: { type: 'array', items: { type: 'object' } }
                        }
                    }
                }
            },
            tags: [
                { name: 'Authentication', description: 'User authentication endpoints' },
                { name: 'Users', description: 'User management (Admin only)' },
                { name: 'Roles', description: 'Role management (Admin/Super Admin)' },
                { name: 'Organizations', description: 'Organization management' }
            ]
        },
        apis: ['./src/routes/*.js']
    };

    return swaggerJsdoc(options);
};

module.exports = getSwaggerSpec;


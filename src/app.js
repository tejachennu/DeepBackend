const express = require('express');
console.log('--- [App] STARTING WITH NEW DONATION LOGS ---');
const cors = require('cors');
const passport = require('./config/passport');
const swaggerUi = require('swagger-ui-express');
const getSwaggerSpec = require('./config/swagger');

// Import middleware
const apiLogger = require('./middleware/apiLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const orgRoutes = require('./routes/orgRoutes');
const projectRoutes = require('./routes/projectRoutes');
const projectSpendRoutes = require('./routes/projectSpendRoutes');
const projectPermissionRoutes = require('./routes/projectPermissionRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const donationRoutes = require('./routes/donationRoutes');
const campRoutes = require('./routes/campRoutes');
const beneficiaryDonationRoutes = require('./routes/beneficiaryDonationRoutes');
const projectSponsorRoutes = require('./routes/projectSponsorRoutes');
const apiLogRoutes = require('./routes/apiLogRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const feedRoutes = require('./routes/feedRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const campRegistrationRoutes = require('./routes/campRegistrationRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const sponsorshipRoutes = require('./routes/sponsorshipRoutes');

const app = express();

// Middleware
// CORS configuration - allows mobile apps and multiple origins
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Logger - logs all API requests
app.use(apiLogger({ logResponseBody: true }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Initialize Passport
app.use(passport.initialize());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(getSwaggerSpec(), {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Auth & Org Management API'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(getSwaggerSpec());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-spends', projectSpendRoutes);
app.use('/api/project-permissions', projectPermissionRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/beneficiary-donations', beneficiaryDonationRoutes);
app.use('/api/project-sponsors', projectSponsorRoutes);
app.use('/api/logs', apiLogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/camp-registrations', campRegistrationRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.details
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized access'
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

module.exports = app;

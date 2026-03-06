const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const razorpayService = require('../services/razorpayService');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// ==================== Razorpay Integration ====================

// Create Razorpay order (for online donations)
exports.createRazorpayOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { campaignId, amount, donorName, phoneNumber, emailId, purpose, panNumber } = req.body;

        // Verify campaign exists and is active
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.CampaignStatus !== 'Active') {
            return res.status(400).json({ success: false, message: 'Campaign is not accepting donations' });
        }

        if (!campaign.RazorpayEnabled) {
            return res.status(400).json({ success: false, message: 'Online payments not enabled for this campaign' });
        }

        // Create Razorpay order
        const orderResult = await razorpayService.createOrder(
            amount,
            'INR',
            `DON-${Date.now()}`,
            {
                campaignId: campaignId.toString(),
                donorName,
                purpose: purpose || campaign.CampaignName
            }
        );

        if (!orderResult.success) {
            return res.status(500).json({ success: false, message: 'Failed to create payment order' });
        }

        // Create pending donation record
        const donationId = await Donation.create({
            campaignId,
            projectId: campaign.ProjectId,
            donorName,
            phoneNumber,
            emailId,
            panNumber,
            donationType: 'RAZORPAY',
            amount,
            paymentMode: 'Online',
            razorpayOrderId: orderResult.orderId,
            purpose: purpose || campaign.CampaignName,
            is80GApplicable: !!panNumber,
            status: 'Pending'
        });

        res.json({
            success: true,
            data: {
                orderId: orderResult.orderId,
                donationId,
                amount: orderResult.amount,
                currency: orderResult.currency,
                keyId: razorpayService.getKeyId(),
                prefill: {
                    name: donorName,
                    email: emailId,
                    contact: phoneNumber
                },
                notes: {
                    campaignName: campaign.CampaignName
                }
            }
        });
    } catch (error) {
        console.error('Create Razorpay order error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
};

// Verify Razorpay payment
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Find donation by order ID
        const donation = await Donation.findByRazorpayOrderId(razorpay_order_id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Verify signature
        const isValid = razorpayService.verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            await Donation.markFailed(donation.DonationId, 'Payment signature verification failed');
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        // Complete the donation
        await Donation.completeRazorpayPayment(donation.DonationId, {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        });

        // Update campaign collected amount
        await Campaign.updateCollectedAmount(donation.CampaignId, donation.Amount);

        const completedDonation = await Donation.findById(donation.DonationId);

        // Send thank you email if email provided
        if (completedDonation.EmailId) {
            // Fetch campaign name if not in donation object
            if (!completedDonation.CampaignName) {
                Campaign.findById(completedDonation.CampaignId).then(campaign => {
                    completedDonation.CampaignName = campaign?.CampaignName;
                    emailService.sendDonationThankYou(completedDonation.EmailId, completedDonation).catch(err => {
                        console.error('Failed to send thank you email:', err);
                    });
                }).catch(err => console.error('Failed to fetch campaign for email:', err));
            } else {
                emailService.sendDonationThankYou(completedDonation.EmailId, completedDonation).catch(err => {
                    console.error('Failed to send thank you email:', err);
                });
            }
        }

        res.json({
            success: true,
            message: 'Payment successful! Thank you for your donation.',
            data: {
                donation: {
                    donationId: completedDonation.DonationId,
                    amount: completedDonation.Amount,
                    receiptNumber: completedDonation.ReceiptNumber,
                    donorName: completedDonation.DonorName,
                    razorpayPaymentId: completedDonation.RazorpayPaymentId
                }
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

// ==================== Offline Donations (Admin) ====================

// Add offline donation (admin only)
exports.createOfflineDonation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Validate donation type for offline
        const validOfflineTypes = ['CASH', 'BANK', 'UPI', 'CHEQUE', 'IN_KIND'];
        if (!validOfflineTypes.includes(req.body.donationType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid donation type. Must be one of: ' + validOfflineTypes.join(', ')
            });
        }

        const donationId = await Donation.create({
            ...req.body,
            projectId: campaign.ProjectId,
            paymentMode: 'Offline',
            status: 'Completed', // Offline donations are immediately marked as completed
            createdBy: req.user.userId
        });

        // Update campaign collected amount
        await Campaign.updateCollectedAmount(req.body.campaignId, req.body.amount);

        const donation = await Donation.findById(donationId);

        res.status(201).json({
            success: true,
            message: 'Offline donation recorded successfully',
            data: { donation }
        });
    } catch (error) {
        console.error('Create offline donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to record donation' });
    }
};

// ==================== General Donation Operations ====================

// Get all donations
exports.getAllDonations = async (req, res) => {
    try {
        const filters = {
            campaignId: req.query.campaignId,
            projectId: req.query.projectId,
            donationType: req.query.donationType,
            status: req.query.status,
            donorType: req.query.donorType,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            search: req.query.search,
            isOffline: req.query.isOffline === 'true',
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const donations = await Donation.findAll(filters);

        res.json({
            success: true,
            data: {
                donations,
                count: donations.length
            }
        });
    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
};

// Get donations by campaign
exports.getDonationsByCampaign = async (req, res) => {
    try {
        const donations = await Donation.findByCampaignId(req.params.campaignId, {
            status: req.query.status,
            donationType: req.query.donationType,
            limit: req.query.limit,
            offset: req.query.offset
        });

        const summary = await Donation.getSummaryByCampaign(req.params.campaignId);

        res.json({
            success: true,
            data: {
                donations,
                summary,
                count: donations.length
            }
        });
    } catch (error) {
        console.error('Get campaign donations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
};

// Get donation by ID
exports.getDonationById = async (req, res) => {
    console.log('[DonationController] Fetching public donation with ID:', req.params.id);
    try {
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        res.json({
            success: true,
            data: { donation }
        });
    } catch (error) {
        console.error('Get donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donation' });
    }
};

// Update donation (admin only)
exports.updateDonation = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const updated = await Donation.update(req.params.id, req.body, req.user.userId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedDonation = await Donation.findById(req.params.id);

        res.json({
            success: true,
            message: 'Donation updated successfully',
            data: { donation: updatedDonation }
        });
    } catch (error) {
        console.error('Update donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to update donation' });
    }
};

// Delete donation (admin only)
exports.deleteDonation = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // If completed, reduce campaign amount
        if (donation.Status === 'Completed') {
            await Campaign.updateCollectedAmount(donation.CampaignId, -donation.Amount);
        }

        await Donation.delete(req.params.id, req.user.userId);

        res.json({
            success: true,
            message: 'Donation deleted successfully'
        });
    } catch (error) {
        console.error('Delete donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete donation' });
    }
};

// Get recent donations for a campaign (public)
exports.getRecentDonations = async (req, res) => {
    try {
        const donations = await Donation.getRecent(req.params.campaignId, parseInt(req.query.limit) || 10);

        // Return only public info
        const publicDonations = donations.map(d => {
            const name = d.DonorName || 'Anonymous';
            return {
                donorName: name.length > 3
                    ? name.substring(0, 3) + '***'
                    : name + '***',
                amount: d.Amount,
                donationType: d.DonationType,
                donationDate: d.DonationDate
            };
        });

        res.json({
            success: true,
            data: { donations: publicDonations }
        });
    } catch (error) {
        console.error('Get recent donations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
};

// Get top donations for a campaign (public)
exports.getTopDonations = async (req, res) => {
    try {
        const donations = await Donation.getTop(req.params.campaignId, parseInt(req.query.limit) || 5);

        // Return only public info
        const publicDonations = donations.map(d => {
            const name = d.DonorName || 'Anonymous';
            return {
                donorName: name.length > 3
                    ? name.substring(0, 3) + '***'
                    : name + '***',
                amount: d.Amount,
                donationType: d.DonationType,
                donationDate: d.DonationDate
            };
        });

        res.json({
            success: true,
            data: { donations: publicDonations }
        });
    } catch (error) {
        console.error('Get top donations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
};

// Get donation summary
exports.getDonationSummary = async (req, res) => {
    try {
        const summary = await Donation.getSummaryByCampaign(req.params.campaignId);

        res.json({
            success: true,
            data: { summary }
        });
    } catch (error) {
        console.error('Get donation summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
};

/**
 * Razorpay Service
 * Handles all Razorpay payment gateway operations
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        // Initialize Razorpay instance
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }

    /**
     * Create a Razorpay order
     * @param {number} amount - Amount in smallest currency unit (paise for INR)
     * @param {string} currency - Currency code (default: INR)
     * @param {string} receipt - Receipt/reference number
     * @param {object} notes - Additional notes
     */
    async createOrder(amount, currency = 'INR', receipt, notes = {}) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Convert to paise
                currency,
                receipt,
                notes,
                payment_capture: 1 // Auto capture
            };

            const order = await this.razorpay.orders.create(options);
            return {
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            };
        } catch (error) {
            console.error('Razorpay create order error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify payment signature
     * @param {string} orderId - Razorpay order ID
     * @param {string} paymentId - Razorpay payment ID
     * @param {string} signature - Razorpay signature
     */
    verifyPaymentSignature(orderId, paymentId, signature) {
        try {
            const body = orderId + '|' + paymentId;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }

    /**
     * Fetch order details
     * @param {string} orderId - Razorpay order ID
     */
    async fetchOrder(orderId) {
        try {
            const order = await this.razorpay.orders.fetch(orderId);
            return { success: true, order };
        } catch (error) {
            console.error('Fetch order error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetch payment details
     * @param {string} paymentId - Razorpay payment ID
     */
    async fetchPayment(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return { success: true, payment };
        } catch (error) {
            console.error('Fetch payment error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initiate refund
     * @param {string} paymentId - Razorpay payment ID
     * @param {number} amount - Amount to refund (optional, full refund if not provided)
     */
    async initiateRefund(paymentId, amount = null) {
        try {
            const options = {};
            if (amount) {
                options.amount = Math.round(amount * 100); // Convert to paise
            }

            const refund = await this.razorpay.payments.refund(paymentId, options);
            return { success: true, refund };
        } catch (error) {
            console.error('Refund error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Razorpay key for frontend
     */
    getKeyId() {
        return process.env.RAZORPAY_KEY_ID;
    }
}

module.exports = new RazorpayService();

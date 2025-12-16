import { differenceInDays, isAfter } from 'date-fns';

export const GRACE_PERIOD_DAYS = 5;
export const ADMIN_FEE_PERCENT = 40; // Default

export interface Loan {
    amount: number;
    interest_rate: number; // Monthly percentage (e.g., 5 for 5%)
    start_date: Date | string;
    cutoff_day: number;
    admin_fee_percent?: number;
}

export interface InterestDistribution {
    totalInterest: number;
    adminShare: number;
    investorShare: number;
}

/**
 * Calculates the monthly interest amount and splits it between Admin and Investor.
 */
export function calculateInterestDistribution(amount: number, rate: number, adminFeePercent: number = ADMIN_FEE_PERCENT): InterestDistribution {
    const totalInterest = amount * (rate / 100);
    const adminShare = totalInterest * (adminFeePercent / 100);
    const investorShare = totalInterest - adminShare;

    return {
        totalInterest,
        adminShare,
        investorShare
    };
}

/**
 * Determines if a payment is considered late based on the expected date and grace period.
 */
export function isPaymentLate(paymentDate: Date, expectedDate: Date): boolean {
    // If payment is made AFTER (expected + grace), it is late.
    // We use differenceInDays. negative deviation is early.
    // differenceInDays(a, b) = a - b. 
    const diff = differenceInDays(paymentDate, expectedDate);
    return diff > GRACE_PERIOD_DAYS;
}

/**
 * Returns the next cutoff date relative to a reference date.
 * @param referenceDate Usually today or the start date.
 * @param cutoffDay THe day of the month (1-31).
 */
export function getNextCutoffDate(referenceDate: Date, cutoffDay: number): Date {
    const date = new Date(referenceDate);
    const currentDay = date.getDate();

    const targetYear = date.getFullYear();
    let targetMonth = date.getMonth(); // 0-indexed

    if (currentDay >= cutoffDay) {
        // If we are past or at the cutoff day, the next one is next month.
        targetMonth += 1;
    }

    // Handle month overflow/underflow automatically by Date constructor
    const nextDate = new Date(targetYear, targetMonth, cutoffDay);

    // Edge case: If cutoff is 31st, and next month has 30 days, Date autocorrects to 1st of following month.
    // We might want to clamp it to the last day of the month.
    // For simplicity, we assume standard behavior or might add logic to clamp.
    // Let's stick to standard JS Date behavior for now, or clamp if critical.
    // Fintech usually prefers sticky end-of-month.

    return nextDate;
}

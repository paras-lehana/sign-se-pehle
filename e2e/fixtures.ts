/**
 * Shared e2e inputs. The rent agreement is typed into an empty form exactly as a reader would
 * paste it; it is not a built-in sample, so this also proves nothing is prefilled.
 */
export const RENT_AGREEMENT = [
  'RENT AGREEMENT made at Pune on 1 October 2026 between the Landlord and the Tenant.',
  '1. Rent: The Tenant shall pay Rs. 22,000 (Rupees Twenty Thousand only) per month before the 5th.',
  '2. Deposit: The Tenant shall pay a security deposit of Rs. 1,32,000, refundable at the sole discretion of the Landlord.',
  '3. Lock-in: The lock-in period is 11 months. If the Tenant leaves earlier, the Tenant shall pay rent for the entire remaining lock-in period.',
  '4. Notice: The Tenant shall give 3 months notice. The Landlord may terminate with 15 days notice.',
  '5. Entry: The Landlord may enter the premises at any time without notice.',
].join('\n');

/** A later draft of the same agreement with a smaller deposit, for the compare journey. */
export const RENT_AGREEMENT_REVISED = RENT_AGREEMENT.replace('Rs. 1,32,000', 'Rs. 44,000');

/** Every route a reader can reach from the header. */
export const ROUTES = ['/', '/compare', '/about'] as const;

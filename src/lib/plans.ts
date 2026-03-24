export interface Plan {
    name: string;
    price: number;
    features: string[];
    popular?: boolean;
    limitations?: string[];
}

export const PLANS: Plan[] = [
    {
        name: 'Free',
        price: 0,
        features: [
            'Up to 50 active members',
            '10 receipt uploads',
            '100 MB default storage',
            'Basic invoicing',
            'Single user',
            'Google Drive integration (15 GB free)',
        ],
        limitations: [
            'Limited default storage',
            'Basic support',
        ],
        popular: false,
    },
    {
        name: 'Professional',
        price: 199,
        features: [
            'Unlimited members',
            'Unlimited receipt uploads',
            '250 MB default storage',
            'Google Drive integration (15 GB free)',
            'Auto Google Sheets backup',
            'Branded invoices with logo',
            'WhatsApp integration',
            'Delivery zones with map',
            'Priority support',
            'Expense reports',
        ],
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 345,
        features: [
            'Everything in Professional',
            '1 GB default storage',
            'Google Drive integration (15 GB free)',
            'Multiple users',
            'Custom integrations',
            'Dedicated support',
            'White-label option',
        ],
        popular: false,
    },
];

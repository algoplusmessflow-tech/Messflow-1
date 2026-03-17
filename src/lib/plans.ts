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
            '50 MB storage',
            'Basic invoicing',
            'Single user',
        ],
        limitations: [
            'Limited storage',
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
            '1 GB storage',
            'Branded invoices with logo',
            'WhatsApp integration',
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
            'Unlimited storage',
            'Multiple users',
            'Custom integrations',
            'Dedicated support',
            'White-label option',
        ],
        popular: false,
    },
];

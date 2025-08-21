import Stripe from 'stripe';
// Rely on the library default API version to match installed types
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
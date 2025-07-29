/**
 * OAuth Configuration
 * 
 * This file contains the configuration for OAuth providers.
 * For security, actual client IDs and secrets should be set as environment variables.
 */

// Base URL for the application (for callback URLs)
function detectBaseUrl(): string {
  // Use production domain for OAuth callbacks
  const productionDomain = 'client.datazag.com';
  
  console.log('OAuth Base URL detection:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DOMAIN: process.env.REPLIT_DOMAIN,
    productionDomain: productionDomain
  });
  
  return `https://${productionDomain}`;
}

export const BASE_URL = detectBaseUrl();

export interface OAuthProviderConfig {
  enabled: boolean;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
}

// Google OAuth configuration
export const googleConfig: OAuthProviderConfig = {
  enabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/google/callback`,
  scope: ['profile', 'email']
};

// GitHub OAuth configuration
export const githubConfig: OAuthProviderConfig = {
  enabled: !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/github/callback`,
  scope: ['user:email']
};

// Microsoft OAuth configuration
export const microsoftConfig: OAuthProviderConfig = {
  enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  clientID: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/microsoft/callback`,
  scope: ['openid', 'profile', 'email', 'User.Read']
};

console.log('Microsoft OAuth environment check:', {
  clientId: process.env.MICROSOFT_CLIENT_ID ? 'Present' : 'Missing',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET ? 'Present' : 'Missing',
  enabled: microsoftConfig.enabled
});

// LinkedIn OAuth configuration
export const linkedinConfig: OAuthProviderConfig = {
  enabled: false, // Disabled: LinkedIn app needs proper scope configuration
  clientID: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/linkedin/callback`,
  // LinkedIn requires approved scopes: openid, profile, email
  scope: ['openid', 'profile', 'email']
};

// Helper to check if any OAuth providers are enabled
export function isOAuthEnabled(): boolean {
  return googleConfig.enabled || 
         githubConfig.enabled || 
         microsoftConfig.enabled || 
         linkedinConfig.enabled;
}

// List of enabled providers for frontend display
export function getEnabledProviders(): string[] {
  const providers = [];
  if (googleConfig.enabled) providers.push('google');
  if (githubConfig.enabled) providers.push('github');
  if (microsoftConfig.enabled) providers.push('microsoft');
  if (linkedinConfig.enabled) providers.push('linkedin');
  return providers;
}

// Log OAuth configuration status at startup
export function logOAuthStatus(): void {
  console.log('OAuth configuration:');
  console.log(`- Google:    ${googleConfig.enabled ? 'Enabled' : 'Disabled'} (ClientID: ${googleConfig.clientID.substring(0, 15)}...)`);
  console.log(`- GitHub:    ${githubConfig.enabled ? 'Enabled' : 'Disabled'} (ClientID: ${githubConfig.clientID.substring(0, 15)}...)`);
  console.log(`- Microsoft: ${microsoftConfig.enabled ? 'Enabled' : 'Disabled'} (ClientID: ${microsoftConfig.clientID ? microsoftConfig.clientID.substring(0, 15) + '...' : 'None'})`);
  console.log(`- LinkedIn:  ${linkedinConfig.enabled ? 'Enabled' : 'Disabled'} (ClientID: ${linkedinConfig.clientID.substring(0, 15)}...)`);
  console.log('OAuth callback URLs:', {
    google: googleConfig.callbackURL,
    github: githubConfig.callbackURL,
    microsoft: microsoftConfig.callbackURL,
    linkedin: linkedinConfig.callbackURL
  });
}
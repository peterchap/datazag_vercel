import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { googleConfig, githubConfig, microsoftConfig, linkedinConfig } from './oauth-config';
import { storage as dbStorage } from './storage';
import { USER_ROLES } from '@shared/schema';

/**
 * Configures OAuth strategies for passport
 */
export function setupOAuthStrategies() {
  // Google OAuth Strategy
  if (googleConfig.enabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleConfig.clientID,
          clientSecret: googleConfig.clientSecret,
          callbackURL: googleConfig.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists with this Google ID
            let user = await dbStorage.getUserByOAuthId('googleId', profile.id);
            
            if (user) {
              // User exists, return the user
              return done(null, user);
            }
            
            // Check if user exists with the same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
              user = await dbStorage.getUserByEmail(email);
              if (user) {
                // Link this Google ID to the existing account
                await dbStorage.updateUser(user.id, { googleId: profile.id });
                return done(null, user);
              }
            }
            
            // No existing user found, create a new user
            if (email) {
              // Get name from profile for first and last name
              const firstName = profile.name?.givenName || 'Google';
              const lastName = profile.name?.familyName || 'User';
              
              // Create a new user
              const newUser = await dbStorage.createUser({
                username: profile.displayName || `${firstName} ${lastName}`,
                firstName,
                lastName,
                email,
                password: Math.random().toString(36).slice(-12) + '!A1',
                googleId: profile.id,
                company: 'Please update your company info',
                emailVerified: true,
                role: 'user',
                credits: 1000,
                active: true,
                canPurchaseCredits: true
              });
              
              return done(null, newUser);
            } else {
              // No email found in profile, can't create account
              return done(new Error('No email found in Google profile'));
            }
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // GitHub OAuth Strategy
  if (githubConfig.enabled) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubConfig.clientID,
          clientSecret: githubConfig.clientSecret,
          callbackURL: githubConfig.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists with this GitHub ID
            let user = await dbStorage.getUserByOAuthId('githubId', profile.id);
            
            if (user) {
              return done(null, user);
            }
            
            // Check if user exists with the same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
              user = await dbStorage.getUserByEmail(email);
              if (user) {
                await dbStorage.updateUser(user.id, { githubId: profile.id });
                return done(null, user);
              }
            }
            
            // Create a new user
            if (email) {
              const nameParts = profile.displayName ? profile.displayName.split(' ') : [profile.username || 'GitHub', 'User'];
              const firstName = nameParts[0] || 'GitHub';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
              
              const newUser = await dbStorage.createUser({
                username: profile.username || profile.displayName || `${firstName} ${lastName}`,
                firstName,
                lastName,
                email,
                password: Math.random().toString(36).slice(-12) + '!A1',
                githubId: profile.id,
                company: 'Please update your company info',
                emailVerified: true,
                role: 'user',
                credits: 1000,
                active: true,
                canPurchaseCredits: true
              });
              
              return done(null, newUser);
            } else {
              return done(new Error('No email found in GitHub profile'));
            }
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Microsoft OAuth Strategy - Force registration with hardcoded credentials
  console.log('Registering Microsoft OAuth strategy...');
  try {
    passport.use('microsoft',
      new MicrosoftStrategy(
        {
          clientID: '5a37b8fb-0633-4e82-9b2b-ca4b8ecc8f1e',
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'fallback-secret',
          callbackURL: 'https://client.datazag.com/auth/microsoft/callback',
          scope: ['openid', 'profile', 'email', 'User.Read'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('Microsoft OAuth callback with profile:', profile.id);
            
            // Check if user already exists with this Microsoft ID
            let user = await dbStorage.getUserByOAuthId('microsoftId', profile.id);
            
            if (user) {
              return done(null, user);
            }
            
            // Check if user exists with the same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
              user = await dbStorage.getUserByEmail(email);
              if (user) {
                await dbStorage.updateUser(user.id, { microsoftId: profile.id });
                return done(null, user);
              }
            }
            
            // Create a new user
            if (email) {
              const nameParts = profile.displayName.split(' ');
              const firstName = nameParts[0] || 'Microsoft';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
              
              const newUser = await dbStorage.createUser({
                username: profile.displayName || `${firstName} ${lastName}`,
                firstName,
                lastName,
                email,
                password: Math.random().toString(36).slice(-12) + '!A1',
                microsoftId: profile.id,
                company: 'Please update your company info',
                emailVerified: true,
                role: 'user',
                credits: 1000,
                active: true,
                canPurchaseCredits: true
              });
              
              return done(null, newUser);
            } else {
              return done(new Error('No email found in Microsoft profile'));
            }
          } catch (error) {
            console.error('Microsoft OAuth error:', error);
            return done(error);
          }
        }
      )
    );
    
    console.log('Microsoft OAuth strategy registered successfully');
    console.log('Available strategies:', Object.keys(passport._strategies || {}));
  } catch (error) {
    console.error('Error registering Microsoft OAuth strategy:', error);
  }

  // LinkedIn OAuth Strategy
  if (linkedinConfig.enabled) {
    passport.use(
      new LinkedInStrategy(
        {
          clientID: linkedinConfig.clientID,
          clientSecret: linkedinConfig.clientSecret,
          callbackURL: linkedinConfig.callbackURL,
          scope: linkedinConfig.scope,
          state: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('=== LINKEDIN OAUTH CALLBACK ===');
            console.log('Profile received:', JSON.stringify(profile, null, 2));
            console.log('Access token received:', !!accessToken);
            
            // Check if user already exists with this LinkedIn ID
            let user = await dbStorage.getUserByOAuthId('linkedinId', profile.id);
            
            if (user) {
              console.log('Found existing LinkedIn user:', user.id);
              return done(null, user);
            }
            
            // Check if user exists with the same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
              user = await dbStorage.getUserByEmail(email);
              if (user) {
                console.log('Found existing user with same email, linking LinkedIn account');
                await dbStorage.updateUser(user.id, { linkedinId: profile.id });
                return done(null, user);
              }
            }
            
            // Create a new user
            if (email) {
              const firstName = profile.name?.givenName || 'LinkedIn';
              const lastName = profile.name?.familyName || 'User';
              
              const newUser = await dbStorage.createUser({
                username: profile.displayName || `${firstName} ${lastName}`,
                firstName,
                lastName,
                email,
                password: Math.random().toString(36).slice(-12) + '!A1',
                linkedinId: profile.id,
                company: 'Please update your company info',
                emailVerified: true,
                role: 'user',
                credits: 1000,
                active: true,
                canPurchaseCredits: true
              });
              
              console.log('Successfully created LinkedIn user:', newUser.id);
              return done(null, newUser);
            } else {
              console.log('No email found in LinkedIn profile');
              return done(new Error('No email found in LinkedIn profile'));
            }
          } catch (error) {
            console.error('LinkedIn OAuth error:', error);
            return done(new Error(`LinkedIn authentication failed: ${error.message}`));
          }
        }
      )
    );
  }
}
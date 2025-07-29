# Microsoft OAuth Setup Guide

Microsoft Azure AD/Microsoft 365 OAuth has been configured for the platform.

## Configuration Details

- **Client ID**: Set via MICROSOFT_CLIENT_ID secret
- **Client Secret**: Set via MICROSOFT_CLIENT_SECRET secret
- **Redirect URI**: https://client.datazag.com/auth/microsoft/callback
- **Scopes**: openid, profile, email, User.Read

## Azure App Registration

To verify or update your Azure app registration:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Find your app: "Datazag Customer Portal"
4. Ensure these settings:
   - **Authentication** > Redirect URIs:
     - https://client.datazag.com/auth/microsoft/callback
     - http://localhost:5000/auth/microsoft/callback (for development)
   - **API permissions**:
     - Microsoft Graph: openid, profile, email, User.Read
   - **Certificates & secrets**: Client secret configured

## Supported Account Types

The app should be configured to support:
- Accounts in any organizational directory (Any Azure AD directory - Multitenant)
- Personal Microsoft accounts (e.g. Skype, Xbox)

This allows both business and personal Microsoft accounts to authenticate.

## Features

- Single sign-on with Microsoft work/school accounts
- Personal Microsoft account authentication
- Automatic user creation with Microsoft profile data
- Email verification from Microsoft OAuth

## Testing

Users can now authenticate using:
1. Google OAuth
2. GitHub OAuth
3. Microsoft OAuth (new)
4. Direct email/password registration
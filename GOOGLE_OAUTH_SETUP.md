# Google OAuth Setup Guide

Gyandeep supports Google OAuth for single sign-on (SSO). This guide explains how to configure it.

## Prerequisites
- A Google Cloud Platform account
- A project created in Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as application type
6. Enter a name (e.g., "Gyandeep SSO")
7. Add authorized JavaScript origins:
   ```
   http://localhost:5173 (development)
   https://yourdomain.com (production)
   ```
8. Add authorized redirect URIs:
   ```
   http://localhost:5173/api/auth/google/callback (development)
   https://yourdomain.com/api/auth/google/callback (production)
   ```
9. Click **Create**
10. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# OAuth callback URL (must match Google Console)
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback
```

For production:
```env
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## Step 3: Enable Required APIs

In Google Cloud Console, enable these APIs:
1. **Google+ API** (for basic profile)
2. **People API** (for contact info)

Navigate to **APIs & Services** > **Library**, search for and enable each API.

## Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in app information:
   - App name: Gyandeep
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   ```
   email
   profile
   openid
   ```
5. Add test users (for development)
6. Publish the app (or keep testing)

## Usage

Once configured, users will see a "Sign in with Google" button on the login page.

### User Flow
1. User clicks "Sign in with Google"
2. Redirected to Google's OAuth consent screen
3. User grants permissions
4. Redirected back to Gyandeep
5. Account created/linked automatically

### Account Linking
- New users: Account created with Google email
- Existing users: Must link Google account in profile settings

## Troubleshooting

### Error: redirect_uri_mismatch
- Ensure redirect URI in `.env` matches exactly what's in Google Console
- Check for trailing slashes
- For local dev, use `http://localhost:5173`

### Error: access_denied
- User denied permission
- Test user not added (in development)
- App not published (in production)

### User not created
- Check server logs for errors
- Verify Google API scopes are enabled
- Ensure email permission is granted

## Security Notes

- Store `GOOGLE_CLIENT_SECRET` securely
- Use HTTPS in production
- Regularly rotate credentials
- Limit to specific domains in production

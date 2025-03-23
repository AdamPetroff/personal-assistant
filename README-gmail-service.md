# Gmail Service

A service for reading emails from a Gmail account, including fetching new emails, reading specific emails by ID, and extracting content and attachments.

## Features

- Fetch list of new/unread emails
- Read specific emails by ID
- Extract email content (both plain text and HTML formats)
- Extract and save email attachments
- Automatic token refresh to maintain persistent access
- Re-authentication flow when refresh tokens expire

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page and select "New Project"
3. Enter a name for your project (e.g., "Personal Assistant Gmail Integration")
4. Click "Create"
5. Wait for the project to be created, then select it from the project dropdown

### 2. Enable the Gmail API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library" in the left sidebar
2. In the search bar, type "Gmail API"
3. Click on "Gmail API" in the search results
4. Click the "Enable" button to enable the API for your project

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen" in the left sidebar
2. Select "External" as the user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
    - App name: Your app name (e.g., "Personal Assistant")
    - User support email: Your email address
    - Developer contact information: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add the following scopes:
    - `https://www.googleapis.com/auth/gmail.readonly` (to read emails)
    - `https://www.googleapis.com/auth/gmail.modify` (to modify emails, like marking as read)
8. Click "Save and Continue"
9. On the "Test users" page, click "Add Users" and add your Gmail address
10. Click "Save and Continue"
11. Review your app details and click "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials" in the left sidebar
2. Click "Create Credentials" at the top of the page and select "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name for your OAuth client (e.g., "Personal Assistant Gmail Client")
5. Under "Authorized redirect URIs", add `https://developers.google.com/oauthplayground`
6. Click "Create"
7. A popup will appear with your client ID and client secret
8. Note down your **Client ID** and **Client Secret**

### 5. Update Environment Variables

Add the following variables to your `.env` file:

```
GMAIL_CLIENT_ID="your_client_id"
GMAIL_CLIENT_SECRET="your_client_secret"
GMAIL_REDIRECT_URI="https://developers.google.com/oauthplayground"
```

You can leave `GMAIL_REFRESH_TOKEN` empty initially, as our service includes an authentication flow to obtain it.

### 6. Initial Authentication

Run the test script which will guide you through the initial authentication process:

```bash
npm run test-gmail
```

The script will:

1. Generate an authorization URL
2. Prompt you to visit the URL and authenticate with your Google account
3. Ask you to enter the authorization code provided
4. Exchange the code for an access token and refresh token
5. Save the tokens for future use

## How It Works

### Token Management

The Gmail service includes sophisticated token refresh logic:

1. **Token Storage**: Tokens are saved to a local file (`.gmail_token.json`) for persistence across restarts.

2. **Automatic Refresh**: The service automatically refreshes access tokens when they expire.

3. **Re-authentication**: If the refresh token becomes invalid (which can happen if you revoke access or after a long period of inactivity), the service will detect this and guide you through re-authentication.

### API Request Handling

All API requests are wrapped in a special handler (`executeWithTokenRefresh`) that:

1. Attempts to execute the API call
2. If authentication fails, automatically attempts to refresh the token
3. Retries the API call with the new token
4. If token refresh fails, provides a clear error indicating re-authentication is needed

## Usage Examples

### List Recent Unread Emails

```typescript
import gmailService from "./services/gmail";

async function getUnreadEmails() {
    const emails = await gmailService.listEmails(10); // Get 10 most recent unread emails

    emails.forEach((email) => {
        console.log(`Subject: ${email.subject}`);
        console.log(`From: ${email.from}`);
        console.log(`Has attachments: ${email.hasAttachments}`);
    });
}
```

### Read a Specific Email with Attachments

```typescript
import gmailService from "./services/gmail";

async function readEmailWithAttachments(emailId: string) {
    const email = await gmailService.getEmail(emailId);

    console.log(`Subject: ${email.subject}`);
    console.log(`Content: ${email.textContent}`);

    // Process attachments
    for (const attachment of email.attachments) {
        const savedPath = await gmailService.saveAttachment(
            email.id,
            attachment.attachmentId,
            attachment.filename,
            attachment.mimeType
        );

        console.log(`Saved attachment: ${attachment.filename} to ${savedPath}`);
    }

    // Mark as read
    await gmailService.markAsRead(email.id);
}
```

### Handle Re-authentication

```typescript
import gmailService from "./services/gmail";

async function ensureAuthenticated() {
    try {
        const emails = await gmailService.listEmails(1);
        console.log("Successfully authenticated");
    } catch (error: any) {
        if (error.message?.includes("Re-authentication required")) {
            // Get authentication URL
            const authUrl = gmailService.getAuthUrl();
            console.log(`Please visit: ${authUrl}`);

            // Get code from user (using your preferred input method)
            const code = await getCodeFromUser();

            // Exchange code for tokens
            const success = await gmailService.getTokensFromCode(code);
            if (success) {
                console.log("Re-authentication successful");
            }
        }
    }
}
```

## Security Considerations

1. **Token Security**: The refresh token gives persistent access to your Gmail account. Keep it secure and never commit it to public repositories.

2. **Scopes**: The service uses the minimal scopes needed (`gmail.readonly` and `gmail.modify`). It cannot send emails or modify your account settings.

3. **Local Storage**: Tokens are stored in a local file (`.gmail_token.json`). Ensure this file has appropriate permissions.

4. **Production Use**: For production use, consider a more secure token storage mechanism like a secret manager or encrypted database.

## Troubleshooting

1. **Authentication Failures**: If authentication fails, delete the `.gmail_token.json` file and run the test script again to go through the authentication flow.

2. **API Quotas**: The Gmail API has usage quotas. If you hit these limits, you'll need to wait or request higher quotas from Google.

3. **Consent Screen Verification**: If you plan to make this application public, you'll need to go through Google's verification process for your OAuth consent screen.

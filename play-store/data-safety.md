# DLT — Data Safety working sheet

Use this as a preparation aid. Confirm every answer against the final production services before
submitting the Play Console form.

## Data collected

### Personal information

- **Name:** optional account profile data; used for account management.
- **Email address:** required for email/password accounts and supplied by Google sign-in; used for
  authentication, verification, account linking, security, and support.
- **User IDs:** internal account ID and optional Google account identifier; used for authentication
  and associating data with the correct account.

### App activity / user content

- **Other user-generated content:** vocabulary, meanings, notes, grammar text, translation text,
  dictionary queries, and story vocabulary. Used to provide core app and AI-assisted learning
  features.

### App info and performance / device or other IDs

- **IP address, device/browser user agent, session timestamps:** collected only while online-presence
  tracking (`SESSION_TRACKING_ENABLED`) is turned on for the backend; currently **off** in production.
  When on, used to show friend online/offline presence and for connection reliability. Retained for
  90 days (auto-expiry) and deleted immediately on account deletion. Update this entry before
  submitting the Play Console form if tracking has been enabled since this was last reviewed.

## Handling declarations

- Data is transmitted over HTTPS in production.
- Passwords are hashed and are never stored as plain text.
- Data is not sold.
- Data is used for app functionality and account management.
- Some submitted learning text is processed by service providers, including the configured AI
  provider, to return the requested output.
- Account data can be deleted from inside the app and through the external deletion route; this
  also purges session/presence tracking records for the account.
- Users cannot use the core app anonymously.

## Service providers to consider

- Render or the active API host
- MongoDB or the active account/vocabulary database
- Astra DB or the active notes database
- Groq or the active AI inference provider
- Google OAuth
- Gmail SMTP

## Play Console forms

- Data Safety
- App access
- Ads: select **No** unless advertising is added before release
- Target audience: recommended 16–17 and 18+
- Content rating questionnaire
- Account deletion URL
- Privacy policy URL

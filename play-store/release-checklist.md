# DLT — Release checklist

## Code and services

- [x] Deploy the latest app and API commits.
- [ ] Add SMTP variables to the production API environment.
- [ ] Test new email registration and six-digit verification.
- [ ] Test password login failures and visible inline messages.
- [ ] Test Google sign-in and same-email Google linking.
- [ ] Test vocabulary, notes, AI tools, and account deletion on production.
- [x] Confirm the public privacy-policy and account-deletion URLs:
  - `https://wordcontrol.netlify.app/privacy-policy.html`
  - `https://wordcontrol.netlify.app/account-deletion.html`

## Android and Google authentication

- [x] Permanent Android package: `com.amogh.dlt`
- [x] Android version code: `3`
- [x] Target Android API: 36
- [x] Create the Play-signed Android OAuth client for `com.amogh.dlt`.
- [x] Register the Play app-signing SHA-1 fingerprint:
  `4A:9B:94:94:5D:2B:75:62:45:92:E9:88:F3:1E:7B:01:94:9F:7F:97`
- [x] Put the resulting Android client ID in the app build environment.
- [x] Build and retain the signed production AAB and upload-key backup.

## Play Console

- [ ] Complete developer identity verification.
- [ ] Create the DLT – Deutsche Learn Tool app entry with the permanent package name.
- [ ] Accept Play App Signing.
- [ ] Add store description, icon, feature graphic, and phone screenshots.
- [ ] Add support email and privacy-policy URL.
- [ ] Complete Data Safety, App access, Ads, Target audience, and Content rating.
- [ ] Add account-deletion URL.
- [ ] Upload the signed AAB to Internal testing first.
- [ ] Create a dedicated reviewer account and enter its credentials under App access.
- [ ] If required, run a closed test with at least 12 opted-in testers for 14 continuous days.
- [ ] Apply for production access and submit the production release.

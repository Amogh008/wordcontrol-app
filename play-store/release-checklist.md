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
- [x] Initial Android version code: `1`
- [x] Target Android API: 36
- [ ] Create/update the Android OAuth client for `com.amogh.dlt`.
- [ ] Add the upload certificate SHA-1 fingerprint:
  `86:B4:FF:BD:C3:85:49:9E:DB:F9:AD:AF:8C:81:AD:40:F6:AF:59:04`
- [ ] Put the resulting Android client ID in the app build environment.
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

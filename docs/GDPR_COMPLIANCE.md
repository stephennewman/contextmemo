# GDPR Compliance Overview

This document summarizes GDPR-related controls and how ContextMemo supports data subject rights.

## Data Subject Rights
- **Access / Export**: Users can export their data via `/api/privacy/export`.
- **Deletion / Erasure**: Users can delete their account and associated data via `/api/privacy/delete`.

## Data Minimization
- Only required data is collected for account, brand, and analytics features.
- Payment data is handled by Stripe; ContextMemo does not store card data.

## Retention
- Product data is retained while the account is active.
- Upon account deletion, all brand-related data is removed.

## Security
- Role-based access and ownership checks on private data.
- Webhook verification and audit logging for billing/security events.

## Open Items
- Formal privacy policy update and DPA templates.
- Configurable retention windows for historical analytics.

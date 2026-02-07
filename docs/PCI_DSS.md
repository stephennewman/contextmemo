# PCI DSS Overview

ContextMemo uses Stripe-hosted payment flows (Checkout + Billing Portal) so no card data is stored, processed, or transmitted by ContextMemo servers.

## Scope
- **SAQ A** scope (hosted payment pages)
- ContextMemo does **not** handle PAN, CVV, or raw card data

## Implemented Controls
- Stripe Checkout and Billing Portal for payment collection
- Webhook signature verification for billing events
- Rate limiting and allowlist support on billing webhooks
- Server-side secrets for Stripe keys

## Operational Requirements
- Use HTTPS everywhere
- Restrict access to Stripe keys
- Rotate secrets periodically
- Monitor webhook failures and billing events

## Notes
- Any future custom card entry forms or Elements integration may expand PCI scope and require additional controls.

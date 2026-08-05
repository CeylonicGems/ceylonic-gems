# Security and Launch Requirements

Before accepting real users, identity documents or payments:

1. Use a dedicated production Supabase project.
2. Rotate all server secrets and keep them only in Vercel environment variables.
3. Enable administrator MFA in the identity provider or add a mandatory MFA gate.
4. Configure production SMTP and email-link templates.
5. Add a professional liveness and identity-verification provider.
6. Define legal retention and deletion periods for NIC, passport and selfie files.
7. Complete PayHere sandbox and live-domain approval.
8. Arrange approved gemstone export, insurance and courier workflows.
9. Commission an independent penetration test and legal/privacy review.
10. Test payment refunds, chargebacks, webhook retries and administrator incident response.

Never place `SUPABASE_SECRET_KEY`, `PAYHERE_MERCHANT_SECRET` or `IDENTITY_HASH_SECRET` in browser code or GitHub.

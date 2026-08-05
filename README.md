# Ceylonic Gems — Full-Stack Marketplace

A GitHub-ready gemstone marketplace with buyer, seller and owner/admin interfaces.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Auth and PostgreSQL
- Row Level Security
- Public gemstone media and private identity/certificate storage
- PayHere Checkout API with server-generated hashes
- Signed PayHere notification verification
- Vercel-compatible server deployment

## Included functionality

### Public website

- Cinematic Gem Lobby
- Apple-inspired responsive interface
- Published gemstone catalogue
- Full gemstone profile
- Maximum five public active offers
- Numeric offer input with currency and arrow controls
- Weighted seven-star community rating
- Appointment and international inquiry flow

### Accounts

- Separate buyer, seller and owner/admin login entry points
- Email/password authentication
- Role-based dashboard routing
- Sri Lankan and foreign account registration
- Old NIC format: 9 digits + V or X
- New NIC format: 12 digits
- Foreign passport workflow
- Live camera selfie capture
- Private identity upload
- Admin identity approval/rejection

### Seller interface

- Verified-seller requirement
- Gemstone details form
- Multiple image upload
- Private certificate upload
- LKR 500 listing fee
- PayHere payment redirect
- Payment retry
- Pending, changes-requested, rejected and published states
- Admin publication required
- 1% success-fee transaction model

### Buyer interface

- Verified-buyer requirement
- One active offer per gemstone
- Offer update support
- Seller self-offer prevention
- Up/down rating
- Seller self-rating prevention
- Buyer offer and appointment dashboard

### Owner/admin interface

- Protected admin role
- User, listing and payment summaries
- Pending identity reviews
- Listing review
- Publication locked until fee confirmation
- Request changes and rejection reasons
- Payment ledger
- Audit logs

## Hosting

Use GitHub for the repository. Deploy the running application to Vercel or another Node.js host.

**Do not deploy this full version to GitHub Pages.** GitHub Pages cannot execute Next.js route handlers, authentication cookies, PayHere hashes, payment callbacks or admin server operations.

## 1. Install

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2. Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add your project URL, publishable key and server secret key.

```bash
cp .env.example .env.local
```

Generate an identity hash secret:

```bash
openssl rand -hex 32
```

Never commit `.env.local`.

## 3. Supabase Auth settings

- Enable email/password authentication.
- Add `http://localhost:3000/**` as a development redirect.
- Add the production Vercel/custom-domain redirect.
- Configure production SMTP before launch.

## 4. Create the first owner/admin

Register the owner account normally. Then run:

```sql
update public.profiles
set role='admin', verification_status='verified', verified_badge=true
where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
```

Admin login:

```text
/login?role=admin
```

Buyer login:

```text
/login?role=buyer
```

Seller login:

```text
/login?role=seller
```

## 5. PayHere setup

Obtain an approved PayHere Business account and approved domain credential.

```env
PAYHERE_MERCHANT_ID=...
PAYHERE_MERCHANT_SECRET=...
PAYHERE_SANDBOX=true
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app
```

PayHere must reach:

```text
https://your-domain/api/payhere/notify
```

For local UI-only testing:

```env
PAYMENTS_DEMO_MODE=true
```

Never leave demo mode enabled in production.

The application does not mark a payment successful from the browser redirect. It waits for the server callback and verifies the PayHere `md5sig` before updating the database.

## 6. Deploy with GitHub and Vercel

1. Upload the entire folder to a GitHub repository.
2. Import the repository in Vercel.
3. Add all environment variables in Vercel.
4. Deploy.
5. Update Supabase Site URL and redirect URLs.
6. Request PayHere approval for the production domain.
7. Switch `PAYHERE_SANDBOX=false` only with approved live credentials.

## External services still required

No downloaded source code can include or activate private third-party credentials. Production operation requires:

- Supabase project
- PayHere merchant approval
- Production SMTP service
- SMS/OTP provider if phone verification is added
- Professional liveness/KYC service for stronger identity verification
- Custom domain
- Gem export, insurance and courier partnerships
- Legal privacy, seller, buyer and retention policies

## Security notes

- Supabase secret key and PayHere secret are server-only.
- NIC/passport numbers are HMAC-hashed; only the last four characters are retained for display.
- Identity and certificate files are in private buckets.
- Public gemstone media is isolated in a separate bucket.
- Row Level Security restricts records by role and ownership.
- This code validates NIC format but does not claim that format validation proves identity ownership.

## Final marketplace flows included

### Offer-to-sale workflow

1. A verified buyer submits one numeric offer per gemstone in any ISO 4217 currency.
2. The seller sees active offers in the seller dashboard.
3. Accepting an offer creates one protected transaction and reserves the gemstone.
4. Other active offers on that gemstone are closed.
5. The buyer sees the accepted purchase and payment action.
6. PayHere is offered for its supported settlement currencies: LKR, USD, GBP, EUR and AUD.
7. Other accepted currencies are flagged for administrator-assisted payment or approved conversion.
8. The transaction records the configurable 1% platform success fee.

### Complete authentication routes

```text
/buyer-login
/seller-login
/owner
/forgot-password
/reset-password
/auth/confirm
```

For SSR email confirmation, configure the Supabase confirmation email template to use a token-hash link such as:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/verification
```

Use the equivalent recovery link with `type=recovery` and `next=/reset-password` for password recovery.

### Administrator review controls

- Identity documents and live selfies open through audited five-minute signed links.
- Gemstone media and certificates can be reviewed before publication.
- Listing publication remains locked until payment confirmation.
- Appointments can be approved, rescheduled, cancelled or completed.
- Accepted purchases, payment status, platform fees and audit records are visible in the owner dashboard.

### Media and currency support

- Multiple gemstone images
- One optional MP4/WebM gemstone video
- Separate private certificate upload
- Full ISO 4217 currency-code dropdown for listings and buyer offers
- Clear separation between offer currencies and PayHere-supported payment currencies

## Validation performed on the downloadable repository

- `package.json` JSON validation passed.
- All local `@/` imports resolve to project files.
- All TypeScript and TSX files passed a parser-level syntax scan.
- Secret values remain placeholders in `.env.example` and are excluded by `.gitignore`.

The restricted generation environment could not install `@supabase/ssr` through its internal package mirror, so a complete dependency build was not run here. GitHub Actions is included to run `npm install`, `npm run typecheck` and `npm run build` against the public npm registry when you push the repository.

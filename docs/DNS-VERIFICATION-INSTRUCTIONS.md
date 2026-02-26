# DNS TXT Record Verification for Google Search Console

## Overview

DNS verification is the **recommended method** for verifying domain ownership in Google Search Console, especially if you manage your own DNS records. This method verifies the entire domain and all its subdomains.

---

## Prerequisites

- Access to your domain's DNS management panel (e.g., GoDaddy, Namecheap, Cloudflare, or your hosting provider)
- Your domain: `smartmedcon-jsnymp6w.manus.space` or your custom domain

---

## Step-by-Step Instructions

### Step 1: Get Your Verification TXT Record from Google

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add Property**
3. Select **Domain** (not URL prefix)
4. Enter your domain: `smartmedcon-jsnymp6w.manus.space`
5. Click **Continue**
6. Google will provide a TXT record that looks like:
   ```
   google-site-verification=abc123xyz456...
   ```
7. **Copy this entire string** (you'll need it in the next step)

### Step 2: Add TXT Record to Your DNS

**For Manus-managed domains (*.manus.space):**
- Contact Manus support or use the Manus Management UI to add DNS records
- Provide the TXT record value from Step 1

**For custom domains (if you've connected your own domain):**

1. Log in to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)
2. Navigate to DNS Management or DNS Records section
3. Click **Add Record** or **Add DNS Record**
4. Fill in the following:
   - **Type**: TXT
   - **Name**: @ (or leave blank, or enter your domain)
   - **Value**: Paste the verification string from Google (e.g., `google-site-verification=abc123xyz456...`)
   - **TTL**: 3600 (or default)
5. Click **Save** or **Add Record**

### Step 3: Verify in Google Search Console

1. Return to Google Search Console
2. Click **Verify** button
3. If verification fails:
   - Wait 24-48 hours for DNS propagation
   - Check that the TXT record was added correctly
   - Use [Google's DNS checker](https://toolbox.googleapps.com/apps/dig/) to verify the TXT record exists

---

## Verification Status

- ✅ **Verified**: You can now access Search Console data
- ❌ **Not Verified**: Check DNS records and wait for propagation

---

## DNS Propagation Time

- **Typical**: 1-4 hours
- **Maximum**: 48 hours
- **Check propagation**: Use [whatsmydns.net](https://www.whatsmydns.net/) to check TXT record propagation globally

---

## Troubleshooting

### Verification Failed

1. **Check TXT Record Format**:
   - Ensure you copied the entire verification string
   - No extra spaces or characters
   - Correct record type (TXT, not CNAME or A)

2. **Check DNS Propagation**:
   - Use `nslookup -type=TXT smartmedcon-jsnymp6w.manus.space` (replace with your domain)
   - Or use online tools like [MXToolbox](https://mxtoolbox.com/TXTLookup.aspx)

3. **Multiple TXT Records**:
   - You can have multiple TXT records on the same domain
   - Don't delete existing TXT records (like SPF, DKIM)

4. **Contact Support**:
   - If using Manus-managed domain, contact Manus support
   - If using custom domain, contact your DNS provider

---

## After Verification

Once verified, you can:
- Submit your sitemap: `https://smartmedcon-jsnymp6w.manus.space/sitemap.xml`
- Monitor search performance
- View indexing status
- Check for crawl errors
- Analyze search queries and click-through rates

---

## Important Notes

- **Keep the TXT record**: Don't delete it after verification, or you'll lose access
- **Verification is permanent**: As long as the TXT record exists, you remain verified
- **Multiple owners**: You can add multiple people as owners by having them verify separately

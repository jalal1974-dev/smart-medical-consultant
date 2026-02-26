# Google Search Console Integration Guide

## Overview

This guide walks you through integrating your Smart Medical Consultant website with Google Search Console (GSC) to monitor search performance, indexing status, and SEO health.

---

## What is Google Search Console?

Google Search Console is a free service that helps you:
- Monitor how Google crawls and indexes your site
- Submit sitemaps for faster indexing
- View search performance data (impressions, clicks, CTR, position)
- Identify and fix technical SEO issues
- Receive alerts about critical site problems
- Analyze which queries bring users to your site

---

## Prerequisites

- A Google account (Gmail)
- Access to your website's hosting or DNS management
- Your website URL: `https://smartmedcon-jsnymp6w.manus.space`

---

## Part 1: Domain Verification

You must verify domain ownership before accessing Search Console data. Choose ONE of the following methods:

### Method 1: HTML Meta Tag (Easiest for Manus-hosted sites)

**Status**: ✅ Pre-configured (placeholder added)

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add Property** → Select **URL prefix**
3. Enter: `https://smartmedcon-jsnymp6w.manus.space`
4. Choose **HTML tag** verification method
5. Copy the meta tag content value (e.g., `abc123xyz456`)
6. Open `client/index.html` in your project
7. Find this line:
   ```html
   <!-- <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" /> -->
   ```
8. Replace `YOUR_VERIFICATION_CODE_HERE` with your actual code and uncomment:
   ```html
   <meta name="google-site-verification" content="abc123xyz456" />
   ```
9. Save, commit, and deploy the changes
10. Return to Google Search Console and click **Verify**

**Advantages**:
- Quick and easy
- No DNS access required
- Instant verification

**Disadvantages**:
- Only verifies the specific URL (not subdomains)
- Meta tag must remain in the HTML

---

### Method 2: HTML File Upload

**Status**: ✅ Placeholder file created

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add Property** → Select **URL prefix**
3. Enter: `https://smartmedcon-jsnymp6w.manus.space`
4. Choose **HTML file** verification method
5. Download the verification file (e.g., `google1234567890abcdef.html`)
6. Rename the placeholder file in `client/public/google-site-verification-placeholder.html` to match the downloaded filename
7. Replace its content with:
   ```
   google-site-verification: google1234567890abcdef.html
   ```
8. Save, commit, and deploy
9. Verify the file is accessible at: `https://smartmedcon-jsnymp6w.manus.space/google1234567890abcdef.html`
10. Return to Google Search Console and click **Verify**

**Advantages**:
- No code changes required
- Simple upload process

**Disadvantages**:
- File must remain accessible
- Only verifies the specific URL

---

### Method 3: DNS TXT Record (Recommended for custom domains)

**Status**: 📄 Instructions provided in `DNS-VERIFICATION-INSTRUCTIONS.md`

**Best for**: Custom domains or when you want to verify the entire domain and all subdomains

See the detailed guide: [DNS-VERIFICATION-INSTRUCTIONS.md](./DNS-VERIFICATION-INSTRUCTIONS.md)

**Quick Summary**:
1. Get TXT record from Google Search Console
2. Add TXT record to your DNS provider
3. Wait for DNS propagation (1-48 hours)
4. Verify in Google Search Console

**Advantages**:
- Verifies entire domain and all subdomains
- Most reliable method
- Doesn't require website changes

**Disadvantages**:
- Requires DNS access
- DNS propagation delay (up to 48 hours)

---

## Part 2: Submit Your Sitemap

After verification, submit your sitemap to help Google discover and index your pages faster.

### Steps:

1. In Google Search Console, select your verified property
2. Go to **Sitemaps** (in the left sidebar under "Indexing")
3. Enter your sitemap URL: `sitemap.xml`
4. Click **Submit**

**Your sitemap URL**: `https://smartmedcon-jsnymp6w.manus.space/sitemap.xml`

### What's in Your Sitemap?

Your sitemap includes:
- Homepage (/)
- Consultations page (/consultations)
- Videos page (/videos)
- Podcasts page (/podcasts)
- Dashboard page (/dashboard)
- Analytics page (/analytics)
- Admin panel (/admin)

Each page includes:
- URL
- Last modification date
- Change frequency
- Priority
- Multilingual alternate links (English/Arabic)

---

## Part 3: Monitor Search Performance

Once verified and indexed, you can monitor your site's performance:

### Key Metrics to Track:

1. **Total Clicks**: Number of times users clicked your site in search results
2. **Total Impressions**: Number of times your site appeared in search results
3. **Average CTR**: Click-through rate (clicks ÷ impressions)
4. **Average Position**: Your average ranking position in search results

### How to Access:

1. Go to Google Search Console
2. Select your property
3. Click **Performance** in the left sidebar
4. View data by:
   - Queries (what people searched for)
   - Pages (which pages get traffic)
   - Countries (where your users are)
   - Devices (mobile, desktop, tablet)
   - Search appearance (rich results, AMP, etc.)

---

## Part 4: Monitor Indexing Status

Track how many of your pages are indexed by Google:

### Steps:

1. Go to **Pages** (under "Indexing" in left sidebar)
2. View:
   - **Indexed pages**: Successfully indexed
   - **Not indexed**: Pages Google couldn't or didn't index
   - **Crawled but not indexed**: Pages Google found but chose not to index

### Common Issues:

- **Blocked by robots.txt**: Check your robots.txt file
- **Duplicate content**: Canonical tags may be needed
- **Soft 404**: Page returns 404 but doesn't use proper status code
- **Server error (5xx)**: Hosting or server issues

---

## Part 5: Set Up Email Notifications

Get alerts about critical issues:

### Steps:

1. Go to **Settings** (gear icon in top right)
2. Click **Users and permissions**
3. Add your email address
4. Choose notification preferences:
   - ✅ Critical issues (recommended)
   - ✅ Manual actions
   - ⬜ New messages (optional)

---

## Part 6: Request Indexing for New Pages

Speed up indexing for newly published pages:

### Steps:

1. Go to **URL Inspection** (top of Search Console)
2. Enter the full URL of your new page
3. Click **Request Indexing**
4. Google will prioritize crawling that page

**Note**: You can request indexing for up to 10 URLs per day.

---

## Part 7: Monitor Mobile Usability

Ensure your site works well on mobile devices:

### Steps:

1. Go to **Mobile Usability** (under "Experience" in left sidebar)
2. View any mobile usability issues
3. Fix issues and request re-validation

**Your site is mobile-responsive**, so you should see minimal issues.

---

## Part 8: Check Core Web Vitals

Monitor page experience metrics:

### Steps:

1. Go to **Core Web Vitals** (under "Experience")
2. View performance for:
   - **LCP** (Largest Contentful Paint): Loading performance
   - **FID** (First Input Delay): Interactivity
   - **CLS** (Cumulative Layout Shift): Visual stability

### Target Scores:

- **Good**: Green (75th percentile or better)
- **Needs Improvement**: Yellow
- **Poor**: Red (requires attention)

---

## Part 9: Set Up Structured Data Monitoring

Monitor your rich results eligibility:

### Steps:

1. Go to **Enhancements** (in left sidebar)
2. View structured data reports:
   - **Breadcrumbs**: Navigation breadcrumbs
   - **Organization**: Business information
   - **Website**: Site search box

**Your site already has**:
- ✅ MedicalBusiness schema
- ✅ WebSite schema with search action
- ✅ BreadcrumbList schema

---

## Part 10: Regular Monitoring Schedule

### Weekly:
- Check **Performance** report for traffic trends
- Review **Coverage** report for indexing issues

### Monthly:
- Analyze **Search queries** to identify opportunities
- Review **Mobile Usability** report
- Check **Core Web Vitals** scores

### Quarterly:
- Audit **Structured data** implementation
- Review **Manual actions** (should be none)
- Update sitemap if site structure changed

---

## Troubleshooting Common Issues

### Verification Failed

**Problem**: "Verification failed" error

**Solutions**:
1. Check that verification code/file is correctly placed
2. Clear browser cache and try again
3. Wait 24-48 hours for DNS propagation (DNS method)
4. Ensure the file/meta tag is accessible publicly
5. Check for typos in verification code

### Sitemap Not Processed

**Problem**: "Couldn't fetch sitemap" error

**Solutions**:
1. Verify sitemap is accessible: `https://smartmedcon-jsnymp6w.manus.space/sitemap.xml`
2. Check sitemap syntax using [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
3. Ensure robots.txt allows sitemap access
4. Wait 24-48 hours and check again

### Pages Not Indexed

**Problem**: Pages aren't appearing in Google search

**Solutions**:
1. Check **Coverage** report for specific errors
2. Use **URL Inspection** tool to check individual pages
3. Request indexing manually
4. Ensure pages aren't blocked by robots.txt
5. Check for `noindex` meta tags
6. Verify canonical tags point to correct URLs

### Low Click-Through Rate (CTR)

**Problem**: High impressions but low clicks

**Solutions**:
1. Improve page titles and meta descriptions
2. Add structured data for rich results
3. Ensure titles match search intent
4. Use compelling calls-to-action in descriptions
5. Check that URLs are user-friendly

---

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters/)
- [SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Structured Data Testing Tool](https://search.google.com/test/rich-results)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Summary Checklist

- [ ] Create Google Search Console account
- [ ] Verify domain ownership (choose one method)
- [ ] Submit sitemap.xml
- [ ] Set up email notifications
- [ ] Monitor performance weekly
- [ ] Check indexing status regularly
- [ ] Review mobile usability
- [ ] Monitor Core Web Vitals
- [ ] Track structured data enhancements
- [ ] Request indexing for new pages

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google Search Console Help documentation
3. Contact Manus support for hosting-related issues
4. Use Google's community forums for SEO questions

---

**Last Updated**: February 26, 2026
**Website**: https://smartmedcon-jsnymp6w.manus.space
**Sitemap**: https://smartmedcon-jsnymp6w.manus.space/sitemap.xml

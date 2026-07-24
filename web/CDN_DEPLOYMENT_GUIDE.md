# CDN Configuration Guide for FleetGuard AI

## Overview

This guide covers CDN (Content Delivery Network) configuration for deploying FleetGuard AI's frontend assets. Proper CDN setup is crucial for meeting the 2-second page load requirement (Requirement 26.2).

## Why CDN Matters

**Benefits:**
- **Global Performance:** Serve assets from edge locations close to users
- **Reduced Latency:** 50-200ms improvement per request
- **Bandwidth Savings:** Offload static assets from origin server
- **Better Caching:** Long-term caching for immutable assets
- **DDoS Protection:** Built-in protection on most CDN platforms

**Expected Performance Impact:**
- Initial page load: 30-40% faster
- Subsequent visits: 60-70% faster (cached assets)
- Global users: 50-80% faster (edge locations)

## Deployment Options

### Option 1: Vercel (Recommended)

**Pros:**
- Zero configuration CDN
- Automatic edge deployment
- Built-in SSL/TLS
- HTTP/2 and HTTP/3 support
- Automatic asset optimization

**Setup:**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd web
vercel --prod
```

3. **Configure Custom Domain (Optional):**
```bash
vercel domains add fleetguard.yourdomain.com
```

4. **Environment Variables:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

5. **Create `vercel.json` for advanced config:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).css",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Expected Performance:**
- Global CDN with 300+ edge locations
- Asset caching: Automatic
- TTL: 31536000 seconds (1 year) for immutable assets

---

### Option 2: Netlify

**Pros:**
- Simple setup
- Automatic CDN
- Split testing support
- Deploy previews

**Setup:**

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Login:**
```bash
netlify login
```

3. **Initialize:**
```bash
cd web
netlify init
```

4. **Configure Build Settings:**

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

5. **Deploy:**
```bash
netlify deploy --prod
```

6. **Environment Variables:**
```bash
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
```

**Expected Performance:**
- Global CDN with 100+ edge locations
- Asset caching: Automatic
- Compression: Automatic (Brotli + Gzip)

---

### Option 3: Cloudflare Pages

**Pros:**
- Fastest CDN network
- Free tier included
- DDoS protection
- Web Analytics included

**Setup:**

1. **Install Wrangler CLI:**
```bash
npm install -g wrangler
```

2. **Login:**
```bash
wrangler login
```

3. **Deploy:**
```bash
cd web
npx wrangler pages publish dist --project-name fleetguard-ai
```

4. **Configure Headers:**

Create `public/_headers`:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.js
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.css
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/index.html
  Cache-Control: public, max-age=0, must-revalidate
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block

/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
```

5. **Configure Redirects:**

Create `public/_redirects`:
```
/*    /index.html   200
```

6. **Environment Variables:**
```bash
wrangler pages secret put VITE_SUPABASE_URL
wrangler pages secret put VITE_SUPABASE_ANON_KEY
```

**Expected Performance:**
- Global CDN with 300+ edge locations
- Fastest DNS resolution
- Automatic HTTP/3 support

---

### Option 4: AWS CloudFront + S3

**Pros:**
- Full AWS integration
- Advanced caching control
- Lambda@Edge for custom logic
- Best for enterprise

**Setup:**

1. **Create S3 Bucket:**
```bash
aws s3 mb s3://fleetguard-ai-frontend
aws s3 website s3://fleetguard-ai-frontend --index-document index.html
```

2. **Upload Build:**
```bash
cd web
npm run build
aws s3 sync dist/ s3://fleetguard-ai-frontend --delete
```

3. **Set Cache Headers:**
```bash
# Set long cache for assets
aws s3 cp s3://fleetguard-ai-frontend/assets/ s3://fleetguard-ai-frontend/assets/ \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable"

# Set no cache for index.html
aws s3 cp s3://fleetguard-ai-frontend/index.html s3://fleetguard-ai-frontend/index.html \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=0, must-revalidate"
```

4. **Create CloudFront Distribution:**

Create `cloudfront-config.json`:
```json
{
  "CallerReference": "fleetguard-ai-frontend",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-fleetguard-ai-frontend",
        "DomainName": "fleetguard-ai-frontend.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-fleetguard-ai-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/assets/*",
        "TargetOriginId": "S3-fleetguard-ai-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "Compress": true,
        "MinTTL": 31536000,
        "DefaultTTL": 31536000,
        "MaxTTL": 31536000
      },
      {
        "PathPattern": "/index.html",
        "TargetOriginId": "S3-fleetguard-ai-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "Compress": true,
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  },
  "Enabled": true
}
```

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

5. **Deployment Script:**

Create `deploy-aws.sh`:
```bash
#!/bin/bash
set -e

echo "Building frontend..."
npm run build

echo "Uploading to S3..."
aws s3 sync dist/ s3://fleetguard-ai-frontend --delete

echo "Setting cache headers..."
aws s3 cp s3://fleetguard-ai-frontend/assets/ s3://fleetguard-ai-frontend/assets/ \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript"

aws s3 cp s3://fleetguard-ai-frontend/index.html s3://fleetguard-ai-frontend/index.html \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=0, must-revalidate"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
```

**Expected Performance:**
- Global CDN with 400+ edge locations
- Full control over caching
- Integration with AWS services

---

## Cache Strategy

### Immutable Assets

**Pattern:** `/assets/*`, `*.js`, `*.css` with content hash

**Headers:**
```
Cache-Control: public, max-age=31536000, immutable
```

**Why:**
- Vite generates unique hashes for changed files
- Old files never change → safe to cache forever
- Browser won't revalidate until hard refresh

**Example:**
```
/assets/index-abc123def.js
/assets/main-xyz789uvw.css
```

### HTML Files

**Pattern:** `/index.html`, `/*.html`

**Headers:**
```
Cache-Control: public, max-age=0, must-revalidate
```

**Why:**
- HTML references hashed assets
- Must always fetch latest to get new asset references
- Fast validation with ETag/Last-Modified

### API Responses (Supabase)

**Pattern:** API calls via Supabase client

**Headers:**
```
Cache-Control: private, no-cache
```

**Why:**
- Data changes frequently
- User-specific content (RLS)
- React Query handles caching in memory

---

## Image Optimization

### 1. Use Modern Formats

Convert images to WebP with fallback:

```bash
# Install sharp
npm install sharp

# Create conversion script
node scripts/optimize-images.js
```

**optimize-images.js:**
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = './public/images';
const outputDir = './public/images/optimized';

fs.readdirSync(inputDir).forEach(file => {
  if (file.match(/\.(jpg|jpeg|png)$/)) {
    sharp(path.join(inputDir, file))
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, file.replace(/\.(jpg|jpeg|png)$/, '.webp')));
  }
});
```

### 2. Responsive Images

Generate multiple sizes:

```javascript
const sizes = [320, 640, 960, 1280, 1920];

sizes.forEach(width => {
  sharp(inputPath)
    .resize(width)
    .webp({ quality: 80 })
    .toFile(`${outputDir}/${name}-${width}w.webp`);
});
```

**Usage:**
```tsx
<LazyImage
  src="/images/vehicle.jpg"
  srcSet={`
    /images/vehicle-320w.webp 320w,
    /images/vehicle-640w.webp 640w,
    /images/vehicle-960w.webp 960w
  `}
  sizes="(max-width: 640px) 320px, (max-width: 960px) 640px, 960px"
  alt="Vehicle"
/>
```

### 3. CDN Image Optimization

**Cloudinary:**
```tsx
<LazyImage
  src="https://res.cloudinary.com/yourcloud/image/upload/f_auto,q_auto,w_800/vehicle.jpg"
  alt="Vehicle"
/>
```

**Imgix:**
```tsx
<LazyImage
  src="https://yoursite.imgix.net/vehicle.jpg?auto=format,compress&w=800"
  alt="Vehicle"
/>
```

---

## Performance Monitoring

### 1. Synthetic Monitoring

**Lighthouse CI:**

Create `.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['https://fleetguard.yourdomain.com'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

Run in CI/CD:
```bash
npm install -g @lhci/cli
lhci autorun
```

### 2. Real User Monitoring (RUM)

Set up in `src/main.tsx`:

```tsx
import { initPerformanceMonitoring } from './lib/performance';

// Send to analytics
initPerformanceMonitoring((metric) => {
  // Send to your analytics service
  fetch('https://api.yourdomain.com/analytics/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
      timestamp: Date.now(),
    }),
    keepalive: true,
  });
});
```

### 3. CDN Monitoring

**Cloudflare Analytics:**
- Built-in Web Analytics
- Core Web Vitals tracking
- Geographic performance breakdown

**AWS CloudWatch:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=YOUR_ID \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

---

## Troubleshooting

### Issue: Assets not caching

**Symptoms:** Every request downloads assets again

**Solutions:**
1. Check response headers in Network tab
2. Verify CDN cache settings
3. Check for query parameters in URLs
4. Ensure consistent asset hashing

### Issue: Stale content after deployment

**Symptoms:** Users see old version after deploy

**Solutions:**
1. Invalidate CDN cache
2. Update HTML cache headers
3. Implement cache-busting
4. Use versioned asset URLs

### Issue: Slow initial load in some regions

**Symptoms:** Fast in US, slow in Asia/Europe

**Solutions:**
1. Check CDN edge coverage
2. Enable HTTP/3
3. Optimize bundle size
4. Use regional origins

### Issue: High CDN costs

**Symptoms:** Unexpectedly high bills

**Solutions:**
1. Implement proper caching
2. Optimize asset sizes
3. Use compression (Brotli/Gzip)
4. Monitor bandwidth usage
5. Consider CDN with better pricing

---

## Checklist for Production

- [ ] CDN configured with global edge locations
- [ ] Cache headers set correctly
- [ ] SSL/TLS certificate installed
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Compression enabled (Brotli + Gzip)
- [ ] Custom domain configured
- [ ] Environment variables set
- [ ] Error pages configured (404, 500)
- [ ] Security headers set
- [ ] Performance monitoring enabled
- [ ] Invalidation strategy documented
- [ ] Deployment automation set up
- [ ] Rollback procedure documented

---

## Conclusion

Proper CDN configuration is critical for meeting the 2-second page load requirement. Choose the platform that best fits your infrastructure and follow the setup guide for optimal performance.

For most teams, **Vercel** or **Netlify** provide the best balance of ease-of-use and performance. For enterprise deployments with existing AWS infrastructure, **CloudFront** offers the most control and integration options.

# Vercel Deployment Guide - FleetGuard AI

## ✅ Step 1: Code is on GitHub (DONE!)

Your code has been successfully pushed to:
**https://github.com/supashoeb/fleetguard.git**

---

## 🚀 Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Website (Recommended for first deployment)

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Click "Sign Up" or "Login" (use your GitHub account)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose: `supashoeb/fleetguard`

3. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: web
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   
   Click "Environment Variables" and add these:
   
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
   
   **To get these values:**
   - Go to Supabase Dashboard: https://supabase.com/dashboard
   - Select your project: `ftywwrzkbtayapfiocck`
   - Go to Settings → API
   - Copy:
     - Project URL → `VITE_SUPABASE_URL`
     - Project API keys → anon/public → `VITE_SUPABASE_ANON_KEY`

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for deployment
   - You'll get a URL like: `https://fleetguard-xxx.vercel.app`

---

### Option B: Deploy via Vercel CLI (Alternative)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Navigate to web directory
cd web

# 4. Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? fleetguard-ai
# - Directory? ./
# - Override settings? N

# 5. Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste: https://ftywwrzkbtayapfiocck.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: your anon key from Supabase

# 6. Deploy to production
vercel --prod
```

---

## 🔧 Step 3: Configure Supabase for Production

After deploying to Vercel, you need to update Supabase settings:

### Update Allowed Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://your-app.vercel.app/**
   https://your-app.vercel.app/auth/callback
   ```

### Update Site URL

Set the Site URL to your Vercel domain:
```
https://your-app.vercel.app
```

---

## 📋 Step 4: Verify Deployment

### Test Your Deployed App

1. **Visit your Vercel URL**
   - Example: `https://fleetguard-xxx.vercel.app`

2. **Test Login**
   - Try to login with your test account
   - If redirects fail, check Supabase URL configuration

3. **Test Key Features**
   - Dashboard loads
   - Can add vehicles
   - Can view components
   - Navigation works

---

## 🔄 Step 5: Automatic Deployments

Vercel will now automatically deploy whenever you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update feature X"
git push origin master

# Vercel automatically deploys the new version!
```

---

## 🌐 Step 6: Custom Domain (Optional)

### Add Your Own Domain

1. **Buy a domain** (if you don't have one)
   - Namecheap, GoDaddy, Google Domains, etc.

2. **Add to Vercel**
   - Go to your Vercel project → Settings → Domains
   - Click "Add Domain"
   - Enter your domain: `fleetguard.com` or `app.fleetguard.com`

3. **Update DNS**
   - Vercel will show you DNS records to add
   - Add these to your domain provider's DNS settings:
     ```
     Type: CNAME
     Name: @  (or www)
     Value: cname.vercel-dns.com
     ```

4. **Update Supabase**
   - Add your custom domain to Supabase redirect URLs
   - Update Site URL to your custom domain

---

## 📱 What's Deployed

### Frontend (Vercel)
- ✅ React web application
- ✅ All pages and components
- ✅ Authentication flows
- ✅ Real-time updates
- ✅ Professional UI

### Backend (Supabase - Already Deployed)
- ✅ PostgreSQL database
- ✅ 27 edge functions
- ✅ Authentication system
- ✅ Row-level security
- ✅ Cron jobs
- ✅ Email notifications

---

## 🔐 Security Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Supabase redirect URLs configured
- [ ] Test login/signup flows
- [ ] Verify RLS policies are active
- [ ] Test email notifications
- [ ] Review user roles and permissions
- [ ] Enable Vercel password protection (optional, for staging)

---

## 🐛 Troubleshooting

### Issue: "Invalid redirect URL"
**Solution**: Add your Vercel URL to Supabase → Auth → Redirect URLs

### Issue: "Failed to fetch" or CORS errors
**Solution**: Check that `VITE_SUPABASE_URL` is set correctly in Vercel

### Issue: App loads but shows blank page
**Solution**: Check browser console for errors, verify environment variables

### Issue: Login works but redirects to localhost
**Solution**: Update Supabase Site URL to your Vercel domain

### Issue: Build fails on Vercel
**Solution**: 
- Check build logs in Vercel dashboard
- Verify `web` is set as root directory
- Ensure all dependencies are in `package.json`

---

## 📊 Monitoring & Analytics

### Vercel Analytics (Free)
- Go to your project → Analytics
- See page views, performance metrics
- Track user behavior

### Supabase Logs
- Go to Supabase Dashboard → Logs
- Monitor database queries
- Check edge function logs
- View authentication events

---

## 💰 Costs

### Current Setup (Free Tier)

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Vercel | Hobby | **$0/month** | 100 GB bandwidth, unlimited deployments |
| Supabase | Free | **$0/month** | 500 MB database, 2 GB bandwidth |
| GitHub | Free | **$0/month** | Unlimited public repos |
| **Total** | | **$0/month** | Perfect for MVP and testing |

### When to Upgrade

**Vercel Pro ($20/month)**:
- Need custom domain
- Need team collaboration
- Need password protection
- 1 TB bandwidth

**Supabase Pro ($25/month)**:
- Database > 500 MB
- Need more bandwidth
- Want daily backups
- Custom SMTP for emails

---

## 🎉 You're Live!

After following these steps:

✅ Your code is on GitHub
✅ Frontend is deployed on Vercel
✅ Backend is running on Supabase
✅ Automatic deployments configured
✅ Users can access your app globally

**Your app is now LIVE and accessible worldwide!** 🌍

---

## 🔗 Quick Links

- **GitHub Repo**: https://github.com/supashoeb/fleetguard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck
- **Vercel Dashboard**: https://vercel.com/dashboard (after you deploy)

---

## 📞 Next Steps After Deployment

1. **Share the URL** with your team for testing
2. **Add test data** through the UI
3. **Monitor logs** for any errors
4. **Gather feedback** from users
5. **Iterate and improve** based on usage

**Need help?** Check the logs in Vercel and Supabase dashboards!


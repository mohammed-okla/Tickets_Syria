# 🚀 Vercel Deployment Guide for Tickets E-Wallet

## Complete step-by-step guide to deploy your application on Vercel after GitHub setup

---

## 📋 **Prerequisites**

✅ Your code is pushed to GitHub  
✅ Supabase database is set up and running  
✅ All admin features are implemented  
✅ Environment variables are documented  

---

## 🔧 **Step 1: Prepare Your Repository**

### 1.1 Create/Update `vercel.json`
Create this file in your project root:

```json
{
  "framework": "vite",
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install",
  "devCommand": "bun run dev",
  "routes": [
    {
      "src": "/[^.]+",
      "dest": "/",
      "status": 200
    }
  ],
  "functions": {
    "app/**/*.tsx": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 1.2 Update `package.json` Scripts
Ensure these scripts exist:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

### 1.3 Create `.env.example`
Document your environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
VITE_APP_NAME=Tickets E-Wallet
VITE_APP_VERSION=1.0.0

# Optional: Analytics
VITE_ANALYTICS_ID=your_analytics_id
```

---

## 🌐 **Step 2: Deploy to Vercel**

### 2.1 Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Select your **tickets-ewallet** repository
5. Click **"Import"**

### 2.2 Configure Build Settings
Vercel should auto-detect these, but verify:

- **Framework Preset:** `Vite`
- **Build Command:** `bun run build`
- **Output Directory:** `dist`
- **Install Command:** `bun install`
- **Development Command:** `bun run dev`

### 2.3 Environment Variables Setup
In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add each variable:

```
Name: VITE_SUPABASE_URL
Value: https://your-project-id.supabase.co

Name: VITE_SUPABASE_ANON_KEY  
Value: your_actual_anon_key_from_supabase

Name: VITE_APP_NAME
Value: Tickets E-Wallet

Name: VITE_APP_VERSION
Value: 1.0.0
```

**Important:** Set these for **Production**, **Preview**, and **Development** environments.

---

## ⚙️ **Step 3: Configure Supabase for Production**

### 3.1 Update Supabase URL Settings
In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Add your Vercel domain to **Site URL**:
   ```
   https://your-app-name.vercel.app
   ```

3. Add to **Redirect URLs**:
   ```
   https://your-app-name.vercel.app/auth/callback
   https://your-app-name.vercel.app
   ```

### 3.2 Update CORS Settings
In Supabase **Authentication** → **URL Configuration**:
- Add your Vercel domain to allowed origins

---

## 🚀 **Step 4: Deploy and Test**

### 4.1 Initial Deployment
1. Click **"Deploy"** in Vercel
2. Wait for build to complete (usually 2-3 minutes)
3. Get your deployment URL: `https://your-app-name.vercel.app`

### 4.2 Test Deployment
Visit your app and test:

- ✅ **Homepage loads correctly**
- ✅ **Authentication works** (login/register)
- ✅ **Database connections work**
- ✅ **Admin features accessible**
- ✅ **All routes work** (no 404 errors)
- ✅ **Mobile responsive design**

---

## 🔧 **Step 5: Custom Domain (Optional)**

### 5.1 Add Custom Domain
1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain: `yourapp.com`
3. Follow DNS configuration instructions

### 5.2 Update Supabase URLs
Add your custom domain to Supabase URL settings:
```
https://yourapp.com
```

---

## 📊 **Step 6: Performance Optimization**

### 6.1 Enable Analytics
In Vercel dashboard:
1. Go to **Analytics** tab
2. Enable **Web Analytics**
3. Monitor performance metrics

### 6.2 Configure Edge Functions (Optional)
For better performance, you can enable edge caching:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=1, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

---

## 🔐 **Step 7: Security Configuration**

### 7.1 Environment Security
- ✅ **Never commit** `.env` files to Git
- ✅ **Use Vercel environment variables** for sensitive data
- ✅ **Rotate keys regularly**

### 7.2 Content Security Policy
Add to your `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' https://*.supabase.co;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
">
```

---

## 🎯 **Step 8: Continuous Deployment**

### 8.1 Auto-Deployment Setup
Vercel automatically deploys when you push to GitHub:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments  
- **Pull requests** → Preview deployments

### 8.2 Deployment Notifications
Configure Slack/Discord notifications:
1. Go to **Settings** → **Git Integration**
2. Add webhook URL for notifications

---

## 📱 **Step 9: Mobile & PWA Setup**

### 9.1 PWA Configuration
Add to `public/manifest.json`:

```json
{
  "name": "Tickets E-Wallet",
  "short_name": "TicketsApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/logo.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

### 9.2 Service Worker (Optional)
For offline functionality, add service worker configuration.

---

## 🧪 **Step 10: Testing Checklist**

### 10.1 Functional Testing
- [ ] User registration/login
- [ ] QR code scanning
- [ ] Payment processing
- [ ] Event management
- [ ] Admin dashboard
- [ ] Dispute resolution
- [ ] Withdrawal processing
- [ ] Mobile responsiveness

### 10.2 Performance Testing
- [ ] Page load speed < 3 seconds
- [ ] First Contentful Paint < 1.5s
- [ ] Lighthouse score > 90
- [ ] Mobile performance optimized

---

## 🚨 **Common Issues & Solutions**

### Issue 1: Build Fails
**Solution:** Check build logs in Vercel dashboard
```bash
# Common fixes:
- Update Node.js version to 18.x
- Clear build cache
- Check TypeScript errors
```

### Issue 2: Environment Variables Not Working
**Solution:** 
- Ensure variables start with `VITE_`
- Redeploy after adding variables
- Check spelling and casing

### Issue 3: Supabase Connection Errors
**Solution:**
- Verify Supabase URL in environment variables
- Check CORS settings in Supabase
- Ensure API keys are correct

### Issue 4: Routing Issues (404 errors)
**Solution:** Verify `vercel.json` routes configuration

---

## 📈 **Step 11: Monitoring & Maintenance**

### 11.1 Set Up Monitoring
- **Vercel Analytics:** Track performance
- **Supabase Logs:** Monitor database queries
- **Error Tracking:** Consider Sentry integration

### 11.2 Regular Maintenance
- **Weekly:** Check performance metrics
- **Monthly:** Update dependencies
- **Quarterly:** Security audit

---

## 🎉 **Deployment Complete!**

Your Tickets E-Wallet application is now live on Vercel! 

**Next Steps:**
1. Share the live URL with your team
2. Set up monitoring and alerts
3. Plan regular updates and maintenance
4. Collect user feedback for improvements

**Live URL:** `https://your-app-name.vercel.app`

---

## 📞 **Support Resources**

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Vite Deployment:** [vitejs.dev/guide/build.html](https://vitejs.dev/guide/build.html)

---

*Last Updated: August 2, 2025*
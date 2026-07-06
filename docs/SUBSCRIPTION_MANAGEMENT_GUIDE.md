# Subscription Management Guide

## How Users Can View and Manage Their Subscription

### 1. **Header Badge (Always Visible)**
- **Location:** Top right of the header
- **What it shows:**
  - Premium users see a blue "Premium" badge
  - Pro users see a purple "Pro" badge
  - Free users see "Upgrade to Premium" button
- **Action:** Clicking the badge takes you to `/subscription` page

### 2. **User Menu Dropdown**
- **Location:** Click on your profile picture/name in the header
- **Option:** "Subscription" link
- **Action:** Takes you directly to `/subscription` page

### 3. **Settings Modal - Subscription Tab** ⭐ NEW
- **Location:** 
  1. Click your profile picture → "Settings"
  2. Click the "Subscription" tab
- **What it shows:**
  - Current subscription tier (Free/Premium/Pro)
  - Subscription status (Active/Cancelled)
  - Billing cycle (Monthly/Yearly)
  - Renewal/End date
  - Your current limits:
    - Routes per day
    - Saved roads
    - Offline map regions
    - Offline map storage
  - Warning if subscription is cancelled
- **Actions:**
  - "Manage Subscription" button → Goes to full subscription page

### 4. **Subscription Page (`/subscription`)**
- **Location:** Direct URL or via any of the above methods
- **What it shows:**
  - **Current Subscription Status Card:**
    - Current plan name
    - Status (Active/Cancelled)
    - Renewal date
    - Billing cycle
    - Cancel/Resume buttons
  
  - **Usage Statistics:**
    - Routes calculated this month
    - Total distance
  
  - **All Available Plans:**
    - Free, Premium, Pro plans with features
    - Pricing (monthly/yearly)
    - Upgrade/Subscribe buttons
    - "Current Plan" indicator

- **Actions Available:**
  - ✅ **Cancel Subscription:** Cancels at period end
  - ✅ **Resume Subscription:** Reactivates cancelled subscription
  - ✅ **Upgrade/Downgrade:** Change to different plan
  - ✅ **Change Billing Cycle:** Switch between monthly/yearly

---

## Quick Access Summary

| Location | What You See | Action |
|----------|--------------|--------|
| **Header Badge** | Premium/Pro badge or "Upgrade" | Click → Subscription page |
| **User Menu** | "Subscription" link | Click → Subscription page |
| **Settings Modal** | Full subscription details & limits | View status, click "Manage" |
| **Subscription Page** | Complete subscription management | Cancel, Resume, Upgrade, etc. |

---

## Subscription Status Indicators

### Active Subscription
- ✅ Green "Active" status
- Shows renewal date
- "Cancel Subscription" button available

### Cancelled Subscription
- ⚠️ Yellow warning banner
- Shows end date
- "Resume Subscription" button available
- Access continues until period end

### Free Tier
- Shows "Free Plan"
- "View Plans & Upgrade" button
- No subscription details

---

## Managing Your Subscription

### To Cancel:
1. Go to Settings → Subscription tab, OR
2. Go to `/subscription` page
3. Click "Cancel Subscription"
4. Confirm cancellation
5. Subscription ends at period end (you keep access until then)

### To Resume:
1. Go to Settings → Subscription tab, OR
2. Go to `/subscription` page
3. Click "Resume Subscription"
4. Subscription reactivates immediately

### To Upgrade:
1. Go to `/subscription` page
2. Click "Upgrade Monthly" or "Upgrade Yearly" on desired plan
3. Complete Stripe checkout
4. Subscription activates immediately

### To Change Plan:
1. Go to `/subscription` page
2. Select new plan
3. Complete checkout
4. Old subscription cancels, new one starts

---

## What Information is Shown

### In Settings Modal:
- ✅ Current tier (Free/Premium/Pro)
- ✅ Status (Active/Cancelled)
- ✅ Billing cycle
- ✅ Renewal/End date
- ✅ Your limits (routes, saved roads, offline maps)
- ✅ Link to full management page

### On Subscription Page:
- ✅ All of the above, PLUS:
- ✅ Usage statistics
- ✅ All available plans
- ✅ Cancel/Resume buttons
- ✅ Upgrade options

---

## Best Practices

1. **Check Status Regularly:** Use Settings → Subscription tab for quick status check
2. **Manage from Subscription Page:** Use `/subscription` for all changes
3. **Monitor Usage:** Check usage statistics to see if you need to upgrade
4. **Cancel Early:** Cancel before renewal if you don't want to continue
5. **Resume Anytime:** You can resume a cancelled subscription before it ends

---

## Troubleshooting

### Can't see subscription status?
- Make sure you're logged in
- Refresh the page
- Check if subscription is synced (contact support if needed)

### Badge not showing?
- Free users won't see a badge (they see "Upgrade" button)
- Premium/Pro users should see badge in header
- If missing, subscription may not be synced

### Can't cancel/resume?
- Make sure you have an active subscription
- Check if you're on the correct page (`/subscription`)
- Try refreshing the page

---

## Support

If you have issues managing your subscription:
1. Check Settings → Subscription tab for current status
2. Visit `/subscription` page for full management
3. Contact support if problems persist



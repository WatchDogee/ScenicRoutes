# Critical Issues To Fix

## 🔴 CRITICAL: User Registration Broken (500 Error)

**Status:** BLOCKING - Users cannot register  
**Priority:** CRITICAL  
**Date Reported:** January 21, 2026

### Issue:
- Registration form fails with 500 Internal Server Error
- Also shows 422 Unprocessable Content errors
- Error message: "The username has already been taken"
- Happens even with new usernames that should be unique

### Error Details:
```
api/register:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/register:1  Failed to load resource: the server responded with a status of 422 (Unprocessable Content)
```

### Attempted Usernames (All Failed):
- test_emailsend@example.com
- test_send@example.com

### Root Cause Analysis Needed:
- [ ] Check Laravel logs for actual error (storage/logs/laravel.log)
- [ ] Verify email sending not causing 500 error (Resend integration)
- [ ] Check database connection
- [ ] Verify user validation rules
- [ ] Check if username uniqueness validation is correct

### Likely Cause:
**Email sending failure** - Registration likely tries to send verification email, which fails and causes 500 error. The Resend integration may need:
- Verification that API key is working
- FROM address properly configured
- Error handling for failed email sends (shouldn't block registration)

### Fix Priority:
1. **Immediate:** Add try-catch around email sending in registration - don't block registration if email fails
2. **Verify:** Test Resend API key and configuration
3. **Long-term:** Queue email sending instead of synchronous

### Files to Check:
- `app/Http/Controllers/AuthController.php` - Registration logic
- `config/mail.php` - Resend configuration
- `.env` - RESEND_API_KEY, MAIL_FROM_ADDRESS
- `storage/logs/laravel.log` - Error details

---

## 🔴 CRITICAL: Password Recovery Page 404

**Status:** BLOCKING - Users cannot recover passwords  
**Priority:** CRITICAL  
**Date Reported:** January 21, 2026

### Issue:
Password recovery page returns 404 Not Found error.

### Error Details:
```
GET http://localhost:8000/recover-password 404 (Not Found)
```

### Root Cause:
- Route `/recover-password` not defined or incorrectly named
- Frontend may be pointing to wrong URL
- Web routes may not include password recovery route

### Files to Check:
- `routes/web.php` - Check if recover-password route exists
- Frontend route configuration - May be using wrong URL
- Should likely be `/forgot-password` or `/reset-password` instead

### Fix:
- Add missing route OR
- Update frontend to use correct password reset URL

---

## 🎨 UI Issue: Back to Map Button Color

**Status:** OPEN  
**Priority:** MEDIUM (UI Polish)  
**Date Reported:** January 21, 2026

### Issue:
Registration screen "Back to Map" button (upper right X) is bright purple, doesn't match app design.

### Expected:
Button should match the color scheme used in /map route (likely muted/neutral colors).

### Location:
- Registration modal/screen
- Upper right corner X button

### Fix:
Update button color to match app theme (check MapScreen colors).

---

## 🔴 CRITICAL: Usage Statistics Not Working

**Status:** OPEN  
**Priority:** HIGH  
**Date Reported:** January 23, 2026

### Issue:
Usage statistics page/feature is not functioning correctly.

### Details:
- Statistics page is not displaying data
- May be related to subscription sync or data collection
- Needs investigation to determine root cause

### To Investigate:
- [ ] Check if statistics endpoint is returning data
- [ ] Verify frontend is correctly fetching/displaying statistics
- [ ] Check database queries for usage tracking
- [ ] Verify statistics are being recorded for user actions

### Files to Check:
- Statistics API endpoints
- Usage tracking middleware/services
- Frontend statistics components
- Database statistics tables

---

## 🎨 UI/Content: Subscription Page Needs Feature Description Rework

**Status:** OPEN  
**Priority:** MEDIUM  
**Date Reported:** January 23, 2026

### Issue:
The subscription/pricing page describes paid features that don't match the actual implementation.

### Problem:
- Feature descriptions are outdated or incorrect
- Users may be confused about what each tier includes
- Premium/Pro tier benefits need to accurately reflect current features

### Required Changes:
- [ ] Review current feature set for Free/Premium/Pro tiers
- [ ] Update subscription page copy to match reality
- [ ] Ensure offline maps limits are correctly stated (Free: 0 regions, Premium: no region limit/500MB, Pro: Unlimited)
- [ ] Verify route planning limits are accurate
- [ ] Check other tier-specific features are correctly described

### Files to Check:
- `resources/js/Pages/Subscription.jsx` - Main subscription page
- `resources/js/Components/SettingsModal.jsx` - Subscription section
- Any pricing/features documentation

---

## Test Users (Reference)

For testing after registration is fixed:
- **test_free** / test_free@example.com / Password123!
- **test_premium** / test_premium@example.com / Password123!  
- **test_pro** / test_pro@example.com / Password123!


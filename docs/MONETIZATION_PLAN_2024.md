# ScenicRoutes Monetization Plan 2024

## Executive Summary

**Current Status:**
- Route planning features working
- Paywalls implemented: alternative routes, round trip (>300km), extra curvy, offline maps
- Stripe integration in place but needs local testing setup
- Need to differentiate from Kurviger (€29.99/year) and Calimoto (€59.99/year)

**Key Issues:**
1. Upgrade error fixed: `plan_id` field now correctly sent
2. Offline maps alerts replaced with toast notifications
3. GraphHopper TOS concern: Need paid API or self-hosted for premium features

---

## Competitive Analysis

### Kurviger (€29.99/year)
- **Strengths:** Affordable, extensive customization, offline maps, GPX export, web planner
- **Weaknesses:** Less polished UI, overwhelming for beginners, Android-only
- **Key Features:** Multiple routing modes, POI integration, voice navigation

### Calimoto (€59.99/year)
- **Strengths:** Intuitive UI, comprehensive POI database, ride analytics, weather forecasts
- **Weaknesses:** More expensive, navigation requires premium
- **Key Features:** Super Curvy mode, ride recording, lean angle tracking, route recommendations

### ScenicRoutes Differentiation Strategy

**1. Web-First Approach**
- Full-featured web app (competitors focus on mobile)
- Desktop route planning with large screen optimization
- Share routes via web links (no app install required)

**2. Social Features**
- Community roads discovery (unique)
- Route reviews and ratings
- Collections and follows
- Leaderboards

**3. Pricing Advantage**
- Competitive pricing: Premium €8-10/month, Pro €15-18/month
- Yearly discounts: Save 20-30%
- Free tier: Unlimited routes (competitive advantage)

**4. Unique Features**
- Offline maps with custom region selection
- Weather integration along routes
- Saved roads with community visibility
- Route planning with waypoint optimization

---

## Monetization Strategy

### Subscription Tiers

#### Free Tier
**Price:** €0/month

**Features:**
- ✅ Unlimited route calculations
- ✅ Basic curvature levels (straightest, balanced, curvy)
- ✅ Unlimited saved roads
- ✅ Community roads discovery
- ✅ Route reviews and ratings
- ✅ Basic route planning
- ❌ Extra curvy routes
- ❌ Round trips > 300km
- ❌ Alternative routes
- ❌ Offline maps
- ❌ GPX export
- ❌ Turn-by-turn navigation

**Value Proposition:** "Try everything, upgrade when you need more"

#### Premium Tier
**Price:** €2.99/month or €29/year (save €6.88/year)

**Competitive Position:** Matches Kurviger Tourer+ (€30/year)

**Features:**
- ✅ Everything in Free
- ✅ Extra curvy routes
- ✅ Unlimited round trips
- ✅ Alternative routes (up to 3)
- ✅ Offline maps (no region limit, 500MB)
- ✅ GPX export
- ✅ Turn-by-turn navigation
- ✅ Ride recording
- ✅ Private roads
- ✅ Route analytics

**Value Proposition:** "For serious riders who want the best routes"

#### Pro Tier
**Price:** €5.99/month or €59/year (save €12.88/year)

**Competitive Position:** Beats Calimoto (€60/year)

**Features:**
- ✅ Everything in Premium
- ✅ Unlimited offline maps
- ✅ API access
- ✅ Priority support
- ✅ Advanced analytics
- ✅ Custom route templates
- ✅ Bulk route export

**Value Proposition:** "For power users and developers"

---

## Feature Paywall Status

### ✅ Currently Paywalled
1. **Extra Curvy Routes** - Premium/Pro only
2. **Round Trips > 300km** - Premium/Pro only
3. **Alternative Routes** - Premium/Pro only
4. **Offline Maps** - Premium/Pro only
5. **GPX Export** - Premium/Pro only (not yet implemented)

### ⚠️ Needs Implementation
1. **Turn-by-Turn Navigation** - Premium/Pro only
2. **Ride Recording** - Premium/Pro only
3. **Route Analytics** - Premium/Pro only
4. **Private Roads** - Premium/Pro only
5. **API Access** - Pro only

### 🔄 Free Tier Features (Competitive Advantage)
1. **Unlimited Routes** - No daily limits
2. **Unlimited Saved Roads** - No storage limits
3. **Community Features** - Reviews, collections, follows
4. **Basic Curvature** - Straightest, balanced, curvy

---

## Recommended New Features

### High Priority (Differentiation)

**1. Route Weather Forecast**
- Show weather along route segments
- Precipitation probability
- Temperature ranges
- Wind conditions
- **Monetization:** Free tier: 3-day forecast, Premium: 7-day, Pro: 14-day

**2. Route Difficulty Scoring**
- Rate routes by difficulty (beginner/intermediate/advanced)
- Based on curvature, elevation, road conditions
- Filter routes by difficulty
- **Monetization:** Free tier: Basic score, Premium: Detailed breakdown

**3. Route Collections Marketplace**
- Users can create and sell route collections
- "Best Routes in [Region]" collections
- Revenue sharing model
- **Monetization:** Platform takes 20%, creator gets 80%

**4. Route Sharing & Collaboration**
- Share routes with friends
- Collaborative route planning
- Group ride planning
- **Monetization:** Free tier: 3 collaborators, Premium: 10, Pro: Unlimited

**5. Elevation Profile Analysis**
- Detailed elevation charts
- Climb difficulty ratings
- Best time to ride (temperature)
- **Monetization:** Premium/Pro feature

### Medium Priority

**6. POI Integration**
- Gas stations, restaurants, hotels along route
- Filter by type
- Add custom POIs
- **Monetization:** Free tier: Basic POIs, Premium: All POIs + custom

**7. Route Optimization**
- Optimize waypoint order
- Time-based routing (avoid rush hour)
- Multi-stop optimization
- **Monetization:** Premium/Pro feature

**8. Route Templates**
- Save route templates
- Quick route creation from templates
- Share templates
- **Monetization:** Free tier: 3 templates, Premium: 20, Pro: Unlimited

**9. Route History & Statistics**
- Track routes you've ridden
- Statistics dashboard
- Personal bests
- **Monetization:** Free tier: Last 10 routes, Premium: Unlimited

**10. Social Features Enhancement**
- Route challenges
- Leaderboards
- Achievements/badges
- **Monetization:** Free tier: Basic, Premium: Advanced stats

---

## Pricing Strategy

### Current Pricing (Updated - Competitive)

| Tier | Monthly | Yearly | Savings | Competitive Position |
|------|---------|--------|----------|----------------------|
| Free | €0 | €0 | - | - |
| Premium | €2.99 | €29 | €6.88/year | Matches Kurviger Tourer+ (€30/year) |
| Pro | €5.99 | €59 | €12.88/year | Beats Calimoto (€60/year) |

### Competitive Positioning

- **Kurviger Tourer:** €14.99/year
- **Kurviger Tourer+:** €30/year
- **Calimoto:** €60/year or €10/week
- **ScenicRoutes Premium:** €29/year - **Matches Kurviger Tourer+**
- **ScenicRoutes Pro:** €59/year - **Beats Calimoto**

**Strategy:** Competitive pricing to guarantee sales, with room to increase when converting to paid GraphHopper:
- Premium matches Kurviger Tourer+ pricing
- Pro beats Calimoto annual pricing
- Monthly options provide flexibility
- Yearly discounts encourage annual subscriptions

---

## Revenue Projections

### Conservative (1,000 users, 5% conversion)
- 950 Free: €0
- 45 Premium (€29/year): €1,305/year = €109/month
- 5 Pro (€59/year): €295/year = €25/month
- **Total: €134/month**

### Moderate (5,000 users, 8% conversion)
- 4,600 Free: €0
- 350 Premium: €10,150/year = €846/month
- 50 Pro: €2,950/year = €246/month
- **Total: €1,092/month**

### Optimistic (10,000 users, 10% conversion)
- 9,000 Free: €0
- 800 Premium: €23,200/year = €1,933/month
- 200 Pro: €11,800/year = €983/month
- **Total: €2,916/month**

**Note:** Lower pricing means higher conversion rates expected. With competitive pricing, target 10-15% conversion rate.

---

## Implementation Roadmap

### Phase 1: Fix Critical Issues (Week 1)
- ✅ Fix upgrade error (plan_id)
- ✅ Replace alerts with toasts
- ⏳ Set up Stripe local testing
- ⏳ Verify paywall enforcement

### Phase 2: Feature Completion (Weeks 2-4)
- Implement GPX export (Premium/Pro)
- Implement turn-by-turn navigation (Premium/Pro)
- Implement ride recording (Premium/Pro)
- Add route analytics dashboard

### Phase 3: Differentiation Features (Weeks 5-8)
- Route weather forecast
- Route difficulty scoring
- Elevation profile analysis
- Enhanced social features

### Phase 4: Marketing & Growth (Ongoing)
- SEO optimization
- Social media presence
- Community building
- Partnership with motorcycle clubs

---

## GraphHopper TOS Compliance

### Current Situation
- Using GraphHopper Cloud API (free tier: 500 routes/day)
- Premium features (extra curvy) available to paying customers

### TOS Compliance Options

**Option 1: Paid GraphHopper Plan** (Recommended)
- Upgrade to paid plan (€49-199/month depending on usage)
- Allows commercial use of premium features
- Better rate limits and support

**Option 2: Self-Hosted GraphHopper**
- Deploy GraphHopper on own VPS (€20-40/month)
- Full control, no API limits
- Requires technical maintenance

**Option 3: Rate Limiting**
- Limit free tier to 500 routes/day
- Premium/Pro: Use paid API or self-hosted
- Clear separation of free vs paid infrastructure

**Recommendation:** Option 1 (Paid GraphHopper Plan) for simplicity and compliance.

---

## Next Steps

1. **Immediate:**
   - Set up Stripe local testing (see STRIPE_LOCAL_SETUP.md)
   - Test upgrade flow end-to-end
   - Verify all paywalls are enforced

2. **Short-term:**
   - Implement missing premium features (GPX export, navigation)
   - Add route analytics
   - Improve upgrade prompts

3. **Medium-term:**
   - Implement differentiation features
   - Launch marketing campaign
   - Build community

4. **Long-term:**
   - Expand to iOS app
   - Add route marketplace
   - International expansion

---

## Success Metrics

- **Conversion Rate:** Target 8-10% free to paid
- **Churn Rate:** Target <5% monthly
- **ARPU:** Target €10-12/month average
- **LTV:** Target €200-300 per customer
- **CAC:** Target <€50 per customer

---

## Risk Mitigation

1. **Competition:** Focus on web-first and social features
2. **Pricing:** Start competitive, adjust based on demand
3. **Technical:** Ensure GraphHopper compliance
4. **Churn:** Focus on value delivery and engagement
5. **Scaling:** Plan infrastructure for growth




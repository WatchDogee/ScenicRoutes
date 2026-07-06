# Deployment Checklist

- [x] Voice guidance restored (instructions parsed and TTS wired)
- [x] Reroute thresholds increased and hysteresis added
- [x] Account deletion API implemented (DELETE /account) and Android UI wired
- [ ] Google Play Billing sandbox users configured and tested
- [ ] Weather API 400s handled ("Missing coordinates")
- [ ] Backend honoring high-density reroute geometry consistently

Notes:
- Android Settings now includes a deletion flow with confirmation.
- Backend deletes user content (roads, collections, rides, photos, reviews), cancels subscriptions, and removes relationships.


# GitHub API Rate Limits - Complete Guide

## What is "Rate Limit Exceeded"?

GitHub API has **rate limits** - a maximum number of API requests you can make per hour. This prevents abuse and ensures fair usage.

### Rate Limit Tiers:

1. **Unauthenticated Requests (No Token):**
   - **60 requests per hour** ⚠️ Very low!
   - Based on your IP address
   - Easy to hit this limit

2. **Authenticated Requests (With Token):**
   - **5,000 requests per hour** ✅ Much better!
   - Based on your GitHub account
   - 83x more requests available

## Why You're Hitting Rate Limits

Your app is currently making **unauthenticated requests** because:
- The token in `.env` was named `NEXT_PUBLIC_GITHUB_TOKEN` 
- But the code looks for `GITHUB_TOKEN` (server-side)
- So the token wasn't being used!

**Result:** Only 60 requests/hour instead of 5,000!

## Solutions to Prevent Rate Limits

### ✅ Solution 1: Use GitHub Token (FIXED)

I've updated your `.env` file to use `GITHUB_TOKEN` instead of `NEXT_PUBLIC_GITHUB_TOKEN`.

**Benefits:**
- 5,000 requests/hour instead of 60
- 83x more capacity
- Should prevent most rate limit issues

**Note:** Restart your dev server after changing `.env`:
```bash
npm run dev
```

### ✅ Solution 2: Improve Caching (ALREADY IMPLEMENTED)

We've added caching to reduce API calls:
- **Repo Activity:** Cached for 5 minutes
- **Chart Data:** Cached for 15 minutes
- **Inactivity Data:** Cached

This means:
- Same data won't be fetched multiple times
- Reduces API calls significantly
- Better performance

### ✅ Solution 3: Reduce API Calls

**Current optimizations:**
- ✅ Caching implemented
- ✅ Batch requests where possible
- ✅ Only fetch what's needed
- ✅ Skip auto-refresh when rate limited

**Additional optimizations you can make:**
1. Increase cache duration for less-frequently-changing data
2. Fetch fewer repos at once
3. Reduce pagination (currently fetches up to 3 pages per repo)

### ✅ Solution 4: Use GitHub App (Advanced)

For even higher limits:
- **GitHub Apps:** 15,000 requests/hour
- Requires setting up a GitHub App
- More complex but best for production

## How to Check Your Rate Limit Status

GitHub API returns rate limit info in response headers:
- `X-RateLimit-Limit`: Total requests allowed (60 or 5000)
- `X-RateLimit-Remaining`: Requests left in current hour
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Best Practices

1. **Always use authentication** - Get 5,000 requests/hour
2. **Cache aggressively** - Don't refetch same data
3. **Batch requests** - Combine multiple calls when possible
4. **Handle errors gracefully** - Show cached data when rate limited
5. **Monitor usage** - Check rate limit headers

## Current Status

✅ **Fixed:** Token now properly configured  
✅ **Implemented:** Caching for all data  
✅ **Implemented:** Rate limit detection and handling  
✅ **Implemented:** Fallback to cached data  

After restarting your server, you should have **5,000 requests/hour** instead of 60!

## Troubleshooting

**Still hitting rate limits?**
1. Check if token is valid: Visit https://github.com/settings/tokens
2. Verify token has correct permissions (read-only is fine)
3. Check server logs for authentication errors
4. Monitor rate limit headers in network tab

**Token not working?**
- Make sure it's in `.env` (not `.env.local`)
- Restart dev server after changing `.env`
- Check token hasn't expired
- Verify token format: `github_pat_...` or `ghp_...`

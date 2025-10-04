# Apify Integration Setup

This document explains how to set up the Apify integration for Twitter monitoring.

## Prerequisites

1. **Apify Account**: Sign up at [apify.com](https://apify.com)
2. **API Token**: Get your API token from Apify dashboard
3. **Environment Variables**: Add the required variables to your `.env` file

## Environment Variables

Add these to your `.env` file:

```bash
# Apify Configuration
APIFY_API_TOKEN=your_apify_api_token_here

# Optional: ElevenLabs for voice synthesis
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## Apify Setup Steps

### 1. Create Apify Account

- Go to [apify.com](https://apify.com)
- Sign up for a free account
- Get your API token from the dashboard

### 2. Choose Your Plan

- **Free**: 1,000 compute units/month (good for testing)
- **Starter**: $39/month for 10,000 compute units
- **Scale**: $199/month for 50,000 compute units (recommended for production)

### 3. Configure Actors

The integration uses these Apify actors:

- **Twitter User Tweets Scraper**: `apnow/twitter-user-tweets-scraper`
- **Twitter Search Scraper**: `apnow/twitter-search-scraper` (future)

## Cost Optimization

### Batch Processing

- Multiple accounts are processed in batches of 5
- Reduces API calls and costs
- Cache prevents duplicate requests

### Smart Monitoring

- Only monitors active accounts
- 2-minute intervals (configurable)
- Automatic cache management

### Estimated Costs

- **100 users**: ~$50-100/month
- **500 users**: ~$200-400/month
- **1000 users**: ~$400-800/month

## Testing

Run the test script to verify everything works:

```bash
npx ts-node src/scripts/test-monitoring.ts
```

## Monitoring Endpoints

### Start Monitoring

```bash
POST /api/monitoring/start
```

### Stop Monitoring

```bash
POST /api/monitoring/stop
```

### Get Status

```bash
GET /api/monitoring/start
```

## Troubleshooting

### Common Issues

1. **API Token Invalid**

   - Check your Apify API token
   - Ensure it has the correct permissions

2. **Rate Limiting**

   - Apify has rate limits
   - The system includes automatic retry logic

3. **Actor Failures**
   - Twitter may block some requests
   - The system will retry with exponential backoff

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=apify:*
```

## Production Considerations

1. **Monitoring**: Set up alerts for Apify usage
2. **Scaling**: Monitor costs and adjust batch sizes
3. **Backup**: Consider fallback strategies
4. **Security**: Keep API tokens secure

## Support

- Apify Documentation: [docs.apify.com](https://docs.apify.com)
- Apify Support: [apify.com/contact](https://apify.com/contact)
- This Project Issues: [GitHub Issues](https://github.com/your-repo/issues)

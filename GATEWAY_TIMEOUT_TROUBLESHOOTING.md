# Troubleshooting Gateway Timeout (504) Errors in Coolify

This guide provides steps to resolve gateway timeout (504) errors when deploying ScenicRoutes with Coolify.

## Understanding Gateway Timeouts

A gateway timeout (504 error) occurs when a server acting as a gateway or proxy does not receive a timely response from an upstream server. In the context of Coolify deployments, this typically means:

1. A deployment command is taking too long to complete
2. The database connection is timing out
3. The server is under heavy load or has insufficient resources
4. Network issues are preventing proper communication

## Quick Fixes

Try these quick fixes first:

1. **Restart the deployment**: Sometimes simply restarting the deployment process can resolve the issue
2. **Check server resources**: Ensure your server has enough CPU, memory, and disk space
3. **Verify database connectivity**: Make sure your database is running and accessible

## Step-by-Step Troubleshooting

### 1. Check Coolify Logs

First, examine the deployment logs:

1. Go to your Coolify dashboard
2. Navigate to your ScenicRoutes resource
3. Click on "Logs" to see what's happening during deployment
4. Look for errors or commands that might be timing out

### 2. Verify Database Connection

Database issues are a common cause of timeouts:

1. Check if your database service is running in Coolify
2. Verify the database credentials in your environment variables
3. Try connecting to the database manually to confirm it's accessible
4. Visit `/debug.php` on your deployed site to check database connectivity

### 3. Optimize Deployment Commands

Long-running commands can cause timeouts:

1. Split complex commands into smaller steps
2. Add `--no-interaction` flags to prevent commands from waiting for input
3. Use `npm ci` instead of `npm install` for faster package installation
4. Consider skipping non-essential steps during initial deployment

### 4. Increase Timeout Settings

Adjust timeout settings in your configuration:

1. Increase `fastcgi_read_timeout`, `fastcgi_connect_timeout`, and `fastcgi_send_timeout` in Nginx
2. Extend the healthcheck timeout and interval in docker-compose.yml
3. Increase PHP's `max_execution_time` in your environment variables

### 5. Check for Resource Constraints

Server resource limitations can cause timeouts:

1. Monitor CPU, memory, and disk usage during deployment
2. Consider upgrading to a server with more resources
3. Close unnecessary services to free up resources during deployment

### 6. Network Issues

Network problems can lead to timeouts:

1. Check if your server can access external resources (npm, composer repositories)
2. Verify that internal services can communicate with each other
3. Check for firewall rules that might be blocking connections

## Advanced Troubleshooting

If the above steps don't resolve the issue:

### Staged Deployment

Consider a staged deployment approach:

1. Deploy a minimal version of the application first (without migrations)
2. Run migrations separately after the initial deployment
3. Build assets locally and upload them instead of building during deployment

### Manual Intervention

Sometimes manual steps are needed:

1. SSH into your server
2. Navigate to your application directory
3. Run problematic commands manually to see detailed error messages
4. Fix issues and then redeploy

### Database Optimization

If database operations are causing timeouts:

1. Optimize slow migrations
2. Consider running migrations with the `--force --no-interaction` flags
3. For large databases, consider running migrations separately from deployment

## Preventive Measures

To prevent future timeout issues:

1. Regularly monitor server resources
2. Optimize database queries and indexes
3. Keep deployment scripts efficient and modular
4. Consider implementing a CI/CD pipeline that builds assets before deployment
5. Use the `/health.php` endpoint to monitor application health

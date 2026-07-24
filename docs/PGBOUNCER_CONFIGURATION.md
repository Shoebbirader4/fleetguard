# PgBouncer Connection Pooling Configuration Guide

## Overview

This guide documents the PgBouncer connection pooling configuration for FleetGuard AI to achieve sub-second query response times and support up to 100 concurrent users per tenant.

**Requirements:**
- **Requirement 26.5**: Handle concurrent user sessions with minimum 100 concurrent users per tenant
- **Requirement 26.6**: Implement database connection pooling and query optimization for sub-second response times

## What is PgBouncer?

PgBouncer is a lightweight connection pooler for PostgreSQL that:
- Reduces connection overhead by reusing database connections
- Prevents database connection exhaustion under high load
- Improves application performance by minimizing connection latency
- Supports multiple pooling modes (session, transaction, statement)

## Supabase Built-in PgBouncer

Supabase includes **built-in PgBouncer connection pooling** in all plans, automatically configured and managed. You don't need to install or configure PgBouncer separately.

### Connection Endpoints

Supabase provides two connection endpoints:

#### 1. Direct Connection (Port 5432)
```
postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Use for:**
- Database migrations
- Schema changes and DDL operations
- Admin operations and maintenance
- LISTEN/NOTIFY subscriptions
- Prepared statement management
- Connection-level session variables

**Limitations:**
- Limited connections (15-100 depending on plan)
- Higher connection overhead
- Not suitable for high-frequency API calls

#### 2. Pooled Connection (Port 6543) ✅ RECOMMENDED
```
postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres
```

**Use for:**
- All application queries (SELECT, INSERT, UPDATE, DELETE)
- Edge Functions and API calls
- Frontend application database calls
- High-frequency query operations

**Benefits:**
- More available connections (45-300 depending on plan)
- Lower latency for short-lived queries
- Automatic connection reuse
- Better resource utilization

### Connection Limits by Supabase Plan

| Plan | Direct Connections | Pooled Connections | Total |
|------|-------------------|-------------------|-------|
| Free | 15 | 45 | 60 |
| Pro | 50 | 150 | 200 |
| Team | 100 | 300 | 400 |
| Enterprise | Custom | Custom | Custom |

## FleetGuard AI Configuration Strategy

### 1. Connection Allocation

**Recommended allocation for Pro Plan (200 total connections):**
- **Direct Connections (50)**: Reserve for migrations and admin operations
- **Pooled Connections (150)**: Use for application layer
  - Edge Functions: 10 connections per function × 10 functions = 100 connections
  - Reserved for burst capacity: 50 connections

### 2. Application-Level Pooling

Even with PgBouncer, implement connection pooling in your application layer:

#### Edge Functions Configuration (Deno)

```typescript
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with pooled connection
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  {
    db: {
      // Use pooled connection string (port 6543)
      schema: 'public',
    },
    auth: {
      persistSession: false, // Edge functions are stateless
      autoRefreshToken: false,
    },
    global: {
      // Configure fetch with timeout
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
      },
    },
  }
);
```

#### Frontend Application Configuration (React)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Throttle realtime events
      },
    },
  }
);
```

#### Python ML Service Configuration

```python
import psycopg2
from psycopg2 import pool

# Create connection pool using pooled endpoint (port 6543)
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host="db.[PROJECT_REF].supabase.co",
    port=6543,  # Use pooled connection
    database="postgres",
    user="postgres",
    password="[PASSWORD]",
    connect_timeout=30,
    options="-c statement_timeout=60000"  # 60 second query timeout
)

def get_connection():
    return connection_pool.getconn()

def release_connection(conn):
    connection_pool.putconn(conn)

# Example usage
def execute_query(query, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
    finally:
        release_connection(conn)
```

### 3. Connection Pool Settings

#### Recommended Settings for Edge Functions

```typescript
// Environment variables for connection pool configuration
const POOL_CONFIG = {
  // Maximum connections per Edge Function instance
  maxConnections: 10,
  
  // Idle connection timeout (return to pool after)
  idleTimeoutSeconds: 60,
  
  // Connection max lifetime
  maxLifetimeSeconds: 3600, // 1 hour
  
  // Connection acquisition timeout
  connectionTimeoutSeconds: 30,
  
  // Enable connection validation
  validateConnection: true,
  
  // Retry failed connections
  maxRetries: 3,
  retryDelayMs: 1000,
};
```

### 4. Query Optimization Best Practices

#### Use Read-Only Transactions

For queries that don't modify data:

```typescript
// Use read-only transaction for better performance
const { data, error } = await supabase
  .from('vehicles')
  .select('*')
  .eq('tenant_id', tenantId)
  .single();
```

#### Batch Operations

Group multiple operations in a single transaction:

```typescript
// Batch insert components
const { data, error } = await supabase
  .from('components')
  .insert([
    { vehicle_id, component_type: 'tire', ... },
    { vehicle_id, component_type: 'brake', ... },
    { vehicle_id, component_type: 'oil', ... },
  ]);
```

#### Use Prepared Statements

PgBouncer in transaction mode supports prepared statements within a transaction:

```typescript
// Prepared statements are automatically used by Supabase client
const { data } = await supabase.rpc('get_fleet_health_dashboard');
```

### 5. Connection Timeout Configuration

#### Edge Function Timeout

```typescript
// Set timeout for database operations
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Database query timeout')), 30000);
});

const queryPromise = supabase
  .from('vehicles')
  .select('*')
  .eq('tenant_id', tenantId);

try {
  const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
  // Handle result
} catch (error) {
  console.error('Query timeout:', error);
  // Handle timeout
}
```

#### Statement Timeout in PostgreSQL

Set statement timeout for long-running queries:

```sql
-- Set default statement timeout to 60 seconds
ALTER DATABASE postgres SET statement_timeout = '60s';

-- Or set per session
SET statement_timeout = '30s';
```

## Monitoring Connection Usage

### Check Active Connections

```sql
-- Total active connections
SELECT count(*) 
FROM pg_stat_activity 
WHERE datname = 'postgres';

-- Connections by state
SELECT 
  state,
  count(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state
ORDER BY connection_count DESC;

-- Connections by application
SELECT 
  application_name,
  count(*) as connection_count,
  max(state) as state
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY application_name
ORDER BY connection_count DESC;
```

### Check Connection Pool Statistics

```sql
-- View PgBouncer stats (if you have direct access)
SHOW POOLS;
SHOW CLIENTS;
SHOW SERVERS;

-- In Supabase, use the dashboard metrics:
-- Dashboard > Database > Connection Pooling
```

### Monitor Connection Exhaustion

Set up alerts for connection exhaustion:

```sql
-- Create function to check connection usage
CREATE OR REPLACE FUNCTION check_connection_usage()
RETURNS TABLE (
  total_connections INTEGER,
  active_connections INTEGER,
  idle_connections INTEGER,
  usage_percentage DECIMAL(5,2)
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    (count(*)::decimal / (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') * 100) as usage_percentage
  FROM pg_stat_activity
  WHERE datname = 'postgres';
$$;

-- Check connection usage
SELECT * FROM check_connection_usage();
```

## Performance Testing

### Load Test Configuration

Test connection pooling under load:

```bash
# Using Apache Bench
ab -n 1000 -c 100 \
  -H "Authorization: Bearer [TOKEN]" \
  https://[PROJECT_REF].supabase.co/rest/v1/vehicles

# Using k6 load testing
k6 run --vus 100 --duration 60s load-test.js
```

### Expected Performance Metrics

With proper connection pooling:
- **Query Response Time**: < 100ms for simple queries
- **Dashboard Load Time**: < 2 seconds (using materialized views)
- **Concurrent Users**: 100+ per tenant
- **Connection Acquisition**: < 50ms
- **Connection Pool Utilization**: 60-80% under normal load

## Troubleshooting

### Issue: Connection Timeout Errors

**Symptoms:**
```
Error: Connection timeout
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Solutions:**
1. Switch from direct (5432) to pooled connection (6543)
2. Reduce connection pool size in application
3. Implement connection retry logic
4. Upgrade Supabase plan for more connections

### Issue: High Connection Count

**Symptoms:**
```sql
SELECT count(*) FROM pg_stat_activity; -- Returns close to max_connections
```

**Solutions:**
1. Check for connection leaks (connections not released)
2. Reduce connection pool size per application instance
3. Implement connection timeout and automatic release
4. Review long-running queries and kill if necessary

### Issue: Slow Query Performance

**Symptoms:**
- Queries taking > 1 second
- Dashboard loading slowly

**Solutions:**
1. Use materialized views for complex analytics
2. Add indexes on frequently queried columns
3. Optimize query execution plans
4. Enable query caching where appropriate

### Issue: Connection Pool Saturation

**Symptoms:**
- Application waiting for available connections
- High connection acquisition time

**Solutions:**
1. Increase connection pool size (if under limit)
2. Reduce connection idle timeout
3. Implement connection queuing with timeout
4. Scale horizontally with more application instances

## Best Practices Summary

### ✅ DO

- Use pooled connections (port 6543) for all application queries
- Implement connection pooling at application level
- Set appropriate connection timeouts (30 seconds)
- Monitor connection usage regularly
- Use materialized views for complex dashboard queries
- Batch operations when possible
- Release connections immediately after use
- Use read-only transactions for SELECT queries

### ❌ DON'T

- Don't use direct connections (port 5432) for application queries
- Don't hold connections open longer than necessary
- Don't set pool size higher than Supabase connection limits
- Don't run long-running queries (> 60 seconds) on pooled connections
- Don't create connections per request (reuse pools)
- Don't ignore connection timeout errors
- Don't skip connection validation

## Related Documentation

- [Database Performance Optimization Migration](../supabase/migrations/20260119000100_optimize_database_performance.sql)
- [Dashboard Refresh Edge Function](../edge-functions/dashboard-refresh/README.md)
- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Official Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)

## Support

For connection pooling issues:
1. Check Supabase Dashboard > Database > Connection Pooling
2. Review Edge Function logs for timeout errors
3. Monitor database metrics in Supabase Dashboard
4. Contact Supabase support for plan-specific questions

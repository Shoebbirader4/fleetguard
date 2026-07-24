# Backup and Recovery Quick Reference

## 🚀 Quick Access

| Resource | Link |
|----------|------|
| **Full Guide** | [BACKUP_AND_RECOVERY_GUIDE.md](./BACKUP_AND_RECOVERY_GUIDE.md) |
| **Supabase Dashboard** | Settings → Database → Backups |
| **Backup Monitor** | [Edge Function](../edge-functions/backup-monitor/) |
| **Failure Alerts** | [Edge Function](../edge-functions/backup-failure-alert/) |
| **Runbook** | See "Operational Runbooks" section below |

---

## 📋 Requirements Coverage

| Requirement | Status | Implementation |
|------------|--------|----------------|
| **27.1** Daily backups at 1:00 AM | ✅ | Supabase automated backups |
| **27.2** Retention: 30/90/365 days | ✅ | Supabase retention policy |
| **27.3** Geo-separated storage | ✅ | AWS S3 cross-region replication |
| **27.4** Backup integrity verification | ✅ | `backup-monitor` Edge Function |
| **27.5** PITR (24-hour RPO) | ✅ | Supabase WAL archiving |
| **27.6** Alert within 5 minutes | ✅ | `backup-failure-alert` Edge Function |

---

## ⚡ Common Commands

### Check Backup Status

```bash
# List recent backups
supabase db backup list --remote

# Check backup health
curl -X POST https://your-project.supabase.co/functions/v1/backup-monitor \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Restore from Backup

```bash
# Full restore
supabase db restore --remote --backup-id <backup-id> --confirm

# Point-in-time recovery
supabase db restore --remote --timestamp "2025-06-10 14:30:00 UTC" --confirm
```

### Manual Backup

```bash
# Trigger manual backup
supabase db backup create --remote

# Verify backup completed
supabase db backup list --remote | head -5
```

---

## 🔔 Alert Configuration

### Email Recipients

```bash
supabase secrets set ADMIN_EMAIL_RECIPIENTS=admin@fleetguard.ai,ops@fleetguard.ai
```

### SMS Recipients

```bash
supabase secrets set SMS_ALERTS_ENABLED=true
supabase secrets set ADMIN_SMS_RECIPIENTS=+15550100,+15550101
```

### Slack Webhook

```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

---

## 📊 Monitoring Queries

### Backup Health Summary

```sql
SELECT * FROM get_backup_health_summary();
```

**Returns:**
- Last backup time
- Backup age (hours)
- 7-day success rate
- Average backup size
- Failed backups in last 24 hours

### Recent Backup History

```sql
SELECT * FROM get_backup_monitoring_history(7, NULL, 10, 1);
-- Args: days_back, status_filter, page_size, page_number
```

### Failed Backups

```sql
SELECT
  backup_timestamp,
  error_message,
  backup_size_mb
FROM backup_monitoring_log
WHERE status = 'failed'
  AND backup_timestamp > NOW() - INTERVAL '7 days'
ORDER BY backup_timestamp DESC;
```

---

## 🔧 Troubleshooting

### Problem: Backup Overdue

**Quick Fix:**
```bash
# 1. Check Supabase Dashboard → Backups for errors
# 2. Look for long-running queries
psql $DATABASE_URL -c "SELECT pid, age(clock_timestamp(), query_start), query FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC LIMIT 5"

# 3. Manually trigger backup
supabase db backup create --remote
```

### Problem: PITR Unavailable

**Quick Fix:**
```bash
# 1. Check PITR is enabled in Supabase Dashboard
# 2. Verify WAL archiving
psql $DATABASE_URL -c "SELECT * FROM pg_stat_archiver"

# 3. Contact Supabase support if issue persists
```

### Problem: Integrity Check Failed

**Quick Fix:**
```bash
# 1. Trigger new backup immediately
supabase db backup create --remote

# 2. Compare sizes
supabase db backup list --remote | head -5

# 3. If new backup size is normal, mark previous as corrupt
```

---

## 🚨 Emergency Procedures

### Procedure 1: Immediate Restore

**When:** Catastrophic data corruption detected

**Steps:**
```bash
# 1. STOP ALL WRITES
supabase functions disable --all

# 2. Find latest good backup
supabase db backup list --remote

# 3. Restore
supabase db restore --remote --backup-id <backup-id> --confirm

# 4. Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM vehicles"

# 5. Resume operations
supabase functions enable --all
```

**RTO:** 2-4 hours

### Procedure 2: Point-in-Time Recovery

**When:** Data corruption at known timestamp

**Steps:**
```bash
# 1. Identify recovery target
RECOVERY_TIME="2025-06-10 14:30:00 UTC"

# 2. Stop writes
supabase functions disable --pattern "write-*"

# 3. Perform PITR
supabase db restore --remote --timestamp "$RECOVERY_TIME" --confirm

# 4. Verify data
# Run application health checks

# 5. Resume operations
supabase functions enable --all
```

**RTO:** 1-2 hours  
**RPO:** < 24 hours (typically < 1 hour)

---

## 📅 Regular Tasks

### Daily
- [ ] Review backup monitoring dashboard
- [ ] Check for alert notifications
- [ ] Verify backup completed successfully

### Weekly
- [ ] Review backup success rate (target: >99%)
- [ ] Check backup size trends
- [ ] Test restore to staging environment

### Monthly
- [ ] Perform DR drill (full restore test)
- [ ] Review and update retention policies
- [ ] Verify alert notification channels working

### Quarterly
- [ ] Audit backup access controls
- [ ] Review backup costs and optimization
- [ ] Update runbooks and documentation

---

## 🔐 Security Checklist

- [ ] Backups encrypted at rest (AES-256)
- [ ] Backups stored in geo-separated location
- [ ] Access to backups requires MFA
- [ ] Backup operations fully audited
- [ ] Restore procedures documented and tested
- [ ] Alert notification channels secure

---

## 📞 Escalation Contacts

### Internal Support
- **Slack:** #fleetguard-alerts
- **Email:** ops@fleetguard.ai
- **On-Call:** PagerDuty escalation

### Supabase Support
- **Email:** support@supabase.com
- **Dashboard:** Supabase → Support
- **SLA:** 4-hour response (Pro/Team tier)

---

## 📚 Related Documentation

- [Full Backup and Recovery Guide](./BACKUP_AND_RECOVERY_GUIDE.md)
- [Backup Monitor Edge Function](../edge-functions/backup-monitor/README.md)
- [Backup Failure Alert Edge Function](../edge-functions/backup-failure-alert/README.md)
- [Supabase Backup Docs](https://supabase.com/docs/guides/platform/backups)
- [Disaster Recovery Plan](./DISASTER_RECOVERY_PLAN.md) (if exists)

---

## 🎯 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Backup Success Rate | > 99.5% | < 95% |
| Backup Duration | < 30 min | > 2 hours |
| Backup Age | < 25 hours | > 25 hours |
| PITR Coverage | 100% | < 99% |
| Alert Delivery Time | < 2 min | > 5 min |

---

**Last Updated:** June 10, 2025  
**Version:** 1.0  
**Owner:** FleetGuard DevOps Team

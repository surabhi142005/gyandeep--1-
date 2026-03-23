#!/bin/bash
# Uptime Monitoring Setup Script
# Run this to configure monitoring services

set -e

echo "Setting up Uptime Monitoring for Gyandeep..."

# Check if cron is available
if command -v cron &> /dev/null; then
    echo "Configuring cron jobs for health checks..."
    
    # Add health check cron (every 5 minutes)
    (crontab -l 2>/dev/null | grep -v "gyandeep-health"; echo "*/5 * * * * curl -sf https://api.gyandeep.edu/api/health || echo 'Health check failed at $(date)' >> /var/log/gyandeep-health.log") | crontab -
    
    # Add SSL certificate check (daily)
    (crontab -l 2>/dev/null | grep -v "ssl-check"; echo "0 0 * * * /opt/gyandeep/scripts/ssl-check.sh") | crontab -
    
    echo "Cron jobs configured"
fi

# Create monitoring script
cat > /opt/gyandeep/scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Gyandeep API

API_URL="${1:-https://api.gyandeep.edu/api/health}"
LOG_FILE="/var/log/gyandeep-health.log"
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"

response=$(curl -sf -w "\n%{http_code}" "$API_URL" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" != "200" ]; then
    timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    message="[ALERT] Gyandeep health check failed at $timestamp. HTTP Status: $http_code"
    
    echo "$message" >> "$LOG_FILE"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$message\"}" || true
    fi
    
    exit 1
fi

echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') - Health check OK" >> "$LOG_FILE"
exit 0
EOF

chmod +x /opt/gyandeep/scripts/health-check.sh

# Create SSL check script
cat > /opt/gyandeep/scripts/ssl-check.sh << 'EOF'
#!/bin/bash
# SSL certificate expiry check for Gyandeep

DOMAINS=("api.gyandeep.edu" "gyandeep.edu")
ALERT_DAYS=30
LOG_FILE="/var/log/gyandeep-ssl.log"
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"

for domain in "${DOMAINS[@]}"; do
    expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
    
    if [ -n "$expiry_date" ]; then
        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y" "$expiry_date" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        days_until=$(($((expiry_epoch - now_epoch)) / 86400))
        
        if [ "$days_until" -le "$ALERT_DAYS" ]; then
            message="[ALERT] SSL certificate for $domain expires in $days_until days (on $expiry_date)"
            echo "$message" >> "$LOG_FILE"
            
            if [ -n "$ALERT_WEBHOOK" ]; then
                curl -s -X POST "$ALERT_WEBHOOK" \
                    -H 'Content-Type: application/json' \
                    -d "{\"text\":\"$message\"}" || true
            fi
        fi
    fi
done
EOF

chmod +x /opt/gyandeep/scripts/ssl-check.sh

# Create systemd service for monitoring
cat > /etc/systemd/system/gyandeep-monitor.service << 'EOF'
[Unit]
Description=Gyandeep Health Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/gyandeep/scripts/health-check.sh
Environment=API_URL=https://api.gyandeep.edu/api/health
Environment=SLACK_WEBHOOK_URL=%env:SLACK_WEBHOOK_URL
StandardOutput=append:/var/log/gyandeep-health.log
StandardError=append:/var/log/gyandeep-health.log

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer for health checks
cat > /etc/systemd/system/gyandeep-monitor.timer << 'EOF'
[Unit]
Description=Gyandeep Health Monitor Timer
Requires=gyandeep-monitor.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Unit=gyandeep-monitor.service

[Install]
WantedBy=timers.target
EOF

# Enable timer
systemctl daemon-reload 2>/dev/null || true
systemctl enable gyandeep-monitor.timer 2>/dev/null || true
systemctl start gyandeep-monitor.timer 2>/dev/null || true

echo "Uptime monitoring setup complete!"
echo "Services configured:"
echo "  - Health checks every 5 minutes"
echo "  - SSL certificate checks daily"
echo "  - Slack alerts on failure"
echo ""
echo "Logs location:"
echo "  - Health: /var/log/gyandeep-health.log"
echo "  - SSL: /var/log/gyandeep-ssl.log"

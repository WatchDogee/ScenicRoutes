# GraphHopper Setup for Laravel Cloud

## Problem Statement

Laravel Cloud is optimized for PHP applications and doesn't support:
- Long-running Java processes
- Custom ports (8989)
- Large file storage (graph cache 1-5GB)

## Solution: Separate VPS for GraphHopper

Deploy GraphHopper on a separate VPS and connect Laravel Cloud app to it.

---

## Step 1: Set Up VPS (Hetzner Recommended)

### 1.1 Create VPS
- **Provider:** Hetzner Cloud (€20/month for 8GB RAM)
- **OS:** Ubuntu 22.04 LTS
- **Location:** Choose closest to your Laravel Cloud region
- **SSH Key:** Add your public key

### 1.2 Initial Server Setup
```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Java 17
apt install -y openjdk-17-jre-headless

# Verify Java
java -version
# Should show: openjdk version "17.0.x"
```

---

## Step 2: Install GraphHopper

### 2.1 Create GraphHopper User
```bash
# Create user
useradd -m -s /bin/bash graphhopper

# Create directory
mkdir -p /opt/graphhopper
chown graphhopper:graphhopper /opt/graphhopper
```

### 2.2 Download GraphHopper
```bash
cd /opt/graphhopper
sudo -u graphhopper wget https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/8.0/graphhopper-web-8.0.jar
```

### 2.3 Download OSM Data
```bash
# For Latvia (example)
sudo -u graphhopper wget https://download.geofabrik.de/europe/latvia-latest.osm.pbf

# For other regions, check: https://download.geofabrik.de/
```

### 2.4 Create Config File
```bash
sudo -u graphhopper nano /opt/graphhopper/config.yml
```

**config.yml:**
```yaml
graphhopper:
  datareader:
    file: /opt/graphhopper/latvia-latest.osm.pbf
  graph:
    location: /opt/graphhopper/graph-cache
  routing:
    default: car
    profiles:
      - name: car
        vehicle: car
        weighting: fastest
        turn_costs: true
      - name: motorcycle
        vehicle: motorcycle
        weighting: fastest
        turn_costs: true

server:
  application_connectors:
    - type: http
      port: 8989
```

---

## Step 3: Create Systemd Service

```bash
nano /etc/systemd/system/graphhopper.service
```

**Service file:**
```ini
[Unit]
Description=GraphHopper Routing Server
After=network.target

[Service]
Type=simple
User=graphhopper
WorkingDirectory=/opt/graphhopper
ExecStart=/usr/bin/java -Xmx4g -Xms4g -jar graphhopper-web-8.0.jar server config.yml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
systemctl daemon-reload
systemctl enable graphhopper
systemctl start graphhopper

# Check status
systemctl status graphhopper

# View logs
journalctl -u graphhopper -f
```

**First import takes 10-30 minutes. Wait for:**
```
INFO: GraphHopper is ready
```

---

## Step 4: Set Up Nginx Reverse Proxy

### 4.1 Install Nginx
```bash
apt install -y nginx
```

### 4.2 Create Nginx Config
```bash
nano /etc/nginx/sites-available/graphhopper
```

**Config:**
```nginx
server {
    listen 80;
    server_name graphhopper.yourdomain.com;

    # Increase timeouts for route calculations
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    location / {
        proxy_pass http://localhost:8989;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
    }
}
```

### 4.3 Enable Site
```bash
ln -s /etc/nginx/sites-available/graphhopper /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Step 5: Set Up SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d graphhopper.yourdomain.com

# Auto-renewal is set up automatically
```

---

## Step 6: Configure Laravel Cloud

### 6.1 Update .env on Laravel Cloud
```env
GRAPHHOPPER_URL=https://graphhopper.yourdomain.com
GRAPHHOPPER_PROFILE=car
```

### 6.2 Test Connection
```bash
# From Laravel Cloud or local
curl https://graphhopper.yourdomain.com/info
```

Should return GraphHopper info JSON.

---

## Step 7: Firewall Configuration

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

**Note:** Port 8989 is only accessible locally (via Nginx). Don't expose it publicly.

---

## Step 8: Monitoring & Maintenance

### 8.1 Check Service Status
```bash
systemctl status graphhopper
```

### 8.2 View Logs
```bash
# Recent logs
journalctl -u graphhopper -n 50

# Follow logs
journalctl -u graphhopper -f
```

### 8.3 Restart Service
```bash
systemctl restart graphhopper
```

### 8.4 Update GraphHopper
```bash
cd /opt/graphhopper
sudo -u graphhopper wget https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/8.0/graphhopper-web-8.0.jar
systemctl restart graphhopper
```

### 8.5 Update OSM Data
```bash
cd /opt/graphhopper
sudo -u graphhopper wget -O latvia-latest.osm.pbf.new https://download.geofabrik.de/europe/latvia-latest.osm.pbf
mv latvia-latest.osm.pbf latvia-latest.osm.pbf.old
mv latvia-latest.osm.pbf.new latvia-latest.osm.pbf
systemctl restart graphhopper
# First import after update takes 10-30 minutes
```

---

## Alternative: Docker Setup

If you prefer Docker:

### docker-compose.yml
```yaml
version: '3.8'
services:
  graphhopper:
    image: graphhopper/graphhopper:latest
    container_name: graphhopper
    ports:
      - "8989:8989"
    volumes:
      - ./graph-cache:/graph-cache
      - ./latvia-latest.osm.pbf:/data/latvia-latest.osm.pbf
      - ./config.yml:/config.yml
    environment:
      - JAVA_OPTS=-Xmx4g -Xms4g
    command: server config.yml
    restart: unless-stopped
```

**Run:**
```bash
docker-compose up -d
```

---

## Cost Breakdown

- **VPS (Hetzner):** €20/month (8GB RAM, 4 vCPU, 160GB SSD)
- **Domain:** $10-15/year (optional, can use IP)
- **SSL:** Free (Let's Encrypt)
- **Total:** ~$22/month

---

## Troubleshooting

### GraphHopper not starting
```bash
# Check Java
java -version

# Check logs
journalctl -u graphhopper -n 100

# Check disk space
df -h

# Check memory
free -h
```

### Nginx 502 Bad Gateway
- Check GraphHopper is running: `systemctl status graphhopper`
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`
- Verify proxy_pass URL matches GraphHopper port

### Slow route calculations
- Increase Java heap: `-Xmx6g` (if you have more RAM)
- Check server resources: `htop`
- Consider upgrading VPS

### Out of memory
- Reduce Java heap: `-Xmx3g`
- Or upgrade VPS to more RAM

---

## Security Recommendations

1. **Firewall:** Only expose ports 22, 80, 443
2. **SSH:** Disable password auth, use keys only
3. **Updates:** Regular `apt update && apt upgrade`
4. **Monitoring:** Set up UptimeRobot or similar
5. **Backups:** Backup graph-cache directory (large, but speeds up recovery)

---

## Next Steps

1. ✅ Set up VPS
2. ✅ Install GraphHopper
3. ✅ Configure Nginx
4. ✅ Set up SSL
5. ✅ Update Laravel Cloud .env
6. ✅ Test connection
7. ✅ Monitor performance

---

## Support

- GraphHopper Docs: https://www.graphhopper.com/docs/
- GraphHopper GitHub: https://github.com/graphhopper/graphhopper
- Hetzner Docs: https://docs.hetzner.com/







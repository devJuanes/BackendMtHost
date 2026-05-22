#!/bin/bash
# Instala BIND9 y prepara MatuHost DNS autoritativo en Ubuntu/Debian
set -e

apt-get update
apt-get install -y bind9 bind9utils

ZONES_DIR="${DNS_ZONES_DIR:-/etc/bind/zones/matuhost}"
SNIPPET="${DNS_NAMED_CONF_SNIPPET:-/etc/bind/matuhost-zones.conf}"

mkdir -p "$ZONES_DIR"
touch "$SNIPPET"

if ! grep -q "matuhost-zones.conf" /etc/bind/named.conf.local 2>/dev/null; then
  echo 'include "/etc/bind/matuhost-zones.conf";' >> /etc/bind/named.conf.local
fi

# Consultas públicas (DNS global)
OPTIONS="/etc/bind/named.conf.options"
if [ -f "$OPTIONS" ] && ! grep -q "MatuHost allow-query" "$OPTIONS"; then
  sed -i '/options {/a \    // MatuHost allow-query\n    listen-on { any; };\n    listen-on-v6 { any; };\n    allow-query { any; };' "$OPTIONS" 2>/dev/null || true
fi

systemctl enable named
systemctl restart named

echo "BIND instalado. Configura BackendMtHost .env:"
echo "  DNS_ZONES_DIR=$ZONES_DIR"
echo "  DNS_NAMED_CONF_SNIPPET=$SNIPPET"
echo "  DNS_RELOAD_CMD=sudo rndc reload"
echo "  ufw allow 53/tcp"
echo "  ufw allow 53/udp"

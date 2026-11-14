#!/bin/bash
# 在 dsh-free 沙箱里跑（root）：把站点和 nginx 重新拉起来，幂等。
# 注意：apt 装完 nginx 会自动用默认配置启动（监听 80、root 是 /var/www/html），
# 必须在启动自己的配置前把那个干掉，否则 pgrep 命中默认实例，永不加载 /data/tophub/nginx.conf。
set -e

DATA=/data/tophub
CONF="$DATA/nginx.conf"

if ! command -v nginx >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq nginx
fi

mkdir -p "$DATA"

if [ ! -s "$DATA/index.html" ]; then
    python3 "$DATA/mirror.py" "$DATA"
fi

if ! pgrep -f "nginx: master process /usr/sbin/nginx -c $CONF" >/dev/null 2>&1; then
    pkill -x nginx 2>/dev/null || true
    sleep 1
    nginx -c "$CONF"
fi

sleep 1
curl -s -o /dev/null -w 'setup http=%{http_code}\n' http://127.0.0.1:8080/ || true
pgrep -af "nginx: master" | head -2
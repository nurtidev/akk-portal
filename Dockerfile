FROM nginx:alpine

# Копируем статику
COPY index.html /usr/share/nginx/html/index.html

# Шаблон конфига — Railway передаст $PORT в env
COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Кэш для статики
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css text/html application/json application/javascript;
}
EOF

# Railway даёт динамический $PORT — nginx подставит через envsubst (есть в образе)
ENV PORT=8080
EXPOSE 8080

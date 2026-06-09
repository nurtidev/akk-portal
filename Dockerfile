FROM nginx:alpine

# Копируем статику
COPY index.html /usr/share/nginx/html/index.html
# Слой интеграции с бэкендом (SMS-авторизация + подача заявки)
COPY __auth-integration.js /usr/share/nginx/html/__auth-integration.js
# Статический config.js — фолбэк для локали; в проде nginx переопределяет /config.js
COPY config.js /usr/share/nginx/html/config.js
# Фото программ для карточек (если папка пустая — карточки покажут иконку-заглушку)
COPY img/ /usr/share/nginx/html/img/

# Шаблон конфига — Railway передаёт $PORT и $AKK_BACKEND_URL в env.
# nginx-entrypoint прогоняет envsubst ТОЛЬКО по переменным, заданным в окружении,
# поэтому $uri/$host не трогаются. AKK_BACKEND_URL на сервисе фронта должен быть
# задан всегда (хотя бы пустым), иначе плейсхолдер останется в выводе.
COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Адрес бэкенда отдаём из env (CORS-схема: фронт ходит на публичный домен бэка).
    # Пусто → интеграция не активируется, остаётся мок-прототип.
    location = /config.js {
        default_type application/javascript;
        add_header Cache-Control "no-store";
        return 200 "window.AKK_BACKEND_URL='${AKK_BACKEND_URL}';";
    }

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
ENV AKK_BACKEND_URL=""
EXPOSE 8080

# Despliegue en Hostinger (VPS Linux)

Guía para llevar el stack completo (Postgres, backend, frontend, n8n, nginx)
a un VPS de Hostinger usando Docker Compose.

## 1. Requisitos previos

- VPS Hostinger con Ubuntu 22.04+ (mínimo 2 vCPU / 4GB RAM recomendado).
- Dominio apuntando al VPS: registros DNS tipo `A`:
  - `tu-dominio.com` → IP del VPS
  - `www.tu-dominio.com` → IP del VPS
  - `api.tu-dominio.com` → IP del VPS
  - `n8n.tu-dominio.com` → IP del VPS
- Cuenta en Wompi (o Mercado Pago) con llaves de producción.
- Proyecto de Firebase con Authentication habilitado.
- Cuenta de WhatsApp Business (Meta Cloud API) con número verificado.

## 2. Preparar el servidor

```bash
ssh root@TU_IP_VPS

apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git

systemctl enable docker
systemctl start docker
```

## 3. Clonar el proyecto

```bash
git clone <url-del-repo> ecommerce-caballero
cd ecommerce-caballero
```

## 4. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edita `backend/.env` con los valores reales:
- `DATABASE_URL` (la sobreescribe docker-compose automáticamente, no la toques ahí)
- `FIREBASE_*` (desde Project Settings > Service Accounts en Firebase Console)
- `WOMPI_*` (desde el dashboard de comercios de Wompi)
- `N8N_WEBHOOK_URL=https://n8n.tu-dominio.com/webhook/whatsapp-notificaciones`

Edita `frontend/.env` con:
- `NEXT_PUBLIC_API_URL=https://api.tu-dominio.com`
- `NEXT_PUBLIC_SITE_URL=https://tu-dominio.com`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_FIREBASE_*` (config pública del cliente Firebase)

Crea también un `.env` en la raíz para docker-compose:

```bash
cat > .env <<EOF
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=$(openssl rand -hex 24)
N8N_HOST=n8n.tu-dominio.com
WHATSAPP_TOKEN=tu_token_de_meta_cloud_api
EOF
```

## 5. Reemplazar `tu-dominio.com` en `nginx/nginx.conf`

```bash
sed -i 's/tu-dominio.com/TU_DOMINIO_REAL/g' nginx/nginx.conf
```

## 6. Levantar el stack

```bash
docker compose up -d --build
```

## 7. Correr las migraciones de base de datos

```bash
docker compose exec backend node src/db/migrate.js
```

## 8. HTTPS con Let's Encrypt (Certbot)

La opción más simple en un VPS es correr certbot en el host (fuera de Docker)
y montar los certificados en nginx:

```bash
apt install -y certbot
certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com -d api.tu-dominio.com -d n8n.tu-dominio.com

# Copia los certificados a la carpeta que monta el contenedor nginx
cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem nginx/certs/
```

Luego agrega los bloques `listen 443 ssl;` con `ssl_certificate`/`ssl_certificate_key`
a cada `server {}` en `nginx/nginx.conf` y reinicia: `docker compose restart nginx`.
Configura un cronjob de renovación (`certbot renew`) cada 60 días.

## 9. Configurar el workflow de n8n

1. Entra a `https://n8n.tu-dominio.com`, crea el usuario admin (primer acceso).
2. Importa `n8n/workflows/notificaciones-whatsapp.json` (Workflows > Import from File).
3. Crea la credencial "WhatsApp Cloud API Token" (HTTP Header Auth) con:
   - Header: `Authorization`
   - Value: `Bearer <tu token de Meta Cloud API>`
4. Reemplaza `PHONE_NUMBER_ID` en el nodo HTTP Request por el ID real de tu número.
5. Activa el workflow. Copia la URL del webhook de producción y verifica que
   coincide con `N8N_WEBHOOK_URL` en `backend/.env`.

## 10. Configurar el feed de Instagram/Facebook Shopping

En Meta Commerce Manager > Catálogo > Fuentes de datos, agrega:
`https://api.tu-dominio.com/feed/productos.xml`, con actualización automática diaria.

## 11. Verificación post-despliegue

```bash
curl https://api.tu-dominio.com/health
curl https://tu-dominio.com
curl https://api.tu-dominio.com/feed/productos.xml
```

## 12. Actualizaciones futuras

```bash
git pull
docker compose up -d --build
docker compose exec backend node src/db/migrate.js
```

# Despliegue — Backend (AWS, coste mínimo)

Guía para publicar **esta API** en Amazon Web Services con el menor coste
posible. El **front** (Angular) se publica aparte en **Vercel**, usando un
dominio gratuito `algo.vercel.app`. Aquí vive Node.js + PostgreSQL.

Lee primero el [README](README.md) (variables, scripts SQL y arranque local).

Si tu cuenta AWS **lleva más de 12 meses**, salta a la
[sección 2](#2-qué-es-la-capa-gratuita-de-aws-en-2026): el año de EC2/RDS
gratis **ya no aplica**. No hay PostgreSQL de por vida a coste cero en AWS.

---

## Tabla de contenidos

1. [Arquitectura objetivo](#1-arquitectura-objetivo)
2. [Qué es la capa gratuita de AWS en 2026](#2-qué-es-la-capa-gratuita-de-aws-en-2026)
3. [Servicios que SÍ te sirven](#3-servicios-que-sí-te-sirven)
4. [Servicios que NO uses en el plan barato](#4-servicios-que-no-uses-en-el-plan-barato)
5. [Recomendación (2 personas, &lt;100 peticiones/día)](#5-recomendación-2-personas-100-peticionesdía)
6. [Preparativos en tu máquina](#6-preparativos-en-tu-máquina)
7. [Paso a paso: Lightsail (recomendado)](#7-paso-a-paso-lightsail-recomendado)
8. [Alternativa: EC2 t3.micro / t4g.micro](#8-alternativa-ec2-t3micro--t4gmicro)
9. [HTTPS (opcional pero recomendable)](#9-https-opcional-pero-recomendable)
10. [Conectar el front de Vercel](#10-conectar-el-front-de-vercel)
11. [Actualizar el backend](#11-actualizar-el-backend)
12. [Operación diaria y cómo no pagar de más](#12-operación-diaria-y-cómo-no-pagar-de-más)
13. [Migrar PostgreSQL a RDS o Aurora](#13-migrar-postgresql-a-rds-o-aurora)
14. [Checklist final](#14-checklist-final)

---

## 1. Arquitectura objetivo

```text
Navegador
   │
   ├─ HTML/JS/CSS  →  Vercel  (https://tu-app.vercel.app)
   │
   └─ API JSON     →  AWS     (http(s)://IP-o-host-de-aws/api)
                              └─ Node (Express) + PostgreSQL en la MISMA máquina
```

Por qué **API + base en la misma instancia** (punto de partida):

- Esta app es un MVP personal: poco tráfico, un solo proceso Node y un Postgres
  pequeño.
- **RDS** es otra máquina 24/7. En una cuenta de más de 12 meses **no es
  gratis** (~14 USD/mes el micro). En cuentas nuevas se come los créditos.
- El código ya habla con Postgres por `PGHOST`; `localhost` en el servidor es
  suficiente. RDS se puede [añadir después](#13-migrar-postgresql-a-rds-o-aurora).

El front **no** se sirve desde AWS. Vercel ya te da HTTPS y el dominio
`*.vercel.app` sin tarjeta extra.

---

## 2. Qué es la capa gratuita de AWS en 2026

AWS cambió el Free Tier el **15 de julio de 2025**. Elige según **cuándo**
creaste la cuenta **y si ya pasó un año**.

### Cuenta de más de 12 meses (tu caso si el alta fue hace más de un año)

El cupo clásico de **12 meses ya expiró**. Eso incluye, entre otros:

- 750 h/mes de **EC2** `t2.micro` / `t3.micro`
- 750 h/mes de **RDS** `db.t3.micro` + 20 GB de disco
- el trial corto de **Lightsail** (si lo tuviste)

**Siguen** los servicios **always-free** (cupo mensual que no caduca): Lambda,
DynamoDB, CloudWatch (límites modestos), AWS Budgets, Cognito, etc. Ninguno de
ellos es un PostgreSQL 24/7 listo para esta API.

Consecuencia directa:

| Lo que quieres | ¿Gratis ahora? |
| -------------- | -------------- |
| VM Linux 24/7 (Lightsail / EC2) | **No.** Lightsail ~**5 USD/mes**; EC2 `t3.micro`/`t4g.micro` ~**8 USD/mes** on-demand |
| PostgreSQL en esa misma VM | **Sí, el motor es software libre.** Pagas solo la VM |
| **RDS PostgreSQL** | **No.** Tras los 12 meses es de pago (~**12 USD/mes** `db.t4g.micro` + disco) |
| **Aurora Serverless** (pausa a 0 ACU) | Compute **casi 0** si está idle; **sí pagas almacenamiento** (~0,10 USD/GB·mes). El primer hit tarda ~15 s |
| **DynamoDB** | Always-free (25 GB / 25 RCU / 25 WCU). Esta app **no lo usa**: habría que reescribir los repositorios |

Consulta **Billing → Free Tier** con tu usuario: si el año ya pasó, verás
RDS/EC2 en **pay-as-you-go**.

100 peticiones al día (~3 000/mes) caben de sobra en Lambda always-free (1 M
invocaciones), pero esta API es **Express + pool `pg`**, no una función
Lambda. Convertirla solo para ahorrar la VM no merece la pena a esta escala:
la base seguiría costando (o habría que cambiar a DynamoDB).

### Cuentas nuevas (desde el 15-jul-2025)

Al registrarte eliges **Free plan** o **Paid plan**:

| | **Free plan** | **Paid plan** |
| --- | --- | --- |
| Créditos | Hasta **200 USD** (100 al alta + hasta 100 por actividades) | Igual |
| Duración | **6 meses** o hasta que se acaben los créditos | Los créditos duran 12 meses; luego pagas lo que uses |
| Factura | No te cobran mientras no pases a Paid | Sí, lo que exceda créditos / always-free |
| Al caducar | **Cierran la cuenta** y los datos 90 días | Sigue viva, con factura |

Actividades que suelen dar **+20 USD** cada una (hasta +100): lanzar y apagar
una EC2, configurar un RDS, una Lambda, un prompt en Bedrock, **crear un
presupuesto en AWS Budgets**. Haz el de Budgets sí o sí (además te avisa).

### Región

Usa una cerca: **`us-east-1`** (N. Virginia) suele ser la más barata; para
Latam a veces conviene **`sa-east-1`** (São Paulo) por latencia, aunque fuera
del cupo sale más cara. Elige **una** región y no mezcles.

---

## 3. Servicios que SÍ te sirven

| Servicio | Para qué en Active Recall | Encaje con coste bajo |
| -------- | ------------------------- | --------------------- |
| **Amazon Lightsail** | Una VM Ubuntu con IP fija, Node y Postgres | Precio **fijo** (~5 USD/mes, 1 GB RAM). Lo más simple y predecible |
| **Amazon EC2** (`t4g.micro` / `t3.micro`) | Lo mismo, más “AWS puro” | On-demand ~8 USD/mes si el año gratis ya pasó |
| **Amazon Linux 2023** o **Ubuntu 24.04** | Sistema de la VM | Incluido en la instancia |
| **Elastic IP** (EC2) / **IP estática** (Lightsail) | Que la URL de la API no cambie al reiniciar | Lightsail: incluida. EC2: **gratis solo si está asociada a una instancia en marcha** |
| **AWS Budgets** | Alerta al 50 / 80 / 100 % de 1–5 USD | Always-free |
| **Amazon CloudWatch** | Disco y CPU de la VM (básico) | Always-free con límites modestos |
| **Security Groups** / firewall Lightsail | Abrir 22, 80, 443 | Sin coste |
| **S3** (opcional) | Copias `pg_dump` | Always-free ~5 GB (comprueba el cupo en tu cuenta) |
| **RDS PostgreSQL** `db.t4g.micro` | Postgres gestionado (backups, parches) | **De pago** (~12 USD/mes + ~2 USD disco). Ver [sección 13](#13-migrar-postgresql-a-rds-o-aurora) |
| **Aurora PostgreSQL Serverless** (mín. 0 ACU) | Postgres gestionado que se duerme | Compute ~0 si idle; almacenamiento barato. El pool de Node puede impedir la pausa |

No hace falta API Gateway, Lambda, ECS ni CloudFront para este backend: Express
ya es el servidor HTTP.

---

## 4. Servicios que NO uses en el plan barato

| Evitar | Por qué |
| ------ | ------- |
| **Application Load Balancer** | ~16 USD/mes fijos (más que toda la app) |
| **NAT Gateway** | Carísimo para un hobby |
| **RDS + Lightsail a la vez “por si acaso”** | Pagas **dos** máquinas 24/7. Para 2 personas no aporta |
| **RDS Multi-AZ / lectores extra** | Duplica el precio de compute |
| **Performance Insights, Enhanced Monitoring, RDS Proxy** | Extras que a esta carga no necesitas |
| **Aurora con mínimo 0,5 ACU** (sin pausa a 0) | Suelo ~**44 USD/mes** de compute aunque no haya tráfico |
| **App Runner / ECS Fargate** | Sin cupo útil para 24/7 |
| **Elastic Beanstalk + load balancer** | El balanceador cobra |
| **IP elástica huérfana** | Si no está pegada a una EC2 running, cobra |
| **Snapshots y volúmenes EBS olvidados** | Siguen facturando tras borrar la instancia |
| **Varias regiones** | Duplicas recursos |

---

## 5. Recomendación (2 personas, &lt;100 peticiones/día)

Ese volumen es irrelevante para el tamaño de instancia: lo que duele es
**dejar algo encendido 24/7**.

**Empieza por Amazon Lightsail, plan Linux/Unix de 5 USD** (1 GB RAM, 1 vCPU,
40 GB SSD), región `us-east-1`, imagen **Ubuntu 24.04**, con **PostgreSQL en
la misma VM**.

Motivos:

1. Un precio que ves **antes** de pulsar (no hay sustos de “un balanceador”).
2. IP estática en dos clics.
3. Consola más simple que EC2.
4. Con 1 GB de RAM, Node 22 + Postgres 16 aguantan de sobra a dos usuarios.
5. **Una sola factura.** RDS encima duplica el gasto sin que el tráfico lo
   pida.

**No uses RDS todavía** si el objetivo es ahorrar. RDS no es “la base gratis
de AWS”: es un servicio gestionado de pago. Migrar tiene sentido más adelante
si quieres backups automáticos, parches y no administrar Postgres en la VM
(sección 13).

Si tu cuenta **legacy** aún tiene horas de EC2 micro (solo si el año **no** ha
cumplido), usa la [alternativa EC2](#8-alternativa-ec2-t3micro--t4gmicro).

No uses Windows: gasta más RAM y no aporta nada a Node.

---

## 6. Preparativos en tu máquina

1. Cuenta AWS verificada (tarjeta; en Free plan no cobran hasta pasar a Paid).
2. **AWS Budgets** (consola → Billing → Budgets):
   - Presupuesto mensual de **5 USD** (cubre Lightsail; sube a 20 USD si más
     adelante enciendes RDS).
   - Alertas por email al 50 %, 80 % y 100 %.
3. En el repo del backend, ten listos:
   - `PASSWORD_PEPPER` y `JWT_SECRET` (cadenas largas aleatorias, p. ej.
     `openssl rand -hex 32` dos veces).
   - Los 14 scripts de `sql/` en orden (ver README).
4. El front en Vercel usará `https://TU-APP.vercel.app`. Anótalo: la API debe
   ser alcanzable **desde el navegador del alumno**, no solo desde tu laptop.

Genera secretos:

```bash
openssl rand -hex 32   # → PASSWORD_PEPPER
openssl rand -hex 32   # → JWT_SECRET
```

---

## 7. Paso a paso: Lightsail (recomendado)

### 7.1 Crear la instancia

1. Entra en [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com).
2. **Create instance**.
3. Región: la misma que elegiste (ej. `Ohio` o `N. Virginia`).
4. Plataforma: **Linux/Unix**.
5. Blueprint: **OS Only → Ubuntu 24.04 LTS**.
6. Plan: **5 USD** (1 GB). Evita planes mayores “por si acaso”.
7. Nombre: `active-recall-api`.
8. Crea la instancia. Espera a que pase a **Running**.

### 7.2 IP estática

1. Instancia → pestaña **Networking**.
2. **Create static IP** y asóciala a `active-recall-api`.
3. Copia la IPv4 pública (ejemplo: `3.88.10.20`). **Esa será la URL de tu API**
   hasta que pongas HTTPS.

Sin IP estática, cada stop/start puede cambiar la dirección y romper el front.

### 7.3 Firewall de Lightsail

En **Networking → IPv4 Firewall** deja:

| Puerto | Protocolo | A quién | Para |
| ------ | --------- | ------- | ---- |
| 22     | TCP       | Tu IP (mejor que `Anywhere`) | SSH |
| 80     | TCP       | Anywhere (`0.0.0.0/0`) | HTTP (nginx) |
| 443    | TCP       | Anywhere | HTTPS (cuando tengas certificado) |

**No abras 5432 a internet.** Postgres solo en `localhost`.
**No hace falta abrir 3000** si nginx hace de proxy (recomendado).

### 7.4 Entrar por SSH

En la consola Lightsail: **Connect using SSH**, o desde tu PC:

```bash
chmod 400 ~/Downloads/LightsailDefaultKey-*.pem
ssh -i ~/Downloads/LightsailDefaultKey-us-east-1.pem ubuntu@3.88.10.20
```

(El nombre exacto de la clave lo descarga Lightsail al crear la instancia.)

### 7.5 Software en la VM

Pega esto en el SSH (Ubuntu 24.04):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx postgresql postgresql-contrib curl ufw

# Node.js 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v22.x
```

Firewall local (además del de Lightsail):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 7.6 PostgreSQL solo en local

```bash
sudo -u postgres psql -c "CREATE USER recall WITH PASSWORD 'ELIGE_UNA_CLAVE_FUERTE';"
sudo -u postgres psql -c "CREATE DATABASE recalldb OWNER recall;"
sudo -u postgres psql -d recalldb -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

Confirma que Postgres **escucha en localhost** (por defecto sí). No edites
`pg_hba.conf` para aceptar `0.0.0.0`.

### 7.7 Código de la API

Sustituye la URL por la de **tu** repo:

```bash
sudo mkdir -p /var/www/active-recall-backend
sudo chown ubuntu:ubuntu /var/www/active-recall-backend
cd /var/www/active-recall-backend
git clone https://github.com/TU_USUARIO/active-recall-backend.git .
npm ci --omit=dev
```

Si el repo es privado: crea un **Personal Access Token** de GitHub y clona con
HTTPS, o sube un `.tar.gz` con `scp`.

### 7.8 Esquema SQL

Desde `/var/www/active-recall-backend`:

```bash
export PGPASSWORD='ELIGE_UNA_CLAVE_FUERTE'
for f in sql/000_init.sql sql/001_create_subjects.sql sql/002_create_topics.sql \
         sql/003_create_flashcards.sql sql/004_create_answer_types.sql \
         sql/005_update_flashcards.sql sql/006_create_answers.sql \
         sql/007_create_user_answers.sql sql/008_create_active_recall.sql \
         sql/009_add_user_answers_is_correct.sql sql/010_create_users.sql \
         sql/011_add_deleted_and_user_enabled.sql \
         sql/012_completed_and_soft_delete_cascade.sql \
         sql/013_denormalize_subject_and_topic_fks.sql
do
  psql -h 127.0.0.1 -U recall -d recalldb -f "$f"
done
```

Si un script falla, **no sigas**: corrige y reejecuta ese archivo (son
idempotentes en su mayoría).

### 7.9 Archivo `.env` de producción

```bash
nano /var/www/active-recall-backend/.env
```

```env
PORT=3000
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=recall
PGPASSWORD=ELIGE_UNA_CLAVE_FUERTE
PGDATABASE=recalldb
PGPOOL_MAX=5
PASSWORD_PEPPER=pega_aqui_el_hex_de_openssl
JWT_SECRET=pega_aqui_el_otro_hex
JWT_EXPIRES_IN=7d
# Deja PGSSLMODE vacío mientras Postgres esté en localhost.
# PGSSLMODE=require
```

`chmod 600 .env`. Sin pepper/JWT la app arranca, pero el login no es seguro.

### 7.10 Servicio systemd (que sobreviva a un reboot)

```bash
sudo nano /etc/systemd/system/active-recall.service
```

```ini
[Unit]
Description=Active Recall API
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/active-recall-backend
EnvironmentFile=/var/www/active-recall-backend/.env
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now active-recall
sudo systemctl status active-recall
```

Deberías ver en el log: `escuchando en http://localhost:3000` y
`Conectado a PostgreSQL`.

```bash
curl -s http://127.0.0.1:3000/api/health
```

Espera `{ "data": { "status": "ok", ... }, "msg": "" }`.

### 7.11 Nginx como puerta 80 → Node 3000

```bash
sudo nano /etc/nginx/sites-available/active-recall
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 3.88.10.20;   # tu IP estática

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/active-recall /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Desde **tu PC** (no desde la VM):

```bash
curl http://3.88.10.20/api/health
```

Si esto responde, el front de Vercel ya puede usar
`http://3.88.10.20/api` (HTTP). Para HTTPS, sección 9.

CORS en este proyecto está **abierto**: no tienes que registrar el dominio de
Vercel en el backend.

---

## 8. Alternativa: EC2 t3.micro / t4g.micro

Usa esto si aún tienes horas gratis de micro **o** prefieres EC2 a Lightsail.
Si el año de la cuenta ya pasó, **pagas** on-demand (~8 USD/mes): Lightsail
suele salir más barato.

1. Consola EC2 → **Launch instance**.
2. AMI: **Ubuntu 24.04**.
3. Tipo: **`t4g.micro`** (Graviton, suele ser el más barato) o `t3.micro`.
4. Par de claves: crea uno y guarda el `.pem`.
5. Security group:
   - 22/tcp desde tu IP
   - 80/tcp y 443/tcp desde `0.0.0.0/0`
   - **nada** en 5432
6. Disco: 20–30 GB gp3 (no pidas 100 GB “por si acaso”).
7. Launch. Luego **Elastic IP** → Allocate → Associate a esa instancia.
8. `ssh -i tu.pem ubuntu@IP_ELASTICA`
9. Repite desde el [apartado 7.5](#75-software-en-la-vm) hasta nginx.

**Cuidado:** si detienes la instancia y dejas la Elastic IP sin asociar, cobra.
Si terminas (Terminate) la instancia, borra también la IP y los volúmenes
huérfanos.

---

## 9. HTTPS (opcional pero recomendable)

Los navegadores no siempre se quejan si el front es `https://*.vercel.app` y la
API es `http://IP` (es contenido mixto: Vercel bloqueará las llamadas).

**Conclusión:** si el front va por HTTPS (Vercel siempre lo va), la API **también
debe ir por HTTPS**.

Opciones baratas:

### A) Certificado en un dominio que controles (Let's Encrypt)

Si más adelante tienes un dominio tipo `api.tudominio.com` apuntando a la IP
estática (registro A):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tudominio.com
```

Certbot reescribe nginx y renueva solo. Es la opción limpia.

### B) Sin dominio propio: Cloudflare + IP (más lío)

Un subdominio gratis de otro sitio o un túnel. No lo necesitas para el MVP si
consigues un dominio barato solo para la API.

### C) No uses el hostname `ec2-xx.compute.amazonaws.com` con Let's Encrypt

Funciona a veces, pero AWS no recomienda certificados en esos nombres y pueden
cambiar. Mejor IP estática + tu dominio, o Lightsail + dominio.

Mientras pruebas **en local** el front contra AWS, puedes usar HTTP. En
**producción en Vercel, planifica HTTPS** antes de dar el enlace a alguien.

Cuando tengas `https://api.tudominio.com`, configura el front con
`apiUrl: 'https://api.tudominio.com/api'` (instrucciones en el `deploy.md` del
repositorio del cliente).

---

## 10. Conectar el front de Vercel

1. Anota la URL pública de la API, **incluyendo `/api`**:
   - HTTP de prueba: `http://3.88.10.20/api`
   - Producción: `https://api.tudominio.com/api`
2. En el repo del **front**, cambia `src/environments/environment.ts`:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://api.tudominio.com/api', // o http://IP/api mientras pruebas
};
```

3. Publica el front en Vercel (paso a paso en `front-end/deploy.md`).
4. Prueba en el navegador: login/registro contra AWS.

Si ves error de **mixed content**, la API sigue en HTTP. Si ves **CORS**,
revisa que `createApp.js` sigue con `app.use(cors())` y que no hay un proxy
que quite cabeceras. Si ves **401**, el JWT no se está enviando o `JWT_SECRET`
cambió.

---

## 11. Actualizar el backend

```bash
cd /var/www/active-recall-backend
git pull
npm ci --omit=dev
# si hay sql/014_....sql nuevo, aplícalo con psql
sudo systemctl restart active-recall
sudo journalctl -u active-recall -n 50 --no-pager
```

Nunca ejecutes `sql/` a ciegas en producción sin leer el script: algunos son
`ALTER` pensados para bases que ya existían.

---

## 12. Operación diaria y cómo no pagar de más

- **Una** instancia. Apágala (`Stop`) si no la usas semanas; con IP estática de
  Lightsail la dirección se conserva.
- No enciendas RDS “para probar cinco minutos” y lo dejes: se factura por hora
  (mínimo ~10 minutos) **aunque no haya tráfico**.
- Copias: `pg_dump` a un archivo y, si quieres, súbelo a un bucket S3 (cupo
  always-free).
- Revisa **Billing → Bills** cada semana el primer mes.
- Logs: `journalctl -u active-recall -f`. Disco lleno = Postgres se cae.

Recursos mínimos en la VM de 1 GB:

- `PGPOOL_MAX=5` (ya en el `.env` de ejemplo).
- No corras `npm run dev` ni el front en esa máquina.

---

## 13. Migrar PostgreSQL a RDS o Aurora

Hazlo **después** de tener la API viva en Lightsail, no el primer día. Para dos
personas y &lt;100 peticiones/día, RDS es una decisión de **operación**
(backups, parches), no de ahorro.

### 13.1 Qué base de AWS es “gratis”

**Ningún PostgreSQL gestionado es always-free** cuando la cuenta ya cumplió
12 meses.

| Opción | Motor compatible con esta API | Coste típico (us-east-1, 2026) | ¿Cuándo |
| ------ | ----------------------------- | ------------------------------ | ------- |
| Postgres **en la VM** | Sí (`pg`) | **0 extra** (solo Lightsail) | Por defecto |
| **RDS PostgreSQL** `db.t4g.micro` Single-AZ, 20 GB gp3 | Sí | ~12 USD instancia + ~2 USD disco ≈ **14 USD/mes** 24/7 | Quieres backups automáticos y no tocar Postgres |
| **Aurora PostgreSQL Serverless**, mínimo **0 ACU** | Sí (mismo SQL) | Almacenamiento ~0,10 USD/GB·mes; compute **0** si está pausado | Tráfico muy irregular y toleras ~15 s al despertar |
| Aurora Serverless mínimo **0,5 ACU** | Sí | ~**44 USD/mes** de compute aunque nadie entre | Evítalo |
| **DynamoDB** | No | Always-free hasta 25 GB | Solo si reescribes repositorios |
| Lightsail Database | Sí | ~15 USD/mes el más pequeño | Peor precio que RDS micro |

RDS se puede **detener** como mucho **7 días**; luego AWS lo enciende solo y
vuelve a cobrar. No sirve como “apagado permanente”.

### 13.2 Si eliges RDS (el camino simple)

Objetivo: **una** instancia `db.t4g.micro`, Single-AZ, disco pequeño, sin
extras.

1. Misma región que Lightsail (`us-east-1`).
2. Motor **PostgreSQL 16**, plantilla **Free tier** si la consola la ofrece
   (en cuentas viejas **igual cobra**).
3. Clase **`db.t4g.micro`** (Graviton). No `t3.small` “por si acaso”.
4. Almacenamiento **gp3 20 GB**, autoscale **off**.
5. **Single-AZ**. Multi-AZ duplica el compute.
6. Acceso público: **No**.
7. Security group: TCP **5432** **solo** desde el security group / firewall
   de la VM de Node. Nunca `0.0.0.0/0`.
8. Backups: retención **7 días**. Sin copias manuales extra al principio.
9. Desactiva **Performance Insights**, **Enhanced Monitoring** y **RDS Proxy**.
10. Usuario maestro distinto de `postgres` si quieres; anota host, puerto, db,
    user, password.

Crea la base vacía (o usa la que crea RDS) y la extensión:

```bash
# Desde la VM (el 5432 de RDS no es público)
export PGPASSWORD='CLAVE_RDS'
psql -h TU-INSTANCIA.xxxxx.us-east-1.rds.amazonaws.com -U recall -d recalldb \
  -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

Aplica los scripts de `sql/` en el mismo orden que en [7.8](#78-esquema-sql)
**si** es una base nueva. Si ya tienes datos en la VM, no reapliques el
esquema: restaura un dump (paso siguiente).

### 13.3 Mover datos (`pg_dump` → RDS)

En la VM, con la API **parada** un minuto para un corte limpio:

```bash
sudo systemctl stop active-recall

pg_dump -h 127.0.0.1 -U recall -d recalldb -Fc -f /tmp/recalldb.dump

export PGPASSWORD='CLAVE_RDS'
pg_restore --no-owner --role=recall \
  -h TU-INSTANCIA.xxxxx.us-east-1.rds.amazonaws.com \
  -U recall -d recalldb /tmp/recalldb.dump
```

Si `pg_restore` se queja de objetos que ya existen, o restáuralo sobre una
base vacía, o usa `--clean --if-exists`.

### 13.4 Apuntar Node a RDS

En `/var/www/active-recall-backend/.env`:

```env
PGHOST=TU-INSTANCIA.xxxxx.us-east-1.rds.amazonaws.com
PGPORT=5432
PGUSER=recall
PGPASSWORD=CLAVE_RDS
PGDATABASE=recalldb
PGPOOL_MAX=5
PGSSLMODE=require
# Si el CA de Amazon no está en el sistema:
# PGSSL_REJECT_UNAUTHORIZED=false
```

```bash
sudo systemctl start active-recall
sudo journalctl -u active-recall -n 20 --no-pager
# debe decir: Conectado a PostgreSQL → recalldb@TU-INSTANCIA...
curl -s http://127.0.0.1:3000/api/health
```

Cuando confirmes que login y materias funcionan, puedes **desinstalar
Postgres de la VM** (`sudo apt remove postgresql`) para no gastar RAM. No
borres el dump hasta tener un backup en S3.

### 13.5 Si eliges Aurora Serverless (pausa a 0 ACU)

Tiene sentido solo si aceptas que **la primera petición del día tarde ~15 s**
y configuras el cluster así:

- Capacidad mínima **0 ACU**, máxima **1 o 2 ACU** (no 16).
- Una sola instancia writer. Sin réplicas.
- Aurora Standard (no I/O-Optimized a esta carga).
- El endpoint de RDS/Aurora igual que arriba, con `PGSSLMODE=require`.
- En el `.env` de Node:

```env
PGPOOL_MAX=2
PGIDLE_TIMEOUT_MS=10000
PGCONNECTION_TIMEOUT_MS=20000
PGSSLMODE=require
```

**Trampa de coste:** un pool de Express que mantiene conexiones idle **impide**
que Aurora pause. Por eso el idle timeout debe ser corto. Si dejas
`PGPOOL_MAX=10` y conexiones abiertas, pagarás ACUs aunque no haya alumnos.

No uses **RDS Proxy** delante: suma ~11 USD/mes y anula el ahorro.

### 13.6 Números redondos (2 usuarios, us-east-1)

Precios on-demand orientativos; confirma en la calculadora de AWS.

| Arquitectura | Estimación / mes |
| ------------ | ---------------- |
| Lightsail 5 USD + Postgres en la VM | **~5 USD** |
| Lightsail 5 USD + RDS `db.t4g.micro` | **~19 USD** |
| Lightsail 5 USD + Aurora 0 ACU (casi siempre dormido, &lt;1 GB datos) | **~5–7 USD** (VM + storage; compute ~0) |
| Solo RDS 24/7 (sin VM: no sirve, Node tiene que vivir en algún sitio) | — |

La fila Aurora asume que el cluster **sí** llega a 0 ACU. Si el pool lo
mantiene despierto a 0,5 ACU, se va a **~50 USD**.

---

## 14. Checklist final

- [ ] Presupuesto AWS con alerta por email (5 USD; 20 USD si usas RDS)
- [ ] Una sola VM (Lightsail 5 USD o EC2 micro)
- [ ] IP estática asociada
- [ ] Puerto 5432 cerrado a internet (solo localhost, o solo el SG de Node si RDS)
- [ ] Node 22 + nginx; Postgres **en la VM** o RDS/Aurora (no los dos a la vez
      “por si acaso”)
- [ ] Los 14 SQL aplicados sobre `recalldb` (o restore del dump)
- [ ] `.env` con pepper, JWT y, si es RDS, `PGSSLMODE=require`
- [ ] `systemctl enable --now active-recall`
- [ ] `curl http://IP/api/health` funciona desde tu PC
- [ ] Front en Vercel con `apiUrl` apuntando a esa URL **con HTTPS en serio**
- [ ] Registro de un usuario de prueba y un `GET /api/subjects` con el token

Cuando eso esté verde, el backend en AWS ya alimenta Active Recall. El detalle
del cliente está en el `deploy.md` del front-end.

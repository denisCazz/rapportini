# Deploy Bitora su VPS (Docker + Caddy + Postgres)

## Prerequisiti

- VPS Linux (Ubuntu 24.04 LTS consigliato)
- Dominio con DNS A/AAAA verso il VPS
- Variabili in `.env` (vedi `.env.example`): `POSTGRES_PASSWORD`, `JWT_SECRET` (≥32), `DOMAIN`, `NEXT_PUBLIC_APP_URL`

## 1. Hardening SSH e firewall

```bash
sudo apt update && sudo apt upgrade -y
sudo adduser deploy
sudo usermod -aG sudo deploy
```

Su `/etc/ssh/sshd_config`:

- `PermitRootLogin no`
- `PasswordAuthentication no` (dopo aver copiato chiave SSH)
- `AllowUsers deploy`

```bash
sudo systemctl restart ssh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Swap (consigliato 2G su VPS piccoli)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Installa Docker

Segui la documentazione ufficiale Docker Engine + Compose plugin.

## 4. Clone e avvio

```bash
git clone <repo> bitora && cd bitora
cp .env.example .env
# modifica .env: POSTGRES_PASSWORD, JWT_SECRET, DOMAIN=app.tuodominio.it, NEXT_PUBLIC_APP_URL=https://app.tuodominio.it
docker compose build
docker compose up -d
```

Prima produzione: applica schema SQL / `npx prisma migrate deploy` sul volume Postgres (vedi [docs/DATA_MIGRATION.md](docs/DATA_MIGRATION.md)).

## 5. Backup automatici

### 5a. Sidecar `pg_backup` (Compose)

Il servizio `pg_backup` in `docker-compose.yml` esegue `scripts/backup.sh` ogni giorno alle **03:00** (timezone del container) e salva dump in volume Docker `backups`.

```bash
docker compose logs -f pg_backup
docker run --rm -v rapportini_backups:/b alpine ls -la /b
```

### 5b. Cron sul **host** (alternativa / doppia copia)

```cron
0 3 * * * docker compose -f /opt/bitora/docker-compose.yml exec -T postgres sh -c 'PGPASSWORD=... pg_dump -U bitora -d bitora -Fc' > /var/backups/bitora_$(date +\%Y\%m\%d).dump
```

Conserva copie off-site. **Test restore mensile**: vedi `scripts/restore.sh` e checklist sotto.

## 6. fail2ban (opzionale)

Abilita jail `sshd` per limitare brute force SSH.

```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

## 6b. Test restore (DR drill)

1. Copia un file `bitora_*.dump` dal volume backup su una macchina di test.
2. Esegui `scripts/restore.sh` contro un Postgres vuoto (vedi commenti nello script).
3. Verifica login app e conteggi tabelle critiche (`rapportini`, `clienti`, `utenti`).

## 7. TLS

Caddy ottiene certificati Let's Encrypt se `DOMAIN` è pubblico e le porte 80/443 sono raggiungibili.

## Rollback

`docker compose down` + ripristino volume da backup `pg_restore`.

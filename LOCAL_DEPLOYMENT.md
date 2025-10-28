# 🏠 Deployment Lokalny - Alternatywa

Jeśli nie możesz połączyć się z serwerem przez SSH, możesz uruchomić aplikację lokalnie:

## 🐳 Deployment Lokalny z Docker

### 1. Uruchom lokalnie:
```bash
cd ~/Secure-Messenger
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### 2. Aplikacja będzie dostępna:
```
http://localhost:5173
```

## 💻 Deployment bez Docker

### 1. Zainstaluj zależności:
```bash
npm install
```

### 2. Skonfiguruj środowisko:
```bash
cp .env.example .env.local
# Edytuj .env.local z danymi Supabase
```

### 3. Uruchom aplikację:
```bash
npm run dev
```

## ☁️ Deployment w chmurze

### Alternatywne platformy:

1. **Vercel** (darmowy):
```bash
npm i -g vercel
vercel
```

2. **Netlify** (darmowy):
```bash
npm run build
# Prześlij folder dist/ do Netlify

```

3. **Railway** (łatwy deployment):
```bash
# Zainstaluj Railway CLI
# railway login
# railway up
```

4. **Render** (darmowy z ograniczeniami):
- Połącz z GitHub
- Automatyczny deployment

## 🔧 Co zrobić z serwerem VPS:

1. **Skontaktuj się z supportem** dostawcy VPS
2. **Sprawdź dokumentację** jak włączyć SSH
3. **Użyj konsoli recovery** jeśli dostępna
4. **Zresetuj hasło root** przez panel

## 📞 Typowi dostawcy VPS i ich panele:

- **DigitalOcean**: Droplet Console
- **Linode**: LISH Console  
- **Vultr**: View Console
- **Hetzner**: VNC Console
- **OVH**: KVM Console

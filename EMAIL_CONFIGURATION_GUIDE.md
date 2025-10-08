# 📧 Konfiguracja Email w Supabase - Krok po kroku

## Problem: Emaile nie są wysyłane

Supabase wymaga konfiguracji SMTP aby wysyłać emaile w produkcji.

## ⚠️ WAŻNE OGRANICZENIA:

### Darmowy plan Supabase:
- **3 emaile/godzinę** przez wbudowany serwer
- Tylko dla rozwoju/testów
- NIE nadaje się do produkcji

### Rozwiązania:

1. **Użyj własnego SMTP** (ZALECANE dla produkcji)
2. **Upgrade do płatnego planu Supabase** ($25/miesiąc = więcej emaili)
3. **Testuj z 3 emailami/h** (dla developmentu)

## 🔧 KROK 1: Konfiguracja w Supabase Dashboard

### A) Zaloguj się do Supabase

```
https://app.supabase.com/project/fyxmppbrealxwnstuzuk
```

### B) Przejdź do ustawień Email

1. Kliknij **"Authentication"** w lewym menu
2. Kliknij **"Email Templates"**
3. Kliknij **"Settings"** (obok)

### C) Sprawdź ustawienia Email

W sekcji **"Email Settings"**:

1. **Enable email confirmations**
   - ✅ Zaznacz jeśli chcesz weryfikować emaile
   - ❌ Odznacz dla szybszej rejestracji (mniej secure)

2. **Enable auto confirm**
   - ❌ Odznacz dla produkcji
   - ✅ Zaznacz tylko dla testów

3. **Secure email change**
   - ✅ Zalecane dla bezpieczeństwa

### D) Skonfiguruj SMTP (Opcjonalnie ale ZALECANE)

#### Opcja 1: Gmail SMTP

1. W Gmail włącz "App Passwords":
   - https://myaccount.google.com/apppasswords
   - Utwórz hasło aplikacji

2. W Supabase, w **"SMTP Settings"**:
   ```
   Host: smtp.gmail.com
   Port: 465
   Username: twoj-email@gmail.com
   Password: [App Password wygenerowane wyżej]
   Sender email: twoj-email@gmail.com
   Sender name: Secure Messenger
   ```

#### Opcja 2: SendGrid (Darmowe 100/dzień)

1. Zarejestruj się na https://sendgrid.com
2. Utwórz API Key
3. W Supabase:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Twój SendGrid API Key]
   Sender email: noreply@secure-messenger.info
   Sender name: Secure Messenger
   ```

#### Opcja 3: Mailgun (Darmowe 5000/miesiąc)

1. Zarejestruj się na https://mailgun.com
2. Zweryfikuj domenę
3. W Supabase:
   ```
   Host: smtp.mailgun.org
   Port: 587
   Username: [Z Mailgun Dashboard]
   Password: [Z Mailgun Dashboard]
   Sender email: noreply@secure-messenger.info
   Sender name: Secure Messenger
   ```

## 🔧 KROK 2: Konfiguracja Szablonów Email

### A) Szablon Powitania (Confirm Signup)

1. W **"Email Templates"** kliknij **"Confirm signup"**
2. Upewnij się że **Subject** i **Body** są poprawne
3. Sprawdź **{{ .ConfirmationURL }}** w template

Przykład Subject:
```
Potwierdź swoje konto w Secure Messenger
```

Przykład Body:
```html
<h2>Witaj w Secure Messenger!</h2>
<p>Kliknij poniższy link aby potwierdzić swoje konto:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
```

### B) Szablon Password Reset

1. W **"Email Templates"** kliknij **"Reset password"**
2. Sprawdź **{{ .Token }}** w template

Przykład Subject:
```
Reset hasła - Secure Messenger
```

Przykład Body:
```html
<h2>Reset hasła</h2>
<p>Kliknij poniższy link aby zresetować hasło:</p>
<p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">Zresetuj hasło</a></p>
<p>Link wygaśnie za 1 godzinę.</p>
```

## 🔧 KROK 3: Konfiguracja URL Redirects

### A) Site URL

W **"Authentication > URL Configuration"**:

```
Site URL: https://secure-messenger.info
```

### B) Redirect URLs

Dodaj dozwolone URL-e:
```
https://secure-messenger.info/*
https://secure-messenger.info/auth/callback
http://5.22.223.49/*
http://localhost:5173/*
```

## 🧪 KROK 4: Testowanie

### Test 1: Rejestracja

```bash
curl -X POST https://fyxmppbrealxwnstuzuk.supabase.co/auth/v1/signup \
  -H "apikey: sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "data": {
      "username": "testuser",
      "display_name": "Test User"
    }
  }'
```

### Test 2: Password Reset

```bash
curl -X POST https://fyxmppbrealxwnstuzuk.supabase.co/auth/v1/recover \
  -H "apikey: sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### Sprawdź logi

W Supabase Dashboard:
- **"Logs"** > **"API Logs"**
- Szukaj błędów związanych z emailem

## 🆘 ROZWIĄZYWANIE PROBLEMÓW

### Problem: "Failed to send email"

**Rozwiązanie:**
1. Sprawdź ustawienia SMTP
2. Zweryfikuj hasło/API key
3. Sprawdź czy port jest prawidłowy (465 lub 587)
4. Upewnij się że sender email jest zweryfikowany

### Problem: "Email rate limit exceeded"

**Rozwiązanie:**
1. Czekaj 1 godzinę (limit 3/h)
2. Lub skonfiguruj własny SMTP
3. Lub upgrade do płatnego planu

### Problem: Email w SPAM

**Rozwiązanie:**
1. Skonfiguruj SPF i DKIM dla swojej domeny
2. Użyj zweryfikowanego sender email
3. Użyj profesjonalnego SMTP (SendGrid, Mailgun)

## ✅ WERYFIKACJA

Po konfiguracji sprawdź:

1. ✅ Email confirmations włączone/wyłączone (według preferencji)
2. ✅ SMTP skonfigurowane (lub świadom limitu 3/h)
3. ✅ Szablony email poprawne
4. ✅ Redirect URLs zawierają https://secure-messenger.info
5. ✅ Test rejestracji wysyła email

## 🚀 SZYBKIE ROZWIĄZANIE DLA TESTÓW

Jeśli chcesz szybko przetestować bez konfiguracji SMTP:

W Supabase Dashboard:
1. **Authentication > Settings**
2. **Enable auto confirm** = ✅ ON
3. **Enable email confirmations** = ❌ OFF

⚠️ **NIE używaj tego w produkcji!** To pomija weryfikację email.

## 📝 PODSUMOWANIE

Dla **produkcji** MUSISZ:
- Skonfigurować własny SMTP (Gmail/SendGrid/Mailgun)
- Włączyć email confirmations
- Wyłączyć auto confirm
- Dodać SPF/DKIM do domeny

Dla **testów** możesz:
- Użyć wbudowanego SMTP (3 emaile/h)
- Lub włączyć auto confirm (pomija email)

Po konfiguracji, użytkownicy otrzymają email po rejestracji i podczas reset hasła!

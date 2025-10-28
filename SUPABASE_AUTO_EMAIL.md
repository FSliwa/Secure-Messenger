# 📧 Konfiguracja automatycznego mailingu Supabase

## USUNIĘCIE SMTP - Użycie wbudowanego systemu Supabase

Zamiast konfigurować zewnętrzny SMTP, użyjemy wbudowanego systemu Supabase.

## 🔧 KONFIGURACJA W SUPABASE DASHBOARD:

### 1. Zaloguj się do Supabase
```
https://app.supabase.com/project/fyxmppbrealxwnstuzuk
```

### 2. Przejdź do: Authentication > Settings

### 3. Skonfiguruj Email Settings:

**Włącz te opcje:**
- ✅ **Enable Email provider** - WŁĄCZ
- ✅ **Enable Email Confirmations** - WŁĄCZ (użytkownicy dostaną email)
- ❌ **Enable auto confirm** - WYŁĄCZ (dla bezpieczeństwa)

**Secure settings:**
- ✅ **Secure email change** - WŁĄCZ
- ✅ **Secure password change** - WŁĄCZ

### 4. URL Configuration

W sekcji **"URL Configuration"**:

**Site URL:**
```
https://secure-messenger.info
```

**Redirect URLs** (dodaj wszystkie):
```
https://secure-messenger.info/**
https://secure-messenger.info/auth/callback
http://5.22.223.49/**
```

### 5. Email Templates

Przejdź do: **Authentication > Email Templates**

#### A) Confirm signup template:

**Subject:**
```
Potwierdź swoje konto - Secure Messenger
```

**Message body (HTML):**
```html
<h2>Witaj w Secure Messenger!</h2>
<p>Dziękujemy za rejestrację. Kliknij poniższy link aby potwierdzić swoje konto:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Link jest ważny przez 24 godziny.</p>
<br>
<p>Jeśli nie rejestrowałeś się w Secure Messenger, zignoruj tę wiadomość.</p>
```

#### B) Reset password template:

**Subject:**
```
Reset hasła - Secure Messenger
```

**Message body (HTML):**
```html
<h2>Reset hasła</h2>
<p>Otrzymaliśmy prośbę o zresetowanie hasła dla Twojego konta.</p>
<p>Kliknij poniższy link aby ustawić nowe hasło:</p>
<p><a href="{{ .ConfirmationURL }}">Zresetuj hasło</a></p>
<p>Link wygaśnie za 1 godzinę.</p>
<br>
<p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
```

### 6. Rate Limits

⚠️ **WAŻNE:** Darmowy plan Supabase ma limity:
- **Email confirmations:** 3 emaile/godzinę
- **Dla większej liczby:** Upgrade do Pro ($25/miesiąc)

## ✅ ZALETY WBUDOWANEGO SYSTEMU:

1. ✅ Brak konfiguracji SMTP
2. ✅ Automatyczne wysyłanie emaili
3. ✅ Bezpieczne szablony
4. ✅ Integracja z Auth
5. ✅ Automatyczne trackowanie

## ⚠️ OGRANICZENIA:

1. ❌ Limit 3 emaile/h (darmowy plan)
2. ❌ Email od: noreply@mail.app.supabase.io
3. ❌ Może trafiać do SPAM

## 🔄 JAK TO DZIAŁA:

```
Użytkownik rejestruje się
         ↓
Supabase tworzy konto (status: unconfirmed)
         ↓
Supabase AUTOMATYCZNIE wysyła email
         ↓
Użytkownik klika link w emailu
         ↓
Konto aktywowane (status: confirmed)
         ↓
Użytkownik może się zalogować
```

## 🧪 TESTOWANIE:

Po skonfigurowaniu, przetestuj:

1. **Rejestracja:**
   - Użyj PRAWDZIWEGO emaila
   - Zarejestruj się na https://secure-messenger.info
   - Sprawdź skrzynkę (włącznie ze SPAM)
   - Kliknij link potwierdzający

2. **Password reset:**
   - Kliknij "Forgot password?"
   - Wpisz email
   - Sprawdź skrzynkę
   - Kliknij link

## 📊 MONITORING EMAILI:

Sprawdź logi wysyłania emaili:
```
Supabase Dashboard > Logs > Auth Logs
```

Szukaj:
- `email.sent` - email wysłany
- `email.failed` - błąd wysyłania

## ✅ PODSUMOWANIE:

Po tej konfiguracji:
- ✅ Emaile wysyłane automatycznie przez Supabase
- ✅ Brak potrzeby SMTP
- ✅ Działa od razu
- ⚠️ Limit 3/h (wystarczy dla małych aplikacji)

Dla większej skali, rozważ upgrade do Pro lub zewnętrzny SMTP.

# 📧 Instrukcja Testowania Emaili w Supabase

## 🚀 Szybki Start

### 1. Sprawdzenie Konfiguracji
```bash
npm run check:config
```
To polecenie sprawdzi:
- ✅ Zmienne środowiskowe
- ✅ Połączenie z Supabase
- ✅ Konfigurację autentykacji

### 2. Test w Przeglądarce (Zalecane)
```bash
npm run test:email-flows
```
Otworzy się strona testowa gdzie możesz:
- Przetestować rejestrację z wysyłką emaila
- Przetestować reset hasła
- Zobaczyć logi w czasie rzeczywistym

### 3. Testy w Terminalu
```bash
# Test rejestracji
npm run test:registration

# Test resetowania hasła
npm run test:password-reset
```

## ⚙️ Konfiguracja Supabase

### Krok 1: Sprawdź Ustawienia Email
1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Przejdź do **Authentication → Email Templates**

### Krok 2: Włącz Potwierdzanie Email
1. Przejdź do **Settings → Auth**
2. Upewnij się że:
   - ✅ Enable email signup = ON
   - ✅ Enable email confirmation = ON
   - ✅ Secure email change = ON

### Krok 3: Konfiguracja SMTP (Opcjonalne)
Dla własnego SMTP (np. Gmail):
1. **Settings → Auth → SMTP Settings**
2. Enable custom SMTP = ON
3. Wypełnij dane:
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: twoj-email@gmail.com
   Password: hasło-aplikacji
   Sender email: twoj-email@gmail.com
   Sender name: SecureChat
   ```

## 📋 Checklist Testów

### Test Rejestracji:
- [ ] Otwórz `test-email-flows.html`
- [ ] Wprowadź dane Supabase (URL i Anon Key)
- [ ] Wypełnij formularz rejestracji
- [ ] Kliknij "Test Registration"
- [ ] Sprawdź email (również spam)
- [ ] Kliknij link weryfikacyjny
- [ ] Spróbuj się zalogować

### Test Resetowania Hasła:
- [ ] Wprowadź email istniejącego użytkownika
- [ ] Kliknij "Test Password Reset"
- [ ] Sprawdź email
- [ ] Kliknij link resetowania
- [ ] Ustaw nowe hasło
- [ ] Zaloguj się nowym hasłem

## ❗ Rozwiązywanie Problemów

### Email nie przychodzi:
1. **Sprawdź folder SPAM**
2. **Sprawdź limity** (3 emaile/godzinę na adres)
3. **Sprawdź logi w Supabase:**
   - Dashboard → Logs → Auth
   - Szukaj błędów związanych z email

### Błąd "Email not confirmed":
- Użytkownik musi najpierw potwierdzić email
- Sprawdź czy email confirmation jest włączone

### Błąd "Rate limit exceeded":
- Poczekaj godzinę lub użyj innego emaila
- Rozważ upgrade do Pro dla wyższych limitów

## 📊 Limity Emaili

### Plan Darmowy:
- 3 emaile na godzinę per adres email
- 30 emaili na godzinę łącznie
- Domyślny nadawca Supabase

### Plan Pro:
- 100 emaili na godzinę per adres
- Brak limitu łącznego
- Własny SMTP
- Własna domena

## 🔧 Konfiguracja Produkcyjna

### 1. Własna Domena Email
- Skonfiguruj własny SMTP
- Dodaj rekordy SPF/DKIM
- Ustaw własny adres nadawcy

### 2. Szablony Email
W Dashboard → Email Templates możesz dostosować:
- Wygląd emaili
- Treść wiadomości
- Logo i kolory

### 3. Monitoring
- Sprawdzaj logi regularnie
- Monitoruj bounce rate
- Śledź deliverability

## 📝 Przykładowe Dane Testowe

### Rejestracja:
```javascript
Email: test-user-123@example.com
Password: TestPassword123!
Username: testuser123
```

### Reset Hasła:
```javascript
Email: existing-user@example.com
New Password: NewPassword456!
```

## 🚨 Ważne Uwagi

1. **Emaile testowe** - używaj prawdziwych adresów email do których masz dostęp
2. **Limity** - nie przekraczaj 3 emaili/godzinę na ten sam adres
3. **Środowisko** - w development emaile mogą być auto-potwierdzone
4. **Produkcja** - zawsze testuj na środowisku zbliżonym do produkcyjnego

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź [Dokumentację Supabase](https://supabase.com/docs/guides/auth/auth-email)
2. Zobacz [FAQ](https://supabase.com/docs/guides/auth/auth-email#faq)
3. Sprawdź logi w Dashboard
4. Skontaktuj się z supportem Supabase

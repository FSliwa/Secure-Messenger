# Instrukcje debugowania błędu rejestracji w konsoli przeglądarki

## 🔍 KROK PO KROKU - ZNAJDŹ DOKŁADNY BŁĄD:

### 1. Otwórz aplikację
```
http://5.22.223.49
```

### 2. Otwórz DevTools
- **Windows/Linux:** Naciśnij `F12` lub `Ctrl+Shift+I`
- **Mac:** Naciśnij `Cmd+Option+I`

### 3. Idź do zakładki **Console**
(Góra DevTools: Elements | Console | Sources | Network...)

### 4. Wyczyść konsolę
Kliknij ikonę 🚫 (Clear console) w lewym górnym rogu konsoli

### 5. Spróbuj się zarejestrować
Wypełnij formularz i kliknij przycisk rejestracji

### 6. PRZEPISZ WSZYSTKIE BŁĘDY które zobaczysz
Będą wyglądać mniej więcej tak:

```
❌ Signup error: Error: ...
❌ Failed to create user profile: ...
❌ PostgrestError: ...
❌ 23505: duplicate key value violates...
❌ 42703: column "..." does not exist
❌ 42P01: relation "..." does not exist
```

### 7. Przejdź do zakładki **Network**

### 8. Wyczyść requesty (ikona 🚫)

### 9. Ponów rejestrację

### 10. Znajdź requesty w czerwonym kolorze (failed)

### 11. Kliknij na nie i zobacz:
- **Headers** → jaki był request URL
- **Response** → co zwróciła baza

### 12. PRZEPISZ MI:
- Błędy z Console
- Response z Network (czerwone requesty)
- Ewentualnie zrób screenshot

## 📸 LUB PROŚCIEJ - SCREENSHOT:

1. Otwórz Console (F12)
2. Spróbuj się zarejestrować
3. Zrób screenshot błędów
4. Wyślij mi

---

## 🆘 JEŚLI NIE WIDZISZ BŁĘDÓW W KONSOLI:

To znaczy że błąd jest ukryty. Uruchom w konsoli (wklej i Enter):

```javascript
// Włącz szczegółowe logowanie
localStorage.setItem('debug', 'true');

// Zobacz co jest w Supabase
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Odśwież stronę
location.reload();
```

Potem spróbuj ponownie się zarejestrować i zobacz więcej logów.

# Kompleksowa Analiza Błędów i Konfliktów

## Data: 8 Października 2025

---

## BŁĄD GŁÓWNY: "An unexpected error occurred" przy rejestracji

### ZIDENTYFIKOWANE PROBLEMY:

#### 1. BRAK TRIGGERA W BAZIE DANYCH
**Problem:** Trigger `handle_new_user` nie istnieje w Supabase
**Skutek:** Po utworzeniu konta w auth.users, profil nie jest tworzony w tabeli users
**Rozwiązanie:** SQL w pliku FINAL_FIX_REGISTRATION.sql

#### 2. POTENCJALNY KONFLIKT: Dwie metody rejestracji

**Metoda A:** `src/lib/supabase.ts` - `signUp()`
```typescript
export const signUp = async (
  email, password, displayName, publicKey, username, encryptedPrivateKey
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        username: username,
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey
      }
    }
  })
  return data
}
```

**Metoda B:** `src/lib/enhanced-auth.ts` - `enhancedSignUp()`
```typescript
export async function enhancedSignUp(options: SignUpOptions) {
  // Tworzy konto
  const { data: authData } = await supabase.auth.signUp(...)
  
  // Próbuje RĘCZNIE utworzyć profil
  const { error: profileError } = await supabase
    .from('users')
    .insert({ id, username, email, profile, status })
    
  if (profileError) {
    await supabase.auth.signOut() // Usuwa konto!
    return { success: false }
  }
}
```

**KONFLIKT:** Aplikacja może używać obu metod, co powoduje nieprzewidywalne zachowanie!

#### 3. NIEKOMPATYBILNA STRUKTURA DANYCH

**W `enhancedSignUp` linia 92:**
```typescript
profile: {
  display_name: displayName,
  bio: '',
  avatar_url: null
}
```

**W schemacie bazy:**
```sql
CREATE TABLE users (
  display_name text,  -- To jest kolumna, NIE jsonb!
  bio text,
  avatar_url text
)
```

**BŁĄD:** Kod próbuje wstawić `profile: {...}` jako obiekt JSONB, ale w bazie `display_name`, `bio`, `avatar_url` to osobne kolumny!

#### 4. BRAK OBSŁUGI ENCRYPTION_KEYS W enhanced-auth.ts

`enhancedSignUp` nie zapisuje kluczy do tabeli `encryption_keys`!

---

## ROZWIĄZANIE:

### OPCJA A: Uproszczona rejestracja (ZALECANA)

Usuń `enhancedSignUp` i używaj tylko prostej metody `signUp()` + trigger w bazie.

### OPCJA B: Naprawa enhanced-auth.ts

Popraw strukturę wstawiania danych.

---

## WSZYSTKIE ZNALEZIONE KONFLIKTY:

1. Dwie różne funkcje rejestracji (`signUp` vs `enhancedSignUp`)
2. Niezgodna struktura danych (profile jako jsonb vs osobne kolumny)
3. Brak zapisu do `encryption_keys` w enhanced-auth
4. Brak triggera w bazie danych
5. Potencjalny problem z RLS policies

---

## REKOMENDOWANE DZIAŁANIA:

1. Uruchom FINAL_FIX_REGISTRATION.sql (trigger)
2. Zmodyfikuj kod aby używał tylko jednej metody rejestracji
3. Usuń konfliktujący kod z enhanced-auth.ts
4. Przetestuj rejestrację

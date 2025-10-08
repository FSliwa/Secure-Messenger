# 🔍 Gdzie są klucze JWT? - Szczegółowa instrukcja

## Klucze które NIE są tym czego potrzebujemy:

❌ **sb_publishable_...** (nowy format)  
❌ **sb_secret_...** (nowy format)  
❌ **d1e45464-ffb9-4333-9142-4193c517c8df** (UUID - standby key)  
❌ **76a00d8a-9cee-4ddf-826f-ad6edb451dee** (UUID - current key)  
❌ **+BoPqNRZPQsifPjy...** (Legacy JWT secret)  

## Klucze których SZUKAMY:

✅ **anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...`  
✅ **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...`  

## Gdzie szukać w Supabase Dashboard:

### Opcja 1: Settings > API > Project API keys

Powinno wyglądać tak:
```
Project URL
https://fyxmppbrealxwnstuzuk.supabase.co

Project API keys
────────────────
anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...    [Copy] [Reveal]

service_role secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...    [Copy] [Reveal]
```

### Opcja 2: Project Settings > Configuration

### Opcja 3: Authentication > Settings > JWT Settings

## Jeśli NIE WIDZISZ kluczy JWT:

To możliwe że Twój projekt używa TYLKO nowego systemu kluczy.

### W takim przypadku mamy 2 opcje:

#### A) Utworzyć nowy projekt Supabase
- Który będzie używał starego systemu JWT
- Przenieść bazę danych

#### B) Zaktualizować aplikację do nowych kluczy
- Zmienić kod aby używał `sb_publishable_` i `sb_secret_`
- Więcej pracy, ale działa

## Co zrobić TERAZ:

1. **Sprawdź dokładnie w Settings > API**
   - Przewiń całą stronę w dół
   - Sprawdź czy nie ma sekcji "JWT Settings"
   - Kliknij wszystkie przyciski "Reveal" lub "Show"

2. **Jeśli nadal nie ma kluczy JWT**
   - Napisz: "Nie ma kluczy JWT w moim projekcie"
   - Przejdziemy do aktualizacji aplikacji na nowe klucze

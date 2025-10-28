# Generowanie kluczy JWT z Legacy JWT secret

## Masz Legacy JWT secret:
```
+BoPqNRZPQsifPjy9CqtZe03lr3TS1+Vnfq1h0DW870UzMH2BKuPqBwQYkorSzOofveum7FPkg/9y6q8N7OFEQ==
```

## Gdzie znaleźć gotowe klucze JWT:

### 1. W Supabase Dashboard powinny być gdzieś obok tego sekretu:

W **Settings > API** szukaj:
- **anon (public) key** - zaczyna się od `eyJ...`
- **service_role key** - zaczyna się od `eyJ...`

Te klucze są generowane automatycznie na podstawie JWT secret.

### 2. Jeśli nie widać kluczy, mogą być w:
- **Project Settings > API**
- **Authentication > Settings**
- Kliknij "Reveal" lub "Show" obok pól z kluczami

### 3. Format kluczy JWT:

Klucze JWT wyglądają tak:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.[podpis]
```

## WAŻNE:
Legacy JWT secret to NIE jest klucz którego używamy w aplikacji. To jest sekret do GENEROWANIA kluczy. Musisz znaleźć faktyczne klucze JWT (anon i service_role) które są wygenerowane na podstawie tego sekretu.

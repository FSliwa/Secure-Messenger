# ⚠️ PILNE: Problem z kluczami API Supabase

## Status: Klucze API zwracają "Invalid API key"

### Możliwe przyczyny:

1. **Projekt jest PAUSED (nieaktywny)**
   - Darmowe projekty Supabase są automatycznie pauzowane po 7 dniach nieaktywności
   - **ROZWIĄZANIE:** Zaloguj się do https://app.supabase.com/project/fyxmppbrealxwnstuzuk
   - Jeśli widzisz komunikat o pauzowaniu, kliknij **"Restore project"**

2. **Klucze zostały zregenerowane**
   - Sprawdź w Settings > API czy klucze się zgadzają
   - Podane klucze:
     - Anon: `...P_u5yDgASYwx-ImH-QhTTqAO8xM96DvUkgJ1tCm-8Pw`
     - Service: `..._exYkOlAqEYUMTyqt8AByk2IE7rqIUghG3rtbpsedBI`

3. **Problem z projektem**
   - Sprawdź zakładkę "Home" w Supabase Dashboard
   - Czy są jakieś alerty lub ostrzeżenia?

### Co zrobić TERAZ:

1. **Zaloguj się do Supabase Dashboard**
   ```
   https://app.supabase.com/project/fyxmppbrealxwnstuzuk
   ```

2. **Sprawdź status projektu**
   - Czy jest aktywny?
   - Czy trzeba go przywrócić (Restore)?

3. **Zweryfikuj klucze API**
   - Settings > API
   - Porównaj z podanymi

4. **Sprawdź Database**
   - Czy tabele istnieją?
   - Table Editor > sprawdź tabele

### Test kluczy:

Po przywróceniu projektu, przetestuj:
```bash
curl https://fyxmppbrealxwnstuzuk.supabase.co/rest/v1/ \
  -H "apikey: TWÓJ_KLUCZ_ANON" \
  -H "Authorization: Bearer TWÓJ_KLUCZ_ANON"
```

Powinno zwrócić listę dostępnych tabel lub "[]" jeśli brak tabel.

### Alternatywa:

Jeśli projekt jest nieodwracalnie uszkodzony:
1. Utwórz nowy projekt Supabase
2. Wykonaj migrację SQL z plików
3. Zaktualizuj klucze w aplikacji

## ⏱️ To jest najprawdopodobniej projekt PAUSED!

Darmowe projekty Supabase są automatycznie pauzowane. Zaloguj się i kliknij "Restore".

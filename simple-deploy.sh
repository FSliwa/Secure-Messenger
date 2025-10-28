#!/bin/bash

echo "🚀 Simple Deployment Script"
echo "=========================="
echo ""
echo "Ten skrypt pomoże Ci przesłać pakiet na serwer."
echo ""
echo "📋 Informacje:"
echo "- Serwer: 5.22.223.49"
echo "- Użytkownik: admin"
echo "- Hasło: MIlik112"
echo ""
echo "Spróbujmy najpierw przesłać pakiet..."
echo ""

# Test connection first
echo "🔍 Testuję połączenie..."
if nc -zv -w5 5.22.223.49 22 2>/dev/null; then
    echo "✅ Serwer odpowiada na porcie SSH"
else
    echo "❌ Nie mogę połączyć się z serwerem"
    exit 1
fi

echo ""
echo "📤 Przesyłam pakiet (będziesz musiał wpisać hasło)..."
echo "HASŁO: MIlik112"
echo ""

# Try to upload
scp -o StrictHostKeyChecking=no secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pakiet przesłany pomyślnie!"
    echo ""
    echo "📋 Teraz połącz się z serwerem:"
    echo "ssh admin@5.22.223.49"
    echo ""
    echo "Po zalogowaniu wykonaj:"
    echo "cd /tmp && tar -xzf secure-messenger-deploy.tar.gz server-deploy.sh && chmod +x server-deploy.sh && sudo ./server-deploy.sh"
else
    echo ""
    echo "❌ Nie udało się przesłać pakietu"
    echo ""
    echo "Możliwe przyczyny:"
    echo "1. Nieprawidłowe hasło"
    echo "2. Problem z połączeniem"
    echo "3. Brak uprawnień"
    echo ""
    echo "Spróbuj ręcznie:"
    echo "scp secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/"
fi

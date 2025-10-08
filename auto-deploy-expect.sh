#!/usr/bin/expect -f

# Automatic deployment with expect
set timeout 30
set password "MIlik112"

puts "🚀 Automatyczny deployment Secure-Messenger\n"

# Upload package
puts "📤 Przesyłanie pakietu na serwer..."
spawn scp -o StrictHostKeyChecking=no secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/
expect {
    "password:" {
        send "$password\r"
        expect eof
    }
    timeout {
        puts "Timeout podczas przesyłania!"
        exit 1
    }
}

puts "\n✅ Pakiet przesłany!"
puts "\n🔧 Uruchamiam deployment na serwerze..."

# Connect and deploy
spawn ssh -o StrictHostKeyChecking=no admin@5.22.223.49
expect {
    "password:" {
        send "$password\r"
        expect "$ "
    }
    timeout {
        puts "Timeout podczas logowania!"
        exit 1
    }
}

# Execute deployment commands
send "cd /tmp\r"
expect "$ "

send "tar -xzf secure-messenger-deploy.tar.gz server-deploy.sh\r"
expect "$ "

send "chmod +x server-deploy.sh\r"
expect "$ "

send "sudo ./server-deploy.sh\r"
expect {
    "password for admin:" {
        send "$password\r"
        expect "$ "
    }
    "$ " {}
}

send "cd /opt/secure-messenger\r"
expect "$ "

puts "\n✅ Deployment rozpakowany!"
puts "\n📝 WAŻNE: Musisz teraz skonfigurować plik .env.production"
puts "Wykonaj: nano .env.production"
puts "\nUstaw:"
puts "- VITE_SUPABASE_URL=https://twoj-projekt.supabase.co"
puts "- VITE_SUPABASE_ANON_KEY=twoj-klucz"
puts "- VITE_APP_URL=http://5.22.223.49"

# Keep session open
interact

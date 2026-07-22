# Chat App

WhatsApp-benzeri gerçek zamanlı sohbet uygulaması. Tekil ve grup sohbetleri, arkadaşlık sistemi, okundu bilgisi, dosya paylaşımı, mesaj arama/düzenleme/silme ve daha fazlasını içerir.

## Stack

- **Server**: TypeScript, Express, MongoDB (Mongoose), Passport (local + JWT), Socket.io, Multer
- **Client**: Next.js (App Router), Tailwind CSS, Tabler Icons, socket.io-client

## Kurulum

### 1. MongoDB

```bash
docker run -d --name chat-app-mongo -p 27017:27017 mongo:7
```

### 2. Server

```bash
cd server
cp .env.example .env   # JWT_SECRET değerini değiştirin
npm install
npm run dev            # http://localhost:4000
```

### 3. Client

```bash
cd client
npm install
npm run dev            # http://localhost:3000
```

`client/.env.local` (yoksa oluşturun):

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Özellikler

- Kayıt/giriş (Passport local + JWT), urlsafe/tekil username
- Username'e göre kullanıcı arama, arkadaşlık istekleri (socket ile anlık)
- Tekil ve grup sohbetleri, grup yönetimi (rename, üye ekle/çıkar, ayrılma)
- Gerçek zamanlı mesajlaşma, okundu bilgisi, "yazıyor..." göstergesi, online/offline durumu
- Dosya/resim paylaşımı (10MB limit)
- Mesaj düzenleme/silme, sohbet-içi ve global mesaj arama
- Reverse infinite scroll, mobil responsive layout
- Emoji picker, bildirim sesi, tarayıcı bildirimleri

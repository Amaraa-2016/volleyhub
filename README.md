# Volleyhub

Волейболын клуб, тэмцээний удирдлагын платформ. Гурван бүрэлдэхүүн:

| Хавтас | Технологи | Тайлбар |
| --- | --- | --- |
| `backend/` | .NET 9 Web API + PostgreSQL (EF Core) | Multi-tenant API. Клуб бүр өөрийн schema-тай |
| `backoffice/` | Next.js 15 + AntD + NextAuth | Клубын админ веб |
| `mobile/` | Expo (React Native) + expo-router | Тамирчин, дасгалжуулагч, дэмжигчдэд зориулсан апп |

Архитектурын дэлгэрэнгүйг [ARCHITECTURE.md](ARCHITECTURE.md)-с уншина уу.

## Локал орчинд ажиллуулах

### 1. PostgreSQL

```bash
docker run -d --name volleyhub-db -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=volleyhub-db -p 5432:5432 postgres:16-alpine
```

`backend/volleyhub-api/appsettings.json` доторх `ConnectionStrings:dbCon` нь анхнаасаа энэ
тохиргоог заасан байгаа. Схем, хүснэгтүүд API эхлэх үед автоматаар үүснэ — migration
ажиллуулах шаардлагагүй.

### 2. API

```bash
dotnet run --project backend/volleyhub-api
```

Swagger: <http://localhost:5090/swagger>

### 3. Backoffice

```bash
cd backoffice && npm install --legacy-peer-deps && npm run dev
```

`.env.example`-г `.env.local` болгож хуулаад `NEXTAUTH_SECRET`-ээ солино уу.
Веб: <http://localhost:3000>

### 4. Mobile

```bash
cd mobile && npm install && npx expo start
```

API хаягийг тохируулаагүй бол апп нь Expo packager-ийн host-оос `http://<host>:5090` гэж
дүгнэнэ — утас нэг wifi дээр байвал шууд ажиллана. Өөр хаяг руу заах бол
`EXPO_PUBLIC_API_URL`-ыг тохируулна.

## Эхний тохиргоо

1. Backoffice дээр бүртгүүлнэ.
2. Платформын админ болохын тулд утасны дугаараа `appsettings.json`-ы
   `Platform:AdminPhones` (эсвэл k3s дээр `PLATFORM_ADMIN_PHONES`) дотор бичээд дахин
   нэвтэрнэ. Эрх нь дараагийн нэвтрэлтээр олгогдоно.
3. `/club` дээрээс клуб бүртгүүлэх хүсэлт илгээнэ.
4. `/admin` дээрээс өөрийн хүсэлтээ батална — клубын schema үүсч, та эзэмшигч болно.
5. Багууд, тамирчид, тэмцээнээ үүсгээд хуваарь автоматаар үүсгэж болно.

## Deploy — kindergarten ажиллаж буй сервер дээр

Volleyhub нь тусдаа Postgres босгохгүй. Байгаа Postgres дээр **тусдаа database**
(`volleyhub-db`), **тусдаа хэрэглэгч** (`volleyhub`) үүсгэж, k3s дээр өөрийн `volleyhub`
namespace-д ажиллана.

> **Нэг DB дотор хамт байрлуулж болохгүй.** Volleyhub, kindergarten хоёулаа
> `public.tenant` / `public.account` хүснэгттэй, хоёулаа `tenant_<id>` нэртэй schema
> үүсгэдэг тул нэг database дотор бие биенээ дарж бичнэ.

### 1. Database үүсгэх (нэг удаа, серверийн node дээр)

```bash
VOLLEYHUB_DB_PASSWORD='<шинэ нууц үг>' sh deploy/bootstrap-db.sh
```

Скрипт нь Postgres pod дотор psql ажиллуулна — kindergarten-ы admin нууц үг хаана ч
хуулагдахгүй. Дахин ажиллуулахад аюулгүй, `kindergarten-db`-д хүрэхгүй.

### 2. Манифест дэх `CHANGE-ME` утгуудыг солих

`deploy/k3s.yaml` дотор: `DB_PASSWORD` (дээрхтэй яг ижил), `AppSettings__Token`,
`NEXTAUTH_SECRET`, Docker образын эзэмшигч, node-ийн IP, платформ админы утас.

### 3. Apply

```bash
k3s kubectl apply -f deploy/k3s.yaml
```

Гарц (NodePort, TLS-гүй):

| Хаяг | Юу |
| --- | --- |
| `http://<node-ip>:30090` | API (`/swagger`, `/api/vh/health`) |
| `http://<node-ip>:30030` | Backoffice |
| `http://<node-ip>:30080` | Mobile web |

⚠ NodePort нь энгийн HTTP тул нууц үг, token нь шифрлэгдэхгүй дамжина. Туршилтын шатанд
хангалттай ч, жинхэнэ хэрэглэгч оруулахаас өмнө байгаа ingress-nginx + cert-manager дээр
домэйнтэй болгох хэрэгтэй (зөвхөн Ingress object нэмж, ConfigMap доторх 2 URL солино).

### 4. CI/CD

`.github/workflows/*.yml` нь Docker Hub руу build хийж, SSH-ээр k3s rollout хийнэ.
GitHub repo-д тохируулах secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `HOST`, `USERNAME`,
`SSH_PASSWORD`, болон `PUBLIC_API_URL` (жишээ нь `http://<node-ip>:30090` — mobile web
bundle дотор шатаагддаг тул өөрчлөгдвөл дахин build хийнэ).

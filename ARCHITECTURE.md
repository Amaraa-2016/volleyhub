# Volleyhub — Architecture

Гурван бүрэлдэхүүнтэй, олон клуб (multi-tenant) үйлчилдэг платформ. Kindergarten (eKids)
төслийн архитектурыг үндэс болгосон: нэг API, schema-per-tenant тусгаарлалт, нэг identity
давхарга дээр веб болон мобайл хоёулаа суусан.

```
                 ┌──────────────┐        ┌──────────────┐
  Админ  ───────▶│  backoffice  │        │    mobile    │◀─── Тамирчин / дэмжигч
                 │  (Next.js)   │        │    (Expo)    │
                 └──────┬───────┘        └───────┬──────┘
                        │ server proxy           │ fetch + Bearer
                        │ (token сервер талд)    │ (token SecureStore-д)
                        ▼                        ▼
                 ┌──────────────────────────────────────┐
                 │        backend  (.NET 9 Web API)     │
                 │  /api/vh/account   — identity        │
                 │  /api/vh/platform  — платформ админ  │
                 │  /api/vh/backoffice— клубын удирдлага│
                 │  /api/vh/client    — мобайл (read)   │
                 └───────────────────┬──────────────────┘
                                     ▼
                          ┌────────────────────┐
                          │     PostgreSQL     │
                          │  public + tenant_N │
                          └────────────────────┘
```

## 1. Multi-tenancy: schema-per-tenant

`public` schema-д зөвхөн cross-tenant өгөгдөл байна:

| Хүснэгт | Утга |
| --- | --- |
| `tenant` | Клубын бүртгэл |
| `account` | Глобал хэрэглэгч (утас unique). Веб, мобайл хоёулаа энэ дээр нэвтэрнэ |
| `account_tenant` | Хэрэглэгч ↔ клуб гишүүнчлэл. `role` = owner/admin/coach/player/fan, `status` = active/pending |
| `tenant_request` | Клуб бүртгүүлэх хүсэлт. Батлагдсаны дараа л `tenant` мөр үүснэ |
| `platform_admin` | Платформын супер админууд |

Клуб бүр `tenant_<tenantid>` нэртэй өөрийн schema-тай. Тэнд домэйний бүх хүснэгт байрлана:
`role`, `staff`, `team`, `player`, `team_player`, `venue`, `season`, `tournament`,
`tournament_team`, `match`, `match_set`, `announcement`. Тусгаарлалт нь schema түвшинд
хийгддэг тул домэйний хүснэгтүүд `tenantid` багана огт агуулдаггүй.

**Хэрхэн шийдэгддэг вэ:** хүсэлт бүр `tenantid` header авчирна.
[`HttpTenantProvider`](backend/volleyhub-api/Tenant/ITenantProvider.cs) уг клубыг олоод,
JWT доторх `accountid` тухайн клубын **идэвхтэй гишүүн** мөн эсэхийг `account_tenant`-аас
шалгана. Ингэснээр header-ээ сольж өөр клуб руу орох боломжгүй.

EF нэг context дээр нэг л model cache хийдэг тул
[`SchemaAwareModelCacheKeyFactory`](backend/volleyhub-api/Tenant/SchemaAwareModelCacheKeyFactory.cs)
schema-г cache key-д оруулж өгдөг — эс тэгвээс эхэлж үйлчлүүлсэн клубын schema бүх процесст
наалдана.

## 2. Схем үүсгэлт — migration байхгүй

[`TenantSchemaManager`](backend/volleyhub-api/Tenant/TenantSchemaManager.cs) бүх DDL-ийг
эзэмшинэ:

- `EnsureSharedSchema()` / `EnsureAccountSchema()` — `public` schema-г түүхий, idempotent SQL-ээр
  үүсгэнэ. (Хоёр EF context `public.tenant`-ыг map хийдэг тул migration history зөрчилдөнө.)
- `CreateSchemaForTenant()` — EF model-оос шууд хүснэгт үүсгэнэ, эсвэл байгаа schema дээр
  дутуу багана нэмж, илүүг нь хаяна (`SyncSchemaColumnsAsync`).

Эдгээр нь `Program.cs` дотор **эхлэх бүрд** ажилладаг. Тиймээс шинэ багана нэмэхэд зөвхөн
model-оо өөрчлөөд deploy хийхэд хангалттай — клуб бүрийн schema автоматаар тэгширнэ.

Энэ нь мянга мянган tenant-д тохирохгүй (эхлэх хугацаа шугаман өснө), гэхдээ хэдэн арваас
хэдэн зуун клубын хэмжээнд migration-ы төвөг үүрэхээс хамаагүй хямд.

## 3. Identity ба token

Хоёр төрлийн JWT:

| Token | Claims | Хаана хэрэглэгдэх |
| --- | --- | --- |
| Account token | `accountid`, `phone`, `platformadmin?` | `/api/vh/account/*`, `/api/vh/platform/*` — клуб сонгохоос өмнө |
| Club token | `accountid`, `tenantid`, `role`, `staffid`, `phone` | `/api/vh/backoffice/*`, `/api/vh/client/*` — үргэлж `tenantid` header-тэй хамт |

Нэвтрэх үед account зөвхөн **нэг** идэвхтэй клубтэй бол backend club token-ыг шууд буцаана —
ингэснээр ганц клубтэй хэрэглэгч сонголтын дэлгэц огт харахгүй.

Нууц үг [`PasswordHasher`](backend/volleyhub-api/Service/PasswordHasher.cs) дотор PBKDF2-SHA256
(100k iteration, санамсаргүй salt) -оор нэг чигт hash хийгддэг.
`pbkdf2$<iterations>$<salt>$<hash>` форматтай тул iteration-оо ирээдүйд өсгөхөд хуучин hash-ууд
хүчинтэй хэвээр үлдэнэ. (Kindergarten дээрх буцаагдах Rijndael схемээс энэ нь ялгаатай.)

### Эрхийн хяналт

- `HttpTenantProvider` — гишүүн эсэхийг шалгана (та энэ клубт хамаарах уу).
- `BackofficeController.AssertStaff()` / `AssertManager()` — юу хийж болохыг шалгана.
  `owner`/`admin` бүгдийг, `coach` уншиж, тамирчин болон үр дүн бүртгэж чадна.
  `player`/`fan` backoffice руу огт орохгүй.
- Платформын эрхийг **үргэлж** `public.platform_admin`-аас дахин уншина. Token доторх
  `platformadmin` claim нь зөвхөн UI-ийн зөвлөмж — хуучирсан token эрх олгож чадахгүй.

## 4. Backoffice: token браузерт очдоггүй

Next.js талд бүх дуудлага сервер талын proxy дундуур явна:

- `app/api/ui/backoffice/route.ts` — session-оос **club token + tenantid**-г нэг дор авч
  хавсаргана. Хоёулаа нэг эх сурвалжаас гардаг тул хэзээ ч зөрөхгүй.
- `app/api/ui/account/route.ts` — account token-ыг хавсаргана, `tenantid` илгээхгүй.
  Login/register/клуб хайлт зэрэг anonymous зам нь session шаардахгүй.

Backend-ийн хаягийг зөвхөн сервер тал уншдаг (`API_BASE_URL`,
[app/utils/backend.ts](backoffice/app/utils/backend.ts)). `NEXT_PUBLIC_` биш учир нь image
дотор шатаагддаггүй — нэг image-ыг ямар ч орчинд заагаад ажиллуулж болно.

`middleware.ts` нь: session байхгүй → `/login`, клуб сонгоогүй → `/club`, платформын админ →
`/admin`. Session-ыг NextAuth (JWT strategy, 12 цаг) эзэмшинэ.

## 5. Мобайл (Expo)

- `expo-router` file-based routing. `src/app/index.tsx` цорын ганц гарц: session уншаад
  login / club / (tabs) руу чиглүүлнэ.
- `src/lib/auth.tsx` — session-ыг `expo-secure-store`-д (веб дээр `localStorage`) хадгалж,
  `clubGet()` helper-ээр token + tenantid-г автоматаар хавсаргана.
- API хаяг: `EXPO_PUBLIC_API_URL`, эсвэл тохируулаагүй бол Expo packager-ийн host-оос
  дүгнэнэ (утас нэг wifi дээр байвал шууд ажиллана).
- Мобайл нь зөвхөн **уншина** (`/api/vh/client/*`) — хуваарь, үр дүн, хүснэгт, багийн
  бүрэлдэхүүн, өөрийн тамирчны карт, мэдээ.

## 6. Домэйн: волейболын дүрэм код дотор

Хамгийн чухал бизнес логик [`CompetitionService`](backend/volleyhub-api/Service/CompetitionService.cs)
дотор:

**Үр дүн бүртгэх (`SaveResult`).** Сет бүрийг нэг дор дахин бичдэг тул засвар гэдэг нь
дахин илгээх л явдал. Backend шалгана:

- 1–4-р сет 25 хүртэл, шийдвэрлэх (5 дахь) сет 15 хүртэл;
- ялагч 2-оос доошгүй онооны зөрүүтэй (24:24 → 26:24 зөв, 26:23 буруу);
- ялахад шаардлагатай сетийн тоо (`best_of / 2 + 1`) хангагдсан байх.

`match.home_sets` / `away_sets` нь `match_set` мөрүүдээс **тооцоологддог** — клиент хэзээ ч
шууд бичдэггүй.

**Хүснэгт (`Standings`).** Хадгалагддаггүй, дууссан тоглолтуудаас бодогдоно. FIVB-ийн оноо:
3:0 / 3:1 хожил = 3 оноо, 3:2 хожил = 2, 2:3 хожигдол = 1, бусад = 0. Эрэмбэ: оноо → хожил →
сетийн харьцаа → онооны харьцаа. Ингэснээр буруу бичсэн дүнг засахад хүснэгт үргэлж
тэгширнэ.

**Хуваарь үүсгэх (`GenerateFixtures`).** Circle method-оор нэг эргэлтийн лиг. Сондгой тооны
багтай бол нэг нь амарна. Аль хэдийн тоглолт үүссэн бол ажиллахаас татгалзана — гараар
зассан хуваарийг санамсаргүй устгахгүй.

## 7. Deploy — kindergarten-тэй нэг сервер дээр

Volleyhub өөрийн Postgres босгохгүй. Байгаа Postgres дээр тусдаа database, тусдаа
хэрэглэгч авч, k3s дээр өөрийн `volleyhub` namespace-д ажиллана:

```
namespace: volleyhub                     namespace: kindergarten
  volleyhub-api        NodePort 30090 ──▶  kindergarten-postgres
  volleyhub-backoffice NodePort 30030        db:   volleyhub-db
  volleyhub-mobile     NodePort 30080        user: volleyhub
```

**Яагаад тусдаа database вэ:** хоёр бүтээгдэхүүн хоёулаа `public.tenant`, `public.account`
хүснэгт үүсгэдэг бөгөөд хоёулаа per-tenant schema-гаа `tenant_<id>` гэж нэрлэдэг. Нэг
database дотор байвал шууд мөргөлдөнө. Schema-гаар салгах нь ч аврахгүй — учир нь клубын
дугаар хоёр систем дээр давхцана.

- `deploy/bootstrap-db.sh` — `volleyhub` role + `volleyhub-db` database-ийг нэг удаа
  үүсгэнэ. Postgres pod дотор psql ажиллуулдаг тул kindergarten-ы admin нууц үг хаана ч
  хуулагдахгүй. Idempotent.
- `deploy/k3s.yaml` — гурван Deployment + NodePort Service. Postgres рүү cross-namespace
  DNS-ээр (`kindergarten-postgres.kindergarten.svc.cluster.local`) холбогдоно.
- `.github/workflows/{backend,backoffice,mobile}.yml` — хавтас бүр өөрийн workflow-той.
  Docker Hub руу push хийж, SSH-ээр `volleyhub` namespace дээр rollout хийнэ.
- Mobile-ийн native build нь EAS-ээр явна; CI зөвхөн web export-ыг сав баглана.

**Одоогийн хязгаарлалт:** NodePort нь энгийн HTTP — нууц үг, JWT шифрлэгдэхгүй дамжина.
Домэйн + байгаа ingress-nginx/cert-manager дээр гаргахад зөвхөн Ingress object нэмж,
ConfigMap доторх `APP_PUBLIC_BASE_URL`, `NEXTAUTH_URL` хоёрыг солиход хангалттай.

## 8. Kindergarten-ээс юуг өөрчилсөн

- **Нууц үг**: буцаагдах Rijndael → PBKDF2 нэг чиглэлт hash.
- **Repository давхарга**: түүхий ADO repository хассан, EF context шууд ашиглана.
- **Customer/Employee хоёр identity** → нэг `account` давхарга. Мобайл, веб хоёулаа нэг
  бүртгэлээр, зөвхөн `role` нь ялгаатай.
- Kindergarten-д байсан SMS, verify.mn, QPay, FCM, S3 интеграцууд одоогоор ороогүй —
  шаардлагатай болбол `Service/` дор тусдаа модуль болгож нэмнэ.

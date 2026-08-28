# Volleyhub Mobile

Тамирчин, дасгалжуулагч, дэмжигчдэд зориулсан Expo (React Native) апп. Backoffice-той нэг
бүртгэл ашиглана — ялгаа нь зөвхөн клуб доторх эрх (`role`).

## Ажиллуулах

```bash
npm install
npx expo start
```

Дараа нь Expo Go дээр QR уншуулах, эсвэл `a` (Android), `i` (iOS), `w` (web).

## API хаяг

`EXPO_PUBLIC_API_URL` тохируулаагүй бол апп нь Expo packager-ийн host-оос
`http://<host>:5090` гэж дүгнэнэ — утас нэг wifi дээр байхад ямар ч тохиргоогүй ажиллана.
Өөр хаяг руу заах бол:

```bash
EXPO_PUBLIC_API_URL=https://api.volleyhub.mn npx expo start
```

## Бүтэц

```
src/
  app/                 expo-router (file-based routing)
    index.tsx          цорын ганц гарц: session-оос хамаарч чиглүүлнэ
    login.tsx          нэвтрэх
    register.tsx       бүртгүүлэх
    club.tsx           клуб сонгох / нэгдэх хүсэлт
    (tabs)/            Нүүр, Хуваарь, Хүснэгт, Профайл
    match/[id].tsx     тоглолтын дэлгэрэнгүй (сет тус бүрийн оноо)
  lib/
    api.ts             fetch client, алдааны текст
    auth.tsx           session context, SecureStore-д хадгална
    types.ts           backend DTO-той тохирсон типүүд
    theme.ts           өнгө, зай
    format.ts          огноо, нэрийн формат
```

## Native build

Native build EAS-ээр явна (`eas build`). CI зөвхөн web export-ыг Docker образ болгож
савладаг — `Dockerfile`-ыг үзнэ үү.

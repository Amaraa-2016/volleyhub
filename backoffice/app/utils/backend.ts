// Where the .NET API lives, as seen from the Next.js *server*. Only the proxy routes and the
// NextAuth credentials provider ever call it - the browser always goes through /api/ui/*, so this
// is deliberately not a NEXT_PUBLIC_ variable: it stays a runtime setting and the same image can
// be pointed at a different backend without rebuilding.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5090";

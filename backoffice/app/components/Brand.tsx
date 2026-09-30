import LogoMark from "@/app/components/LogoMark";

// Mark + wordmark for the login and register screens. "hub" carries the brand orange, as in the
// logo files under /public/brand.
export default function Brand({ sub }: { sub?: string }) {
    return (
        <div className="brandmark">
            <LogoMark size={52} />
            <div>
                <b>volley<span style={{ color: "var(--brand)" }}>hub</span></b>
                <small>{sub ?? "Дасгалжуулагчийн туслах"}</small>
            </div>
        </div>
    );
}

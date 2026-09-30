import { Volleyball } from "lucide-react";

export default function Brand({ sub }: { sub?: string }) {
    return (
        <div className="brandmark">
            <div className="logo"><Volleyball size={26} /></div>
            <div>
                <b>Volleyhub</b>
                <small>{sub ?? "Дасгалжуулагчийн туслах"}</small>
            </div>
        </div>
    );
}

import { redirect } from "next/navigation";

// The middleware already decides where a visitor belongs (login, club select, console). Landing on
// / just means "take me to the app", so hand straight over to the dashboard.
export default function Home() {
    redirect("/dashboard");
}

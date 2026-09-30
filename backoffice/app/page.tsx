import { redirect } from "next/navigation";

// The middleware has already sent anyone without a session to /login, so "/" is simply home.
export default function Root() {
    redirect("/home");
}

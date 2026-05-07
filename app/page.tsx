import { redirect } from "next/navigation";

export default function Home() {
  if (!process.env.ADMIN_JWT_SECRET) {
    redirect("/dashboard");
  }
  redirect("/login");
}

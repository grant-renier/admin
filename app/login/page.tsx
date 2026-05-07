import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold">
          IA
        </div>
      </div>
      <LoginForm />
    </div>
  );
}

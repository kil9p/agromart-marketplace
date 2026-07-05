import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout, Tractor, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/agromart-auth";
import type { UserType } from "@/lib/agromart-types";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Sign up · AgroMart" }] }),
});

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<UserType>("farmer");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signup({ email, password, full_name: fullName, type });
      toast.success(`Welcome to AgroMart, ${user.full_name}!`);
      navigate({
        to: type === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground text-primary">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">AgroMart</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Join Nigeria's smartest agricultural marketplace.
          </h2>
          <p className="mt-4 opacity-80">
            ML-powered demand forecasts, live inventory, and buyer
            recommendations built for local farmers and traders.
          </p>
        </div>
        <p className="text-xs opacity-70">© {new Date().getFullYear()} AgroMart</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick your role and start trading in minutes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              active={type === "farmer"}
              onClick={() => setType("farmer")}
              icon={<Tractor className="h-5 w-5" />}
              title="Farmer"
              body="Sell produce"
            />
            <RoleCard
              active={type === "buyer"}
              onClick={() => setType("buyer")}
              icon={<ShoppingBasket className="h-5 w-5" />}
              title="Buyer"
              body="Source produce"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adaeze Okonkwo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-secondary/50"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-md ${
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </button>
  );
}

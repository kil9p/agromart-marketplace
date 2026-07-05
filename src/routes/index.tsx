import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, LineChart, ShoppingBasket, Sprout, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/agromart-auth";
import { AgroNavbar } from "@/components/agromart-navbar";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && user) {
      navigate({
        to: user.type === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard",
      });
    }
  }, [isReady, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AgroNavbar />
      <main>
        <section className="border-b bg-card">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Sprout className="h-3.5 w-3.5 text-primary" />
                Nigeria's Agricultural Marketplace
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Fresh produce, <span className="text-primary">smarter trade</span>.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                AgroMart connects farmers and buyers with ML-powered demand
                forecasting and personalized recommendations — all in one clean,
                reliable workspace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate({ to: "/signup" })}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ to: "/login" })}
                >
                  I already have an account
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Try the demo:{" "}
                <span className="font-mono">farmer@demo.com</span> ·{" "}
                <span className="font-mono">buyer@demo.com</span> (password:{" "}
                <span className="font-mono">password</span>)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FeatureCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Demand Forecasting"
                body="Plan harvests with weekly ML predictions per state and commodity."
              />
              <FeatureCard
                icon={<ShoppingBasket className="h-5 w-5" />}
                title="Smart Marketplace"
                body="Browse produce and receive personalized product matches."
              />
              <FeatureCard
                icon={<LineChart className="h-5 w-5" />}
                title="Live Analytics"
                body="Track sales, low-stock alerts and pending orders in real time."
              />
              <FeatureCard
                icon={<Sprout className="h-5 w-5" />}
                title="Farmer First"
                body="Simple inventory tools built for Nigerian growers."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-2xl font-semibold">Ready to start trading?</h2>
            <p className="mt-2 text-muted-foreground">
              Create an account as a Farmer or a Buyer in under a minute.
            </p>
            <div className="mt-6">
              <Link to="/signup">
                <Button size="lg">Create your account</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

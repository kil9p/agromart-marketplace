import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  History,
  MapPin,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AgroNavbar } from "@/components/agromart-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/agromart-auth";
import {
  addToCart,
  checkout,
  getCart,
  getOrderHistory,
  getRecommendations,
  listProduce,
  removeFromCart,
} from "@/lib/agromart-mock";
import type { Produce } from "@/lib/agromart-types";

export const Route = createFileRoute("/buyer-dashboard")({
  component: BuyerDashboard,
  head: () => ({ meta: [{ title: "Marketplace · AgroMart" }] }),
});

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

function BuyerDashboard() {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && !user) navigate({ to: "/login" });
    else if (isReady && user && user.type !== "buyer")
      navigate({ to: "/farmer-dashboard" });
  }, [isReady, user, navigate]);

  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const produce = useQuery({ queryKey: ["produce"], queryFn: listProduce });
  const recs = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendations(8),
  });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart, enabled: !!user });
  const history = useQuery({
    queryKey: ["orderHistory"],
    queryFn: getOrderHistory,
    enabled: !!user,
  });

  const addMut = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => addToCart(id, qty),
    onSuccess: () => {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => removeFromCart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  const checkoutMut = useMutation({
    mutationFn: checkout,
    onSuccess: () => {
      toast.success("Order placed successfully");
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orderHistory"] });
      setCartOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = produce.data ?? [];
    if (!q) return list;
    const term = q.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term),
    );
  }, [produce.data, q]);

  const cartCount = cart.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  if (!isReady || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AgroNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fresh produce from farmers across Nigeria.
            </p>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingCart className="h-4 w-4" /> Cart
                {cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Your cart</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-4">
                {cart.data && cart.data.items.length > 0 ? (
                  <ul className="space-y-3">
                    {cart.data.items.map((item) => {
                      const p = produce.data?.find((x) => x.id === item.produce_id);
                      return (
                        <li key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">{p?.name ?? "Product"}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {NGN(item.unit_price)}
                            </p>
                            <p className="mt-1 text-sm font-semibold">{NGN(item.subtotal)}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMut.mutate(item.produce_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <ShoppingCart className="mb-3 h-8 w-8" />
                    Your cart is empty.
                  </div>
                )}
              </div>
              <SheetFooter className="border-t pt-4">
                <div className="flex w-full flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">
                      {NGN(cart.data?.total_amount ?? 0)}
                    </span>
                  </div>
                  <Button
                    disabled={!cart.data || cart.data.items.length === 0 || checkoutMut.isPending}
                    onClick={() => checkoutMut.mutate()}
                  >
                    {checkoutMut.isPending ? "Placing order…" : "Checkout"}
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Recommendations */}
        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Recommended for you</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Personalized picks powered by our ML engine.
          </p>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {recs.data?.recommendations.map((r) => (
              <div
                key={r.product_id}
                className="min-w-[240px] flex-shrink-0 rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{r.category}</Badge>
                  <Badge className="bg-accent text-accent-foreground">
                    {(r.score * 100).toFixed(0)}% match
                  </Badge>
                </div>
                <p className="mt-3 font-semibold">{r.product_name}</p>
                <p className="mt-1 text-lg font-bold text-primary">{NGN(r.price)}</p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => addMut.mutate({ id: r.product_id, qty: 1 })}
                >
                  Add to cart
                </Button>
              </div>
            ))}
            {!recs.data && (
              <div className="text-sm text-muted-foreground">Loading picks…</div>
            )}
          </div>
        </section>

        {/* Tabs: Browse / History */}
        <Tabs defaultValue="browse" className="mt-8">
          <TabsList>
            <TabsTrigger value="browse">Browse produce</TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4" /> Order history
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            <div className="mb-4 flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, category or location"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  produce={p}
                  onAdd={() => addMut.mutate({ id: p.id, qty: 1 })}
                />
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No produce matches your search.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="rounded-xl border bg-card">
              {history.data && history.data.length > 0 ? (
                <ul className="divide-y">
                  {history.data.map((o) => (
                    <li key={o.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">
                          Order #{o.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.order_date).toLocaleString()} · {o.items.length} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{NGN(o.total_amount)}</p>
                        <Badge variant="secondary" className="mt-1">
                          <CheckCircle2 className="h-3 w-3" /> {o.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No completed orders yet.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ProductCard({
  produce,
  onAdd,
}: {
  produce: Produce;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex h-40 items-center justify-center bg-secondary text-4xl font-bold text-muted-foreground">
        {produce.name.charAt(0)}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{produce.name}</h3>
          <Badge variant="secondary">{produce.category}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {produce.description}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {produce.location}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <p className="text-lg font-bold text-primary">{NGN(produce.price)}</p>
            <p className="text-xs text-muted-foreground">
              {produce.quantity} in stock
            </p>
          </div>
          <Button size="sm" onClick={onAdd} disabled={produce.quantity === 0}>
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}

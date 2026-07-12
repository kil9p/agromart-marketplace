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
} from "@/lib/api";
import { useHumanLocation } from "@/hooks/use-human-location";
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
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const [cartOpen, setCartOpen] = useState(false);

  // WebSocket for real-time inventory updates
  useEffect(() => {
    if (!user) return;
    const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
    const urlObj = new URL(rawUrl);
    urlObj.protocol = urlObj.protocol.replace("http", "ws");
    const wsUrl = `${urlObj.protocol}//${urlObj.host}/ws/inventory`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      console.log("Real-time inventory update:", event.data);
      qc.invalidateQueries({ queryKey: ["produce"] });
    };
    return () => {
      ws.close();
    };
  }, [user, qc]);

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

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const cartCount = cart.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const totalSpent = useMemo(() => {
    if (!history.data) return 0;
    return history.data
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.total_amount, 0);
  }, [history.data]);

  if (!isReady || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AgroNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 pb-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fresh produce from farmers across Nigeria.
            </p>
          </div>
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

        <div className="grid lg:grid-cols-[300px_1fr] gap-8 mt-8 items-start">
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center text-center">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Spent</h3>
              <p className="text-3xl font-bold text-primary">{NGN(totalSpent)}</p>
            </div>
            
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="bg-muted/50 p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Order History</h3>
              </div>
              <div className="p-0">
                {history.data && history.data.length > 0 ? (
                  <ul className="divide-y max-h-[600px] overflow-y-auto">
                    {history.data.map((o) => (
                      <li key={o.id} className="flex flex-col p-4 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">Order #{o.id.slice(0, 6)}</span>
                          <span className="font-bold">{NGN(o.total_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{new Date(o.order_date).toLocaleDateString()}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {o.status}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No completed orders yet.
                  </p>
                )}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4">Browse Produce</h2>
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
              {paginated.map((p) => (
                <ProductCard
                  key={p.id}
                  produce={p}
                  onAdd={(qty) => addMut.mutate({ id: p.id, qty })}
                />
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No produce matches your search.
                </p>
              )}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t pt-4">
                <Button 
                  variant="outline" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-16 w-16 rounded-full shadow-2xl relative bg-primary hover:bg-primary/90 text-primary-foreground">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col sm:max-w-md border-l shadow-2xl">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" /> Your Cart
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {cart.data && cart.data.items.length > 0 ? (
                <ul className="space-y-4">
                  {cart.data.items.map((item) => {
                    const p = produce.data?.find((x) => x.id === item.produce_id);
                    return (
                      <li key={item.id} className="flex items-center gap-4 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                        <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-secondary flex items-center justify-center font-bold text-xl overflow-hidden relative">
                          {p?.image_url ? (
                            <img src={p.image_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            p?.name.charAt(0) || "P"
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold leading-none">{p?.name ?? "Product"}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.quantity} × {NGN(item.unit_price)}
                          </p>
                          <p className="mt-2 font-bold text-primary">{NGN(item.subtotal)}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
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
                  <div className="rounded-full bg-secondary p-4 mb-4">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">Your cart is empty</p>
                  <p className="mt-1">Add items from the marketplace to checkout.</p>
                </div>
              )}
            </div>
            <SheetFooter className="border-t pt-6 pb-2">
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-primary">
                    {NGN(cart.data?.total_amount ?? 0)}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full text-lg h-12"
                  disabled={!cart.data || cart.data.items.length === 0 || checkoutMut.isPending}
                  onClick={() => checkoutMut.mutate()}
                >
                  {checkoutMut.isPending ? "Placing order…" : "Proceed to Checkout"}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function ProductCard({
  produce,
  onAdd,
}: {
  produce: Produce;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const locationText = useHumanLocation(produce.location);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex h-40 items-center justify-center bg-secondary text-4xl font-bold text-muted-foreground relative overflow-hidden">
        {produce.image_url ? (
          <img src={produce.image_url} alt={produce.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          produce.name.charAt(0)
        )}
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
          <MapPin className="h-3 w-3" /> {locationText}
        </div>
        <div className="mt-auto flex flex-col pt-4 gap-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-primary">{NGN(produce.price)}</p>
              <p className="text-xs text-muted-foreground">
                {produce.quantity} in stock
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8" 
                onClick={() => setQty(Math.max(1, qty - 1))} 
                disabled={qty <= 1 || produce.quantity === 0}
              >
                -
              </Button>
              <span className="w-6 text-center text-sm font-medium">{qty}</span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8" 
                onClick={() => setQty(Math.min(produce.quantity, qty + 1))} 
                disabled={qty >= produce.quantity || produce.quantity === 0}
              >
                +
              </Button>
              <Button className="ml-2" size="sm" onClick={() => onAdd(qty)} disabled={produce.quantity === 0}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

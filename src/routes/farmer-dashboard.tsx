import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  Clock,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  Package,
  Camera,
  X,
} from "lucide-react";
import { AgroNavbar } from "@/components/agromart-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/agromart-auth";
import {
  createProduce,
  deleteProduce,
  getDemandForecast,
  getFarmerStats,
  listMyProduce,
  updateInventory,
} from "@/lib/agromart-mock";
import type { Produce } from "@/lib/agromart-types";

export const Route = createFileRoute("/farmer-dashboard")({
  component: FarmerDashboard,
  head: () => ({ meta: [{ title: "Farmer Dashboard · AgroMart" }] }),
});

const NG_STATES = ["Borno", "Kano", "Lagos", "Kaduna", "Jos", "Benue", "Cross River", "Ondo", "Akure"];
const COMMODITIES = [
  "Rice (imported)",
  "Yellow Maize",
  "Tomatoes",
  "Yams",
  "Palm Oil",
  "Beans",
];

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

function FarmerDashboard() {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && !user) navigate({ to: "/login" });
    else if (isReady && user && user.type !== "farmer")
      navigate({ to: "/buyer-dashboard" });
  }, [isReady, user, navigate]);

  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const wsUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/^http/, "ws").replace(/\/api\/v1$/, "") + "/ws/inventory";
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      console.log("Real-time inventory update:", event.data);
      qc.invalidateQueries({ queryKey: ["farmer"] });
    };
    return () => {
      ws.close();
    };
  }, [user, qc]);
  const [state, setState] = useState("Borno");
  const [commodity, setCommodity] = useState("Rice (imported)");

  const stats = useQuery({
    queryKey: ["farmer", "stats"],
    queryFn: getFarmerStats,
  });
  const products = useQuery({
    queryKey: ["farmer", "produce"],
    queryFn: listMyProduce,
  });
  const forecast = useQuery({
    queryKey: ["demand", state, commodity],
    queryFn: () => getDemandForecast(state, commodity, 10),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["farmer"] });
  };

  const createMut = useMutation({
    mutationFn: (data: any) => createProduce(data),
    onSuccess: () => {
      toast.success("Produce added");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: deleteProduce,
    onSuccess: () => {
      toast.success("Produce removed");
      invalidateAll();
    },
  });
  const invMut = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateInventory(id, quantity),
    onSuccess: () => {
      toast.success("Inventory updated");
      invalidateAll();
    },
  });

  if (!isReady || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AgroNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {user.full_name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here's how your farm is performing today.
            </p>
          </div>
          <AddProduceDialog onSubmit={(v) => createMut.mutate(v)} />
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Boxes className="h-4 w-4" />}
            label="Total products"
            value={stats.data?.total_products ?? "—"}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Low-stock alerts"
            value={stats.data?.low_stock_alerts ?? "—"}
            accent
          />
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total sales"
            value={stats.data ? NGN(stats.data.total_sales) : "—"}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending orders"
            value={stats.data?.pending_orders ?? "—"}
          />
        </div>

        {/* Forecast */}
        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Demand Forecast
              </h2>
              <p className="text-sm text-muted-foreground">
                Weekly predicted demand index, powered by ML.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-40">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NG_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-56">
                <Label className="text-xs text-muted-foreground">Commodity</Label>
                <Select value={commodity} onValueChange={setCommodity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMODITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            {forecast.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecast.data.forecast}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted_demand_index"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--color-primary)" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading forecast…
              </div>
            )}
          </div>
        </section>

        {/* Produce table */}
        <section className="mt-8 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-semibold">My produce</h2>
              <p className="text-sm text-muted-foreground">
                Manage your listings and inventory.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.location}</TableCell>
                  <TableCell className="text-right">{NGN(p.price)}</TableCell>
                  <TableCell className="text-right">
                    {p.quantity < 10 ? (
                      <span className="font-medium text-destructive">{p.quantity}</span>
                    ) : (
                      p.quantity
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditInventoryDialog
                        produce={p}
                        onSave={(q) => invMut.mutate({ id: p.id, quantity: q })}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => deleteMut.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.data && products.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No produce yet. Add your first listing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            accent ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AddProduceDialog({
  onSubmit,
}: {
  onSubmit: (v: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Grains",
    price: 0,
    location: "",
    quantity: 0,
  });
  const [image, setImage] = useState<File | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm({ ...form, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
          setGettingLocation(false);
        },
        (err) => {
          console.error(err);
          setGettingLocation(false);
        }
      );
    } else {
      setGettingLocation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New produce
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new produce</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ ...form, image });
            setOpen(false);
            setForm({
              name: "",
              description: "",
              category: "Grains",
              price: 0,
              location: "",
              quantity: 0,
            });
            setImage(null);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Image (Optional)</Label>
            {image ? (
              <div className="relative h-32 w-full rounded-md border overflow-hidden">
                <img src={URL.createObjectURL(image)} alt="Preview" className="h-full w-full object-cover" />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setImage(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                </div>
                <div className="relative overflow-hidden">
                  <Button type="button" variant="outline" className="w-full h-10 px-4">
                    <Camera className="h-4 w-4 mr-2" /> Take Photo
                  </Button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Grains", "Vegetables", "Tubers", "Legumes", "Oils", "Fruits"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location (Lat, Lon)</Label>
              <div className="flex gap-2">
                <Input value={form.location} readOnly placeholder="e.g. 9.0820, 8.6753" />
                <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={gettingLocation}>
                  {gettingLocation ? "..." : "GPS"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (₦)</Label>
              <Input type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add produce</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditInventoryDialog({
  produce,
  onSave,
}: {
  produce: Produce;
  onSave: (quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(produce.quantity);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update inventory · {produce.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New quantity</Label>
          <Input type="number" min={0} value={q} onChange={(e) => setQ(Number(e.target.value))} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onSave(q);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

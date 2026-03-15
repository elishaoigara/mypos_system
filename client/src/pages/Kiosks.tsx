import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Monitor, MapPin, Wifi, WifiOff, Wrench } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  online: {
    icon: Wifi,
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Online",
  },
  offline: {
    icon: WifiOff,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    label: "Offline",
  },
  maintenance: {
    icon: Wrench,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Maintenance",
  },
};

export default function Kiosks() {
  return (
    <DashboardLayout>
      <KiosksContent />
    </DashboardLayout>
  );
}

function KiosksContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: kioskList, isLoading } = trpc.kiosk.list.useQuery();

  const createMutation = trpc.kiosk.create.useMutation({
    onSuccess: () => {
      toast.success("Kiosk added successfully");
      utils.kiosk.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const statusMutation = trpc.kiosk.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Kiosk status updated");
      utils.kiosk.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      location: (formData.get("location") as string) || undefined,
    });
  };

  const cycleStatus = (id: number, current: string) => {
    const order = ["offline", "online", "maintenance"];
    const next = order[(order.indexOf(current) + 1) % order.length] as
      | "online"
      | "offline"
      | "maintenance";
    statusMutation.mutate({ id, status: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kiosks</h1>
          <p className="text-muted-foreground mt-1">
            Manage self-checkout kiosk machines
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Kiosk
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading kiosks...
        </div>
      ) : !kioskList || kioskList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No kiosks registered</h3>
            <p className="text-muted-foreground mb-4">
              Add your first kiosk to start tracking
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Kiosk
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kioskList.map((kiosk) => {
            const statusInfo = STATUS_CONFIG[kiosk.status] ?? STATUS_CONFIG.offline;
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={kiosk.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{kiosk.name}</CardTitle>
                        {kiosk.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {kiosk.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => cycleStatus(kiosk.id, kiosk.status)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors hover:opacity-80 ${statusInfo.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </button>
                    {kiosk.lastActive && (
                      <span className="text-xs text-muted-foreground">
                        Last active:{" "}
                        {new Date(kiosk.lastActive).toLocaleString("en-KE", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Kiosk Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Kiosk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Kiosk Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Kiosk 1"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g. Main Entrance"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Kiosk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

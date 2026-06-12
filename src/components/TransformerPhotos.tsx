import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Camera, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PHOTO_CATEGORIES = [
  { value: "nameplate", label: "Nameplate" },
  { value: "overall", label: "Overall view" },
  { value: "location", label: "Location / surroundings" },
  { value: "oil_level", label: "Oil level / gauge" },
  { value: "fault", label: "Fault evidence" },
  { value: "before_work", label: "Before work" },
  { value: "after_work", label: "After work" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PHOTO_CATEGORIES.map((c) => [c.value, c.label]),
);

type AssetPhoto = {
  id: string;
  image_url: string;
  photo_category: string | null;
  captured_at: string;
};

export function TransformerPhotos({ transformerId }: { transformerId: string }) {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("overall");
  const [preview, setPreview] = useState<{ url: string; id: string } | null>(null);

  const canUpload = canDo(role, "edit_transformer") || canDo(role, "log_inspection");
  const canDelete = role === "super_admin";

  const photosQuery = useQuery({
    queryKey: ["transformer-photos", transformerId],
    queryFn: async (): Promise<(AssetPhoto & { signedUrl: string })[]> => {
      const { data, error } = await supabase
        .from("asset_photos")
        .select("id, image_url, photo_category, captured_at")
        .eq("transformer_id", transformerId)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as AssetPhoto[];
      // Sign URLs for private bucket
      const signed = await Promise.all(
        rows.map(async (p) => {
          const { data: s } = await supabase.storage
            .from("asset-photos")
            .createSignedUrl(p.image_url, 3600);
          return { ...p, signedUrl: s?.signedUrl ?? "" };
        }),
      );
      return signed;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${transformerId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("asset-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("asset_photos").insert({
        transformer_id: transformerId,
        image_url: path,
        photo_category: category,
        captured_by: user.id,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Photo uploaded");
      qc.invalidateQueries({ queryKey: ["transformer-photos", transformerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (photo: AssetPhoto) => {
      const { error: sErr } = await supabase.storage
        .from("asset-photos")
        .remove([photo.image_url]);
      if (sErr) throw sErr;
      const { error } = await supabase.from("asset_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["transformer-photos", transformerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: max 10 MB`);
        continue;
      }
      upload.mutate(f);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const photos = photosQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Camera className="size-4" /> Photos
            <Badge variant="outline" className="ml-1">{photos.length}</Badge>
          </span>
          {canUpload && (
            <div className="flex items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={upload.isPending}
              >
                <Upload className="size-4 mr-1.5" />
                {upload.isPending ? "Uploading…" : "Upload"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {photosQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading photos…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photos yet.{canUpload ? " Upload a nameplate or site photo to start." : ""}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreview({ url: p.signedUrl, id: p.id })}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                <img
                  src={p.signedUrl}
                  alt={p.photo_category ?? "Asset photo"}
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="text-[10px] text-white font-medium truncate">
                    {CATEGORY_LABELS[p.photo_category ?? ""] ?? "Photo"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Photo preview</span>
              <div className="flex items-center gap-2">
                {canDelete && preview && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const ph = photos.find((p) => p.id === preview.id);
                      if (ph && confirm("Delete this photo?")) remove.mutate(ph);
                    }}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-4 mr-1.5" /> Delete
                  </Button>
                )}
                <Button type="button" size="icon" variant="ghost" onClick={() => setPreview(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={preview.url}
              alt="Asset photo preview"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

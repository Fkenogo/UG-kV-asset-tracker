import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Download, Printer, QrCode, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  transformerId: string;
  assetId: string;
  siteName: string | null;
  kvaRating: number;
  voltageKv: number;
}

/**
 * QR payload is the asset_id (e.g. TRF-000001). Short, human-readable,
 * scanner can look it up by `transformers.asset_id`. We persist the same
 * string in `qr_codes.qr_code_string` so we can revoke / reissue.
 */
export function TransformerQR({
  transformerId,
  assetId,
  siteName,
  kvaRating,
  voltageKv,
}: Props) {
  const { role, user } = useAuth();
  const canEdit = canDo(role, "edit_asset");
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const qrQuery = useQuery({
    queryKey: ["qr-code", transformerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("id, qr_code_string, status, generated_at, last_scanned_at")
        .eq("transformer_id", transformerId)
        .eq("status", "active")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      // Mark any existing active QR as revoked, then insert fresh.
      await supabase
        .from("qr_codes")
        .update({ status: "revoked" })
        .eq("transformer_id", transformerId)
        .eq("status", "active");
      const { error } = await supabase.from("qr_codes").insert({
        transformer_id: transformerId,
        qr_code_string: assetId,
        generated_by: user?.id ?? null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr-code", transformerId] }),
  });

  const payload = qrQuery.data?.qr_code_string ?? null;

  // Render to canvas whenever payload changes.
  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  }, [payload]);

  function handleDownload() {
    if (!canvasRef.current || !payload) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assetId}-qr.png`;
    a.click();
  }

  function handlePrint() {
    if (!canvasRef.current || !payload) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>${assetId}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}
        .label{border:2px solid #000;padding:16px;display:inline-block;border-radius:8px}
        h1{font-size:20px;margin:0 0 4px}
        .meta{font-size:12px;color:#444;margin-bottom:12px}
        img{display:block;margin:0 auto}
        .foot{font-size:10px;margin-top:8px;letter-spacing:.1em;text-transform:uppercase;color:#666}
      </style></head>
      <body><div class="label">
        <h1>${assetId}</h1>
        <div class="meta">${siteName ?? "—"} · ${kvaRating}kVA/${voltageKv}kV</div>
        <img src="${dataUrl}" width="240" height="240" />
        <div class="foot">UEDCL kVAssetTracker</div>
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="size-4" /> Asset QR Code
        </CardTitle>
        {canEdit && payload && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            <RefreshCw className="size-3.5" /> Reissue
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {qrQuery.isLoading ? (
          <div className="h-60 grid place-items-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : payload ? (
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <canvas ref={canvasRef} className="border rounded-md bg-white" />
            <div className="flex-1 space-y-3 w-full">
              <div className="text-sm">
                <div className="text-muted-foreground">Payload</div>
                <div className="font-mono">{payload}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Generated</div>
                <div>{new Date(qrQuery.data!.generated_at).toLocaleString()}</div>
              </div>
              {qrQuery.data!.last_scanned_at && (
                <div className="text-sm">
                  <div className="text-muted-foreground">Last scanned</div>
                  <div>{new Date(qrQuery.data!.last_scanned_at).toLocaleString()}</div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={handleDownload}>
                  <Download className="size-3.5" /> PNG
                </Button>
                <Button size="sm" variant="secondary" onClick={handlePrint}>
                  <Printer className="size-3.5" /> Print label
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <div className="text-sm text-muted-foreground">
              No QR code has been generated for this transformer.
            </div>
            {canEdit ? (
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
              >
                <QrCode className="size-4" /> Generate QR code
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">
                Ask an engineer or field technician to generate a QR code.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { AlertTriangle, Camera, CameraOff, Search, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/qr-scan")({
  component: QrScanPage,
});

function QrScanPage() {
  const navigate = useNavigate();
  const containerId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  async function start() {
    setError(null);
    setStatus(null);
    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleDecoded(decoded),
        () => {
          /* per-frame errors are noisy; ignore */
        },
      );
      setScanning(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Camera unavailable: ${e.message}`
          : "Camera unavailable.",
      );
    }
  }

  async function stop() {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch {
      /* noop */
    }
    scannerRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  async function lookup(code: string) {
    const payload = code.trim();
    if (!payload) return;
    setStatus(`Looking up ${payload}…`);
    // Prefer qr_codes table, fall back to asset_id (since we store asset_id as payload).
    const { data: qr } = await supabase
      .from("qr_codes")
      .select("transformer_id, status")
      .eq("qr_code_string", payload)
      .eq("status", "active")
      .maybeSingle();

    let transformerId = qr?.transformer_id ?? null;
    if (!transformerId) {
      const { data: t } = await supabase
        .from("transformers")
        .select("id")
        .eq("asset_id", payload)
        .maybeSingle();
      transformerId = t?.id ?? null;
    }

    if (!transformerId) {
      setStatus(null);
      setError(`No transformer matches "${payload}".`);
      return;
    }

    // Bump last_scanned_at (best-effort; ignore failure).
    if (qr) {
      await supabase
        .from("qr_codes")
        .update({ last_scanned_at: new Date().toISOString() })
        .eq("qr_code_string", payload);
    }
    await stop();
    navigate({ to: "/transformers/$id", params: { id: transformerId } });
  }

  function handleDecoded(decoded: string) {
    void lookup(decoded);
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    void lookup(manual);
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan transformer QR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Point your camera at a transformer's QR label, or enter the asset ID manually.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="size-4" /> Camera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            id={containerId}
            className="aspect-square w-full max-w-md mx-auto bg-muted rounded-md overflow-hidden"
          />
          <div className="flex gap-2 justify-center">
            {!scanning ? (
              <Button onClick={start}>
                <Camera className="size-4" /> Start camera
              </Button>
            ) : (
              <Button variant="secondary" onClick={stop}>
                <CameraOff className="size-4" /> Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onManualSubmit} className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. TRF-000001"
              className="font-mono"
            />
            <Button type="submit" disabled={!manual.trim()}>
              <Search className="size-4" /> Look up
            </Button>
          </form>
        </CardContent>
      </Card>

      {status && (
        <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          {status}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive px-3 py-2 text-sm flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        <Link to="/transformers" className="underline">Browse the registry</Link> instead.
      </div>
    </div>
  );
}

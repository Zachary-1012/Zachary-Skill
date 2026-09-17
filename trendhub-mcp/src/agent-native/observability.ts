/** OTel-compatible local metric points; no exporter and no remote collection. */
export interface LocalMetricPoint { name: string; value: number; unit: string; observedAt: string; attributes: Record<string, string>; }
export function metric(name: string, value: number, unit: string, attributes: Record<string, string> = {}): LocalMetricPoint {
  if (!/^trendhub\.[a-z0-9_.-]+$/.test(name)) throw new Error("metric name must use the trendhub namespace");
  return { name, value: Number.isFinite(value) ? value : 0, unit, observedAt: new Date().toISOString(), attributes: { ...attributes } };
}

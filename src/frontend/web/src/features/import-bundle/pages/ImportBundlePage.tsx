/**
 * ImportBundlePage — luồng import PDF bundle 4 bước (ADMIN).
 * Chọn project → upload file (gán role) → validate → preview → confirm → poll status.
 */
import { useEffect, useRef, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  fetchProjectOptions, uploadBundleFile, validateBundle, previewBundle,
  confirmImport, getBundleStatus,
  type FileRole, type UploadedFile, type ValidateResult, type PreviewResult, type BundleStatus,
} from "@/shared/lib/adapters";

type Staged = { file: File; role: FileRole };

export function ImportBundlePage() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [bundleName, setBundleName] = useState("Bundle 01");
  const [batchName, setBatchName] = useState("Batch 01");
  const [staged, setStaged] = useState<Staged[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [bundleId, setBundleId] = useState("");
  const [status, setStatus] = useState<BundleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const tokens = uploaded.map((u) => u.uploadToken);

  useEffect(() => {
    fetchProjectOptions().then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    }).catch((e) => setMsg(e?.message ?? "Không tải được project."));
  }, []);

  // Poll status khi đã confirm.
  useEffect(() => {
    if (!bundleId) return;
    if (status && ["done", "failed"].includes(status.bundleStatus)) return;
    const t = setInterval(async () => {
      try {
        const st = await getBundleStatus(bundleId);
        setStatus(st);
        if (["done", "failed"].includes(st.bundleStatus)) clearInterval(t);
      } catch { /* thử lại lần sau */ }
    }, 2500);
    return () => clearInterval(t);
  }, [bundleId, status]);

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    const add: Staged[] = Array.from(files).map((file, i) => ({
      file,
      role: staged.length + i === 0 ? "answer_pdf" : staged.length + i === 1 ? "source_ref_pdf" : "source_content_pdf",
    }));
    setStaged((p) => [...p, ...add]);
  };

  async function uploadAndValidate() {
    if (!projectId || staged.length === 0) { setMsg("Chọn project và ít nhất 1 file."); return; }
    setBusy(true); setMsg(null);
    try {
      const res: UploadedFile[] = [];
      for (const s of staged) res.push(await uploadBundleFile(s.file, s.role, projectId));
      setUploaded(res);
      setValidation(await validateBundle(projectId, res.map((r) => r.uploadToken), bundleName));
    } catch (e) { setMsg((e as { message?: string })?.message ?? "Lỗi upload/validate."); }
    finally { setBusy(false); }
  }

  async function doPreview() {
    setBusy(true); setMsg(null);
    try { setPreview(await previewBundle(projectId, tokens)); }
    catch (e) { setMsg((e as { message?: string })?.message ?? "Lỗi preview."); }
    finally { setBusy(false); }
  }

  async function doConfirm() {
    setBusy(true); setMsg(null);
    try {
      const r = await confirmImport(projectId, tokens, bundleName, batchName);
      setBundleId(r.bundleId);
      setMsg(r.message || "Đã enqueue xử lý bundle.");
    } catch (e) { setMsg((e as { message?: string })?.message ?? "Lỗi confirm."); }
    finally { setBusy(false); }
  }

  const inp: React.CSSProperties = { padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", width: "100%" };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Nhập PDF Bundle</h1>
      {msg && <Card style={{ color: "var(--muted)" }}>{msg}</Card>}

      <Card style={{ display: "grid", gap: 12 }}>
        <strong>1. Project & tên bundle</strong>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inp}>
          {projects.length === 0 && <option value="">— Chưa có project —</option>}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 12 }}>
          <input value={bundleName} onChange={(e) => setBundleName(e.target.value)} placeholder="Tên bundle" style={inp} />
          <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Tên batch" style={inp} />
        </div>
      </Card>

      <Card style={{ display: "grid", gap: 12 }}>
        <strong>2. Chọn file PDF & gán role</strong>
        <input ref={fileInput} type="file" accept="application/pdf" multiple hidden onChange={(e) => pickFiles(e.target.files)} />
        <Button variant="ghost" onClick={() => fileInput.current?.click()}>+ Chọn file PDF</Button>
        {staged.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 13 }}>{s.file.name}</span>
            <select value={s.role} onChange={(e) => setStaged((p) => p.map((x, j) => j === i ? { ...x, role: e.target.value as FileRole } : x))}
              style={{ ...inp, width: "auto" }}>
              <option value="answer_pdf">answer_pdf</option>
              <option value="source_ref_pdf">source_ref_pdf</option>
              <option value="source_content_pdf">source_content_pdf</option>
            </select>
            <Button variant="ghost" onClick={() => setStaged((p) => p.filter((_, j) => j !== i))}>Xóa</Button>
          </div>
        ))}
        <Button onClick={uploadAndValidate} disabled={busy || staged.length === 0}>
          {busy ? "Đang xử lý…" : "Upload + Validate"}
        </Button>
        {validation && (
          <div style={{ fontSize: 13, color: validation.isValid ? "#16a34a" : "var(--danger)" }}>
            {validation.isValid ? "✓ Bundle hợp lệ" : "✗ Bundle không hợp lệ"}
            {validation.errors.map((e, i) => <div key={i}>⛔ {e}</div>)}
            {validation.warnings.map((w, i) => <div key={i} style={{ color: "var(--muted)" }}>⚠ {w}</div>)}
          </div>
        )}
      </Card>

      {validation?.isValid && (
        <Card style={{ display: "grid", gap: 12 }}>
          <strong>3. Preview parse</strong>
          <Button variant="ghost" onClick={doPreview} disabled={busy}>Xem preview</Button>
          {preview && (
            <div style={{ fontSize: 13 }}>
              <div>Title: <strong>{preview.title || "—"}</strong></div>
              <div>Domain: <strong>{preview.domainName || preview.domainKey || "—"}</strong></div>
              <div>Claim candidates: <strong>{preview.totalClaimCandidates}</strong> · Source refs: <strong>{preview.sourceRefCount}</strong></div>
              {preview.warnings.map((w, i) => <div key={i} style={{ color: "var(--muted)" }}>⚠ {w.code}: {w.message}</div>)}
            </div>
          )}
        </Card>
      )}

      {preview && (
        <Card style={{ display: "grid", gap: 12 }}>
          <strong>4. Xác nhận import</strong>
          <Button onClick={doConfirm} disabled={busy || !!bundleId}>Confirm import</Button>
          {bundleId && (
            <div style={{ fontSize: 14 }}>
              Bundle <code>{bundleId}</code> —{" "}
              {status && ["done", "failed"].includes(status.bundleStatus)
                ? (status.bundleStatus === "done"
                    ? <span style={{ color: "#16a34a", fontWeight: 700 }}>Hoàn tất ({status.fileCount} file)</span>
                    : <span style={{ color: "var(--danger)", fontWeight: 700 }}>Lỗi: {status.errorDetail}</span>)
                : <span style={{ color: "var(--muted)" }}>Đang xử lý: {status?.bundleStatus || "chờ"}…</span>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

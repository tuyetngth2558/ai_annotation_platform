/** ProjectSetupPage — tạo project + cấu hình LLM (ADMIN). Nối POST /projects. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createProject } from "@/shared/lib/adapters";

export function ProjectSetupPage() {
  const navigate = useNavigate();
  const [projectCode, setProjectCode] = useState("vivipedia");
  const [projectName, setProjectName] = useState("Vivipedia MVP");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [llmEndpoint, setLlmEndpoint] = useState("https://openrouter.ai/api/v1");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("openai/gpt-5.4");
  const [promptTemplate, setPromptTemplate] = useState(
    "Chấm claim {{claim_text}} dựa trên nguồn {{source_context}} theo 6 dimension SF/SC/NH/SQ/REL/COMP."
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setMsg(null);
    if (!promptTemplate.includes("{{claim_text}}") || !promptTemplate.includes("{{source_context}}")) {
      setMsg("Prompt template phải chứa {{claim_text}} và {{source_context}} (BR-1.3).");
      return;
    }
    setBusy(true);
    try {
      const r = await createProject({ projectCode, projectName, description, deadline, llmEndpoint, llmApiKey, llmModel, promptTemplate });
      navigate("/admin/projects");
      void r;
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không tạo được project.");
    } finally {
      setBusy(false);
    }
  }

  const inp: React.CSSProperties = { padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", width: "100%" };
  const lbl: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 600, fontSize: 13 };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0 }}>Cấu hình dự án</h1>
      <Card style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={lbl}>Mã project<input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} style={inp} /></label>
          <label style={lbl}>Tên project<input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={inp} /></label>
        </div>
        <label style={lbl}>Hạn chót<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inp} /></label>
        <label style={lbl}>Mô tả<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={inp} /></label>

        <strong style={{ marginTop: 4 }}>Cấu hình LLM (key mã hóa at-rest — BR-1.2)</strong>
        <label style={lbl}>Endpoint<input value={llmEndpoint} onChange={(e) => setLlmEndpoint(e.target.value)} style={inp} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={lbl}>API Key<input type="password" autoComplete="off" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-or-..." style={inp} /></label>
          <label style={lbl}>Model<input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} style={inp} /></label>
        </div>
        <label style={lbl}>Prompt template (chứa {"{{claim_text}}"} & {"{{source_context}}"})
          <textarea value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} rows={3} style={inp} />
        </label>

        {msg && <div style={{ color: "var(--danger)", fontSize: 13 }}>{msg}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onSubmit} disabled={busy}>{busy ? "Đang tạo…" : "Tạo project"}</Button>
          <Button variant="ghost" onClick={() => navigate("/admin/projects")}>Hủy</Button>
        </div>
      </Card>
    </div>
  );
}

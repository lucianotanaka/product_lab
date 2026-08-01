import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VPCCanvas { id: string; product_id: string; name: string; description?: string; }
interface ItemSlim  { id: string; type: string; name?: string | null; content: string; priority: number; parent_id?: string | null; }
interface JobNode   { job: ItemSlim; pains: ItemSlim[]; gains: ItemSlim[]; }
interface VPNode    { item: ItemSlim; addresses: ItemSlim[]; }   // N:M — list of linked targets
interface VPCLink   { id: string; canvas_id: string; source_id: string; target_id: string; }
interface Structured {
  canvas_id: string; canvas_name: string;
  jobs: JobNode[]; orphan_pains: ItemSlim[]; orphan_gains: ItemSlim[];
  products: VPNode[]; pain_relievers: VPNode[]; gain_creators: VPNode[];
}

// Types that use N:M links (not parent_id)
const NM_TYPES = ["pain_reliever", "gain_creator", "product"] as const;
type NMType = typeof NM_TYPES[number];
const isNMType = (t: string): t is NMType => NM_TYPES.includes(t as NMType);

// ── Theme-aware accent colors ─────────────────────────────────────────────────

function accentFor(type: string, dark: boolean): string {
  const map: Record<string, [string, string]> = {
    job:           ["#00d4ff", "#0088aa"],
    product:       ["#00d4ff", "#0088aa"],
    pain:          ["#ff4466", "#cc3333"],
    pain_reliever: ["#ff4466", "#cc3333"],
    gain:          ["#00ff88", "#006e38"],
    gain_creator:  ["#00ff88", "#006e38"],
  };
  const [d, l] = map[type] ?? ["#7899b0", "#5a7080"];
  return dark ? d : l;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { type: "job", name: "", content: "", priority: 3, parent_id: "", parent_ids: [] as string[] };
const EMPTY_C    = { name: "", description: "" };

// ── VPC Diagram v2 (visual canvas view — larger, with canvas filter) ─────────

function VPCDiagram({
  data, dark, canvases, canvas, onCanvasChange,
}: {
  data: Structured; dark: boolean;
  canvases: VPCCanvas[]; canvas: VPCCanvas | null;
  onCanvasChange: (c: VPCCanvas) => void;
}) {
  const { t } = useTranslation();
  const jobs      = data.jobs.map(j => j.job);
  const pains     = [...data.jobs.flatMap(j => j.pains), ...data.orphan_pains];
  const gains     = [...data.jobs.flatMap(j => j.gains), ...data.orphan_gains];
  const products  = data.products.map(n => n.item);
  const relievers = data.pain_relievers.map(n => n.item);
  const creators  = data.gain_creators.map(n => n.item);

  const c = dark ? {
    vpBg: "rgba(0,136,200,0.12)", vpBorder: "rgba(0,212,255,0.5)",
    cpBorder: "rgba(255,68,102,0.6)", cpBg: "rgba(220,60,80,0.12)",
    vpTitle: "#00d4ff", cpTitle: "#ff4466",
    divider: "rgba(0,212,255,0.3)", cpDivider: "rgba(255,68,102,0.4)",
    text: "#c8dce8", sub: "#7899b0",
    jobColor: "#00d4ff", painColor: "#ff4466", gainColor: "#00ff88",
    productColor: "#00d4ff", relieverColor: "#ff4466", creatorColor: "#00ff88",
    selectorBg: "rgba(0,212,255,0.05)", selectorBorder: "rgba(0,212,255,0.25)",
    selectorColor: "#00d4ff",
  } : {
    vpBg: "rgba(0,100,180,0.08)", vpBorder: "rgba(0,136,170,0.5)",
    cpBorder: "rgba(204,51,51,0.5)", cpBg: "rgba(200,40,60,0.08)",
    vpTitle: "#0088aa", cpTitle: "#cc3333",
    divider: "rgba(0,136,170,0.3)", cpDivider: "rgba(204,51,51,0.4)",
    text: "#1a2a3a", sub: "#5a7080",
    jobColor: "#0088aa", painColor: "#cc3333", gainColor: "#006e38",
    productColor: "#0088aa", relieverColor: "#cc3333", creatorColor: "#006e38",
    selectorBg: "rgba(0,136,170,0.05)", selectorBorder: "rgba(0,136,170,0.25)",
    selectorColor: "#0088aa",
  };

  const Items = ({ items, color, maxH = 130 }: { items: { id: string; name?: string | null; content: string }[]; color: string; maxH?: number }) => (
    <div style={{ overflowY: "auto", maxHeight: maxH, paddingRight: 4, scrollbarWidth: "thin" as const, scrollbarColor: `${color}40 transparent` }}>
      {items.length === 0
        ? <div style={{ fontSize: 9, color: c.sub, fontStyle: "italic" }}>—</div>
        : items.map(i => (
            <div key={i.id} style={{ fontSize: 10, color: c.text, marginBottom: 3, lineHeight: 1.3 }}>
              <span style={{ color, fontWeight: 700 }}>·</span> {i.name ?? i.content.substring(0, 42)}{!i.name && i.content.length > 42 ? "…" : ""}
            </div>
          ))
      }
    </div>
  );

  // VP square size
  const vpS = 500;

  // CP circle
  const cpS = 500;
  const r = cpS / 2;
  const cx = r; const cy = r;

  // SVG arc: sectors with given start/end degrees (SVG coords: 0°=right, clockwise)
  const arc = (startDeg: number, endDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const norm = (d: number) => ((d % 360) + 360) % 360;
    const s = norm(startDeg); const e = norm(endDeg);
    const span = ((endDeg - startDeg) % 360 + 360) % 360;
    const x1 = cx + r * Math.cos(toRad(s));
    const y1 = cy + r * Math.sin(toRad(s));
    const x2 = cx + r * Math.cos(toRad(e));
    const y2 = cy + r * Math.sin(toRad(e));
    const large = span > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  };

  // Sector angles — Customer Jobs on LEFT with tip pointing toward VP:
  // Horizontal line at center height = dividing line between Gains (top) and Pains (bottom) → goes to 180° (left)
  // Customer Jobs: right wedge centered at 0°, from 300° to 60° (120°) — tip at CENTER pointing left
  // Gains:  top-left arc from 60° to 180° (120°)
  // Pains:  bottom-left arc from 180° to 300° (120°)
  const jobStart  = 300; const jobEnd  = 420; // 420 = 60° mod 360, right sector
  const gainStart = 60;  const gainEnd = 180; // top-left sector
  const painStart = 180; const painEnd = 300; // bottom-left sector
  // Divider angles: 60°, 180° (horizontal), 300°
  const div1 = 60; const div2 = 180; const div3 = 300;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* ── Canvas filter (always shown in diagram view) ── */}
      {canvases.length >= 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 10, letterSpacing: 1, color: c.sub }}>CANVAS:</span>
          <select
            value={canvas?.id ?? ""}
            onChange={e => { const found = canvases.find(cv => cv.id === e.target.value); if (found) onCanvasChange(found); }}
            style={{
              background: c.selectorBg, border: `1px solid ${c.selectorBorder}`,
              color: c.selectorColor, fontFamily: "inherit", fontSize: 10,
              letterSpacing: 1, padding: "5px 10px", outline: "none", minWidth: 200,
            }}
          >
            {canvases.map(cv => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>

        {/* ── VALUE PROPOSITION square ── */}
        <div style={{ position: "relative", width: vpS, height: vpS, background: c.vpBg, border: `2px solid ${c.vpBorder}`, borderRadius: 4, flexShrink: 0 }}>
          {/* Title */}
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 700, color: c.vpTitle, letterSpacing: 2, whiteSpace: "nowrap", zIndex: 2 }}>
            {t("vpc.diagram_vp_title")}
          </div>

          {/* SVG: full X diagonals + horizontal center-to-right (pointer baseline). All triangles transparent. */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox={`0 0 ${vpS} ${vpS}`}>
            {/* Diagonal: top-left → bottom-right */}
            <line x1={0}     y1={0}     x2={vpS}   y2={vpS}   stroke={c.divider} strokeWidth="1.5" />
            {/* Diagonal: top-right → bottom-left */}
            <line x1={vpS}   y1={0}     x2={0}     y2={vpS}   stroke={c.divider} strokeWidth="1.5" />
            {/* Horizontal: center → right-edge (baseline of the RIGHT pointer triangle) */}
            <line x1={vpS/2} y1={vpS/2} x2={vpS}   y2={vpS/2} stroke={c.divider} strokeWidth="1.5" />
          </svg>

          {/* LEFT triangle — Products & Services  centroid≈(vpS*0.17, vpS*0.5) */}
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: vpS * 0.40, zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.productColor, letterSpacing:1, marginBottom:6 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/></svg>{t("vpc.section_products")}</div>
            <Items items={products} color={c.productColor} maxH={150} />
          </div>

          {/* TOP triangle — Gain Creators  centroid≈(vpS*0.5, vpS*0.17) */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 36, width: vpS * 0.52, textAlign: "center", zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.creatorColor, letterSpacing:1, marginBottom:6 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 20 7 12 12 16 17 8 22 4"/><line x1="2" y1="20" x2="22" y2="20"/></svg>{t("vpc.section_creators")}</div>
            <Items items={creators} color={c.creatorColor} maxH={110} />
          </div>

          {/* BOTTOM triangle — Pain Relievers  centroid≈(vpS*0.5, vpS*0.83) */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 28, width: vpS * 0.52, textAlign: "center", zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.relieverColor, letterSpacing:1, marginBottom:6 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="10" width="20" height="4" rx="2" transform="rotate(-45 12 12)"/></svg>{t("vpc.section_relievers")}</div>
            <Items items={relievers} color={c.relieverColor} maxH={110} />
          </div>
          {/* RIGHT triangle = visual pointer toward Customer Profile (empty — no text) */}
        </div>

        {/* Arrow connector */}
        <div style={{ color: c.jobColor, fontSize: 24, fontWeight: 700, flexShrink: 0 }}>⟵⟶</div>

        {/* ── CUSTOMER PROFILE circle ── */}
        <div style={{ position: "relative", width: cpS, height: cpS, flexShrink: 0 }}>
          <svg width={cpS} height={cpS} viewBox={`0 0 ${cpS} ${cpS}`} style={{ position: "absolute", inset: 0 }}>
            {/* Sector fills */}
            <path d={arc(gainStart, gainEnd)} fill={c.gainColor}    opacity="0.20" />
            <path d={arc(jobStart,  jobEnd)}  fill={c.jobColor}     opacity="0.20" />
            <path d={arc(painStart, painEnd)} fill={c.painColor}    opacity="0.20" />
            {/* Divider lines from center at 60°, 180° (horizontal left), 300° */}
            <line x1={cx} y1={cy} x2={cx + r*Math.cos(div1*Math.PI/180)} y2={cy + r*Math.sin(div1*Math.PI/180)} stroke={c.cpDivider} strokeWidth="1.5" />
            <line x1={cx} y1={cy} x2={cx + r*Math.cos(div2*Math.PI/180)} y2={cy + r*Math.sin(div2*Math.PI/180)} stroke={c.cpDivider} strokeWidth="2" />
            <line x1={cx} y1={cy} x2={cx + r*Math.cos(div3*Math.PI/180)} y2={cy + r*Math.sin(div3*Math.PI/180)} stroke={c.cpDivider} strokeWidth="1.5" />
            {/* Outer border */}
            <circle cx={cx} cy={cy} r={r-2}  fill="none" stroke={c.cpBorder} strokeWidth="2" />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={16} fill={c.cpBg} stroke={c.cpBorder} strokeWidth="1.5" />
          </svg>

          {/* Title */}
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 700, color: c.cpTitle, letterSpacing: 2, whiteSpace: "nowrap", zIndex: 2 }}>
            {t("vpc.diagram_cp_title")}
          </div>

          {/* GAINS — top-left sector (60°→180°, centroid ~120°=lower-right... label at top-left visual area) */}
          <div style={{ position: "absolute", top: 40, left: 40, width: 205, zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.gainColor, letterSpacing:1, marginBottom:4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>{t("vpc.section_gains")}</div>
            <Items items={gains} color={c.gainColor} maxH={150} />
          </div>

          {/* CUSTOMER JOBS — right sector (300°→60°, centered at 0°=right), tip points LEFT toward VP */}
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 175, zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.jobColor, letterSpacing:1, marginBottom:4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>{t("vpc.customer_jobs")}</div>
            <Items items={jobs} color={c.jobColor} maxH={150} />
          </div>

          {/* PAINS — bottom-left sector (180°→300°, centroid ~240°=upper-left... label at bottom-left visual area) */}
          <div style={{ position: "absolute", bottom: 40, left: 40, width: 205, zIndex: 2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:c.painColor, letterSpacing:1, marginBottom:4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>{t("vpc.section_pains")}</div>
            <Items items={pains} color={c.painColor} maxH={150} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VPC Network (connection map) ─────────────────────────────────────────────

function VPCNetwork({ data, dark, canvases, canvas, onCanvasChange }: {
  data: Structured; dark: boolean;
  canvases: VPCCanvas[]; canvas: VPCCanvas | null;
  onCanvasChange: (c: VPCCanvas) => void;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<{ d: string; color: string; key: string; dashed: boolean }[]>([]);
  const [showIndirect, setShowIndirect] = useState(false);

  const products  = data.products;
  const relievers = data.pain_relievers;
  const creators  = data.gain_creators;
  const allPains  = [...data.jobs.flatMap(j => j.pains), ...data.orphan_pains];
  const allGains  = [...data.jobs.flatMap(j => j.gains), ...data.orphan_gains];
  const jobs      = data.jobs.map(j => j.job);

  // Connections:
  // DIRECT:  reliever → pain (red), creator → gain (green)
  // INDIRECT: product → reliever (cyan), product → creator (purple) — via shared job
  const conns: { from: string; to: string; color: string; dashed?: boolean }[] = [];
  if (showIndirect) {
    products.forEach(p => {
      p.addresses.forEach(job => {
        relievers.forEach(r => { if (r.addresses.some(a => a.parent_id === job.id)) conns.push({ from: `p_${p.item.id}`, to: `r_${r.item.id}`, color: "#00d4ff" }); });
        creators.forEach(c2 => { if (c2.addresses.some(a => a.parent_id === job.id)) conns.push({ from: `p_${p.item.id}`, to: `c_${c2.item.id}`, color: "#c084fc" }); });
      });
    });
  }
  relievers.forEach(r => { r.addresses.forEach(a => conns.push({ from: `r_${r.item.id}`, to: `pain_${a.id}`, color: "#ff4466" })); });
  creators.forEach(c2 => { c2.addresses.forEach(a => conns.push({ from: `c_${c2.item.id}`, to: `gain_${a.id}`, color: "#00ff88" })); });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newLines = conns.flatMap(({ from, to, color, dashed }, i) => {
      const a = itemRefs.current.get(from);
      const b = itemRefs.current.get(to);
      if (!a || !b) return [];
      const ar = a.getBoundingClientRect(); const br = b.getBoundingClientRect();
      const x1 = ar.right - rect.left;  const y1 = ar.top - rect.top + ar.height / 2;
      const x2 = br.left  - rect.left;  const y2 = br.top - rect.top + br.height / 2;
      const cx_ = (x1 + x2) / 2;
      return [{ key: `${from}-${to}-${i}`, color, dashed: dashed ?? false, d: `M${x1},${y1} C${cx_},${y1} ${cx_},${y2} ${x2},${y2}` }];
    });
    setLines(newLines);
  });

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id);
  };

  const dk = dark;
  const col = {
    text: dk ? "#c8dce8" : "#1a2a3a",
    sub:  dk ? "#7899b0" : "#5a7080",
    border: dk ? "#0d2535" : "#d0dde8",
    cyan:  dk ? "#00d4ff" : "#0088aa",
    red:   dk ? "#ff4466" : "#cc3333",
    green: dk ? "#00ff88" : "#006e38",
    selBg: dk ? "rgba(0,212,255,0.05)" : "rgba(0,136,170,0.05)",
    selBorder: dk ? "rgba(0,212,255,0.25)" : "rgba(0,136,170,0.25)",
  };

  const NetCard = ({ refId, color, title, desc, priority }: { refId: string; color: string; title: string; desc: string; priority: number }) => (
    <div ref={setRef(refId)} style={{ border: `1px solid ${color}44`, borderRadius: 3, padding: "6px 8px", marginBottom: 5, background: `${color}06` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 2, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 8, color: col.sub, lineHeight: 1.25 }}>{desc.substring(0, 65)}{desc.length > 65 ? "…" : ""}</div>
      <div style={{ fontSize: 7, color: col.sub, marginTop: 2, opacity: 0.7 }}>P{priority}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {canvases.length >= 1 && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1, color: col.sub }}>CANVAS:</span>
            <select value={canvas?.id ?? ""} onChange={e => { const f = canvases.find(cv => cv.id === e.target.value); if (f) onCanvasChange(f); }}
              style={{ background: col.selBg, border: `1px solid ${col.selBorder}`, color: col.cyan, fontFamily: "inherit", fontSize: 10, letterSpacing: 1, padding: "5px 10px", outline: "none", minWidth: 200 }}>
              {canvases.map(cv => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowIndirect(v => !v)}
            style={{
              background: showIndirect ? "rgba(192,132,252,0.15)" : "rgba(0,212,255,0.05)",
              border: `1px solid ${showIndirect ? "#c084fc" : "rgba(0,212,255,0.25)"}`,
              color: showIndirect ? "#c084fc" : col.sub,
              fontFamily: "inherit", fontSize: 9, letterSpacing: 1,
              padding: "5px 12px", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {showIndirect ? "⬡ OCULTAR INDIRETOS" : "⬡ EXIBIR INDIRETOS"}
          </button>
        </div>
      )}

      <div ref={containerRef} style={{ position: "relative", display: "grid", gridTemplateColumns: "260px 260px 280px 220px", columnGap: "110px", rowGap: "16px", alignItems: "start" }}>
        {/* SVG overlay for connection lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
          <defs>
            {["00d4ff", "ff4466", "00ff88", "c084fc"].map(c2 => (
              <marker key={c2} id={`arr-${c2}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 Z" fill={`#${c2}`} opacity="0.8" />
              </marker>
            ))}
          </defs>
          {lines.map(l => (
            <path key={l.key} d={l.d} fill="none"
              stroke={l.color}
              strokeWidth={l.dashed ? "1" : "1.5"}
              strokeOpacity={l.dashed ? "0.35" : "0.75"}
              strokeDasharray={l.dashed ? "4,4" : undefined}
              markerEnd={l.dashed ? undefined : `url(#arr-${l.color.replace("#","").toLowerCase()})`} />
          ))}
        </svg>

        {/* LEFT — Products & Services */}
        <div style={{ background: `${col.cyan}06`, border: `1px solid ${col.cyan}22`, borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.cyan, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.cyan}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/></svg>{t("vpc.section_products")}</div>
          {products.length === 0 ? <div style={{ fontSize: 9, color: col.sub }}>—</div>
            : products.map(n => <NetCard key={n.item.id} refId={`p_${n.item.id}`} color={col.cyan}
                title={n.item.name ?? n.item.content.substring(0, 40)} desc={n.item.content} priority={n.item.priority} />)
          }
        </div>

        {/* MIDDLE — Pain Relievers + Gain Creators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: `${col.red}06`, border: `1px solid ${col.red}22`, borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.red, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.red}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="10" width="20" height="4" rx="2" transform="rotate(-45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke="none"/></svg>{t("vpc.section_relievers")}</div>
          {relievers.length === 0 ? <div style={{ fontSize: 9, color: col.sub, marginBottom: 16 }}>—</div>
            : relievers.map(n => <NetCard key={n.item.id} refId={`r_${n.item.id}`} color={col.red}
                title={n.item.name ?? n.item.content.substring(0, 40)} desc={n.item.content} priority={n.item.priority} />)
          }
          </div>
          <div style={{ background: `${col.green}06`, border: `1px solid ${col.green}22`, borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.green, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.green}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 20 7 12 12 16 17 8 22 4"/><line x1="2" y1="20" x2="22" y2="20"/></svg>{t("vpc.section_creators")}</div>
          {creators.length === 0 ? <div style={{ fontSize: 9, color: col.sub }}>—</div>
            : creators.map(n => <NetCard key={n.item.id} refId={`c_${n.item.id}`} color={col.green}
                title={n.item.name ?? n.item.content.substring(0, 40)} desc={n.item.content} priority={n.item.priority} />)
          }
          </div>
        </div>

          {/* RIGHT — Pains + Gains */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: `${col.red}06`, border: `1px solid ${col.red}22`, borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.red, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.red}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>{t("vpc.section_pains")}</div>
          {allPains.length === 0 ? <div style={{ fontSize: 9, color: col.sub, marginBottom: 16 }}>—</div>
            : allPains.map((p, i) => (
                <div key={p.id} ref={setRef(`pain_${p.id}`)}
                  style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 6, padding: "4px 8px", borderRadius: 3, background: `${col.red}08`, border: `1px solid ${col.red}33` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: col.red, minWidth: 22 }}>P{i + 1}</span>
                  <span style={{ fontSize: 9, color: col.text }}>{(p.name ?? p.content).substring(0, 55)}</span>
                </div>
              ))
          }
          </div>
          <div style={{ background: `${col.green}06`, border: `1px solid ${col.green}22`, borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.green, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.green}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>{t("vpc.section_gains")}</div>
          {allGains.length === 0 ? <div style={{ fontSize: 9, color: col.sub }}>—</div>
            : allGains.map((g, i) => (
                <div key={g.id} ref={setRef(`gain_${g.id}`)}
                  style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 5, padding: "4px 8px", borderRadius: 3, background: `${col.green}08`, border: `1px solid ${col.green}33` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: col.green, minWidth: 22 }}>G{i + 1}</span>
                  <span style={{ fontSize: 9, color: col.text }}>{(g.name ?? g.content).substring(0, 55)}</span>
                </div>
              ))
          }
          </div>
        </div>

        {/* COL 4 — Customer Jobs + Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {jobs.length > 0 && (
            <div style={{ background: `${col.cyan}06`, border: `1px solid ${col.cyan}22`, borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, color:col.cyan, letterSpacing:2, marginBottom:10, borderBottom:`1px solid ${col.cyan}30`, paddingBottom:8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>{t("vpc.customer_jobs")}</div>
              {jobs.map(j => (
                <div key={j.id} style={{ fontSize: 9, color: col.text, marginBottom: 6, padding: "4px 8px", borderRadius: 3, border: `1px solid ${col.cyan}33` }}>
                  {(j.name ?? j.content).substring(0, 80)}
                </div>
              ))}
            </div>
          )}
          {/* Legend */}
          <div style={{ padding: "10px 12px", border: `1px solid ${col.border}`, borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: col.sub, marginBottom: 8, letterSpacing: 1 }}>{t("vpc.network_legend")}</div>
            {[
              { color: "#00d4ff", label: t("vpc.legend_prod_reliever") },
              { color: "#c084fc", label: t("vpc.legend_prod_creator") },
              { color: col.red,   label: t("vpc.legend_reliever_pain") },
              { color: col.green, label: t("vpc.legend_creator_gain") },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <svg width="32" height="10" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="26" y2="5" stroke={color} strokeWidth="1.5" />
                  <polygon points="24,2 30,5 24,8" fill={color} opacity="0.8" />
                </svg>
                <span style={{ fontSize: 8, color: col.sub }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({ item, dark, onEdit, onDel, badge }: {
  item: ItemSlim; dark: boolean;
  onEdit: () => void; onDel: () => void;
  badge?: string;
}) {
  const { t } = useTranslation();
  const accent = accentFor(item.type, dark);
  return (
    <div className="vpc-card" style={{ border: `1px solid ${accent}33` }}>
      {badge && <div style={{ fontSize: 9, color: accent, letterSpacing: 1, marginBottom: 4 }}>{badge}</div>}
      {item.name && (
        <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 2, cursor: "pointer" }} onClick={onEdit}>
          {item.name}
        </div>
      )}
      <div className={item.name ? "vpc-card__text--muted" : "vpc-card__text"} style={{ cursor: "pointer" }} onClick={onEdit}>
        {item.content}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
        <span style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080" }}>P.{item.priority}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-icon" style={{ fontSize: 9, padding: "1px 6px" }} onClick={onEdit}>{t("vpc.btn_edit")}</button>
          <button className="btn-icon btn-icon--danger" style={{ fontSize: 9, padding: "1px 6px" }} onClick={onDel}>{t("vpc.btn_del")}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VPCPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dark = user?.user_theme !== "light";

  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [canvases, setCanvases]   = useState<VPCCanvas[]>([]);
  const [canvas, setCanvas]       = useState<VPCCanvas | null>(null);
  const [data, setData]           = useState<Structured | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const [canvasModal, setCanvasModal]   = useState(false);
  const [editingCanvas, setEditingCanvas] = useState(false);
  const [cf, setCf]     = useState({ ...EMPTY_C });
  const [savingC, setSavingC] = useState(false);

  const [view, setView]       = useState<"edit" | "diagram" | "network">("edit");
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [itemLinks, setItemLinks] = useState<VPCLink[]>([]);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadCanvases = async (pid = productId) => {
    if (!pid) { setCanvases([]); setCanvas(null); setData(null); return; }
    try {
      const list = await apiGet<VPCCanvas[]>(`/vpc/canvas?product_id=${pid}`);
      setCanvases(list);
      setCanvas(prev => (prev && list.find(c => c.id === prev.id)) ? prev : list[0] ?? null);
    } catch { setCanvases([]); setCanvas(null); }
  };

  const loadData = async (c = canvas) => {
    if (!c) { setData(null); return; }
    setLoading(true); setError("");
    try {
      const s = await apiGet<Structured>(`/vpc/canvas/${c.id}/structured`);
      setData(s);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("vpc.err_load")); }
    finally { setLoading(false); }
  };

  useEffect(() => { setCanvas(null); setData(null); loadCanvases(productId); }, [productId]);
  useEffect(() => { loadData(canvas); }, [canvas]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  // ── Canvas handlers ─────────────────────────────────────────────────────────

  const createCanvas = async () => {
    if (!cf.name.trim() || !productId) return;
    setSavingC(true); setError("");
    try {
      if (editingCanvas && canvas) {
        const updated = await apiPatch<VPCCanvas>(`/vpc/canvas/${canvas.id}`, { name: cf.name.trim(), description: cf.description.trim() || null });
        setCanvases(prev => prev.map(c => c.id === updated.id ? updated : c));
        setCanvas(updated);
      } else {
        const created = await apiPost<VPCCanvas>("/vpc/canvas", { product_id: productId, name: cf.name.trim(), description: cf.description.trim() || null });
        setCanvases(upd => [...upd, created]); setCanvas(created);
      }
      setCanvasModal(false); setCf({ ...EMPTY_C }); setEditingCanvas(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("vpc.err_canvas_create")); }
    finally { setSavingC(false); }
  };

  const deleteCanvas = async () => {
    if (!canvas || !confirm(t("vpc.confirm_del_canvas", { name: canvas.name }))) return;
    try {
      await apiDelete(`/vpc/canvas/${canvas.id}`);
      const upd = canvases.filter(c => c.id !== canvas.id);
      setCanvases(upd); setCanvas(upd[0] ?? null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("vpc.err_canvas_delete")); }
  };

  // ── Item handlers ───────────────────────────────────────────────────────────

  const openCreate = (type: string, parent_id = "") => {
    setForm({ type, name: "", content: "", priority: 3, parent_id, parent_ids: [] });
    setItemLinks([]); setEditId(null); setModal("create");
  };

  const openEdit = async (item: ItemSlim) => {
    let parent_ids: string[] = [];
    let links: VPCLink[] = [];
    if (isNMType(item.type)) {
      try {
        links = await apiGet<VPCLink[]>(`/vpc/items/${item.id}/links`);
        parent_ids = links.map(l => l.target_id);
      } catch { /* ignore */ }
    }
    setItemLinks(links);
    setForm({ type: item.type, name: item.name ?? "", content: item.content, priority: item.priority, parent_id: item.parent_id ?? "", parent_ids });
    setEditId(item.id); setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditId(null); };

  const handleSave = async () => {
    if (!form.content.trim() || !canvas) return;
    setSaving(true);
    try {
      const body = { ...form, priority: Number(form.priority), parent_id: isNMType(form.type) ? null : (form.parent_id || null) };
      let savedId = editId;

      if (modal === "create") {
        const created = await apiPost<{ id: string }>("/vpc", { ...body, product_id: productId, canvas_id: canvas.id });
        savedId = created.id;
      } else if (editId) {
        await apiPatch(`/vpc/${editId}`, { name: body.name, content: body.content, priority: body.priority, parent_id: body.parent_id });
      }

      // Manage N:M links for reliever/creator/product
      if (savedId && isNMType(form.type)) {
        const currentLinks = modal === "edit" ? itemLinks : [];
        const currentTargetIds = currentLinks.map(l => l.target_id);
        // Delete removed
        for (const lnk of currentLinks) {
          if (!form.parent_ids.includes(lnk.target_id)) {
            try { await apiDelete(`/vpc/links/${lnk.id}`); } catch { /* ignore */ }
          }
        }
        // Add new
        for (const tid of form.parent_ids) {
          if (!currentTargetIds.includes(tid)) {
            try { await apiPost("/vpc/links", { canvas_id: canvas.id, source_id: savedId, target_id: tid }); } catch { /* ignore */ }
          }
        }
      }

      closeModal(); loadData();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("vpc.err_save")); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("vpc.confirm_del_item"))) return;
    try { await apiDelete(`/vpc/${id}`); loadData(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : t("vpc.err_delete")); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allItems: ItemSlim[] = data ? [
    ...data.jobs.map(j => j.job),
    ...data.jobs.flatMap(j => [...j.pains, ...j.gains]),
    ...data.orphan_pains, ...data.orphan_gains,
    ...data.products.map(n => n.item),
    ...data.pain_relievers.map(n => n.item),
    ...data.gain_creators.map(n => n.item),
  ] : [];

  const totalItems = allItems.length;

  const parentOptions: ItemSlim[] = (() => {
    if (!data) return [];
    const type = form.type;
    if (type === "pain" || type === "gain")    return data.jobs.map(j => j.job);
    if (type === "pain_reliever")              return [...data.jobs.flatMap(j => j.pains), ...data.orphan_pains];
    if (type === "gain_creator")               return [...data.jobs.flatMap(j => j.gains), ...data.orphan_gains];
    if (type === "product")                    return [
      ...data.jobs.map(j => j.job),
      ...data.pain_relievers.map(n => n.item),
      ...data.gain_creators.map(n => n.item),
    ];
    return [];
  })();

  // Toggle a target in parent_ids (for N:M types)
  const toggleParentId = (id: string) => {
    setForm(f => ({
      ...f,
      parent_ids: f.parent_ids.includes(id)
        ? f.parent_ids.filter(x => x !== id)
        : [...f.parent_ids, id],
    }));
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      job: t("vpc.type_job"), pain: t("vpc.type_pain"), gain: t("vpc.type_gain"),
      product: t("vpc.type_product"), pain_reliever: t("vpc.type_reliever"), gain_creator: t("vpc.type_creator"),
    };
    return map[type] ?? type;
  };

  const parentLabel = (type: string) => {
    if (type === "pain" || type === "gain") return t("vpc.parent_pain_gain");
    if (type === "pain_reliever")           return t("vpc.parent_reliever");
    if (type === "gain_creator")            return t("vpc.parent_creator");
    if (type === "product")                 return t("vpc.parent_product");
    return t("vpc.parent_other");
  };

  const sectionTitle = (label: string, color: string, onAdd?: () => void) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ color, fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>{label}</span>
      {onAdd && <button className="btn-icon" style={{ fontSize: 9, padding: "2px 8px" }} onClick={onAdd}>+ ADD</button>}
    </div>
  );

  // Multiple badges for N:M addresses list
  const badgesFor = (prefix: string, items: ItemSlim[]) =>
    items.length ? items.map(a => `${prefix} ${a.name ?? a.content.substring(0, 35)}`).join(" · ") : undefined;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ModuleLayout moduleIcon="⬡" moduleName="VALUE PROPOSITION CANVAS" moduleAccent="CANVAS"
      selectedProductId={productId} onProductChange={handleProductChange}>

      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("vpc.eyebrow")}</span>
          <h1 className="mod-header__title">{t("vpc.title")} <span>{t("vpc.title_accent")}</span></h1>
          <p className="mod-header__meta">
            {canvas ? t("vpc.meta", { count: totalItems, canvas: canvas.name }) : t("vpc.meta_no_canvas")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className={`btn-icon ${view === "edit" ? "influence-btn--active" : ""}`} onClick={() => setView("edit")}>{t("vpc.view_canvas")}</button>
          <button className={`btn-icon ${view === "diagram" ? "influence-btn--active" : ""}`} onClick={() => setView("diagram")}>{t("vpc.view_diagram")}</button>
          <button className={`btn-icon ${view === "network" ? "influence-btn--active" : ""}`} onClick={() => setView("network")}>{t("vpc.view_network")}</button>
          {canvas && view === "edit" && <button className="btn-add" onClick={() => openCreate("job")}>{t("vpc.btn_new_job")}</button>}
        </div>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {/* Canvas selector — select + actions in EDIT view */}
      {productId && view === "edit" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ color: dark ? "#7899b0" : "#5a7080", fontSize: 10, letterSpacing: 1 }}>{t("vpc.canvas_label")}</span>
          <select
            value={canvas?.id ?? ""}
            onChange={e => { const found = canvases.find(c => c.id === e.target.value); if (found) setCanvas(found); }}
            className="mod-select"
            style={{ minWidth: 220, fontSize: 10, padding: "5px 10px" }}
          >
            {canvases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {canvas && (
            <button className="btn-icon" style={{ fontSize: 10 }}
              onClick={() => { setCf({ name: canvas.name, description: canvas.description ?? "" }); setEditingCanvas(true); setCanvasModal(true); }}>
              ✏ {t("vpc.btn_edit_canvas")}
            </button>
          )}
          <button className="btn-icon" style={{ fontSize: 10, color: dark ? "#00d4ff" : "#0088aa" }}
            onClick={() => { setCf({ ...EMPTY_C }); setEditingCanvas(false); setCanvasModal(true); }}>
            {t("vpc.btn_new_canvas")}
          </button>
          {canvas && (
            <button className="btn-icon btn-icon--danger" style={{ fontSize: 10 }} onClick={deleteCanvas}>
              {t("vpc.btn_del_canvas")}
            </button>
          )}
        </div>
      )}

      {!productId && (
        <div className="mod-empty">
          <div className="mod-empty__icon">⬡</div>
          <div className="mod-empty__title">{t("vpc.empty_product")}</div>
          <div className="mod-empty__sub">{t("vpc.empty_product_sub")}</div>
        </div>
      )}

      {productId && !canvas && !loading && (
        <div className="mod-empty">
          <div className="mod-empty__icon">⬡</div>
          <div className="mod-empty__title">{t("vpc.empty_canvas")}</div>
          <div className="mod-empty__sub">{t("vpc.empty_canvas_sub")}</div>
          <button className="btn-add" style={{ marginTop: 16 }} onClick={() => { setCf({ ...EMPTY_C }); setCanvasModal(true); }}>
            {t("vpc.btn_create_canvas")}
          </button>
        </div>
      )}

      {/* Network view */}
      {canvas && view === "network" && (
        loading ? <div className="mod-loading">{t("vpc.loading")}</div>
        : !data ? null
        : <VPCNetwork data={data} dark={dark} canvases={canvases} canvas={canvas} onCanvasChange={setCanvas} />
      )}

      {/* Diagram view */}
      {canvas && view === "diagram" && (
        loading ? <div className="mod-loading">{t("vpc.loading")}</div>
        : !data ? null
        : <VPCDiagram data={data} dark={dark} canvases={canvases} canvas={canvas} onCanvasChange={setCanvas} />
      )}

      {/* Main canvas — Customer Profile LEFT | Value Proposition RIGHT */}
      {canvas && view === "edit" && (
        loading ? <div className="mod-loading">{t("vpc.loading")}</div> : !data ? null : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* ── LEFT: Customer Profile ── */}
            <div className="vpc-panel">
              <div className="vpc-panel__header" style={{ color: dark ? "#ff9900" : "#b85c00" }}>
                {t("vpc.panel_cp")}
              </div>

              {data.jobs.length === 0 && data.orphan_pains.length === 0 && data.orphan_gains.length === 0 && (
                <div style={{ color: dark ? "#7899b0" : "#5a7080", fontSize: 10, textAlign: "center", padding: 20 }}>
                  {t("vpc.empty_start_job")}
                </div>
              )}

              {data.jobs.map(jn => (
                <div key={jn.job.id} className="vpc-job-box">
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: accentFor("job", dark), letterSpacing: 1, marginBottom: 3 }}>{t("vpc.label_job")}</div>
                    {jn.job.name && <div style={{ fontSize: 12, fontWeight: 600, color: accentFor("job", dark), marginBottom: 2 }}>{jn.job.name}</div>}
                    <div className={jn.job.name ? "vpc-job-text--muted" : "vpc-job-text"}>{jn.job.content}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080" }}>P.{jn.job.priority}</span>
                      <button className="btn-icon" style={{ fontSize: 9, padding: "1px 6px" }} onClick={() => openEdit(jn.job)}>{t("vpc.btn_edit")}</button>
                      <button className="btn-icon btn-icon--danger" style={{ fontSize: 9, padding: "1px 6px" }} onClick={() => handleDelete(jn.job.id)}>{t("vpc.btn_del")}</button>
                    </div>
                  </div>

                  <div className="vpc-pains-indent">
                    {sectionTitle(t("vpc.section_pains"), accentFor("pain", dark), () => openCreate("pain", jn.job.id))}
                    {jn.pains.length === 0
                      ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.empty_pains")}</div>
                      : jn.pains.map(p => <ItemCard key={p.id} item={p} dark={dark} onEdit={() => openEdit(p)} onDel={() => handleDelete(p.id)} />)
                    }
                  </div>

                  <div className="vpc-gains-indent">
                    {sectionTitle(t("vpc.section_gains"), accentFor("gain", dark), () => openCreate("gain", jn.job.id))}
                    {jn.gains.length === 0
                      ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.empty_gains")}</div>
                      : jn.gains.map(g => <ItemCard key={g.id} item={g} dark={dark} onEdit={() => openEdit(g)} onDel={() => handleDelete(g.id)} />)
                    }
                  </div>
                </div>
              ))}

              {(data.orphan_pains.length > 0 || data.orphan_gains.length > 0) && (
                <div className="vpc-orphan-box">
                  <div style={{ fontSize: 9, color: dark ? "#ff9900" : "#b85c00", marginBottom: 8 }}>{t("vpc.orphan_warning")}</div>
                  {data.orphan_pains.map(p => <ItemCard key={p.id} item={p} dark={dark} onEdit={() => openEdit(p)} onDel={() => handleDelete(p.id)} badge={t("vpc.type_pain")} />)}
                  {data.orphan_gains.map(g => <ItemCard key={g.id} item={g} dark={dark} onEdit={() => openEdit(g)} onDel={() => handleDelete(g.id)} badge={t("vpc.type_gain")} />)}
                </div>
              )}
            </div>

            {/* ── RIGHT: Value Proposition ── */}
            <div className="vpc-panel">
              <div className="vpc-panel__header" style={{ color: accentFor("job", dark) }}>
                {t("vpc.panel_vp")}
              </div>

              <div style={{ marginBottom: 16 }}>
                {sectionTitle(t("vpc.section_products"), accentFor("product", dark), () => openCreate("product"))}
              {data.products.length === 0
                  ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.empty_products")}</div>
                  : data.products.map(n => (
                      <ItemCard key={n.item.id} item={n.item} dark={dark}
                        onEdit={() => openEdit(n.item)} onDel={() => handleDelete(n.item.id)}
                        badge={badgesFor(t("vpc.badge_job"), n.addresses)}
                      />
                    ))
                }
              </div>

              <div style={{ marginBottom: 16 }}>
                {sectionTitle(t("vpc.section_relievers"), accentFor("pain_reliever", dark), () => openCreate("pain_reliever"))}
                {data.pain_relievers.length === 0
                  ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.empty_relievers")}</div>
                  : data.pain_relievers.map(n => (
                      <ItemCard key={n.item.id} item={n.item} dark={dark}
                        onEdit={() => openEdit(n.item)} onDel={() => handleDelete(n.item.id)}
                        badge={badgesFor(t("vpc.badge_pain"), n.addresses)}
                      />
                    ))
                }
              </div>

              <div>
                {sectionTitle(t("vpc.section_creators"), accentFor("gain_creator", dark), () => openCreate("gain_creator"))}
                {data.gain_creators.length === 0
                  ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.empty_creators")}</div>
                  : data.gain_creators.map(n => (
                      <ItemCard key={n.item.id} item={n.item} dark={dark}
                        onEdit={() => openEdit(n.item)} onDel={() => handleDelete(n.item.id)}
                        badge={badgesFor(t("vpc.badge_gain"), n.addresses)}
                      />
                    ))
                }
              </div>
            </div>

          </div>
        )
      )}

      {/* ── Canvas modal ── */}
      {canvasModal && (
        <div className="mod-overlay" onClick={() => setCanvasModal(false)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// VALUE CANVAS //</span><h3 className="mod-modal__title">{editingCanvas ? t("vpc.modal_edit_canvas") : t("vpc.modal_new")} <span>{t("vpc.canvas_title_accent")}</span></h3></div>
              <button className="mod-modal__close" onClick={() => { setCanvasModal(false); setEditingCanvas(false); }}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">{t("vpc.canvas_name")}</label>
                <input className="mod-input" value={cf.name} onChange={e => setCf(f => ({ ...f, name: e.target.value }))} placeholder={t("vpc.canvas_name_placeholder")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("vpc.canvas_desc")}</label>
                <input className="mod-input" value={cf.description} onChange={e => setCf(f => ({ ...f, description: e.target.value }))} placeholder={t("vpc.canvas_desc_placeholder")} />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => { setCanvasModal(false); setEditingCanvas(false); }}>{t("vpc.btn_cancel")}</button>
              <button className="btn-save" onClick={createCanvas} disabled={savingC || !cf.name.trim()}>{savingC ? t("vpc.btn_saving") : t("vpc.btn_save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item modal ── */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// VALUE CANVAS //</span><h3 className="mod-modal__title">{modal === "create" ? t("vpc.modal_new") : t("vpc.modal_edit")} <span>{typeLabel(form.type)}</span></h3></div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              {modal === "create" && (
                <div className="mod-field">
                  <label className="mod-field__label">{t("vpc.field_type")}</label>
                  <select className="mod-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, parent_id: "" }))}>
                    <optgroup label={`— ${t("vpc.panel_cp")}`}>
                      <option value="job">{t("vpc.type_job")}</option>
                      <option value="pain">{t("vpc.type_pain")}</option>
                      <option value="gain">{t("vpc.type_gain")}</option>
                    </optgroup>
                    <optgroup label={`— ${t("vpc.panel_vp")}`}>
                      <option value="product">{t("vpc.type_product")}</option>
                      <option value="pain_reliever">{t("vpc.type_reliever")}</option>
                      <option value="gain_creator">{t("vpc.type_creator")}</option>
                    </optgroup>
                  </select>
                </div>
              )}

              {parentOptions.length > 0 && !isNMType(form.type) && (
                <div className="mod-field">
                  <label className="mod-field__label">{parentLabel(form.type)}</label>
                  <select className="mod-select" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                    <option value="">{t("vpc.opt_none")}</option>
                    {parentOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.name ?? o.content.substring(0, 60)}{!o.name && o.content.length > 60 ? "…" : ""}</option>
                    ))}
                  </select>
                </div>
              )}
              {parentOptions.length > 0 && isNMType(form.type) && (
                <div className="mod-field">
                  <label className="mod-field__label">{parentLabel(form.type)} <span style={{ fontSize: 8, opacity: 0.6 }}>{t("vpc.multi_select_hint")}</span></label>
                  <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${dark ? "#1e3a4a" : "#d0dde8"}`, borderRadius: 3, padding: "4px 8px" }}>
                    {parentOptions.length === 0
                      ? <div style={{ fontSize: 9, color: dark ? "#7899b0" : "#5a7080", padding: "4px 0" }}>{t("vpc.opt_none")}</div>
                      : form.type === "product"
                        ? (
                          <>
                            {/* Group: Customer Jobs */}
                            {parentOptions.filter(o => o.type === "job").length > 0 && (
                              <>
                                <div style={{ fontSize: 8, color: dark ? "#00d4ff" : "#0088aa", letterSpacing: 1, padding: "6px 0 2px", borderBottom: `1px solid ${dark ? "#1e3a4a" : "#d0dde8"}`, marginBottom: 2 }}>{t("vpc.parent_product_group_jobs")}</div>
                                {parentOptions.filter(o => o.type === "job").map(o => (
                                  <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", cursor: "pointer" }}>
                                    <input type="checkbox" checked={form.parent_ids.includes(o.id)} onChange={() => toggleParentId(o.id)} style={{ accentColor: dark ? "#00d4ff" : "#0088aa" }} />
                                    <span style={{ fontSize: 9, color: dark ? "#c8dce8" : "#1a2a3a", lineHeight: 1.3 }}>{o.name ?? o.content.substring(0, 55)}{!o.name && o.content.length > 55 ? "…" : ""}</span>
                                  </label>
                                ))}
                              </>
                            )}
                            {/* Group: Pain Relievers */}
                            {parentOptions.filter(o => o.type === "pain_reliever").length > 0 && (
                              <>
                                <div style={{ fontSize: 8, color: dark ? "#ff4466" : "#cc3333", letterSpacing: 1, padding: "6px 0 2px", borderBottom: `1px solid ${dark ? "#1e3a4a" : "#d0dde8"}`, marginBottom: 2, marginTop: 4 }}>{t("vpc.parent_product_group_relievers")}</div>
                                {parentOptions.filter(o => o.type === "pain_reliever").map(o => (
                                  <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", cursor: "pointer" }}>
                                    <input type="checkbox" checked={form.parent_ids.includes(o.id)} onChange={() => toggleParentId(o.id)} style={{ accentColor: dark ? "#ff4466" : "#cc3333" }} />
                                    <span style={{ fontSize: 9, color: dark ? "#c8dce8" : "#1a2a3a", lineHeight: 1.3 }}>{o.name ?? o.content.substring(0, 55)}{!o.name && o.content.length > 55 ? "…" : ""}</span>
                                  </label>
                                ))}
                              </>
                            )}
                            {/* Group: Gain Creators */}
                            {parentOptions.filter(o => o.type === "gain_creator").length > 0 && (
                              <>
                                <div style={{ fontSize: 8, color: dark ? "#00ff88" : "#006e38", letterSpacing: 1, padding: "6px 0 2px", borderBottom: `1px solid ${dark ? "#1e3a4a" : "#d0dde8"}`, marginBottom: 2, marginTop: 4 }}>{t("vpc.parent_product_group_creators")}</div>
                                {parentOptions.filter(o => o.type === "gain_creator").map(o => (
                                  <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", cursor: "pointer" }}>
                                    <input type="checkbox" checked={form.parent_ids.includes(o.id)} onChange={() => toggleParentId(o.id)} style={{ accentColor: dark ? "#00ff88" : "#006e38" }} />
                                    <span style={{ fontSize: 9, color: dark ? "#c8dce8" : "#1a2a3a", lineHeight: 1.3 }}>{o.name ?? o.content.substring(0, 55)}{!o.name && o.content.length > 55 ? "…" : ""}</span>
                                  </label>
                                ))}
                              </>
                            )}
                          </>
                        )
                        : parentOptions.map(o => (
                            <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", cursor: "pointer" }}>
                              <input type="checkbox" checked={form.parent_ids.includes(o.id)} onChange={() => toggleParentId(o.id)} style={{ accentColor: dark ? "#00d4ff" : "#0088aa" }} />
                              <span style={{ fontSize: 9, color: dark ? "#c8dce8" : "#1a2a3a", lineHeight: 1.3 }}>
                                {o.name ?? o.content.substring(0, 55)}{!o.name && o.content.length > 55 ? "…" : ""}
                              </span>
                            </label>
                          ))
                    }
                  </div>
                </div>
              )}

              <div className="mod-field">
                <label className="mod-field__label">{t("vpc.field_name")}</label>
                <input className="mod-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("vpc.placeholder_name")} />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("vpc.field_content")}</label>
                <textarea className="mod-textarea" style={{ minHeight: 100 }} value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={t("vpc.placeholder_content")} />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("vpc.field_priority")}</label>
                <div className="influence-grid">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" className={`influence-btn ${form.priority === n ? "influence-btn--active" : ""}`}
                      onClick={() => setForm(f => ({ ...f, priority: n }))}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("vpc.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.content.trim()}>{saving ? t("vpc.btn_saving") : t("vpc.btn_save")}</button>
            </div>
          </div>
        </div>
      )}

    </ModuleLayout>
  );
}

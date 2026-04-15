export { default } from "./src/App.jsx";

// ── Tokens ────────────────────────────────────────────────────
const T = {
  pink:"#f604b7", pinkDim:"rgba(246,4,183,0.12)",
  bg:"#111", surf:"#1a1a1a", card:"#202020", cardHov:"#262626",
  border:"#2e2e2e", muted:"#777", mutedL:"#aaa", white:"#fff",
};

// ── API ───────────────────────────────────────────────────────
const API_BASE = "/api";

function getRecruiterPassword() {
  try { return sessionStorage.getItem("recruiterPwd") || ""; } catch { return ""; }
}
function setRecruiterPassword(pwd) {
  try { sessionStorage.setItem("recruiterPwd", pwd || ""); } catch {}
}
function recruiterAuthHeader(pwd) {
  const token = typeof window !== "undefined" && window.btoa ? window.btoa(`recruiter:${pwd}`) : "";
  return token ? `Basic ${token}` : "";
}

async function apiJson(path, { method="GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(headers||{}), ...(body ? {"Content-Type":"application/json"} : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if(!res.ok) {
    const msg = await res.text().catch(()=> "");
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

// ── Data ──────────────────────────────────────────────────────
const TEAMS = ["Wholesale","Retail","Operations","Technology","Research"];
const LOCS  = ["Madrid","London","Barcelona","Amsterdam","Remote"];
const SENS  = ["Junior","Mid","Mid-Senior","Senior","Lead","Principal"];
const REMOTES = ["Onsite","Hybrid","Remote"];
const TYPES   = ["Full-time","Part-time","Contract","Freelance"];
const JOB_STATUSES = ["drafting","open","closed"];

let _idSeq = 3;
const nextId = () => ++_idSeq;

const INIT_JOBS = [
  {
    id:1, status:"open",
    title:"Business Data Consultant", team:"Retail",
    location:"Madrid", remote:"Hybrid", seniority:"Senior", type:"Full-time",
    description:"Lead data strategy and analytics initiatives for retail payments clients. Work with payment processors, banks, and fintechs to turn transaction data into actionable insights.",
    questions:[
      { id:"q1", label:"Years of experience in payments or fintech", type:"select", options:["<1 year","1–3 years","3–5 years","5–10 years","10+ years"], isMust:false },
      { id:"q2", label:"Languages you work professionally in", type:"multicheck", options:["English","Spanish","French","German","Portuguese"], isMust:true },
      { id:"q3", label:"Data tools you use regularly", type:"multicheck", options:["SQL","Python","Power BI","Tableau","Spark","dbt","Other"], isMust:false },
      { id:"q4", label:"SQL proficiency level", type:"select", options:["Beginner","Intermediate","Advanced","Expert"], isMust:false },
    ],
    criteria:[
      { questionId:"q1", label:"Min. 3 years experience", matchValues:["3–5 years","5–10 years","10+ years"] },
      { questionId:"q2", label:"English required", matchValues:["English"] },
    ],
  },
  {
    id:2, status:"open",
    title:"DLT Technical Consultant", team:"Wholesale",
    location:"London", remote:"Remote", seniority:"Mid-Senior", type:"Contract",
    description:"Design and implement distributed ledger solutions for wholesale financial markets. Advise institutional clients on tokenisation, settlement, and on-chain data architecture.",
    questions:[
      { id:"q1", label:"Years of experience with DLT / blockchain", type:"select", options:["<1 year","1–3 years","3–5 years","5–10 years","10+ years"], isMust:false },
      { id:"q2", label:"Languages you work professionally in", type:"multicheck", options:["English","Spanish","French","German","Portuguese"], isMust:true },
      { id:"q3", label:"DLT platforms you have worked with", type:"multicheck", options:["Ethereum / EVM","Hyperledger Fabric","Corda","Solana","Stellar","DAML","Other"], isMust:false },
      { id:"q4", label:"Background in wholesale finance", type:"select", options:["None","Some exposure","Solid background","Deep expertise"], isMust:false },
    ],
    criteria:[
      { questionId:"q1", label:"Min. 1 year DLT experience", matchValues:["1–3 years","3–5 years","5–10 years","10+ years"] },
      { questionId:"q2", label:"English required", matchValues:["English"] },
    ],
  },
];

const MOCK_APPS = [
  { id:1, jobId:1, name:"Elena Márquez",    linkedin:"https://linkedin.com", status:"new",         date:"2025-04-10", answers:{ q1:"5–10 years", q2:["English","Spanish"], q3:["SQL","Python"], q4:"Expert" } },
  { id:2, jobId:2, name:"James Okonkwo",    linkedin:"https://linkedin.com", status:"new",         date:"2025-04-11", answers:{ q1:"3–5 years",  q2:["English"],           q3:["Ethereum / EVM"], q4:"Solid background" } },
  { id:3, jobId:1, name:"Luisa Ferreira",   linkedin:"https://linkedin.com", status:"shortlisted",  date:"2025-04-12", answers:{ q1:"3–5 years",  q2:["English","Portuguese"], q3:["dbt","Python"], q4:"Advanced" } },
  { id:4, jobId:2, name:"Tobias Müller",    linkedin:"https://linkedin.com", status:"interview",    date:"2025-04-12", answers:{ q1:"5–10 years", q2:["English","German"],  q3:["Corda","DAML"], q4:"Deep expertise" } },
  { id:5, jobId:1, name:"Sara Andersen",    linkedin:"",                     status:"new",          date:"2025-04-13", answers:{ q1:"1–3 years",  q2:["English","French"],  q3:["Tableau"],      q4:"Intermediate" } },
  { id:6, jobId:2, name:"Hiroshi Nakamura", linkedin:"https://linkedin.com", status:"new",          date:"2025-04-14", answers:{ q1:"<1 year",    q2:["English"],           q3:["Ethereum / EVM","Solana"], q4:"Some exposure" } },
];

// ── Helpers ───────────────────────────────────────────────────
function computeScore(job, answers) {
  if (!job.criteria || !job.criteria.length) return null;
  let hit = 0;
  for (const c of job.criteria) {
    const a = answers[c.questionId];
    if (!a) continue;
    const arr = Array.isArray(a) ? a : [a];
    if (c.matchValues.some(v => arr.includes(v))) hit++;
  }
  return Math.round((hit / job.criteria.length) * 100);
}

function mustScore(job, answers) {
  const musts = (job.questions || []).filter(q => q.isMust);
  if (!musts.length) return null;
  let hit = 0;
  for (const q of musts) {
    const a = answers[q.id];
    if (!a) continue;
    const arr = Array.isArray(a) ? a : [a];
    if (arr.length > 0) hit++;
  }
  return { hit, total: musts.length };
}

const STATUS_COLORS = {
  new:         { bg:"rgba(246,4,183,0.1)",   text:"#f604b7" },
  shortlisted: { bg:"rgba(80,200,120,0.1)",  text:"#50c878" },
  interview:   { bg:"rgba(100,150,255,0.1)", text:"#6699ff" },
  rejected:    { bg:"rgba(255,100,100,0.09)",text:"#ff6060" },
};
const JOB_STATUS_COLORS = {
  open:     { bg:"rgba(80,200,120,0.1)",  text:"#50c878" },
  drafting: { bg:"rgba(246,4,183,0.1)",   text:"#f604b7" },
  closed:   { bg:"rgba(136,136,136,0.15)",text:"#888" },
};

// ── Shared atoms ──────────────────────────────────────────────
function Tag({ children, accent, small }) {
  return (
    <span style={{
      display:"inline-block", padding: small?"2px 8px":"3px 11px",
      borderRadius:99, fontSize: small?10:11,
      fontFamily:"'DM Sans',sans-serif", fontWeight:500, letterSpacing:"0.03em",
      background: accent ? T.pink : "rgba(255,255,255,0.06)",
      color: accent ? T.white : T.mutedL,
      border: accent ? "none" : `1px solid ${T.border}`, whiteSpace:"nowrap",
    }}>{children}</span>
  );
}

function StatusBadge({ status, colors }) {
  const s = colors[status] || colors[Object.keys(colors)[0]];
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11,
      fontFamily:"'DM Sans',sans-serif", fontWeight:500,
      background:s.bg, color:s.text, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button className="pill-btn" onClick={onClick} style={{
      padding:"6px 14px", borderRadius:99, cursor:"pointer",
      border: active ? `1.5px solid ${T.pink}` : `1px solid ${T.border}`,
      background: active ? T.pinkDim : "transparent",
      color: active ? T.pink : T.muted,
      fontFamily:"'DM Sans',sans-serif", fontSize:12,
      fontWeight: active ? 500 : 400, whiteSpace:"nowrap",
    }}>{label}</button>
  );
}

function BtnPink({ children, onClick, disabled, outline, full, small, style:sx={} }) {
  return (
    <button className="btn-pink" onClick={onClick} disabled={disabled} style={{
      padding: small ? "8px 16px" : "12px 20px",
      borderRadius:10, cursor:disabled?"not-allowed":"pointer",
      border: outline ? `1.5px solid ${T.pink}` : "none",
      background: outline ? "transparent" : (disabled ? "#2a2a2a" : T.pink),
      color: outline ? T.pink : (disabled ? T.muted : T.white),
      fontFamily:"'Afacad Flux',sans-serif", fontWeight:600,
      fontSize: small ? 13 : 15,
      width: full ? "100%" : "auto", ...sx,
    }}>{children}</button>
  );
}

function Input({ label, value, onChange, placeholder, multiline, required }) {
  const s = {
    width:"100%", padding:"10px 12px", borderRadius:9,
    background:"#181818", border:`1px solid ${T.border}`,
    color:T.white, fontFamily:"'DM Sans',sans-serif", fontSize:14,
    outline:"none", display:"block",
  };
  return (
    <div>
      {label && <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:T.muted, display:"block", marginBottom:5 }}>
        {label}{required && <span style={{color:T.pink}}> *</span>}
      </label>}
      {multiline
        ? <textarea rows={3} value={value} onChange={onChange} placeholder={placeholder||""} style={{ ...s, resize:"vertical" }}/>
        : <input value={value} onChange={onChange} placeholder={placeholder||""} style={s}/>
      }
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:T.muted, display:"block", marginBottom:5 }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        width:"100%", padding:"10px 12px", borderRadius:9,
        background:"#181818", border:`1px solid ${T.border}`,
        color: value ? T.white : T.muted,
        fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none",
      }}>
        <option value="">Select…</option>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Logo ──────────────────────────────────────────────────────
function Logo({ height=28, linkToMain=false }) {
  const inner = (
    <img
      src={LOGO_URL}
      alt="Laminar"
      style={{ height, width:"auto", display:"block", objectFit:"contain" }}
    />
  );
  if (linkToMain) return (
    <a href={CONFIG.mainPageUrl} style={{ display:"inline-block", lineHeight:0 }}>
      {inner}
    </a>
  );
  return inner;
}

// ── Nav ───────────────────────────────────────────────────────
function Nav({ onRecruiter, showBack, onBack }) {
  return (
    <nav style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"16px 24px",
      borderBottom:`1px solid ${T.border}`,
      position:"sticky", top:0, zIndex:200,
      background:"rgba(17,17,17,0.95)",
      backdropFilter:"blur(14px)",
    }}>
      <Logo height={CONFIG.logoHeight} linkToMain={true}/>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        {showBack
          ? <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.mutedL, padding:"7px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>
              ← Jobs
            </button>
          : <>
              <a href="#" className="nav-links" style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.muted, textDecoration:"none" }}>About</a>
              <a href="#" className="nav-links" style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.muted, textDecoration:"none" }}>Services</a>
              {onRecruiter && <button onClick={onRecruiter} style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.mutedL, padding:"7px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>
                Recruiter ↗
              </button>}
            </>
        }
      </div>
    </nav>
  );
}

// ── Dropdown filter ───────────────────────────────────────────
function DropFilter({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) { if(ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = value !== "All";
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"8px 14px", borderRadius:99, cursor:"pointer",
        border: active ? `1.5px solid ${T.pink}` : `1px solid ${T.border}`,
        background: active ? T.pinkDim : T.surf,
        color: active ? T.pink : T.mutedL,
        fontFamily:"'DM Sans',sans-serif", fontSize:13,
        fontWeight: active ? 500 : 400, whiteSpace:"nowrap",
      }}>
        {active ? value : label}
        <span style={{ fontSize:10, opacity:0.7 }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:300,
          background:T.surf, border:`1px solid ${T.border}`,
          borderRadius:12, overflow:"hidden", minWidth:160,
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
          animation:"fadeIn 0.12s ease",
        }}>
          {["All",...options].map(opt => (
            <button key={opt} onClick={()=>{ onChange(opt); setOpen(false); }} style={{
              display:"block", width:"100%", textAlign:"left",
              padding:"10px 14px", background: opt===value ? T.pinkDim : "transparent",
              color: opt===value ? T.pink : T.mutedL,
              border:"none", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", fontSize:13,
              borderBottom:`1px solid ${T.border}`,
            }}>
              {opt === "All" ? `All ${label.toLowerCase()}s` : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Job card (vertical list) ──────────────────────────────────
function JobCard({ job, onClick }) {
  return (
    <div className="job-card" onClick={() => onClick(job)} style={{
      background:T.card, border:`1px solid ${T.border}`,
      borderRadius:16, padding:"24px",
      cursor:"pointer", display:"flex", flexDirection:"column", gap:14,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontWeight:700, fontSize:"clamp(17px,3vw,21px)", color:T.white, lineHeight:1.2 }}>
            {job.title}
          </div>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontSize:14, color:T.pink, marginTop:3 }}>
            {job.team}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <Tag small>{job.location}</Tag>
          <Tag small>{job.remote}</Tag>
          <Tag small accent>{job.type}</Tag>
        </div>
      </div>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.muted, lineHeight:1.65, margin:0 }}>
        {job.description.slice(0,130)}…
      </p>
      <div style={{ display:"flex", alignItems:"center", gap:6, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.pink, fontWeight:500 }}>
        Apply now
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke={T.pink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

// ── Job detail page ───────────────────────────────────────────
function JobDetail({ job, onApply, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.white }}>
      <Nav showBack onBack={onBack}/>
      <div style={{
        maxWidth:720, margin:"0 auto", padding:"clamp(32px,6vw,64px) 24px",
        animation:"fadeUp 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:T.pink, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:16 }}>
          Open position
        </div>
        <h1 style={{ fontFamily:"'Afacad Flux',sans-serif", fontWeight:800, fontSize:"clamp(28px,5vw,48px)", lineHeight:1.08, color:T.white, marginBottom:6 }}>
          {job.title}
        </h1>
        <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontSize:18, color:T.pink, marginBottom:20 }}>
          {job.team}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:32 }}>
          <Tag>{job.team}</Tag>
          <Tag>{job.location}</Tag>
          <Tag>{job.remote}</Tag>
          <Tag>{job.seniority}</Tag>
          <Tag accent>{job.type}</Tag>
        </div>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, color:T.mutedL, lineHeight:1.75, marginBottom:36 }}>
          {job.description}
        </p>
        <BtnPink onClick={onApply} full>
          Apply for this position
        </BtnPink>
      </div>
    </div>
  );
}

// ── Application modal (bottom sheet) ─────────────────────────
function ApplyModal({ job, onClose, onSubmit }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [linkedin, setLinkedin] = useState("");
  const [file, setFile]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag]       = useState(false);
  const fileRef               = useRef();

  function setAns(id, val) { setAnswers(p=>({...p,[id]:val})); }
  function toggleArr(id, v) {
    setAnswers(p=>{
      const cur = p[id]||[];
      return {...p,[id]:cur.includes(v)?cur.filter(x=>x!==v):[...cur,v]};
    });
  }

  const allAnswered = job.questions.every(q => {
    const a = answers[q.id];
    if(q.type==="multicheck") return (a||[]).length>0;
    return !!a;
  });

  function handleDrop(e) { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) setFile(f); }

  async function handleSubmit() {
    if(!file) { setErr("Please attach your CV."); return; }
    setSubmitting(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("job_id", String(job.id));
      fd.append("answers", JSON.stringify(answers||{}));
      fd.append("linkedin", linkedin||"");
      fd.append("name", "");
      fd.append("cv", file);

      const res = await fetch(`${API_BASE}/apply`, { method:"POST", body: fd });
      if(!res.ok) throw new Error("apply_failed");

      onSubmit && onSubmit({ jobId:job.id, answers, linkedin, file });
      setStep(2);
    } catch(e) {
      setErr("Couldn’t submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:900,
      background:"rgba(0,0,0,0.78)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      animation:"fadeIn 0.18s",
    }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{
        background:T.surf, border:`1px solid ${T.border}`,
        borderRadius:"20px 20px 0 0",
        width:"100%", maxWidth:580,
        maxHeight:"94vh", overflowY:"auto",
        padding:"28px 22px 40px",
        animation:"fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width:36,height:4,background:T.border,borderRadius:99,margin:"0 auto 22px" }}/>
        <button onClick={onClose} style={{ position:"absolute",top:18,right:18,background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:24,lineHeight:1 }}>×</button>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontWeight:700, fontSize:21, color:T.white }}>{job.title}</div>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontSize:14, color:T.pink, marginTop:2 }}>{job.team}</div>
          <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
            <Tag small>{job.location}</Tag><Tag small>{job.remote}</Tag><Tag small>{job.seniority}</Tag>
          </div>
        </div>

        {/* Progress */}
        {step < 2 && (
          <div style={{ display:"flex", gap:6, marginBottom:22, alignItems:"center" }}>
            {["Questions","CV upload"].map((s,i)=>(
              <div key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:i===step?24:8, height:8, borderRadius:99, background:i<=step?T.pink:T.border, transition:"all 0.3s" }}/>
                {i===step && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:T.pink, letterSpacing:"0.07em", textTransform:"uppercase" }}>{s}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Step 0: Questions */}
        {step===0 && (
          <>
            {job.criteria?.length > 0 && (
              <div style={{ background:"rgba(246,4,183,0.05)", border:`1px solid rgba(246,4,183,0.18)`, borderRadius:10, padding:"11px 13px", marginBottom:20 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:T.pink, fontWeight:500, marginBottom:5 }}>
                  All applications are reviewed — answers help us match you to the right opportunity
                </div>
                {job.criteria.map((c,i)=>(
                  <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:T.mutedL, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{color:T.border}}>·</span> {c.label}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {job.questions.map(q=>(
                <div key={q.id}>
                  <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.mutedL, display:"block", marginBottom:8 }}>
                    {q.label} {q.isMust && <span style={{color:T.pink,fontSize:11}}>(required)</span>}
                  </label>
                  {q.type==="select" && (
                    <select value={answers[q.id]||""} onChange={e=>setAns(q.id,e.target.value)} style={{
                      width:"100%", padding:"11px 12px", borderRadius:9,
                      background:"#181818", border:`1px solid ${T.border}`,
                      color:answers[q.id]?T.white:T.muted,
                      fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none",
                    }}>
                      <option value="">Select…</option>
                      {q.options.map(o=><option key={o}>{o}</option>)}
                    </select>
                  )}
                  {q.type==="multicheck" && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {q.options.map(o=>{
                        const sel=(answers[q.id]||[]).includes(o);
                        return <button key={o} onClick={()=>toggleArr(q.id,o)} style={{
                          padding:"7px 13px", borderRadius:99, cursor:"pointer",
                          border:`1.5px solid ${sel?T.pink:T.border}`,
                          background:sel?T.pinkDim:"transparent",
                          color:sel?T.pink:T.mutedL,
                          fontFamily:"'DM Sans',sans-serif", fontSize:13,
                          transition:"all 0.14s",
                        }}>{o}</button>;
                      })}
                    </div>
                  )}
                </div>
              ))}
              {/* LinkedIn */}
              <div>
                <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.mutedL, display:"block", marginBottom:8 }}>
                  LinkedIn profile URL <span style={{color:T.muted,fontSize:11}}>(optional)</span>
                </label>
                <input value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" style={{
                  width:"100%", padding:"11px 12px", borderRadius:9,
                  background:"#181818", border:`1px solid ${T.border}`,
                  color:T.white, fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none",
                }}/>
              </div>
            </div>
            <div style={{ marginTop:24 }}>
              <BtnPink disabled={!allAnswered} onClick={()=>setStep(1)} full>Continue →</BtnPink>
              {!allAnswered && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:T.muted, textAlign:"center", marginTop:7 }}>Please answer all questions to continue</p>}
            </div>
          </>
        )}

        {/* Step 1: CV */}
        {step===1 && (
          <>
            <div
              onClick={()=>fileRef.current.click()}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={handleDrop}
              style={{
                border:`2px dashed ${drag?T.pink:file?T.pink:T.border}`,
                borderRadius:14, padding:"42px 20px",
                textAlign:"center", cursor:"pointer",
                background:file||drag?"rgba(246,4,183,0.04)":"transparent",
                transition:"all 0.2s",
              }}>
              <div style={{ fontSize:36, marginBottom:10 }}>{file?"✓":"📄"}</div>
              <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontWeight:600, fontSize:16, color:file?T.pink:T.white }}>
                {file ? file.name : "Tap or drag your CV here"}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:T.muted, marginTop:5 }}>PDF or DOCX · max 5 MB</div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
            </div>
            <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:10 }}>
              {err && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#ff6060" }}>{err}</div>}
              <BtnPink disabled={!file || submitting} onClick={handleSubmit} full>{submitting ? "Submitting…" : "Submit application"}</BtnPink>
              <BtnPink outline onClick={()=>setStep(0)} full>← Back</BtnPink>
            </div>
          </>
        )}

        {/* Step 2: Done */}
        {step===2 && (
          <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
            <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(246,4,183,0.1)",border:`1.5px solid ${T.pink}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:24,animation:"pinkPulse 2s infinite" }}>✓</div>
            <div style={{ fontFamily:"'Afacad Flux',sans-serif", fontWeight:700, fontSize:24, color:T.white, marginBottom:10 }}>Application received</div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:T.muted, lineHeight:1.7, maxWidth:320, margin:"0 auto 22px" }}>
              Thank you for applying to <strong style={{color:T.white}}>{job.title} – {job.team}</strong>. Our team will be in touch.
            </p>
            <BtnPink onClick={onClose} sx={{ maxWidth:180, margin:"0 auto" }}>Close</BtnPink>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add/Edit job modal ────────────────────────────────────────
function JobFormModal({ initial, onClose, onSave }) {
  const blank = { title:"",team:"Retail",location:"Madrid",remote:"Hybrid",seniority:"Senior",type:"Full-time",description:"",status:"drafting",questions:[],criteria:[] };
  const [form, setForm] = useState(initial ? {...initial} : blank);
  const [qForm, setQF]  = useState({ label:"", type:"select", options:"", isMust:false });
  const [cForm, setCF]  = useState({ questionId:"", label:"", matchValues:"" });

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  function addQ() {
    if(!qForm.label||!qForm.options) return;
    const opts = qForm.options.split(",").map(s=>s.trim()).filter(Boolean);
    const id = "q"+(form.questions.length+1);
    set("questions",[...form.questions,{ id, label:qForm.label, type:qForm.type, options:opts, isMust:qForm.isMust }]);
    setQF({ label:"", type:"select", options:"", isMust:false });
  }
  function removeQ(id) { set("questions",form.questions.filter(q=>q.id!==id)); set("criteria",form.criteria.filter(c=>c.questionId!==id)); }
  function addC() {
    if(!cForm.questionId||!cForm.label||!cForm.matchValues) return;
    const vals = cForm.matchValues.split(",").map(s=>s.trim()).filter(Boolean);
    set("criteria",[...form.criteria,{ questionId:cForm.questionId, label:cForm.label, matchValues:vals }]);
    setCF({ questionId:"", label:"", matchValues:"" });
  }
  function removeC(i) { set("criteria",form.criteria.filter((_,j)=>j!==i)); }

  const valid = form.title && form.description && form.questions.length>0;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.15s" }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:T.surf,border:`1px solid ${T.border}`,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:600,maxHeight:"95vh",overflowY:"auto",padding:"28px 22px 48px",animation:"fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ width:36,height:4,background:T.border,borderRadius:99,margin:"0 auto 22px" }}/>
        <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:700,fontSize:21,color:T.white,marginBottom:22 }}>
          {initial?"Edit position":"New position"}
        </div>

        {/* Basic */}
        <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:24 }}>
          <Input label="Job title *" value={form.title} onChange={e=>set("title",e.target.value)} required/>
          <Input label="Description *" value={form.description} onChange={e=>set("description",e.target.value)} multiline required/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <SelectField label="Team" value={form.team} onChange={e=>set("team",e.target.value)} options={TEAMS}/>
            <SelectField label="Location" value={form.location} onChange={e=>set("location",e.target.value)} options={LOCS}/>
            <SelectField label="Mode" value={form.remote} onChange={e=>set("remote",e.target.value)} options={REMOTES}/>
            <SelectField label="Seniority" value={form.seniority} onChange={e=>set("seniority",e.target.value)} options={SENS}/>
            <SelectField label="Type" value={form.type} onChange={e=>set("type",e.target.value)} options={TYPES}/>
            <SelectField label="Status" value={form.status} onChange={e=>set("status",e.target.value)} options={JOB_STATUSES}/>
          </div>
        </div>

        {/* Questions */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:16,color:T.white,marginBottom:12 }}>Screening questions</div>
          {form.questions.map(q=>(
            <div key={q.id} style={{ background:"#181818",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10 }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:T.white,fontWeight:500 }}>{q.label}</span>
                  {q.isMust && <span style={{ fontSize:10,background:"rgba(246,4,183,0.1)",color:T.pink,padding:"1px 7px",borderRadius:99 }}>must</span>}
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted,marginTop:2 }}>{q.type} · {q.options.join(", ")}</div>
              </div>
              <button onClick={()=>removeQ(q.id)} style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:18,lineHeight:1,flexShrink:0 }}>×</button>
            </div>
          ))}
          <div style={{ background:"#161616",border:`1px dashed ${T.border}`,borderRadius:10,padding:14,marginTop:8 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted,marginBottom:10 }}>Add question</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <Input value={qForm.label} onChange={e=>setQF(p=>({...p,label:e.target.value}))} placeholder="Question text"/>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                <SelectField value={qForm.type} onChange={e=>setQF(p=>({...p,type:e.target.value}))} options={["select","multicheck"]}/>
                <Input value={qForm.options} onChange={e=>setQF(p=>({...p,options:e.target.value}))} placeholder="Options, comma-separated"/>
              </div>
              <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:T.mutedL }}>
                <input type="checkbox" checked={qForm.isMust} onChange={e=>setQF(p=>({...p,isMust:e.target.checked}))} style={{ accentColor:T.pink }}/>
                Mark as must-have (shown in recruiter filters)
              </label>
              <button onClick={addQ} style={{ padding:"8px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.mutedL,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13 }}>
                + Add question
              </button>
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div style={{ marginBottom:26 }}>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:16,color:T.white,marginBottom:6 }}>
            Ideal criteria <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted,fontWeight:400 }}>— for scoring only, never filters applicants</span>
          </div>
          {form.criteria.map((c,i)=>(
            <div key={i} style={{ background:"#181818",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10 }}>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:T.white }}>{c.label}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted,marginTop:2 }}>Q:{c.questionId} · {c.matchValues.join(", ")}</div>
              </div>
              <button onClick={()=>removeC(i)} style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:18 }}>×</button>
            </div>
          ))}
          {form.questions.length>0 && (
            <div style={{ background:"#161616",border:`1px dashed ${T.border}`,borderRadius:10,padding:14,marginTop:8 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted,marginBottom:10 }}>Add criterion</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <SelectField value={cForm.questionId} onChange={e=>setCF(p=>({...p,questionId:e.target.value}))} options={form.questions.map(q=>q.id)}/>
                <Input value={cForm.label} onChange={e=>setCF(p=>({...p,label:e.target.value}))} placeholder='e.g. "Min. 3 years experience"'/>
                <Input value={cForm.matchValues} onChange={e=>setCF(p=>({...p,matchValues:e.target.value}))} placeholder="Matching values, comma-separated"/>
                <button onClick={addC} style={{ padding:"8px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.mutedL,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13 }}>+ Add criterion</button>
              </div>
            </div>
          )}
        </div>

        <BtnPink disabled={!valid} onClick={()=>{onSave(form);onClose();}} full>
          {initial?"Save changes":"Create position"}
        </BtnPink>
        {!valid && <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted,textAlign:"center",marginTop:8 }}>Title, description and at least one question required</p>}
      </div>
    </div>
  );
}

// ── Applicant detail modal ────────────────────────────────────
function ApplicantModal({ applicant, job, onClose, onStatusChange }) {
  const score = computeScore(job, applicant.answers);
  const ms = mustScore(job, applicant.answers);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn 0.15s" }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:T.surf,border:`1px solid ${T.border}`,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"86vh",overflowY:"auto",padding:"28px 24px 32px",position:"relative",animation:"fadeUp 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
        <button onClick={onClose} style={{ position:"absolute",top:18,right:18,background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:24 }}>×</button>

        <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:700,fontSize:22,color:T.white }}>{applicant.name}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:T.pink,marginTop:2 }}>{job.title} – {job.team}</div>

        <div style={{ display:"flex",gap:8,marginTop:14,flexWrap:"wrap",alignItems:"center" }}>
          <StatusBadge status={applicant.status} colors={STATUS_COLORS}/>
          {score!==null && <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:score===100?"#50c878":score>=50?T.pink:"#ff9944" }}>{score}% match</span>}
          {ms && <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:ms.hit===ms.total?"#50c878":T.pink }}>{ms.hit}/{ms.total} must-haves</span>}
          {applicant.linkedin && (
            <a href={applicant.linkedin} target="_blank" rel="noreferrer" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#6699ff",textDecoration:"none" }}>
              LinkedIn ↗
            </a>
          )}
        </div>

        <div style={{ marginTop:22, display:"flex",flexDirection:"column",gap:14 }}>
          {job.questions.map(q=>{
            const a = applicant.answers[q.id];
            const val = Array.isArray(a) ? a.join(", ") : a;
            return (
              <div key={q.id} style={{ background:"#191919",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px" }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted,marginBottom:4,display:"flex",alignItems:"center",gap:6 }}>
                  {q.label}
                  {q.isMust && <span style={{ fontSize:10,background:"rgba(246,4,183,0.1)",color:T.pink,padding:"1px 6px",borderRadius:99 }}>must</span>}
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:T.white }}>{val || <span style={{color:T.border}}>—</span>}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:20 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted,marginBottom:8 }}>Change status</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {["new","shortlisted","interview","rejected"].map(s=>(
              <button key={s} onClick={()=>onStatusChange(applicant.id,s)} style={{
                padding:"6px 13px",borderRadius:99,cursor:"pointer",
                border:`1.5px solid ${applicant.status===s?T.pink:T.border}`,
                background:applicant.status===s?T.pinkDim:"transparent",
                color:applicant.status===s?T.pink:T.mutedL,
                fontFamily:"'DM Sans',sans-serif",fontSize:12,
                transition:"all 0.14s",
              }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recruiter dashboard ───────────────────────────────────────
function Dashboard({ jobs, setJobs, applicants: initApps, onBack }) {
  const [apps, setApps]       = useState(initApps);
  const [sortK, setSortK]     = useState("date");
  const [sortD, setSortD]     = useState("desc");
  const [fDept, setFDept]     = useState("All");
  const [fJob, setFJob]       = useState("All");
  const [fStat, setFStat]     = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [selApp, setSelApp]   = useState(null);
  const [pwd, setPwd]         = useState(getRecruiterPassword());

  async function loadApplicants(pwdArg) {
    const auth = recruiterAuthHeader(pwdArg);
    const data = await apiJson("/applicants", { headers: { Authorization: auth } });
    setApps(data.map(a=>({
      id: a.id,
      jobId: a.job_id,
      name: a.name || "—",
      linkedin: a.linkedin || "",
      status: a.status || "new",
      date: (a.applied_at || "").slice(0,10) || "",
      answers: a.answers || {},
      parsedCv: a.parsed_cv || null,
      cvPath: a.cv_path || "",
    })));
  }

  useEffect(()=>{
    let cur = pwd || getRecruiterPassword();
    if(!cur) cur = window.prompt("Recruiter password") || "";
    setPwd(cur);
    setRecruiterPassword(cur);
    loadApplicants(cur).catch((e)=>{
      if(e?.status === 401) {
        setRecruiterPassword("");
        setPwd("");
        alert("Wrong password.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function tSort(k) {
    if(sortK===k) setSortD(d=>d==="asc"?"desc":"asc");
    else { setSortK(k); setSortD("desc"); }
  }

  async function addJob(form) {
    const cur = pwd || getRecruiterPassword();
    const auth = recruiterAuthHeader(cur);
    const resp = await apiJson("/jobs", { method:"POST", headers:{ Authorization: auth }, body: form });
    setJobs(p=>[...p,{ ...form, id: resp.id }]);
  }

  async function updateJob(form) {
    const cur = pwd || getRecruiterPassword();
    const auth = recruiterAuthHeader(cur);
    await apiJson(`/jobs/${form.id}`, { method:"PATCH", headers:{ Authorization: auth }, body: form });
    setJobs(p=>p.map(j=>j.id===form.id?form:j));
  }

  async function changeAppStatus(appId, status) {
    const cur = pwd || getRecruiterPassword();
    const auth = recruiterAuthHeader(cur);
    await apiJson(`/applicants/${appId}/status`, { method:"PATCH", headers:{ Authorization: auth }, body: { status } });
    setApps(p=>p.map(a=>a.id===appId?{...a,status}:a));
    if(selApp?.id===appId) setSelApp(p=>({...p,status}));
  }

  function rejectApp(appId) {
    changeAppStatus(appId, "rejected");
  }

  const jobMap = Object.fromEntries(jobs.map(j=>[j.id,j]));
  const appCount = id => apps.filter(a=>a.jobId===id).length;

  const rows = apps
    .filter(a => fJob==="All" || String(a.jobId)===fJob)
    .filter(a => fStat==="All" || a.status===fStat)
    .filter(a => {
      if(fDept==="All") return true;
      const j = jobMap[a.jobId];
      return j?.team===fDept;
    })
    .sort((a,b)=>{
      const av=a[sortK], bv=b[sortK];
      if(typeof av==="string") return sortD==="asc"?av.localeCompare(bv):bv.localeCompare(av);
      return sortD==="asc"?av-bv:bv-av;
    });

  const Th = ({k,children}) => (
    <th onClick={()=>tSort(k)} style={{ padding:"11px 14px",textAlign:"left",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif",fontSize:10,color:T.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}` }}>
      {children}
      <span style={{ color:sortK===k?T.pink:T.border,marginLeft:4,fontSize:9 }}>
        {sortK===k?(sortD==="asc"?"↑":"↓"):"↕"}
      </span>
    </th>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e" }}>
      {showAdd && <JobFormModal onClose={()=>setShowAdd(false)} onSave={addJob}/>}
      {editJob && <JobFormModal initial={editJob} onClose={()=>setEditJob(null)} onSave={f=>{ updateJob(f); setEditJob(null); }}/>}
      {selApp && <ApplicantModal applicant={selApp} job={jobMap[selApp.jobId]} onClose={()=>setSelApp(null)} onStatusChange={changeAppStatus}/>}

      {/* Nav */}
      <div style={{ background:T.surf,borderBottom:`1px solid ${T.border}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo height={72}/>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span className="desktop-only" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted }}>Recruiter dashboard</span>
          <button onClick={onBack} style={{ background:"transparent",border:`1px solid ${T.border}`,color:T.mutedL,padding:"6px 13px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12 }}>← Jobs</button>
        </div>
      </div>

      <div style={{ padding:"24px 20px" }}>
        {/* Positions header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:19,color:T.white }}>
            Open positions ({jobs.filter(j=>j.status==="open").length})
          </div>
          <button onClick={()=>setShowAdd(true)} style={{ background:T.pink,border:"none",color:T.white,padding:"9px 16px",borderRadius:9,cursor:"pointer",fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
            + Add position
          </button>
        </div>

        {/* Dept filter above positions */}
        <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:14 }}>
          <Pill label="All teams" active={fDept==="All"} onClick={()=>setFDept("All")}/>
          {TEAMS.map(t=><Pill key={t} label={t} active={fDept===t} onClick={()=>setFDept(t)}/>)}
        </div>

        {/* Position cards — clickable filter */}
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:28 }}>
          {jobs.filter(j=>fDept==="All"||j.team===fDept).map(j=>(
            <div key={j.id}
              onClick={()=>setFJob(p=>String(p)===String(j.id)?"All":String(j.id))}
              style={{
                background: String(fJob)===String(j.id) ? T.pinkDim : T.card,
                border:`1px solid ${String(fJob)===String(j.id)?T.pink:T.border}`,
                borderRadius:12, padding:"12px 14px", cursor:"pointer",
                transition:"all 0.15s", minWidth:180,
              }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                <div>
                  <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontSize:14,fontWeight:600,color:T.white }}>{j.title}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.pink,marginTop:2 }}>{j.team}</div>
                </div>
                <StatusBadge status={j.status} colors={JOB_STATUS_COLORS}/>
              </div>
              <div style={{ display:"flex",gap:6,marginTop:8,alignItems:"center",flexWrap:"wrap" }}>
                <Tag small>{j.location}</Tag>
                <Tag small accent>{j.type}</Tag>
                <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted }}>{appCount(j.id)} applicant{appCount(j.id)!==1?"s":""}</span>
                <button onClick={e=>{e.stopPropagation();setEditJob(j);}} style={{ marginLeft:"auto",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,padding:"2px 9px",borderRadius:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11 }}>Edit</button>
              </div>
            </div>
          ))}
        </div>

        {/* Applicants */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:19,color:T.white }}>
            Applicants ({rows.length})
          </div>
        </div>

        {/* Status filters */}
        <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:16 }}>
          {["All","new","shortlisted","interview","rejected"].map(s=>(
            <Pill key={s} label={s==="All"?"All status":s} active={fStat===s} onClick={()=>setFStat(s)}/>
          ))}
        </div>

        {/* Desktop table */}
        <div className="desktop-only" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead><tr style={{ background:T.surf }}>
              <Th k="name">Candidate</Th>
              <Th k="jobId">Position</Th>
              <Th k="date">Applied</Th>
              <Th k="status">Status</Th>
              <th style={{ padding:"11px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:10,color:T.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}`,textAlign:"left" }}>Match</th>
              <th style={{ padding:"11px 14px",borderBottom:`1px solid ${T.border}` }}/>
            </tr></thead>
            <tbody>
              {rows.map((a,i)=>{
                const j=jobMap[a.jobId];
                const score=j?computeScore(j,a.answers):null;
                const ms=j?mustScore(j,a.answers):null;
                return (
                  <tr key={a.id} className="tr-hover" onClick={()=>setSelApp(a)} style={{ borderBottom:i<rows.length-1?`1px solid ${T.border}`:"none" }}>
                    <td style={{ padding:"13px 14px" }}>
                      <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:14,color:T.white }}>{a.name}</div>
                    </td>
                    <td style={{ padding:"13px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:T.mutedL }}>{j?.title}</td>
                    <td style={{ padding:"13px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.muted }}>{a.date}</td>
                    <td style={{ padding:"13px 14px" }}><StatusBadge status={a.status} colors={STATUS_COLORS}/></td>
                    <td style={{ padding:"13px 14px" }}>
                      {score!==null&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:score===100?"#50c878":score>=50?T.pink:"#ff9944",marginRight:8 }}>{score}%</span>}
                      {ms&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:ms.hit===ms.total?"#50c878":T.muted }}>{ms.hit}/{ms.total} ✓</span>}
                    </td>
                    <td style={{ padding:"13px 14px" }} onClick={e=>e.stopPropagation()}>
                      {a.status!=="rejected" && (
                        <button onClick={()=>rejectApp(a.id)} style={{ padding:"4px 10px",borderRadius:7,border:`1px solid rgba(255,100,100,0.3)`,background:"transparent",color:"#ff6060",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,whiteSpace:"nowrap" }}>
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-only" style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {rows.map(a=>{
            const j=jobMap[a.jobId];
            const score=j?computeScore(j,a.answers):null;
            const ms=j?mustScore(j,a.answers):null;
            return (
              <div key={a.id} onClick={()=>setSelApp(a)} style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",cursor:"pointer" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:600,fontSize:15,color:T.white }}>{a.name}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:T.pink,marginTop:2 }}>{j?.title}</div>
                  </div>
                  <StatusBadge status={a.status} colors={STATUS_COLORS}/>
                </div>
                <div style={{ display:"flex",gap:10,marginTop:10,alignItems:"center" }}>
                  {score!==null&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:score===100?"#50c878":score>=50?T.pink:"#ff9944" }}>{score}%</span>}
                  {ms&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:ms.hit===ms.total?"#50c878":T.muted }}>{ms.hit}/{ms.total} must</span>}
                  <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.muted,marginLeft:"auto" }}>{a.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView]       = useState("board"); // board | detail | dashboard
  const [jobs, setJobs]       = useState([]);
  const [apps, setApps]       = useState([]);
  const [selJob, setSelJob]   = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [deptF, setDeptF]     = useState("All");
  const [locF, setLocF]       = useState("All");
  const [senF, setSenF]       = useState("All");
  const [mounted, setMtd]     = useState(false);

  useEffect(()=>{ const t=setTimeout(()=>setMtd(true),80); return()=>clearTimeout(t); },[]);
  useEffect(()=>{
    apiJson("/jobs").then(setJobs).catch(()=>{ setJobs(INIT_JOBS); });
  },[]);

  function addApp(data) {
    const score = computeScore(jobs.find(j=>j.id===data.jobId), data.answers);
    setApps(p=>[...p,{
      id: Date.now(), jobId:data.jobId,
      name:"New Applicant",
      linkedin: data.linkedin||"",
      status:"new",
      date: new Date().toISOString().slice(0,10),
      answers: data.answers,
    }]);
  }

  const openJobs = jobs.filter(j=>j.status==="open");
  const filtered = openJobs.filter(j=>
    (deptF==="All"||j.team===deptF) &&
    (locF==="All" ||j.location===locF) &&
    (senF==="All" ||j.seniority===senF)
  );

  if(view==="dashboard") return (
    <Dashboard
      jobs={jobs} setJobs={setJobs}
      applicants={apps}
      onBack={()=>setView("board")}
    />
  );

  if(view==="detail" && selJob) return (
    <>
      {applyJob && <ApplyModal job={applyJob} onClose={()=>setApplyJob(null)} onSubmit={addApp}/>}
      <JobDetail job={selJob} onApply={()=>setApplyJob(selJob)} onBack={()=>{ setView("board"); setSelJob(null); }}/>
    </>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.white }}>
      {applyJob && <ApplyModal job={applyJob} onClose={()=>setApplyJob(null)} onSubmit={addApp}/>}

      <Nav onRecruiter={()=>setView("dashboard")}/>

      {/* Hero */}
      <div style={{
        padding:"clamp(40px,8vw,80px) 24px clamp(28px,4vw,48px)",
        opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(18px)",
        transition:"all 0.6s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ fontSize:11,fontFamily:"'DM Sans',sans-serif",color:T.pink,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:14 }}>
          We're hiring
        </div>
        <h1 style={{ fontFamily:"'Afacad Flux',sans-serif",fontWeight:800,fontSize:"clamp(30px,6vw,60px)",lineHeight:1.06,margin:"0 0 14px",color:T.white }}>
          Shape the future<br/>
          <span style={{ color:T.pink }}>of financial infrastructure.</span>
        </h1>
        <p style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:"clamp(14px,2vw,17px)",color:T.muted,maxWidth:520,lineHeight:1.72,margin:0 }}>
          Boutique fintech consultancy at the intersection of data, distributed ledger technology, and payments.
        </p>
      </div>

      {/* Filters (dropdown style) */}
      <div style={{
        padding:"0 24px 20px",
        opacity:mounted?1:0, transition:"opacity 0.5s 0.15s",
        display:"flex", gap:8, flexWrap:"wrap",
      }}>
        <DropFilter label="Department" options={TEAMS} value={deptF} onChange={setDeptF}/>
        <DropFilter label="Location"   options={LOCS}  value={locF}  onChange={setLocF}/>
        <DropFilter label="Level"      options={SENS}  value={senF}  onChange={setSenF}/>
      </div>

      {/* Vertical job list */}
      <div style={{
        padding:"0 24px clamp(48px,8vw,80px)",
        opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(10px)",
        transition:"all 0.6s 0.2s cubic-bezier(0.22,1,0.36,1)",
        maxWidth:800, display:"flex", flexDirection:"column", gap:14,
      }}>
        {filtered.length===0
          ? <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:T.muted,padding:"32px 0" }}>No positions match the selected filters.</div>
          : filtered.map(j=>(
              <JobCard key={j.id} job={j} onClick={job=>{ setSelJob(job); setView("detail"); }}/>
            ))
        }
        <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.border,marginTop:4 }}>
          {filtered.length} open position{filtered.length!==1?"s":""}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${T.border}`,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
        <Logo height={60}/>
        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:T.border }}>© 2025 Laminar · All rights reserved</span>
      </div>
    </div>
  );
}

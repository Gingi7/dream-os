import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg:      "#08090E",
  surface: "#0F1018",
  card:    "#13141F",
  border:  "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  text:    "#EEEEF5",
  muted:   "#5A5B72",
  faint:   "#2A2B3D",
  // accents
  amber:   "#F5A623",
  emerald: "#2DD8A3",
  coral:   "#FF5F6D",
  sky:     "#38BDF8",
  violet:  "#8B5CF6",
  rose:    "#F472B6",
};

const CAT_COLOR = {
  "Zdrowie":   T.emerald,
  "Kariera":   T.sky,
  "Finanse":   T.amber,
  "Relacje":   T.rose,
  "Rozwój":    T.violet,
  "Duchowość": "#A78BFA",
  "Biznes":    T.coral,
};

const TYPE_LABEL = { wynikowy:"Wynikowy", procesowy:"Procesowy", nawykowy:"Nawykowy" };
const PRIO_LABEL = { must:"Must", important:"Ważny", optional:"Opcjonalny" };
const PRIO_COLOR = { must: T.coral, important: T.amber, optional: T.muted };
const HORIZON_LABEL = { "7d":"7 dni","30d":"30 dni","90d":"90 dni","1y":"1 rok","3y":"3 lata" };

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const SEED = [
  {
    id: "g1",
    dream: "Chcę zbudować własną firmę technologiczną",
    title: "Uruchomić MVP aplikacji SaaS",
    category: "Biznes", type: "wynikowy", priority: "must",
    horizon: "90d", deadline: "2026-06-30",
    metric: "Zdobyć 10 płatnych klientów",
    why: "Chcę mieć niezależność finansową i tworzyć coś swojego",
    color: T.coral,
    milestones: [
      { id:"m1", text:"Walidacja pomysłu z 20 osobami", done:true },
      { id:"m2", text:"Prototyp gotowy", done:true },
      { id:"m3", text:"Pierwsi beta testerzy (5 os.)", done:false },
      { id:"m4", text:"Wersja płatna i pierwsze 10 klientów", done:false },
    ],
    steps: [
      { id:"s1", text:"Zaplanować architekturę backendu", done:true, today:false },
      { id:"s2", text:"Zbudować stronę landing page", done:true, today:false },
      { id:"s3", text:"Napisać 5 cold emaili do potencjalnych klientów", done:false, today:true },
      { id:"s4", text:"Nagrać demo aplikacji (5 min)", done:false, today:true },
    ],
    ifthen: [
      { if:"Wrócę do domu przed 19:00", then:"Od razu siadam do kodu przez 45 minut" },
    ],
    streak: 12, lastCheck: "2026-03-23",
  },
  {
    id: "g2",
    dream: "Chcę być sprawny i mieć energię na cały dzień",
    title: "Przebiec półmaraton w September 2026",
    category: "Zdrowie", type: "wynikowy", priority: "important",
    horizon: "1y", deadline: "2026-09-15",
    metric: "Czas poniżej 2h",
    why: "Chcę udowodnić sobie, że potrafię i poprawić kondycję",
    color: T.emerald,
    milestones: [
      { id:"m1", text:"Biegać 3x/tydz przez 4 tygodnie", done:true },
      { id:"m2", text:"Przebiec 10 km bez przerwy", done:false },
      { id:"m3", text:"Zapisać się na zawody", done:false },
    ],
    steps: [
      { id:"s1", text:"Bieg 5 km (trening interwałowy)", done:false, today:true },
      { id:"s2", text:"Zaplanować dietę na tydzień", done:false, today:false },
    ],
    ifthen: [
      { if:"Wstanę przed 7:00", then:"Od razu idę biegać zanim zaczną się spotkania" },
    ],
    streak: 5, lastCheck: "2026-03-23",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pct(arr, key="done") { return arr.length ? Math.round(arr.filter(x=>x[key]).length/arr.length*100) : 0; }
function daysLeft(d) { return d ? Math.ceil((new Date(d)-new Date())/86400000) : null; }

function Ring({ p, size=64, color, stroke=5, children }) {
  const r=(size-stroke*2)/2, c=2*Math.PI*r, off=c-(p/100)*c;
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.faint} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)"}}/>
      <foreignObject x={0} y={0} width={size} height={size}>
        <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {children}
        </div>
      </foreignObject>
    </svg>
  );
}

function Tag({ label, color }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"22",color,borderRadius:999,padding:"2px 9px",fontSize:11,fontWeight:700,letterSpacing:.3}}>{label}</span>;
}

function Divider() { return <div style={{height:1,background:T.border,margin:"16px 0"}}/>; }

// ─── AI CALL ─────────────────────────────────────────────────────────────────
async function callAI(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system: systemPrompt || "Jesteś ekspertem od psychologii celów i produktywności. Odpowiadaj po polsku. Zwracaj TYLKO czysty JSON bez markdown ani komentarzy.",
      messages:[{role:"user",content:prompt}]
    })
  });
  const d = await res.json();
  return d.content.map(b=>b.text||"").join("");
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  phone:{width:390,minHeight:820,maxWidth:"100vw",margin:"0 auto",background:T.bg,fontFamily:"'Sora','Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",borderRadius:38,overflow:"hidden",boxShadow:"0 0 120px rgba(139,92,246,.1),0 0 0 1px rgba(255,255,255,.06)"},
  status:{height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",fontSize:12,color:T.muted,flexShrink:0},
  scroll:{flex:1,overflowY:"auto",padding:"0 18px 110px",scrollbarWidth:"none"},
  nav:{position:"sticky",bottom:0,background:"rgba(8,9,14,.97)",backdropFilter:"blur(24px)",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 24px",flexShrink:0},
  navBtn:(a)=>({display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:a?T.violet:T.muted,fontSize:9,fontFamily:"inherit",fontWeight:a?700:400,transition:"color .2s",letterSpacing:.5}),
  input:{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"},
  select:{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none"},
  textarea:{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box"},
  btn:(c=T.violet)=>({background:c,color:"#fff",border:"none",borderRadius:13,padding:"13px 20px",fontSize:14,fontWeight:700,fontFamily:"inherit",cursor:"pointer",width:"100%",letterSpacing:.3}),
  ghost:{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:13,padding:"12px 20px",fontSize:14,fontFamily:"inherit",cursor:"pointer",width:"100%",letterSpacing:.3},
  card:{background:T.card,borderRadius:20,padding:18,marginBottom:12,border:`1px solid ${T.border}`},
  label:{fontSize:11,color:T.muted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.8,fontWeight:600},
  section:{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10},
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [goals, setGoals] = useState(SEED);
  const [tab, setTab] = useState("dashboard"); // dashboard | today | goals | review
  const [view, setView] = useState("list");    // list | detail | add | ai
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(null);  // form state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [weeklyNote, setWeeklyNote] = useState("");

  const selected = goals.find(g=>g.id===selectedId);

  function showToast(msg, color=T.emerald) {
    setToast({msg,color});
    setTimeout(()=>setToast(null),2200);
  }

  function toggleMilestone(goalId, mid) {
    setGoals(gs=>gs.map(g=>g.id!==goalId?g:{...g,milestones:g.milestones.map(m=>m.id===mid?{...m,done:!m.done}:m)}));
  }
  function toggleStep(goalId, sid) {
    setGoals(gs=>gs.map(g=>g.id!==goalId?g:{...g,steps:g.steps.map(s=>s.id===sid?{...s,done:!s.done}:s)}));
  }
  function toggleToday(goalId, sid) {
    setGoals(gs=>gs.map(g=>g.id!==goalId?g:{...g,steps:g.steps.map(s=>s.id===sid?{...s,today:!s.today}:s)}));
  }
  function deleteGoal(id) { setGoals(gs=>gs.filter(g=>g.id!==id)); setView("list"); setSelectedId(null); }

  // ── AI breakdown ──────────────────────────────────────────────────────────
  async function runAI(goalData) {
    setAiLoading(true); setView("ai");
    try {
      const prompt = `Cel: "${goalData.title}"
Marzenie: "${goalData.dream}"
Kategoria: ${goalData.category}, Typ: ${goalData.type}
Termin: ${goalData.deadline || "brak"}, Miara: ${goalData.metric}
Powód: ${goalData.why}

Zaproponuj:
1. 4 kamienie milowe (milestones) — etapy pośrednie do celu
2. 5 konkretnych pierwszych kroków operacyjnych
3. 2 plany if-then (implementacyjne intencje)
4. Ocenę realności celu 1-10 + krótki komentarz (1 zdanie)

Format JSON:
{
  "milestones": ["tekst","tekst","tekst","tekst"],
  "steps": ["tekst","tekst","tekst","tekst","tekst"],
  "ifthen": [{"if":"...","then":"..."},{"if":"...","then":"..."}],
  "realism": 7,
  "realismNote": "..."
}`;
      const raw = await callAI(prompt);
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setAiResult({ goalData, parsed });
    } catch(e) {
      showToast("Błąd AI – spróbuj ponownie", T.coral);
      setView("add");
    }
    setAiLoading(false);
  }

  function acceptAI() {
    const { goalData, parsed } = aiResult;
    const newGoal = {
      ...goalData,
      id: "g"+Date.now(),
      color: CAT_COLOR[goalData.category] || T.violet,
      milestones: parsed.milestones.map((t,i)=>({id:"m"+i,text:t,done:false})),
      steps: parsed.steps.map((t,i)=>({id:"s"+i,text:t,done:false,today:i===0})),
      ifthen: parsed.ifthen,
      streak: 0, lastCheck: null,
      aiRealism: parsed.realism,
      aiRealismNote: parsed.realismNote,
    };
    setGoals(gs=>[...gs,newGoal]);
    setAiResult(null); setView("list"); setTab("goals");
    showToast("Cel dodany z planem AI ✨");
  }

  // ── VIEWS ─────────────────────────────────────────────────────────────────
  function renderContent() {
    if(view==="ai") return <AIScreen loading={aiLoading} result={aiResult} onAccept={acceptAI} onBack={()=>{setView("add");setAiResult(null);}}/>;
    if(view==="add") return <AddScreen onSubmit={runAI} onBack={()=>setView("list")}/>;
    if(view==="detail" && selected) return <DetailScreen goal={selected} onBack={()=>{setView("list");setSelectedId(null);}} onToggleMilestone={toggleMilestone} onToggleStep={toggleStep} onToggleToday={toggleToday} onDelete={deleteGoal}/>;

    if(tab==="dashboard") return <Dashboard goals={goals} onOpenGoal={(id)=>{setSelectedId(id);setView("detail");}} onAdd={()=>setView("add")}/>;
    if(tab==="today") return <TodayScreen goals={goals} mood={mood} energy={energy} onMood={setMood} onEnergy={setEnergy} onToggleStep={toggleStep} showToast={showToast}/>;
    if(tab==="goals") return <GoalsList goals={goals} onOpen={(id)=>{setSelectedId(id);setView("detail");}} onAdd={()=>setView("add")}/>;
    if(tab==="review") return <WeeklyReview goals={goals} note={weeklyNote} onNote={setWeeklyNote}/>;
  }

  const tabs=[
    {id:"dashboard",icon:"⬡",label:"Home"},
    {id:"today",icon:"◎",label:"Dziś"},
    {id:"goals",icon:"▲",label:"Cele"},
    {id:"review",icon:"◷",label:"Tydzień"},
  ];

  const hideNav = view==="add"||view==="ai"||view==="detail";

  return (
    <div style={S.phone}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{display:none;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{transform:scale(.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        .anim{animation:fadeUp .35s ease both}
        .card-hover{transition:border-color .2s,transform .15s}
        .card-hover:hover{border-color:rgba(255,255,255,.13);transform:translateY(-1px)}
        textarea::placeholder,input::placeholder{color:#3d3e55}
      `}</style>

      {/* Status */}
      <div style={S.status}>
        <span style={{fontWeight:600,fontSize:13}}>9:41</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10}}>●●●</span>
          <span style={{fontSize:12}}>⚡</span>
        </div>
      </div>

      {/* Content */}
      <div style={S.scroll}>{renderContent()}</div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:110,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",borderRadius:999,padding:"10px 20px",fontSize:13,fontWeight:700,zIndex:999,whiteSpace:"nowrap",animation:"pop .3s ease",boxShadow:"0 4px 20px rgba(0,0,0,.4)"}}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      {!hideNav && (
        <div style={S.nav}>
          {tabs.map(t=>(
            <button key={t.id} style={S.navBtn(tab===t.id)} onClick={()=>{setTab(t.id);setView("list");}}>
              <span style={{fontSize:18,lineHeight:1}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ goals, onOpenGoal, onAdd }) {
  const today = goals.flatMap(g=>g.steps.filter(s=>s.today&&!s.done));
  const overallSteps = goals.flatMap(g=>g.steps);
  const op = overallSteps.length ? Math.round(overallSteps.filter(s=>s.done).length/overallSteps.length*100) : 0;
  const atRisk = goals.filter(g=>{ const dl=daysLeft(g.deadline); return dl!==null&&dl<14&&pct(g.steps)<50; });

  return (
    <div className="anim">
      <div style={{paddingTop:8,paddingBottom:24}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:4}}>DREAM OS</div>
        <div style={{fontSize:26,fontWeight:800,lineHeight:1.15}}>Twój system<br/>realizacji celów</div>
      </div>

      {/* Big progress card */}
      <div style={{background:`linear-gradient(135deg,#1a0f2e,#0f1a2e)`,borderRadius:24,padding:22,marginBottom:14,border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,marginBottom:4,letterSpacing:.8}}>OGÓLNY POSTĘP</div>
            <div style={{fontSize:44,fontWeight:800,color:T.violet,lineHeight:1}}>{op}<span style={{fontSize:22}}>%</span></div>
            <div style={{fontSize:12,color:T.muted,marginTop:4}}>{goals.length} aktywnych celów</div>
          </div>
          <Ring p={op} size={80} color={T.violet} stroke={6}>
            <span style={{fontSize:22}}>⬡</span>
          </Ring>
        </div>
        <div style={{marginTop:16,background:"rgba(255,255,255,.06)",borderRadius:999,height:4}}>
          <div style={{width:`${op}%`,height:"100%",background:`linear-gradient(90deg,${T.violet},${T.sky})`,borderRadius:999,transition:"width .8s ease"}}/>
        </div>
        {/* Mini streaks */}
        <div style={{display:"flex",gap:12,marginTop:14}}>
          {goals.map(g=>(
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:g.color}}/>
              <span style={{fontSize:11,color:T.muted}}>🔥{g.streak}</span>
            </div>
          ))}
        </div>
      </div>

      {/* At Risk */}
      {atRisk.length>0 && (
        <div style={{background:`${T.coral}11`,border:`1px solid ${T.coral}33`,borderRadius:16,padding:14,marginBottom:14}}>
          <div style={{fontSize:11,color:T.coral,fontWeight:700,marginBottom:8,letterSpacing:.8}}>⚠ ZAGROŻONE</div>
          {atRisk.map(g=>(
            <div key={g.id} style={{fontSize:13,color:T.text,cursor:"pointer",padding:"4px 0"}} onClick={()=>onOpenGoal(g.id)}>
              {g.title} <span style={{color:T.coral}}>({daysLeft(g.deadline)}d)</span>
            </div>
          ))}
        </div>
      )}

      {/* Today steps */}
      <div style={{...S.card,marginBottom:14}}>
        <div style={{...S.section,marginBottom:12}}>DZISIAJ DO ZROBIENIA</div>
        {today.length===0 && <div style={{fontSize:13,color:T.muted}}>Wszystko gotowe! 🎉</div>}
        {today.slice(0,3).map(s=>(
          <div key={s.id} style={{fontSize:13,color:T.muted,padding:"5px 0",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:T.violet,flexShrink:0}}/>
            {s.text}
          </div>
        ))}
      </div>

      {/* Goals overview */}
      <div style={S.section}>TWOJE CELE</div>
      {goals.map(g=>{
        const p=pct(g.steps); const dl=daysLeft(g.deadline);
        return (
          <div key={g.id} className="card-hover" style={{...S.card,cursor:"pointer",borderLeft:`3px solid ${g.color}`}} onClick={()=>onOpenGoal(g.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:3}}>{g.dream.substring(0,45)}…</div>
                <div style={{fontSize:15,fontWeight:700,lineHeight:1.3,marginBottom:8}}>{g.title}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  <Tag label={g.category} color={g.color}/>
                  <Tag label={PRIO_LABEL[g.priority]} color={PRIO_COLOR[g.priority]}/>
                  {dl!==null&&<Tag label={dl>0?`${dl}d`:"Przeterminowany"} color={dl<14?T.coral:T.muted}/>}
                </div>
                <div style={{marginTop:10,background:T.faint,borderRadius:999,height:4}}>
                  <div style={{width:`${p}%`,height:"100%",background:g.color,borderRadius:999,transition:"width .6s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                  <span style={{fontSize:11,color:T.muted}}>{g.steps.filter(s=>s.done).length}/{g.steps.length} kroków</span>
                  <span style={{fontSize:11,fontWeight:700,color:g.color}}>{p}%</span>
                </div>
              </div>
              <Ring p={p} size={52} color={g.color} stroke={4}>
                <span style={{fontSize:11,fontWeight:800,color:g.color}}>{p}</span>
              </Ring>
            </div>
          </div>
        );
      })}

      <button style={{...S.btn(),marginTop:8}} onClick={onAdd}>+ Dodaj nowe marzenie</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY
// ═══════════════════════════════════════════════════════════════════════════════
function TodayScreen({ goals, mood, energy, onMood, onEnergy, onToggleStep, showToast }) {
  const todaySteps = goals.flatMap(g=>g.steps.filter(s=>s.today).map(s=>({...s,goalId:g.id,goalTitle:g.title,goalColor:g.color})));
  const done = todaySteps.filter(s=>s.done);
  const top = todaySteps.find(s=>!s.done);

  return (
    <div className="anim">
      <div style={{paddingTop:8,paddingBottom:20}}>
        <div style={{fontSize:11,color:T.muted,marginBottom:4}}>FOKUS NA DZIŚ</div>
        <div style={{fontSize:24,fontWeight:800}}>Co robisz dziś?</div>
      </div>

      {/* Mood / energy */}
      <div style={{...S.card,marginBottom:14}}>
        <div style={{...S.section,marginBottom:10}}>JAK SIĘ CZUJESZ?</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:8}}>Nastrój</div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["😞","😐","🙂","😄","🔥"].map((m,i)=>(
            <button key={i} onClick={()=>onMood(i)} style={{fontSize:22,background:mood===i?`${T.violet}33`:"transparent",border:`1.5px solid ${mood===i?T.violet:T.border}`,borderRadius:10,padding:"6px 8px",cursor:"pointer",flex:1,transition:"all .15s"}}>{m}</button>
          ))}
        </div>
        <div style={{fontSize:12,color:T.muted,marginBottom:8}}>Energia</div>
        <div style={{display:"flex",gap:8}}>
          {["🪫","💤","⚡","🚀"].map((e,i)=>(
            <button key={i} onClick={()=>onEnergy(i)} style={{fontSize:18,background:energy===i?`${T.amber}33`:"transparent",border:`1.5px solid ${energy===i?T.amber:T.border}`,borderRadius:10,padding:"6px 8px",cursor:"pointer",flex:1,transition:"all .15s"}}>{e}</button>
          ))}
        </div>
      </div>

      {/* Top task */}
      {top && (
        <div style={{background:`linear-gradient(135deg,${top.goalColor}18,${top.goalColor}06)`,border:`1px solid ${top.goalColor}44`,borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{fontSize:11,color:top.goalColor,fontWeight:700,marginBottom:6,letterSpacing:.8}}>⬟ NAJWAŻNIEJSZE TERAZ</div>
          <div style={{fontSize:17,fontWeight:700,lineHeight:1.4,marginBottom:12}}>{top.text}</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:14}}>↳ {top.goalTitle}</div>
          <button onClick={()=>{onToggleStep(top.goalId,top.id);showToast("Ukończone! 💪",top.goalColor);}}
            style={{...S.btn(top.goalColor),padding:"11px 16px",fontSize:14}}>
            ✓ Gotowe
          </button>
        </div>
      )}

      {/* All today */}
      <div style={S.section}>WSZYSTKIE ZADANIA NA DZIŚ ({todaySteps.length})</div>
      {todaySteps.length===0 && <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Brak zadań na dziś. Wróć do celów i oznacz kroki.</div>}
      {todaySteps.map(s=>(
        <div key={s.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",opacity:s.done?.6:1}} onClick={()=>onToggleStep(s.goalId,s.id)}>
          <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${s.done?s.goalColor:T.muted}`,background:s.done?s.goalColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
            {s.done&&<span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,textDecoration:s.done?"line-through":"none",color:s.done?T.muted:T.text}}>{s.text}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.goalTitle}</div>
          </div>
          <div style={{width:6,height:6,borderRadius:"50%",background:s.goalColor,flexShrink:0}}/>
        </div>
      ))}

      {done.length>0&&done.length===todaySteps.length&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:40}}>🎉</div>
          <div style={{fontSize:17,fontWeight:700,marginTop:8,color:T.emerald}}>Wszystko gotowe!</div>
          <div style={{fontSize:13,color:T.muted,marginTop:4}}>Niesamowity dzień. Tak trzymaj!</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS LIST
// ═══════════════════════════════════════════════════════════════════════════════
function GoalsList({ goals, onOpen, onAdd }) {
  const [filter, setFilter] = useState("all");
  const cats = ["all",...new Set(goals.map(g=>g.category))];
  const filtered = filter==="all"?goals:goals.filter(g=>g.category===filter);

  return (
    <div className="anim">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,paddingBottom:16}}>
        <div>
          <div style={{fontSize:11,color:T.muted,marginBottom:3}}>WSZYSTKIE CELE</div>
          <div style={{fontSize:22,fontWeight:800}}>Twoje marzenia</div>
        </div>
        <button onClick={onAdd} style={{background:T.violet,border:"none",borderRadius:13,width:42,height:42,fontSize:20,cursor:"pointer",color:"#fff"}}>+</button>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?T.violet:"transparent",color:filter===c?"#fff":T.muted,border:`1px solid ${filter===c?T.violet:T.border}`,borderRadius:999,padding:"5px 12px",fontSize:12,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",fontWeight:filter===c?700:400,transition:"all .15s"}}>
            {c==="all"?"Wszystkie":c}
          </button>
        ))}
      </div>

      {filtered.map(g=>{
        const ms=pct(g.milestones), sp=pct(g.steps), dl=daysLeft(g.deadline);
        return (
          <div key={g.id} className="card-hover" style={{...S.card,cursor:"pointer",borderLeft:`3px solid ${g.color}`,marginBottom:10}} onClick={()=>onOpen(g.id)}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T.muted,marginBottom:3}}>{g.dream.substring(0,50)}…</div>
                <div style={{fontSize:15,fontWeight:700}}>{g.title}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              <Tag label={g.category} color={g.color}/>
              <Tag label={TYPE_LABEL[g.type]} color={T.sky}/>
              <Tag label={PRIO_LABEL[g.priority]} color={PRIO_COLOR[g.priority]}/>
              <Tag label={HORIZON_LABEL[g.horizon]||g.horizon} color={T.muted}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:T.muted,marginBottom:4}}>KAMIENIE MILOWE</div>
                <div style={{background:T.faint,borderRadius:999,height:4}}>
                  <div style={{width:`${ms}%`,height:"100%",background:g.color,borderRadius:999}}/>
                </div>
                <div style={{fontSize:10,color:T.muted,marginTop:3}}>{ms}%</div>
              </div>
              <div>
                <div style={{fontSize:10,color:T.muted,marginBottom:4}}>KROKI</div>
                <div style={{background:T.faint,borderRadius:999,height:4}}>
                  <div style={{width:`${sp}%`,height:"100%",background:T.sky,borderRadius:999}}/>
                </div>
                <div style={{fontSize:10,color:T.muted,marginTop:3}}>{sp}%</div>
              </div>
            </div>
            {dl!==null&&<div style={{fontSize:11,color:dl<14?T.coral:T.muted,marginTop:8}}>⏱ {dl>0?`${dl} dni do terminu`:"Termin minął"}</div>}
          </div>
        );
      })}
      <button style={{...S.btn(),marginTop:4}} onClick={onAdd}>+ Nowe marzenie</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function DetailScreen({ goal, onBack, onToggleMilestone, onToggleStep, onToggleToday, onDelete }) {
  const [section, setSection] = useState("progress"); // progress | plan | ifthen
  const mp=pct(goal.milestones), sp=pct(goal.steps), dl=daysLeft(goal.deadline);

  return (
    <div className="anim">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:8,paddingBottom:16}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.muted,fontSize:22,cursor:"pointer",padding:"4px 8px 4px 0"}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:2}}>{goal.dream.substring(0,45)}…</div>
          <div style={{fontSize:17,fontWeight:800,lineHeight:1.2}}>{goal.title}</div>
        </div>
      </div>

      {/* Tags */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        <Tag label={goal.category} color={goal.color}/>
        <Tag label={TYPE_LABEL[goal.type]} color={T.sky}/>
        <Tag label={PRIO_LABEL[goal.priority]} color={PRIO_COLOR[goal.priority]}/>
        {dl!==null&&<Tag label={dl>0?`${dl}d`:"Minął termin"} color={dl<14?T.coral:T.muted}/>}
        <Tag label={`🔥 ${goal.streak}`} color={T.amber}/>
      </div>

      {/* Progress hero */}
      <div style={{background:`linear-gradient(135deg,${goal.color}18,${goal.color}06)`,border:`1px solid ${goal.color}33`,borderRadius:22,padding:20,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
          <div style={{textAlign:"center"}}>
            <Ring p={mp} size={72} color={goal.color} stroke={5}>
              <span style={{fontSize:14,fontWeight:800,color:goal.color}}>{mp}%</span>
            </Ring>
            <div style={{fontSize:10,color:T.muted,marginTop:6}}>MILESTONE</div>
          </div>
          <div style={{textAlign:"center"}}>
            <Ring p={sp} size={72} color={T.sky} stroke={5}>
              <span style={{fontSize:14,fontWeight:800,color:T.sky}}>{sp}%</span>
            </Ring>
            <div style={{fontSize:10,color:T.muted,marginTop:6}}>KROKI</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32,fontWeight:900,color:goal.color}}>{goal.aiRealism||"—"}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:4}}>AI REALNOŚĆ</div>
          </div>
        </div>
        {goal.aiRealismNote&&<div style={{marginTop:12,fontSize:12,color:T.muted,fontStyle:"italic",textAlign:"center"}}>"{goal.aiRealismNote}"</div>}
      </div>

      {/* Why */}
      <div style={{...S.card,marginBottom:14,borderLeft:`3px solid ${T.amber}`}}>
        <div style={{fontSize:10,color:T.amber,fontWeight:700,marginBottom:4,letterSpacing:.8}}>DLACZEGO TEN CEL?</div>
        <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{goal.why}</div>
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:T.surface,borderRadius:12,padding:4}}>
        {[["progress","Postęp"],["plan","Plan"],["ifthen","If-Then"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setSection(id)} style={{flex:1,background:section===id?T.card:"transparent",color:section===id?T.text:T.muted,border:"none",borderRadius:10,padding:"8px 0",fontSize:12,fontWeight:section===id?700:400,fontFamily:"inherit",cursor:"pointer",transition:"all .15s"}}>
            {lbl}
          </button>
        ))}
      </div>

      {section==="progress"&&(
        <>
          <div style={S.section}>KAMIENIE MILOWE</div>
          {goal.milestones.map((m,i)=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer"}} onClick={()=>onToggleMilestone(goal.id,m.id)}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${m.done?goal.color:T.muted}`,background:m.done?goal.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                {m.done&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
              </div>
              <div style={{flex:1,fontSize:14,textDecoration:m.done?"line-through":"none",color:m.done?T.muted:T.text}}>{m.text}</div>
              <div style={{fontSize:11,color:T.muted}}>M{i+1}</div>
            </div>
          ))}
        </>
      )}

      {section==="plan"&&(
        <>
          <div style={{...S.section,marginBottom:12}}>KROKI OPERACYJNE</div>
          {goal.steps.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${s.done?goal.color:T.muted}`,background:s.done?goal.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"all .2s"}} onClick={()=>onToggleStep(goal.id,s.id)}>
                {s.done&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
              </div>
              <div style={{flex:1,fontSize:13,color:s.done?T.muted:T.text,textDecoration:s.done?"line-through":"none"}}>{s.text}</div>
              <button onClick={()=>onToggleToday(goal.id,s.id)} style={{background:s.today?`${T.amber}22`:"transparent",border:`1px solid ${s.today?T.amber:T.border}`,borderRadius:8,padding:"3px 8px",fontSize:10,color:s.today?T.amber:T.muted,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                {s.today?"Dziś":"+ Dziś"}
              </button>
            </div>
          ))}
        </>
      )}

      {section==="ifthen"&&(
        <>
          <div style={{...S.section,marginBottom:4}}>PLANY IF-THEN</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Implementacyjne intencje — jedna z mocniejszych technik psychologicznych.</div>
          {goal.ifthen&&goal.ifthen.map((it,i)=>(
            <div key={i} style={{...S.card,marginBottom:10,borderLeft:`3px solid ${T.emerald}`}}>
              <div style={{fontSize:11,color:T.emerald,fontWeight:700,marginBottom:6}}>JEŚLI →</div>
              <div style={{fontSize:13,marginBottom:10,color:T.text}}>{it.if}</div>
              <div style={{fontSize:11,color:T.amber,fontWeight:700,marginBottom:6}}>TO →</div>
              <div style={{fontSize:13,color:T.text}}>{it.then}</div>
            </div>
          ))}
          {(!goal.ifthen||goal.ifthen.length===0)&&<div style={{fontSize:13,color:T.muted}}>Brak planów. Dodaj cel przez AI aby je wygenerować.</div>}
        </>
      )}

      <div style={{height:16}}/>
      <button style={{...S.btn(T.coral),marginTop:8}} onClick={()=>onDelete(goal.id)}>🗑 Usuń cel</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY REVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function WeeklyReview({ goals, note, onNote }) {
  const total=goals.flatMap(g=>g.steps).length;
  const done=goals.flatMap(g=>g.steps).filter(s=>s.done).length;
  const stuck=goals.filter(g=>pct(g.steps)<20);
  const flying=goals.filter(g=>pct(g.steps)>60);

  return (
    <div className="anim">
      <div style={{paddingTop:8,paddingBottom:20}}>
        <div style={{fontSize:11,color:T.muted,marginBottom:4}}>PRZEGLĄD TYGODNIA</div>
        <div style={{fontSize:24,fontWeight:800}}>Co ruszyło?</div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {label:"Ukończone kroki",val:done,color:T.emerald},
          {label:"Wszystkich kroków",val:total,color:T.muted},
          {label:"Celów ruszonych",val:flying.length,color:T.sky},
          {label:"Celów stojących",val:stuck.length,color:T.coral},
        ].map((s,i)=>(
          <div key={i} style={{...S.card,textAlign:"center",padding:14}}>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {flying.length>0&&(
        <div style={{...S.card,marginBottom:10,borderLeft:`3px solid ${T.emerald}`}}>
          <div style={{fontSize:11,color:T.emerald,fontWeight:700,marginBottom:8}}>🚀 CO RUSZA</div>
          {flying.map(g=><div key={g.id} style={{fontSize:13,color:T.text,marginBottom:4}}>· {g.title} ({pct(g.steps)}%)</div>)}
        </div>
      )}

      {stuck.length>0&&(
        <div style={{...S.card,marginBottom:10,borderLeft:`3px solid ${T.coral}`}}>
          <div style={{fontSize:11,color:T.coral,fontWeight:700,marginBottom:8}}>⚠ CO STOI</div>
          {stuck.map(g=><div key={g.id} style={{fontSize:13,color:T.text,marginBottom:4}}>· {g.title} ({pct(g.steps)}%)</div>)}
          <div style={{fontSize:12,color:T.muted,marginTop:8}}>Wskazówka: uprość, podziel lub odrocz te cele.</div>
        </div>
      )}

      <div style={{...S.section,marginTop:14}}>REFLEKSJA TYGODNIA</div>
      <textarea style={{...S.textarea,height:110,marginBottom:14}} placeholder="Co zadziałało? Co przeszkadzało? Co zmienić w przyszłym tygodniu?" value={note} onChange={e=>onNote(e.target.value)}/>

      {/* Radar-like viz */}
      <div style={S.section}>POSTĘP NA CEL</div>
      {goals.map(g=>{
        const p=pct(g.steps);
        return (
          <div key={g.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:12,color:T.text}}>{g.title.substring(0,30)}…</span>
              <span style={{fontSize:12,fontWeight:700,color:g.color}}>{p}%</span>
            </div>
            <div style={{background:T.faint,borderRadius:999,height:6}}>
              <div style={{width:`${p}%`,height:"100%",background:g.color,borderRadius:999,transition:"width .6s ease"}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD GOAL FORM
// ═══════════════════════════════════════════════════════════════════════════════
function AddScreen({ onSubmit, onBack }) {
  const [form, setForm] = useState({
    dream:"", title:"", category:"Kariera", type:"wynikowy",
    priority:"must", horizon:"90d", deadline:"", metric:"", why:""
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const valid=form.dream&&form.title&&form.metric&&form.why;

  return (
    <div className="anim">
      <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:8,paddingBottom:18}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.muted,fontSize:22,cursor:"pointer",padding:"4px 8px 4px 0"}}>←</button>
        <div>
          <div style={{fontSize:11,color:T.muted}}>NOWE MARZENIE</div>
          <div style={{fontSize:20,fontWeight:800}}>Dodaj cel</div>
        </div>
      </div>

      {[
        {label:"Marzenie / kierunek",key:"dream",ph:"np. Chcę mieć własną firmę technologiczną",multi:true},
        {label:"Cel główny (konkretny)",key:"title",ph:"np. Uruchomić MVP aplikacji SaaS"},
        {label:"Miara sukcesu",key:"metric",ph:"np. 10 płatnych klientów"},
        {label:"Dlaczego ten cel jest ważny?",key:"why",ph:"np. Chcę mieć niezależność finansową",multi:true},
      ].map(({label,key,ph,multi})=>(
        <div key={key} style={{marginBottom:14}}>
          <label style={S.label}>{label}</label>
          {multi
            ? <textarea style={{...S.textarea,height:72}} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)}/>
            : <input style={S.input} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)}/>
          }
        </div>
      ))}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <label style={S.label}>Kategoria</label>
          <select style={S.select} value={form.category} onChange={e=>set("category",e.target.value)}>
            {Object.keys(CAT_COLOR).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Typ celu</label>
          <select style={S.select} value={form.type} onChange={e=>set("type",e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Priorytet</label>
          <select style={S.select} value={form.priority} onChange={e=>set("priority",e.target.value)}>
            {Object.entries(PRIO_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Horyzont</label>
          <select style={S.select} value={form.horizon} onChange={e=>set("horizon",e.target.value)}>
            {Object.entries(HORIZON_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <label style={S.label}>Termin (opcjonalnie)</label>
        <input type="date" style={S.input} value={form.deadline} onChange={e=>set("deadline",e.target.value)}/>
      </div>

      <div style={{...S.card,marginBottom:16,borderLeft:`3px solid ${T.violet}`,background:`${T.violet}08`}}>
        <div style={{fontSize:11,color:T.violet,fontWeight:700,marginBottom:4}}>✨ CO DALEJ</div>
        <div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>Po wypełnieniu formularza AI przeanalizuje Twój cel i zaproponuje kamienie milowe, pierwsze kroki oraz plany if-then.</div>
      </div>

      <button style={{...S.btn(),opacity:valid?1:.5}} onClick={()=>valid&&onSubmit(form)}>
        ✨ Analizuj cel z AI →
      </button>
      <button style={{...S.ghost,marginTop:8}} onClick={onBack}>Anuluj</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function AIScreen({ loading, result, onAccept, onBack }) {
  if(loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:500,gap:20}}>
      <div style={{width:52,height:52,border:`3px solid ${T.violet}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:16,fontWeight:700,color:T.violet}}>AI analizuje Twój cel…</div>
      <div style={{fontSize:13,color:T.muted,textAlign:"center",maxWidth:260}}>Sprawdzam realność, rozkładam na etapy i tworzę plan działania.</div>
    </div>
  );

  if(!result) return null;
  const { goalData, parsed } = result;
  const rColor = parsed.realism>=7?T.emerald:parsed.realism>=5?T.amber:T.coral;

  return (
    <div className="anim">
      <div style={{paddingTop:8,paddingBottom:18}}>
        <div style={{fontSize:11,color:T.violet,marginBottom:4}}>✨ ANALIZA AI</div>
        <div style={{fontSize:20,fontWeight:800}}>Plan gotowy</div>
      </div>

      {/* Realism */}
      <div style={{background:`${rColor}11`,border:`1px solid ${rColor}33`,borderRadius:18,padding:16,marginBottom:14,display:"flex",alignItems:"center",gap:16}}>
        <div style={{textAlign:"center",flexShrink:0}}>
          <div style={{fontSize:36,fontWeight:900,color:rColor}}>{parsed.realism}</div>
          <div style={{fontSize:10,color:T.muted}}>/10</div>
        </div>
        <div>
          <div style={{fontSize:11,color:rColor,fontWeight:700,marginBottom:4}}>REALNOŚĆ CELU</div>
          <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{parsed.realismNote}</div>
        </div>
      </div>

      {/* Goal summary */}
      <div style={{...S.card,marginBottom:14,borderLeft:`3px solid ${CAT_COLOR[goalData.category]||T.violet}`}}>
        <div style={{fontSize:10,color:T.muted,marginBottom:2}}>{goalData.dream}</div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>{goalData.title}</div>
        <div style={{fontSize:12,color:T.muted}}>📏 {goalData.metric}</div>
      </div>

      {/* Milestones */}
      <div style={{...S.section,marginBottom:10}}>KAMIENIE MILOWE</div>
      {parsed.milestones.map((m,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
          <div style={{width:22,height:22,borderRadius:7,background:T.violet+"22",border:`1px solid ${T.violet}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:T.violet}}>
            {i+1}
          </div>
          <div style={{fontSize:13,color:T.text,paddingTop:3,lineHeight:1.4}}>{m}</div>
        </div>
      ))}

      <Divider/>

      {/* Steps */}
      <div style={{...S.section,marginBottom:10}}>PIERWSZE KROKI</div>
      {parsed.steps.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:T.sky,flexShrink:0,marginTop:5}}/>
          <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>{s}</div>
        </div>
      ))}

      <Divider/>

      {/* If-Then */}
      <div style={{...S.section,marginBottom:10}}>PLANY IF-THEN</div>
      {parsed.ifthen.map((it,i)=>(
        <div key={i} style={{...S.card,marginBottom:8,borderLeft:`3px solid ${T.emerald}`}}>
          <span style={{fontSize:11,fontWeight:700,color:T.emerald}}>JEŚLI </span>
          <span style={{fontSize:13,color:T.text}}>{it.if}</span>
          <br/><br/>
          <span style={{fontSize:11,fontWeight:700,color:T.amber}}>TO </span>
          <span style={{fontSize:13,color:T.text}}>{it.then}</span>
        </div>
      ))}

      <div style={{height:16}}/>
      <button style={S.btn()} onClick={onAccept}>✓ Dodaj cel do systemu</button>
      <button style={{...S.ghost,marginTop:8}} onClick={onBack}>← Wróć i edytuj</button>
    </div>
  );
}

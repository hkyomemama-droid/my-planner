import { useState, useRef, useEffect } from "react";

// ── サーバー共有ストレージ ──────────────────────────
// /api/data (サーバーの JSON ファイル) に全データを保存。
// PC・スマホで同じファイルを読み書きしてデータを共有する。

let _promise = null;        // 初回ロードの Promise（1回だけ fetch）
let _store = null;          // メモリ上のデータキャッシュ
let _saveTimer = null;      // デバウンス用タイマー
const _migrated = new Set(); // localStorage 移行済みキーのセット（2重実行防止）

function _load() {
  if (_promise) return _promise;
  _promise = fetch('/api/data')
    .then(r => r.json())
    .then(d => { _store = d; return d; })
    .catch(() => { _store = {}; return {}; });
  return _promise;
}

function _save(key, value) {
  if (!_store) _store = {};
  _store[key] = value;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_store),
    }).catch(() => {});
  }, 600);
}

function useSharedStorage(key, initialValue) {
  const [state, setState] = useState(initialValue);
  const loadedRef = useRef(false);   // サーバーからの初期ロード完了フラグ
  const loadedValRef = useRef(undefined); // サーバーから読み込んだ値の参照

  // マウント時にサーバーからデータを取得（localStorage からの移行も行う）
  useEffect(() => {
    _load().then(data => {
      let value = null;

      // ① localStorage からの移行（StrictMode の2重実行を _migrated でガード）
      if (!_migrated.has(key)) {
        try {
          const saved = localStorage.getItem(key);
          if (saved !== null) {
            value = JSON.parse(saved);
            localStorage.removeItem(key); // 移行後は削除
            _migrated.add(key);
            _save(key, value);            // _store に即反映してサーバーへ保存
          }
        } catch {}
      }

      // ② localStorage になければ _store → server data → initialValue の順で取得
      if (value === null) {
        if (_store && key in _store) {
          value = _store[key];            // 同セッション内の別 effect 実行で既に _store に入っている場合
        } else if (key in data) {
          value = data[key];
        } else {
          value = initialValue;
          _save(key, value);
        }
      }

      loadedValRef.current = value;
      setState(value);
      loadedRef.current = true;
    });
  }, []);

  // state が変わったらサーバーに保存（初回ロード直後の setState は除外）
  useEffect(() => {
    if (!loadedRef.current) return;
    if (state === loadedValRef.current) return; // サーバーから読んだ値と同じ → スキップ
    loadedValRef.current = state;
    _save(key, state);
  }, [state]);

  return [state, setState];
}
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PASTEL = {
  pink:"#FFB7C5",lavender:"#C9B8FF",mint:"#B8F0E0",peach:"#FFD4B8",
  sky:"#B8E4FF",yellow:"#FFF3B8",white:"#FFFAF8",dark:"#3D2C35",
  mid:"#7A6072",light:"#F5EEF2",coral:"#FFB0A0",sage:"#C8E6C0",
};
const EMOJI_CATS=["🐱","🐰","🌸","✨","🍓","🌷","🎀","🌈","🍰","🌙"];
const MOODS=["😊","😄","😐","😢","😤","🥰","😴","🤩"];
const WEEK_DAYS=["日","月","火","水","木","金","土"];
const EVENT_COLORS=[PASTEL.pink,PASTEL.lavender,PASTEL.mint,PASTEL.peach,PASTEL.sky,PASTEL.yellow];
const HOLIDAY_COLOR="#FF8FAB";

// 2026年 日本の祝日
const HOLIDAYS={
  "2026-01-01":"元日",
  "2026-01-12":"成人の日",
  "2026-02-11":"建国記念の日",
  "2026-02-23":"天皇誕生日",
  "2026-03-20":"春分の日",
  "2026-04-29":"昭和の日",
  "2026-05-03":"憲法記念日",
  "2026-05-04":"みどりの日",
  "2026-05-05":"こどもの日",
  "2026-05-06":"振替休日",
  "2026-07-20":"海の日",
  "2026-08-11":"山の日",
  "2026-09-21":"敬老の日",
  "2026-09-23":"秋分の日",
  "2026-10-12":"スポーツの日",
  "2026-11-03":"文化の日",
  "2026-11-23":"勤労感謝の日",
};

// ── initial data ──────────────────────────────────────────────
const initialGoals=[
  {id:1,text:"毎日30分読書する",done:false,color:PASTEL.pink},
  {id:2,text:"週3回運動する",done:false,color:PASTEL.lavender},
  {id:3,text:"早起き習慣をつける",done:true,color:PASTEL.mint},
];
const initialEvents={
  "2026-05-21":[
    {id:1,title:"チームミーティング",start:10,end:11,color:PASTEL.lavender,memo:"議題：Q2レビュー"},
    {id:2,title:"ランチ 🍱",start:12,end:13,color:PASTEL.peach,memo:""},
    {id:3,title:"デザインレビュー",start:15,end:17,color:PASTEL.sky,memo:""},
  ],
  "2026-05-23":[
    {id:4,title:"ヨガ 🧘",start:7,end:8,color:PASTEL.mint,memo:"スタジオB"},
    {id:5,title:"報告書作成",start:14,end:16,color:PASTEL.yellow,memo:""},
  ],
};
const initialReports={
  "2026-05-21":{mood:"😊",good:"デザインレビューが好評だった！",improve:"朝の準備に時間がかかりすぎた。",tomorrow:"午前中にメール返信を済ませる"},
};
const initialBodyLogs=[
  {date:"2026-05-01",weight:57.2,fat:26.5},
  {date:"2026-05-05",weight:56.8,fat:26.2},
  {date:"2026-05-10",weight:56.5,fat:25.9},
  {date:"2026-05-15",weight:56.1,fat:25.6},
  {date:"2026-05-21",weight:55.8,fat:25.3},
];
const initialSizeLogs=[
  {month:"2026-04",bust:86,waist:68,belly:76,thighL:52,thighR:52,photos:{front:null,side:null,back:null}},
  {month:"2026-05",bust:85,waist:67,belly:75,thighL:51,thighR:51,photos:{front:null,side:null,back:null}},
];
const initialMealLogs={
  "2026-05-21":{morning:"ヨーグルト、バナナ、グラノーラ 🍌",lunch:"サラダチキン、玄米、野菜スープ 🥗",dinner:"鶏むね肉のソテー、ブロッコリー、味噌汁 🍱",snack:"プロテインバー"},
};
// 繰り返しテンプレ: {id,title,dayOfWeek(0-6),start,end,color,memo}
const initialTemplates=[
  {id:1,title:"ヨガ 🧘",dayOfWeek:3,start:7,end:8,color:PASTEL.mint,memo:"毎週水曜"},
  {id:2,title:"英会話レッスン",dayOfWeek:5,start:19,end:20,color:PASTEL.lavender,memo:"毎週金曜"},
];

const DEFAULT_TYPES=["HP","LP","サムネ","バナー","チラシ","名刺","その他"];
const DEFAULT_CHANNELS=["AIまるわかり","みずたろう","ねんきん","スマホ"];
const PROGRESS_OPTIONS=["未着手","進行中","初稿済","修正中","納品済","請求済"];
const PROGRESS_COLORS={"未着手":PASTEL.light,"進行中":PASTEL.sky,"初稿済":PASTEL.yellow,"修正中":PASTEL.peach,"納品済":PASTEL.mint,"請求済":PASTEL.lavender};
const initialJobs=[
  {id:1,name:"AIまるわかりトップページ",type:"HP",channel:"AIまるわかり",draftDate:"2026-05-20",deliveryDate:"2026-05-28",progress:"進行中",amount:80000,invoiceDate:"2026-06-10"},
  {id:2,name:"スマホ講座LP",type:"LP",channel:"スマホ",draftDate:"2026-05-25",deliveryDate:"2026-06-05",progress:"未着手",amount:50000,invoiceDate:"2026-06-30"},
  {id:3,name:"ねんきんYouTubeサムネ5枚",type:"サムネ",channel:"ねんきん",draftDate:"2026-05-18",deliveryDate:"2026-05-21",progress:"納品済",amount:25000,invoiceDate:"2026-05-31"},
];

// ════════════════════════════════════════════════
// helpers
// ════════════════════════════════════════════════
const dateKey=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

// テンプレから日付範囲にイベント展開（当月分）
function applyTemplates(events,templates,year,month){
  const result={...events};
  const daysInMonth=new Date(year,month+1,0).getDate();
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(year,month,d);
    const dow=date.getDay();
    const key=dateKey(date);
    templates.forEach(tmpl=>{
      if(tmpl.dayOfWeek===dow){
        const existing=result[key]||[];
        // 同じテンプレIDがすでに展開済みか確認
        if(!existing.find(e=>e.templateId===tmpl.id)){
          result[key]=[...existing,{
            id:`tmpl-${tmpl.id}-${key}`,
            templateId:tmpl.id,
            title:tmpl.title,start:tmpl.start,end:tmpl.end,
            color:tmpl.color,memo:tmpl.memo||"",
          }];
        }
      }
    });
  }
  return result;
}

// ════════════════════════════════════════════════
// 同期ボタン（ページリロードでサーバーの最新データを取得）
// ════════════════════════════════════════════════
function SyncButton(){
  const [syncing,setSyncing]=useState(false);
  const handleSync=()=>{
    setSyncing(true);
    setTimeout(()=>window.location.reload(),300);
  };
  return(
    <button onClick={handleSync} style={{
      border:"none",cursor:"pointer",
      background:syncing?"rgba(184,240,224,0.6)":"rgba(255,255,255,0.7)",
      borderRadius:20,padding:"5px 12px",
      display:"flex",alignItems:"center",gap:5,
      fontSize:12,fontWeight:700,color:PASTEL.mid,
      boxShadow:"0 2px 8px rgba(200,150,180,0.15)",
      transition:"all 0.2s",
    }}>
      <span style={{
        display:"inline-block",
        animation:syncing?"spin 0.6s linear infinite":"none",
      }}>🔄</span>
      {syncing?"同期中…":"同期"}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </button>
  );
}

// ════════════════════════════════════════════════
// Main App
// ════════════════════════════════════════════════
export default function App(){
  const [page,setPage]=useState("monthly");
  const [currentDate,setCurrentDate]=useState(new Date());
  const [selectedDate,setSelectedDate]=useState(new Date());
  const [baseEvents,setBaseEvents]=useSharedStorage("mp_events",initialEvents);
  const [templates,setTemplates]=useSharedStorage("mp_templates",initialTemplates);
  const [goals,setGoals]=useSharedStorage("mp_goals",initialGoals);
  const [reports,setReports]=useSharedStorage("mp_reports",initialReports);
  const [editReport,setEditReport]=useState(null);
  const [newGoal,setNewGoal]=useState("");
  const [goalColor,setGoalColor]=useState(PASTEL.pink);
  // Diet
  const [bodyLogs,setBodyLogs]=useSharedStorage("mp_bodyLogs",initialBodyLogs);
  const [sizeLogs,setSizeLogs]=useSharedStorage("mp_sizeLogs",initialSizeLogs);
  const [mealLogs,setMealLogs]=useSharedStorage("mp_mealLogs",initialMealLogs);
  // Work
  const [jobs,setJobs]=useSharedStorage("mp_jobs",initialJobs);
  const [jobTypes,setJobTypes]=useSharedStorage("mp_jobTypes",DEFAULT_TYPES);
  const [channels,setChannels]=useSharedStorage("mp_channels",DEFAULT_CHANNELS);
  // Event modal (shared, used from monthly & vertical)
  const [eventModal,setEventModal]=useState(null); // null | {date, event|null}

  // テンプレを現在月に適用したイベントマップ
  const events=applyTemplates(baseEvents,templates,currentDate.getFullYear(),currentDate.getMonth());

  const todayReport=reports[dateKey(selectedDate)]||{mood:"😊",good:"",improve:"",tomorrow:""};

  const openAddEvent=(date,existingEvent=null)=>{
    setEventModal({date,event:existingEvent||{title:"",start:9,end:10,color:PASTEL.pink,memo:"",repeat:false}});
  };

  const saveEvent=(modal)=>{
    if(!modal.event.title)return;
    const key=dateKey(modal.date);
    const updated={...baseEvents};
    if(!updated[key])updated[key]=[];
    if(modal.event.id){
      // edit
      updated[key]=updated[key].map(e=>e.id===modal.event.id?modal.event:e);
    } else {
      updated[key]=[...updated[key],{...modal.event,id:Date.now()}];
    }
    setBaseEvents(updated);
    setEventModal(null);
  };

  const deleteEvent=(dateObj,eventId)=>{
    const key=dateKey(dateObj);
    const updated={...baseEvents,[key]:(baseEvents[key]||[]).filter(e=>e.id!==eventId)};
    setBaseEvents(updated);
    setEventModal(null);
  };

  const saveReport=()=>{ setReports({...reports,[dateKey(selectedDate)]:editReport}); setEditReport(null); };
  const addGoal=()=>{ if(!newGoal.trim())return; setGoals([...goals,{id:Date.now(),text:newGoal,done:false,color:goalColor}]); setNewGoal(""); };

  const navItems=[
    {id:"monthly",icon:"🗓",label:"月間"},
    {id:"vertical",icon:"⏰",label:"予定"},
    {id:"report",icon:"📓",label:"日報"},
    {id:"goals",icon:"🌟",label:"目標"},
    {id:"diet",icon:"🥗",label:"ダイエット"},
    {id:"work",icon:"💼",label:"お仕事"},
  ];

  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 20%, #FFE4EE 0%, #F5EEF8 40%, #E8F4FF 100%)`,fontFamily:"'Hiragino Maru Gothic ProN','BIZ UDPGothic',sans-serif",color:PASTEL.dark,position:"relative"}}>
      {EMOJI_CATS.slice(0,5).map((e,i)=>(
        <div key={i} style={{position:"fixed",fontSize:20+i*4,opacity:0.10,top:`${10+i*17}%`,right:`${2+i*3}%`,pointerEvents:"none",userSelect:"none",animation:`float${i} ${3+i}s ease-in-out infinite alternate`}}>{e}</div>
      ))}
      <style>{`
        @keyframes float0{from{transform:translateY(0)}to{transform:translateY(-8px)}}
        @keyframes float1{from{transform:translateY(0)}to{transform:translateY(-12px)}}
        @keyframes float2{from{transform:translateY(0)}to{transform:translateY(-6px)}}
        @keyframes float3{from{transform:translateY(0)}to{transform:translateY(-10px)}}
        @keyframes float4{from{transform:translateY(0)}to{transform:translateY(-14px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .card{background:rgba(255,255,255,0.72);backdrop-filter:blur(12px);border-radius:20px;border:1.5px solid rgba(255,183,197,0.3);box-shadow:0 4px 24px rgba(200,150,180,0.10);animation:fadeIn 0.3s ease;}
        .btn-soft{border:none;cursor:pointer;border-radius:40px;padding:8px 18px;font-weight:700;font-size:13px;transition:all 0.18s;letter-spacing:0.03em;}
        .btn-soft:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(200,150,180,0.3);}
        .nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 10px;border-radius:14px;cursor:pointer;transition:all 0.2s;border:none;background:none;font-size:10px;color:#7A6072;font-weight:600;}
        .nav-item.active{background:rgba(255,255,255,0.9);box-shadow:0 2px 12px rgba(200,150,180,0.2);color:#3D2C35;}
        .nav-item:hover{background:rgba(255,255,255,0.6);}
        input,textarea,select{outline:none;border:1.5px solid rgba(255,183,197,0.5);border-radius:12px;padding:8px 12px;font-family:inherit;font-size:13px;background:rgba(255,255,255,0.8);color:#3D2C35;transition:border 0.2s;}
        input:focus,textarea:focus,select:focus{border-color:#FFB7C5;box-shadow:0 0 0 3px rgba(255,183,197,0.2);}
        .event-bar{border-radius:8px;padding:2px 8px;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}
        .hour-row:hover{background:rgba(255,183,197,0.07);}
        .goal-item{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.7);border:1.5px solid rgba(255,183,197,0.2);transition:all 0.2s;}
        .goal-item:hover{transform:translateX(4px);box-shadow:0 2px 12px rgba(200,150,180,0.15);}
        .mood-btn{border:2px solid transparent;border-radius:50%;padding:4px;cursor:pointer;font-size:22px;transition:all 0.15s;background:none;}
        .mood-btn:hover{transform:scale(1.2);}
        .mood-btn.selected{border-color:#FFB7C5;background:rgba(255,183,197,0.2);transform:scale(1.15);}
        .tab-btn{border:none;cursor:pointer;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;transition:all 0.18s;font-family:inherit;}
        .job-row{background:rgba(255,255,255,0.7);border-radius:14px;border:1.5px solid rgba(255,183,197,0.2);margin-bottom:8px;overflow:hidden;transition:all 0.2s;}
        .job-row:hover{box-shadow:0 4px 16px rgba(200,150,180,0.15);}
        .day-cell{border-radius:12px;padding:5px 2px;text-align:center;cursor:pointer;border:1.5px solid transparent;transition:all 0.15s;user-select:none;}
        .day-cell:active{transform:scale(0.92);}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(200,150,180,0.3);border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{padding:"16px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.02em"}}>✿ My Planner</div>
          <div style={{fontSize:11,color:PASTEL.mid,marginTop:1}}>{selectedDate.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <SyncButton/>
          <div style={{fontSize:26}}>{EMOJI_CATS[currentDate.getMonth()%EMOJI_CATS.length]}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"14px 14px 110px"}}>
        {page==="monthly"&&<MonthlyPage currentDate={currentDate} setCurrentDate={setCurrentDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={events} openAddEvent={openAddEvent} setPage={setPage}/>}
        {page==="vertical"&&<VerticalPage selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={events} openAddEvent={openAddEvent} templates={templates} setTemplates={setTemplates}/>}
        {page==="report"&&<ReportPage selectedDate={selectedDate} setSelectedDate={setSelectedDate} todayReport={todayReport} editReport={editReport} setEditReport={setEditReport} saveReport={saveReport}/>}
        {page==="goals"&&<GoalsPage goals={goals} setGoals={setGoals} newGoal={newGoal} setNewGoal={setNewGoal} goalColor={goalColor} setGoalColor={setGoalColor} addGoal={addGoal}/>}
        {page==="diet"&&<DietPage bodyLogs={bodyLogs} setBodyLogs={setBodyLogs} sizeLogs={sizeLogs} setSizeLogs={setSizeLogs} mealLogs={mealLogs} setMealLogs={setMealLogs} selectedDate={selectedDate} setSelectedDate={setSelectedDate}/>}
        {page==="work"&&<WorkPage jobs={jobs} setJobs={setJobs} jobTypes={jobTypes} setJobTypes={setJobTypes} channels={channels} setChannels={setChannels}/>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(255,250,248,0.94)",backdropFilter:"blur(16px)",borderTop:"1.5px solid rgba(255,183,197,0.25)",display:"flex",justifyContent:"center",gap:2,padding:"8px 8px 14px",zIndex:100}}>
        {navItems.map(n=>(
          <button key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
            <span style={{fontSize:18}}>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </div>

      {/* ── Unified Event Modal ── */}
      {eventModal&&(
        <EventModal
          modal={eventModal} setModal={setEventModal}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// 体重グラフ用：測り忘れた日を前回値で埋める
// ════════════════════════════════════════════════
function fillBodyLogs(logs){
  if(logs.length<2)return logs;
  const sorted=[...logs].sort((a,b)=>a.date.localeCompare(b.date));
  const map=Object.fromEntries(sorted.map(l=>[l.date,l]));
  const result=[];
  let prev=sorted[0];
  const start=new Date(sorted[0].date);
  const end=new Date(sorted[sorted.length-1].date);
  for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if(map[key])prev=map[key];
    result.push({date:key,weight:prev.weight,fat:prev.fat,measured:!!map[key]});
  }
  return result;
}

// ════════════════════════════════════════════════
// helpers: minutes ↔ "HH:MM"
// ════════════════════════════════════════════════
const toMins=(h,m=0)=>h*60+m;
const fmtTime=(mins)=>`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;

// Build time options every 5 min
const TIME_OPTIONS=Array.from({length:24*60/5},(_,i)=>i*5); // 0,5,10,...1435

// TimePicker: select hours + minutes separately
function TimePicker({value,onChange,label}){
  const h=Math.floor(value/60);
  const m=value%60;
  return(
    <div style={{flex:1}}>
      <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>{label}</label>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <select value={h} onChange={e=>onChange(+e.target.value*60+m)} style={{flex:1,padding:"7px 6px",fontSize:13,textAlign:"center"}}>
          {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}</option>)}
        </select>
        <span style={{color:PASTEL.mid,fontWeight:700,flexShrink:0}}>:</span>
        <select value={m} onChange={e=>onChange(h*60+(+e.target.value))} style={{flex:1,padding:"7px 6px",fontSize:13,textAlign:"center"}}>
          {[0,5,10,15,20,25,30,35,40,45,50,55].map(v=><option key={v} value={v}>{String(v).padStart(2,"0")}</option>)}
        </select>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Event Modal (分単位・削除ボタン付き)
// ════════════════════════════════════════════════
function EventModal({modal,setModal,onSave,onDelete}){
  const normalize=(v)=>typeof v==="number"&&v<100?v*60:v;
  const raw=modal.event;
  const [ev,setEv]=useState({...raw, start:normalize(raw.start??9*60), end:normalize(raw.end??10*60)});
  const [isAllDay,setIsAllDay]=useState(!!raw.allDay);
  const isEdit=!!(modal.event.id);
  const [confirmDelete,setConfirmDelete]=useState(false);

  const duration=ev.end-ev.start;
  const durationLabel=duration>0?`${Math.floor(duration/60)}時間${duration%60?duration%60+"分":""}`:duration===0?"0分":"(終了>開始)";
  const canSave=ev.title&&(isAllDay||duration>0);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(61,44,53,0.38)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}}
      onClick={()=>setModal(null)}>
      <div style={{background:"rgba(255,250,248,0.98)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 36px",animation:"slideUp 0.25s ease",maxHeight:"92vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"rgba(200,150,180,0.3)",borderRadius:4,margin:"0 auto 18px"}}/>
        <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>{isEdit?"✏️ 予定を編集":"✦ 予定を追加"}</div>
        <div style={{fontSize:12,color:PASTEL.mid,marginBottom:14}}>
          📅 {modal.date.toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"short"})}
        </div>

        <input placeholder="タイトル（例：ヨガ、誕生日）" value={ev.title} onChange={e=>setEv({...ev,title:e.target.value})}
          style={{width:"100%",marginBottom:12,boxSizing:"border-box",fontSize:14,fontWeight:700}}/>

        {/* 終日トグル */}
        <div onClick={()=>setIsAllDay(!isAllDay)}
          style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer",userSelect:"none"}}>
          <div style={{width:38,height:22,borderRadius:11,background:isAllDay?PASTEL.pink:"rgba(200,150,180,0.2)",transition:"background 0.2s",position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:isAllDay?18:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.18)"}}/>
          </div>
          <span style={{fontSize:13,fontWeight:700,color:isAllDay?PASTEL.dark:PASTEL.mid}}>終日</span>
        </div>

        {/* 時間ピッカー（終日でないとき） */}
        {!isAllDay&&(
          <>
            <div style={{display:"flex",gap:10,marginBottom:4,alignItems:"flex-end"}}>
              <TimePicker label="⏰ 開始" value={ev.start} onChange={v=>setEv({...ev,start:v})}/>
              <span style={{color:PASTEL.mid,fontWeight:700,paddingBottom:9,flexShrink:0}}>〜</span>
              <TimePicker label="終了" value={ev.end} onChange={v=>setEv({...ev,end:v})}/>
            </div>
            <div style={{fontSize:11,color:duration>0?PASTEL.mid:"#FF8FAB",marginBottom:12,textAlign:"right",fontWeight:700}}>
              {duration>0?"⏱ "+durationLabel:"⚠ 終了時刻が開始より前です"}
            </div>
          </>
        )}

        <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:4}}>📝 メモ</label>
        <textarea value={ev.memo||""} onChange={e=>setEv({...ev,memo:e.target.value})} placeholder="場所・メモなど..." rows={2}
          style={{width:"100%",boxSizing:"border-box",resize:"none",marginBottom:12}}/>

        <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:6}}>🎨 カラー</label>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {EVENT_COLORS.map(c=>(
            <div key={c} onClick={()=>setEv({...ev,color:c})} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:ev.color===c?"2.5px solid #3D2C35":"2.5px solid transparent",transition:"all 0.15s",boxShadow:ev.color===c?"0 2px 8px rgba(0,0,0,0.15)":"none"}}/>
          ))}
        </div>

        {isEdit&&confirmDelete&&(
          <div style={{background:"rgba(255,183,197,0.2)",borderRadius:14,padding:"12px 14px",marginBottom:12,border:"1.5px solid rgba(255,183,197,0.5)"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>🗑 この予定を削除しますか？</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn-soft" onClick={()=>setConfirmDelete(false)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid,padding:"7px"}}>やめる</button>
              <button className="btn-soft" onClick={()=>onDelete(modal.date,ev.id)} style={{flex:1,background:"#FF8FAB",color:"#fff",padding:"7px"}}>削除する</button>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8}}>
          <button className="btn-soft" onClick={()=>setModal(null)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
          {isEdit&&!confirmDelete&&(
            <button className="btn-soft" onClick={()=>setConfirmDelete(true)}
              style={{background:"rgba(255,183,197,0.35)",color:"#c0607a",padding:"8px 14px",fontSize:13}}>🗑</button>
          )}
          <button className="btn-soft" onClick={()=>canSave&&onSave({...modal,event:{...ev,allDay:isAllDay}})}
            style={{flex:1,background:canSave?PASTEL.pink:"#ddd",color:"#fff",cursor:canSave?"pointer":"not-allowed"}}>
            {isEdit?"保存 ✓":"追加 ✦"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Monthly Page — 日付タップで詳細＆追加モーダル
// ════════════════════════════════════════════════
function MonthlyPage({currentDate,setCurrentDate,selectedDate,setSelectedDate,events,openAddEvent,setPage}){
  const [dayDetailDate,setDayDetailDate]=useState(null);
  const y=currentDate.getFullYear(),m=currentDate.getMonth();
  const first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate();
  const today=new Date();

  const handleDayTap=(d)=>{
    setSelectedDate(d);
    setDayDetailDate(d);
  };

  return(
    <div>
      <div className="card" style={{padding:"16px 20px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button className="btn-soft" onClick={()=>setCurrentDate(new Date(y,m-1,1))} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>‹</button>
          <div style={{fontWeight:900,fontSize:18}}>{y}年 {m+1}月</div>
          <button className="btn-soft" onClick={()=>setCurrentDate(new Date(y,m+1,1))} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
          {WEEK_DAYS.map((w,i)=><div key={w} style={{textAlign:"center",fontSize:11,fontWeight:700,color:i===0?"#FF8FAB":i===6?"#7B9BFF":PASTEL.mid,padding:"4px 0"}}>{w}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array.from({length:first}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:total}).map((_,i)=>{
            const d=new Date(y,m,i+1),key=dateKey(d);
            const dayEvs=events[key]||[];
            const isToday=d.toDateString()===today.toDateString();
            const isSel=d.toDateString()===selectedDate.toDateString();
            const isSun=d.getDay()===0;
            const isSat=d.getDay()===6;
            const isHoliday=!!HOLIDAYS[key];
            const numColor=isSel?"#fff":(isSun||isHoliday)?HOLIDAY_COLOR:isSat?"#7B9BFF":PASTEL.dark;
            const allDayEvs=dayEvs.filter(ev=>ev.allDay);
            const timedEvs=dayEvs.filter(ev=>!ev.allDay);
            return(
              <div key={i} className="day-cell" onClick={()=>handleDayTap(d)}
                style={{background:isSel?PASTEL.pink:isToday?"rgba(255,183,197,0.25)":"transparent",border:isToday&&!isSel?`1.5px solid ${PASTEL.pink}`:"1.5px solid transparent"}}>
                <div style={{fontSize:13,fontWeight:isToday||isSel?900:600,color:numColor}}>{i+1}</div>
                {/* 祝日バッジ */}
                {isHoliday&&!isSel&&<div style={{fontSize:7,color:HOLIDAY_COLOR,fontWeight:700,lineHeight:1,marginTop:1}}>祝</div>}
                {/* 終日予定：細いカラーバー */}
                {allDayEvs.slice(0,2).map((ev,ei)=>(
                  <div key={ei} style={{height:3,borderRadius:2,marginTop:1,background:isSel?"rgba(255,255,255,0.75)":ev.color}}/>
                ))}
                {/* 時間付き予定：ドット */}
                {timedEvs.length>0&&<div style={{display:"flex",justifyContent:"center",gap:2,marginTop:1}}>
                  {timedEvs.slice(0,3).map((ev,ei)=><div key={ei} style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,0.8)":ev.color}}/>)}
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day Detail Sheet ── */}
      {dayDetailDate&&(
        <DayDetailSheet
          date={dayDetailDate}
          events={events[dateKey(dayDetailDate)]||[]}
          onClose={()=>setDayDetailDate(null)}
          onAddEvent={()=>{ openAddEvent(dayDetailDate); setDayDetailDate(null); }}
          onEditEvent={(ev)=>{ openAddEvent(dayDetailDate,ev); setDayDetailDate(null); }}
          onGotoVertical={()=>{ setPage("vertical"); setDayDetailDate(null); }}
        />
      )}
    </div>
  );
}

function DayDetailSheet({date,events,onClose,onAddEvent,onEditEvent,onGotoVertical}){
  const key=dateKey(date);
  const holiday=HOLIDAYS[key];
  const allDayEvs=events.filter(ev=>ev.allDay);
  const timedEvs=events.filter(ev=>!ev.allDay);
  return(
    <div className="card" style={{padding:16,position:"relative",animation:"slideUp 0.2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:15}}>
          📅 {date.getMonth()+1}月{date.getDate()}日（{WEEK_DAYS[date.getDay()]}）
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="btn-soft" onClick={onGotoVertical} style={{background:PASTEL.sky,color:PASTEL.dark,padding:"5px 10px",fontSize:11}}>バーチカルへ →</button>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:18,color:PASTEL.mid,padding:"2px 6px"}}>×</button>
        </div>
      </div>

      {/* 終日エリア（祝日＋終日予定） */}
      {(holiday||allDayEvs.length>0)&&(
        <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:5}}>
          {holiday&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:10,background:HOLIDAY_COLOR+"22",borderLeft:`3px solid ${HOLIDAY_COLOR}`}}>
              <span style={{fontSize:13}}>🎌</span>
              <span style={{fontSize:13,fontWeight:800,color:HOLIDAY_COLOR}}>{holiday}</span>
            </div>
          )}
          {allDayEvs.map(ev=>(
            <div key={ev.id} onClick={()=>onEditEvent(ev)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:10,background:ev.color+"33",borderLeft:`3px solid ${ev.color}`,cursor:"pointer"}}>
              <span style={{fontSize:11,fontWeight:700,color:PASTEL.mid}}>終日</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800}}>{ev.title}</div>
                {ev.memo&&<div style={{fontSize:11,color:PASTEL.mid}}>{ev.memo}</div>}
              </div>
              <div style={{fontSize:11,color:PASTEL.mid}}>›</div>
            </div>
          ))}
        </div>
      )}

      {timedEvs.length===0&&!holiday&&allDayEvs.length===0
        ?<div style={{color:PASTEL.mid,fontSize:13,textAlign:"center",padding:"14px 0"}}>予定なし 🌸</div>
        :timedEvs.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {timedEvs.map(ev=>(
            <div key={ev.id} onClick={()=>onEditEvent(ev)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderRadius:10,background:ev.color+"33",borderLeft:`3px solid ${ev.color}`,cursor:"pointer"}}>
              <div style={{flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:700,color:PASTEL.mid}}>{fmtTime(typeof ev.start<100?ev.start*60:ev.start)}</div>
                <div style={{fontSize:10,color:PASTEL.mid}}>〜{fmtTime(typeof ev.end<100?ev.end*60:ev.end)}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800}}>{ev.title}</div>
                {ev.memo&&<div style={{fontSize:11,color:PASTEL.mid,marginTop:2}}>{ev.memo}</div>}
              </div>
              <div style={{fontSize:11,color:PASTEL.mid}}>›</div>
            </div>
          ))}
        </div>
      }
      <button className="btn-soft" onClick={onAddEvent} style={{width:"100%",background:PASTEL.pink,color:"#fff",padding:"10px"}}>＋ 予定を追加</button>
    </div>
  );
}

// ════════════════════════════════════════════════
// 重なり検出：各イベントに col / numCols を付与
// ════════════════════════════════════════════════
function layoutEvents(events){
  if(!events.length)return[];
  // 開始時刻順にソート（同じなら終了時刻が遅い方を先に）
  const sorted=[...events].sort((a,b)=>a.startM!==b.startM?a.startM-b.startM:b.endM-a.endM);
  // 貪欲法でカラム割り当て（cols[i] = そのカラムの最後のイベントの終了時刻）
  const cols=[];
  const withCol=sorted.map(ev=>{
    let col=cols.findIndex(end=>end<=ev.startM);
    if(col===-1){col=cols.length;cols.push(ev.endM);}
    else cols[col]=ev.endM;
    return{...ev,col};
  });
  // 各イベントの numCols = 同時間帯に重なる全イベントの中で最大カラム番号+1
  return withCol.map(ev=>{
    const overlapping=withCol.filter(o=>o.startM<ev.endM&&o.endM>ev.startM);
    const numCols=Math.max(...overlapping.map(o=>o.col))+1;
    return{...ev,numCols};
  });
}

// ════════════════════════════════════════════════
// Vertical Page — 分単位表示対応
// ════════════════════════════════════════════════
function VerticalPage({selectedDate,setSelectedDate,events,openAddEvent,templates,setTemplates}){
  const [showTemplates,setShowTemplates]=useState(false);
  const key=dateKey(selectedDate);
  const dayEvents=events[key]||[];
  const MIN_H=56/60; // px per minute
  const HOUR_H=56;   // px per hour
  const prev=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-1);setSelectedDate(d);};
  const next=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()+1);setSelectedDate(d);};

  // normalize event start/end to minutes、終日と時間付きを分離
  const allDayEvs=dayEvents.filter(ev=>ev.allDay);
  const normEvs=dayEvents.filter(ev=>!ev.allDay).map(ev=>({
    ...ev,
    startM:typeof ev.start==="number"&&ev.start<100?ev.start*60:ev.start,
    endM:typeof ev.end==="number"&&ev.end<100?ev.end*60:ev.end,
  }));
  const holiday=HOLIDAYS[key];

  // now line: 現在時刻（1分ごとに更新）
  const [nowMins,setNowMins]=useState(()=>{const n=new Date();return n.getHours()*60+n.getMinutes();});
  useEffect(()=>{
    const tick=()=>{const n=new Date();setNowMins(n.getHours()*60+n.getMinutes());};
    const id=setInterval(tick,60000);
    return()=>clearInterval(id);
  },[]);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button className="btn-soft" onClick={prev} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>‹</button>
        <div style={{fontWeight:900,fontSize:15}}>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{WEEK_DAYS[selectedDate.getDay()]}）</div>
        <button className="btn-soft" onClick={next} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>›</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button className="btn-soft" onClick={()=>openAddEvent(selectedDate)} style={{flex:1,background:PASTEL.pink,color:"#fff",padding:"8px"}}>＋ 予定追加</button>
        <button className="btn-soft" onClick={()=>setShowTemplates(!showTemplates)} style={{background:showTemplates?PASTEL.lavender:"rgba(255,255,255,0.8)",color:showTemplates?"#fff":PASTEL.mid,padding:"8px 12px"}}>🔁 テンプレ</button>
      </div>

      {showTemplates&&<TemplatePanel templates={templates} setTemplates={setTemplates}/>}

      {/* ── 終日エリア ── */}
      {(holiday||allDayEvs.length>0)&&(
        <div className="card" style={{padding:"8px 12px",marginBottom:8,display:"flex",flexDirection:"column",gap:5}}>
          {holiday&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,background:HOLIDAY_COLOR+"22",borderLeft:`3px solid ${HOLIDAY_COLOR}`}}>
              <span style={{fontSize:12}}>🎌</span>
              <span style={{fontSize:12,fontWeight:800,color:HOLIDAY_COLOR}}>{holiday}</span>
            </div>
          )}
          {allDayEvs.map(ev=>(
            <div key={ev.id} onClick={()=>openAddEvent(selectedDate,ev)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,background:ev.color+"33",borderLeft:`3px solid ${ev.color}`,cursor:"pointer"}}>
              <span style={{fontSize:10,fontWeight:700,color:PASTEL.mid,flexShrink:0}}>終日</span>
              <span style={{fontSize:12,fontWeight:800,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</span>
              <span style={{fontSize:10,color:PASTEL.mid}}>›</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowY:"auto",maxHeight:"62vh",position:"relative"}}>
          {/* Total height = 24 hours */}
          <div style={{position:"relative",height:HOUR_H*24}}>

            {/* Hour grid lines + labels */}
            {Array.from({length:24},(_,h)=>(
              <div key={h} style={{position:"absolute",top:h*HOUR_H,left:0,right:0,height:HOUR_H,borderBottom:"1px solid rgba(255,183,197,0.12)",pointerEvents:"none"}}>
                <div style={{position:"absolute",left:0,top:4,width:44,fontSize:11,fontWeight:700,textAlign:"right",paddingRight:8,color:h===0||h===12?"#FFB7C5":PASTEL.mid}}>{String(h).padStart(2,"0")}:00</div>
                {/* 30-min sub-line */}
                <div style={{position:"absolute",top:HOUR_H/2,left:44,right:0,borderBottom:"1px dashed rgba(255,183,197,0.07)"}}/>
              </div>
            ))}

            {/* Now indicator */}
            <div style={{position:"absolute",left:44,right:0,top:nowMins*MIN_H,height:2,background:PASTEL.pink,zIndex:10,boxShadow:`0 0 8px ${PASTEL.pink}`,pointerEvents:"none"}}>
              <div style={{position:"absolute",left:-6,top:-4,width:10,height:10,borderRadius:"50%",background:PASTEL.pink}}/>
            </div>

            {/* Events — 重なり防止レイアウト */}
            {layoutEvents(normEvs).map((ev)=>{
              const top=ev.startM*MIN_H;
              const height=Math.max((ev.endM-ev.startM)*MIN_H-3,18);
              const showTime=height>=22;
              const showMemo=height>=40&&ev.memo;
              // 利用可能幅 = 100% - 50px(時刻ラベル) - 6px(右余白) = calc(100% - 56px)
              // 各カラム幅 = 利用可能幅 / numCols、カラム間に2pxのギャップ
              const leftPct=ev.col/ev.numCols;
              const widthPct=1/ev.numCols;
              return(
                <div key={ev.id} onClick={()=>openAddEvent(selectedDate,ev)} style={{
                  position:"absolute",
                  top,
                  left:`calc(50px + ${leftPct} * (100% - 56px))`,
                  width:`calc(${widthPct} * (100% - 56px) - 2px)`,
                  height,
                  zIndex:5+ev.col,
                  background:ev.color,borderRadius:8,
                  padding:"3px 6px",
                  fontSize:11,fontWeight:700,
                  color:"rgba(61,44,53,0.85)",
                  boxShadow:`0 2px 8px ${ev.color}66`,
                  cursor:"pointer",overflow:"hidden",
                  border:`1.5px solid rgba(255,255,255,0.6)`,
                  boxSizing:"border-box",
                }}>
                  <div style={{fontWeight:800,fontSize:showTime?11:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</div>
                  {showTime&&<div style={{fontSize:9,opacity:0.75,marginTop:1}}>{fmtTime(ev.startM)}〜{fmtTime(ev.endM)}</div>}
                  {showMemo&&<div style={{fontSize:9,opacity:0.7,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.memo}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Template Panel — 繰り返し予定テンプレ管理
// ════════════════════════════════════════════════
function TemplatePanel({templates,setTemplates}){
  const [showForm,setShowForm]=useState(false);
  const emptyForm={title:"",dayOfWeek:1,start:9*60,end:10*60,color:PASTEL.pink,memo:""};
  const [form,setForm]=useState(emptyForm);

  // 既存テンプレの start/end を分単位に正規化（旧データ互換）
  const normalize=(v)=>typeof v==="number"&&v<100?v*60:v;

  const saveTemplate=()=>{
    if(!form.title)return;
    setTemplates([...templates,{...form,id:Date.now()}]);
    setShowForm(false);
    setForm(emptyForm);
  };

  const duration=form.end-form.start;

  return(
    <div className="card" style={{padding:14,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontWeight:800,fontSize:13}}>🔁 繰り返しテンプレ</span>
        <button className="btn-soft" onClick={()=>setShowForm(!showForm)} style={{background:PASTEL.lavender,color:"#fff",padding:"4px 12px",fontSize:12}}>＋ 追加</button>
      </div>

      {templates.length===0&&!showForm&&<div style={{fontSize:12,color:PASTEL.mid,textAlign:"center",padding:"8px 0"}}>テンプレなし</div>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {templates.map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,background:t.color+"33",borderLeft:`3px solid ${t.color}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:800}}>{t.title}</div>
              <div style={{fontSize:10,color:PASTEL.mid}}>毎週{WEEK_DAYS[t.dayOfWeek]}　{fmtTime(normalize(t.start))}〜{fmtTime(normalize(t.end))}{t.memo?` ・ ${t.memo}`:""}</div>
            </div>
            <button onClick={()=>setTemplates(templates.filter(x=>x.id!==t.id))} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,color:"rgba(200,150,180,0.6)",padding:2}}>×</button>
          </div>
        ))}
      </div>

      {showForm&&(
        <div style={{marginTop:12,borderTop:"1px solid rgba(255,183,197,0.2)",paddingTop:12}}>
          <input placeholder="予定のタイトル" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{width:"100%",marginBottom:8,boxSizing:"border-box"}}/>

          <div style={{marginBottom:8}}>
            <label style={{fontSize:10,color:PASTEL.mid,display:"block",marginBottom:4}}>曜日</label>
            <select value={form.dayOfWeek} onChange={e=>setForm({...form,dayOfWeek:+e.target.value})} style={{width:"100%",fontSize:12}}>
              {WEEK_DAYS.map((w,i)=><option key={i} value={i}>{w}曜日</option>)}
            </select>
          </div>

          <div style={{display:"flex",gap:10,marginBottom:4,alignItems:"flex-end"}}>
            <TimePicker label="⏰ 開始" value={form.start} onChange={v=>setForm({...form,start:v})}/>
            <span style={{color:PASTEL.mid,fontWeight:700,paddingBottom:9,flexShrink:0}}>〜</span>
            <TimePicker label="終了" value={form.end} onChange={v=>setForm({...form,end:v})}/>
          </div>
          <div style={{fontSize:11,color:duration>0?PASTEL.mid:"#FF8FAB",marginBottom:8,textAlign:"right",fontWeight:700}}>
            {duration>0?`⏱ ${Math.floor(duration/60)}時間${duration%60?duration%60+"分":""}`:"⚠ 終了時刻が開始より前です"}
          </div>

          <input placeholder="メモ（任意）" value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} style={{width:"100%",marginBottom:8,boxSizing:"border-box",fontSize:12}}/>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {EVENT_COLORS.map(c=><div key={c} onClick={()=>setForm({...form,color:c})} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"2.5px solid #3D2C35":"2px solid transparent"}}/>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn-soft" onClick={()=>setShowForm(false)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid,padding:"7px",fontSize:12}}>キャンセル</button>
            <button className="btn-soft" onClick={saveTemplate}
              style={{flex:1,background:duration>0?PASTEL.lavender:"#ddd",color:"#fff",padding:"7px",fontSize:12,cursor:duration>0?"pointer":"not-allowed"}}>
              追加 ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// Report Page
// ════════════════════════════════════════════════
function ReportPage({selectedDate,setSelectedDate,todayReport,editReport,setEditReport,saveReport}){
  const prev=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-1);setSelectedDate(d);};
  const next=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()+1);setSelectedDate(d);};
  const cur=editReport||todayReport;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button className="btn-soft" onClick={prev} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>‹</button>
        <div style={{fontWeight:900,fontSize:15}}>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日の日報</div>
        <button className="btn-soft" onClick={next} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>›</button>
      </div>
      <div className="card" style={{padding:20,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>今日の気分 {cur.mood}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {MOODS.map(m=><button key={m} className={`mood-btn ${cur.mood===m?"selected":""}`} onClick={()=>setEditReport({...cur,mood:m})}>{m}</button>)}
        </div>
      </div>
      <div className="card" style={{padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontWeight:800,fontSize:14}}>📝 振り返り</span>
          {!editReport&&<button className="btn-soft" onClick={()=>setEditReport({...todayReport})} style={{background:PASTEL.lavender+"66",color:PASTEL.dark,padding:"4px 12px",fontSize:12}}>編集</button>}
        </div>
        <Section label="🌟 良かったこと" value={cur.good} onChange={editReport?v=>setEditReport({...editReport,good:v}):null}/>
        <Section label="💡 改善したいこと" value={cur.improve} onChange={editReport?v=>setEditReport({...editReport,improve:v}):null}/>
        <Section label="🎯 明日やること" value={cur.tomorrow} onChange={editReport?v=>setEditReport({...editReport,tomorrow:v}):null}/>
        {editReport&&<div style={{display:"flex",gap:8,marginTop:12}}>
          <button className="btn-soft" onClick={()=>setEditReport(null)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
          <button className="btn-soft" onClick={saveReport} style={{flex:1,background:PASTEL.mint,color:PASTEL.dark}}>保存 ✓</button>
        </div>}
      </div>
    </div>
  );
}
function Section({label,value,onChange}){
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:PASTEL.mid}}>{label}</div>
      {onChange
        ?<textarea value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",minHeight:70,resize:"vertical",boxSizing:"border-box",fontSize:13}}/>
        :<div style={{background:"rgba(255,250,248,0.8)",borderRadius:10,padding:"10px 12px",fontSize:13,lineHeight:1.7,color:value?PASTEL.dark:PASTEL.mid,minHeight:44,border:"1px solid rgba(255,183,197,0.2)"}}>{value||"まだ記録がありません 🌸"}</div>
      }
    </div>
  );
}

// ════════════════════════════════════════════════
// Goals Page
// ════════════════════════════════════════════════
function GoalsPage({goals,setGoals,newGoal,setNewGoal,goalColor,setGoalColor,addGoal}){
  const toggle=(id)=>setGoals(goals.map(g=>g.id===id?{...g,done:!g.done}:g));
  const remove=(id)=>setGoals(goals.filter(g=>g.id!==id));
  const done=goals.filter(g=>g.done).length;
  const pct=goals.length?Math.round(done/goals.length*100):0;
  return(
    <div>
      <div className="card" style={{padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:800,fontSize:14}}>🌟 目標達成度</span>
          <span style={{fontWeight:900,fontSize:22,color:PASTEL.pink}}>{pct}%</span>
        </div>
        <div style={{height:10,background:"rgba(255,183,197,0.2)",borderRadius:10,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${PASTEL.pink},${PASTEL.lavender})`,borderRadius:10,transition:"width 0.4s ease"}}/>
        </div>
        <div style={{fontSize:12,color:PASTEL.mid,marginTop:6}}>{done} / {goals.length} 達成 ✨</div>
      </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📋 目標リスト</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {goals.map(g=>(
            <div key={g.id} className="goal-item" style={{background:g.done?`${g.color}22`:"rgba(255,255,255,0.7)",borderLeft:`3px solid ${g.color}`,opacity:g.done?0.7:1}}>
              <button onClick={()=>toggle(g.id)} style={{width:22,height:22,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${g.color}`,background:g.done?g.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",transition:"all 0.15s"}}>{g.done?"✓":""}</button>
              <span style={{flex:1,fontSize:13,fontWeight:600,textDecoration:g.done?"line-through":"none",color:g.done?PASTEL.mid:PASTEL.dark}}>{g.text}</span>
              <button onClick={()=>remove(g.id)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,color:"rgba(200,150,180,0.5)",padding:2}}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>＋ 新しい目標</div>
        <input placeholder="目標を入力..." value={newGoal} onChange={e=>setNewGoal(e.target.value)} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&addGoal()}/>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {EVENT_COLORS.map(c=><div key={c} onClick={()=>setGoalColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:goalColor===c?"2.5px solid #3D2C35":"2px solid transparent",transition:"all 0.15s"}}/>)}
        </div>
        <button className="btn-soft" onClick={addGoal} style={{width:"100%",background:PASTEL.pink,color:"#fff",padding:"10px"}}>目標を追加 🌸</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Diet Page — 写真を月ごとに管理
// ════════════════════════════════════════════════
function DietPage({bodyLogs,setBodyLogs,sizeLogs,setSizeLogs,mealLogs,setMealLogs,selectedDate,setSelectedDate}){
  const [tab,setTab]=useState("daily");
  const [showBodyForm,setShowBodyForm]=useState(false);
  const [showSizeForm,setShowSizeForm]=useState(false);
  const [bodyForm,setBodyForm]=useState({date:"",weight:"",fat:""});
  const [sizeForm,setSizeForm]=useState({month:"",bust:"",waist:"",belly:"",thighL:"",thighR:""});
  const [editMeal,setEditMeal]=useState(null);
  const [mealForm,setMealForm]=useState({morning:"",lunch:"",dinner:"",snack:""});
  // 写真ビューア用
  const [photoMonth,setPhotoMonth]=useState(null);
  const key=dateKey(selectedDate);
  const todayMeal=mealLogs[key]||{morning:"",lunch:"",dinner:"",snack:""};
  const prev=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-1);setSelectedDate(d);};
  const next=()=>{const d=new Date(selectedDate);d.setDate(d.getDate()+1);setSelectedDate(d);};
  const latest=bodyLogs[bodyLogs.length-1];
  const first=bodyLogs[0];
  const weightDiff=latest&&first?((latest.weight-first.weight).toFixed(1)):0;
  const latestSize=sizeLogs[sizeLogs.length-1];

  const saveBody=()=>{
    if(!bodyForm.weight||!bodyForm.date)return;
    const existing=bodyLogs.findIndex(l=>l.date===bodyForm.date);
    const entry={date:bodyForm.date,weight:parseFloat(bodyForm.weight),fat:parseFloat(bodyForm.fat)||0};
    if(existing>=0){const n=[...bodyLogs];n[existing]=entry;setBodyLogs(n);}
    else setBodyLogs([...bodyLogs,entry].sort((a,b)=>a.date.localeCompare(b.date)));
    setShowBodyForm(false);setBodyForm({date:"",weight:"",fat:""});
  };
  const saveSize=()=>{
    if(!sizeForm.month)return;
    const existing=sizeLogs.findIndex(l=>l.month===sizeForm.month);
    const entry={month:sizeForm.month,bust:+sizeForm.bust||0,waist:+sizeForm.waist||0,belly:+sizeForm.belly||0,thighL:+sizeForm.thighL||0,thighR:+sizeForm.thighR||0,photos:existing>=0?sizeLogs[existing].photos:{front:null,side:null,back:null}};
    if(existing>=0){const n=[...sizeLogs];n[existing]=entry;setSizeLogs(n);}
    else setSizeLogs([...sizeLogs,entry].sort((a,b)=>a.month.localeCompare(b.month)));
    setShowSizeForm(false);setSizeForm({month:"",bust:"",waist:"",belly:"",thighL:"",thighR:""});
  };
  const saveMeal=()=>{ setMealLogs({...mealLogs,[key]:mealForm}); setEditMeal(null); };

  // 写真を特定月に保存
  const savePhoto=(month,slot,url)=>{
    setSizeLogs(sizeLogs.map(s=>{
      if(s.month!==month)return s;
      return {...s,photos:{...(s.photos||{front:null,side:null,back:null}),[slot]:url}};
    }));
  };

  const tabs=[{id:"daily",label:"📅 毎日"},{id:"graph",label:"📈 グラフ"},{id:"size",label:"📏 サイズ"},{id:"photo",label:"📷 写真比較"}];

  return(
    <div>
      <div className="card" style={{padding:"14px 16px",marginBottom:12,display:"flex",justifyContent:"space-around"}}>
        <StatBubble label="体重" value={latest?`${latest.weight}kg`:"--"} sub={weightDiff>0?`+${weightDiff}`:weightDiff+"kg"}/>
        <StatBubble label="体脂肪" value={latest?`${latest.fat}%`:"--"} sub=""/>
        <StatBubble label="ウエスト" value={latestSize?`${latestSize.waist}cm`:"--"} sub=""/>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {tabs.map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?PASTEL.pink:"rgba(255,255,255,0.7)",color:tab===t.id?"#fff":PASTEL.mid}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="daily"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <button className="btn-soft" onClick={prev} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>‹</button>
            <div style={{fontWeight:800,fontSize:14}}>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日</div>
            <button className="btn-soft" onClick={next} style={{background:PASTEL.light,color:PASTEL.mid,padding:"6px 14px"}}>›</button>
          </div>
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontWeight:800,fontSize:14}}>⚖️ 体重・体脂肪</span>
              <button className="btn-soft" onClick={()=>{setBodyForm({date:key,weight:latest?.weight||"",fat:latest?.fat||""});setShowBodyForm(true);}} style={{background:PASTEL.pink,color:"#fff",padding:"5px 12px",fontSize:12}}>記録</button>
            </div>
            {(()=>{const log=bodyLogs.find(l=>l.date===key);return log?(
              <div style={{display:"flex",gap:12}}>
                <div style={{flex:1,background:PASTEL.pink+"33",borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:PASTEL.mid,marginBottom:4}}>体重</div>
                  <div style={{fontSize:22,fontWeight:900}}>{log.weight}<span style={{fontSize:13}}>kg</span></div>
                </div>
                <div style={{flex:1,background:PASTEL.lavender+"33",borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:PASTEL.mid,marginBottom:4}}>体脂肪率</div>
                  <div style={{fontSize:22,fontWeight:900}}>{log.fat}<span style={{fontSize:13}}>%</span></div>
                </div>
              </div>
            ):<div style={{textAlign:"center",color:PASTEL.mid,fontSize:13,padding:"12px 0"}}>今日の記録はまだありません 🌿</div>;})()}
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontWeight:800,fontSize:14}}>🍽️ 食事記録</span>
              {!editMeal&&<button className="btn-soft" onClick={()=>{setMealForm({...todayMeal});setEditMeal(true);}} style={{background:PASTEL.peach,color:PASTEL.dark,padding:"5px 12px",fontSize:12}}>編集</button>}
            </div>
            {editMeal?(
              <div>
                {[["morning","🌅 朝食"],["lunch","☀️ 昼食"],["dinner","🌙 夕食"],["snack","🍡 間食"]].map(([k,label])=>(
                  <div key={k} style={{marginBottom:10}}>
                    <label style={{fontSize:12,fontWeight:700,color:PASTEL.mid,display:"block",marginBottom:4}}>{label}</label>
                    <input value={mealForm[k]} onChange={e=>setMealForm({...mealForm,[k]:e.target.value})} placeholder="食べたものを入力..." style={{width:"100%",boxSizing:"border-box"}}/>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button className="btn-soft" onClick={()=>setEditMeal(null)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
                  <button className="btn-soft" onClick={saveMeal} style={{flex:1,background:PASTEL.mint,color:PASTEL.dark}}>保存 ✓</button>
                </div>
              </div>
            ):(
              <div>
                {[["morning","🌅 朝食"],["lunch","☀️ 昼食"],["dinner","🌙 夕食"],["snack","🍡 間食"]].map(([k,label])=>(
                  <div key={k} style={{marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:PASTEL.mid,marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,color:todayMeal[k]?PASTEL.dark:PASTEL.mid,background:"rgba(255,250,248,0.8)",borderRadius:8,padding:"7px 10px",border:"1px solid rgba(255,183,197,0.15)"}}>{todayMeal[k]||"記録なし"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="graph"&&(
        <div>
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📈 体重推移</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={fillBodyLogs(bodyLogs)} margin={{top:5,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,183,197,0.2)"/>
                <XAxis dataKey="date" tick={{fontSize:9,fill:PASTEL.mid}} tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                <YAxis tick={{fontSize:9,fill:PASTEL.mid}} domain={["dataMin - 1","dataMax + 1"]}/>
                <Tooltip contentStyle={{borderRadius:12,border:`1px solid ${PASTEL.pink}`,fontSize:12}}
                  formatter={(v,n,p)=>[`${v}kg`, p.payload.measured?"体重(実測)":"体重(引継)"]}/>
                <Line type="monotone" dataKey="weight" stroke={PASTEL.pink} strokeWidth={2.5}
                  dot={(props)=>props.payload.measured?<circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={PASTEL.pink} stroke="#fff" strokeWidth={1.5}/>:<g key={props.key}/>}
                  activeDot={{r:5,fill:PASTEL.pink}} name="体重(kg)"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📈 体脂肪率推移</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={fillBodyLogs(bodyLogs)} margin={{top:5,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,184,255,0.2)"/>
                <XAxis dataKey="date" tick={{fontSize:9,fill:PASTEL.mid}} tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                <YAxis tick={{fontSize:9,fill:PASTEL.mid}} domain={["dataMin - 1","dataMax + 1"]}/>
                <Tooltip contentStyle={{borderRadius:12,border:`1px solid ${PASTEL.lavender}`,fontSize:12}}
                  formatter={(v,n,p)=>[`${v}%`, p.payload.measured?"体脂肪(実測)":"体脂肪(引継)"]}/>
                <Line type="monotone" dataKey="fat" stroke={PASTEL.lavender} strokeWidth={2.5}
                  dot={(props)=>props.payload.measured?<circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={PASTEL.lavender} stroke="#fff" strokeWidth={1.5}/>:<g key={props.key}/>}
                  activeDot={{r:5,fill:PASTEL.lavender}} name="体脂肪率(%)"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:10}}>📋 記録一覧</div>
            {[...bodyLogs].reverse().slice(0,8).map((l,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:10,background:"rgba(255,250,248,0.8)",marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:700,color:PASTEL.mid}}>{l.date}</span>
                <div style={{display:"flex",gap:12}}>
                  <span style={{fontSize:13,fontWeight:800,color:PASTEL.pink}}>{l.weight}kg</span>
                  <span style={{fontSize:13,fontWeight:800,color:PASTEL.lavender}}>{l.fat}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="size"&&(
        <div>
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontWeight:800,fontSize:14}}>📏 ボディサイズ（月一）</span>
              <button className="btn-soft" onClick={()=>{setSizeForm({month:"",bust:"",waist:"",belly:"",thighL:"",thighR:""});setShowSizeForm(true);}} style={{background:PASTEL.mint,color:PASTEL.dark,padding:"5px 12px",fontSize:12}}>記録</button>
            </div>
            {sizeLogs.length===0
              ?<div style={{textAlign:"center",color:PASTEL.mid,fontSize:13}}>記録がありません</div>
              :[...sizeLogs].reverse().map((s,i)=>(
                <div key={i} style={{marginBottom:i<sizeLogs.length-1?18:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:800,color:PASTEL.mid}}>{s.month.replace("-","年")}月</span>
                    <button className="btn-soft" onClick={()=>setPhotoMonth(s.month)} style={{background:PASTEL.sky,color:PASTEL.dark,padding:"4px 10px",fontSize:11}}>📷 写真</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[["バスト",s.bust],["ウエスト",s.waist],["お腹",s.belly],["太もも左",s.thighL],["太もも右",s.thighR]].map(([label,val])=>(
                      <div key={label} style={{background:"rgba(255,250,248,0.9)",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid rgba(255,183,197,0.2)"}}>
                        <div style={{fontSize:10,color:PASTEL.mid,marginBottom:2}}>{label}</div>
                        <div style={{fontSize:16,fontWeight:900}}>{val}<span style={{fontSize:10}}>cm</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
          {sizeLogs.length>=2&&(
            <div className="card" style={{padding:16}}>
              <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📈 サイズ推移</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sizeLogs} margin={{top:5,right:10,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,183,197,0.2)"/>
                  <XAxis dataKey="month" tick={{fontSize:9,fill:PASTEL.mid}} tickFormatter={v=>v.slice(5)+"月"}/>
                  <YAxis tick={{fontSize:9,fill:PASTEL.mid}} domain={["dataMin - 2","dataMax + 2"]}/>
                  <Tooltip contentStyle={{borderRadius:12,fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                  <Line type="monotone" dataKey="bust" stroke={PASTEL.pink} strokeWidth={2} dot={{r:3}} name="バスト"/>
                  <Line type="monotone" dataKey="waist" stroke={PASTEL.lavender} strokeWidth={2} dot={{r:3}} name="ウエスト"/>
                  <Line type="monotone" dataKey="belly" stroke={PASTEL.mint} strokeWidth={2} dot={{r:3}} name="お腹"/>
                  <Line type="monotone" dataKey="thighL" stroke={PASTEL.peach} strokeWidth={2} dot={{r:3}} name="太もも"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab==="photo"&&(
        <PhotoCompareTab sizeLogs={sizeLogs} setSizeLogs={setSizeLogs} savePhoto={savePhoto}/>
      )}

      {/* Body modal */}
      {showBodyForm&&(
        <Modal title="⚖️ 体重・体脂肪を記録" onClose={()=>setShowBodyForm(false)}>
          <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:4}}>日付</label>
          <input type="date" value={bodyForm.date} onChange={e=>setBodyForm({...bodyForm,date:e.target.value})} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <div style={{flex:1}}>
              <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:4}}>体重 (kg)</label>
              <input type="number" step="0.1" value={bodyForm.weight} onChange={e=>setBodyForm({...bodyForm,weight:e.target.value})} placeholder="55.0" style={{width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:4}}>体脂肪率 (%)</label>
              <input type="number" step="0.1" value={bodyForm.fat} onChange={e=>setBodyForm({...bodyForm,fat:e.target.value})} placeholder="25.0" style={{width:"100%",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-soft" onClick={()=>setShowBodyForm(false)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
            <button className="btn-soft" onClick={saveBody} style={{flex:1,background:PASTEL.pink,color:"#fff"}}>保存 ✓</button>
          </div>
        </Modal>
      )}

      {/* Size modal */}
      {showSizeForm&&(
        <Modal title="📏 ボディサイズを記録" onClose={()=>setShowSizeForm(false)}>
          <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:4}}>年月</label>
          <input type="month" value={sizeForm.month} onChange={e=>setSizeForm({...sizeForm,month:e.target.value})} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[["bust","バスト"],["waist","ウエスト"],["belly","お腹"],["thighL","太もも(左)"],["thighR","太もも(右)"]].map(([k,label])=>(
              <div key={k}>
                <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>{label} (cm)</label>
                <input type="number" value={sizeForm[k]} onChange={e=>setSizeForm({...sizeForm,[k]:e.target.value})} placeholder="--" style={{width:"100%",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-soft" onClick={()=>setShowSizeForm(false)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
            <button className="btn-soft" onClick={saveSize} style={{flex:1,background:PASTEL.mint,color:PASTEL.dark}}>保存 ✓</button>
          </div>
        </Modal>
      )}

      {/* Photo modal per month */}
      {photoMonth&&(
        <Modal title={`📷 ${photoMonth.replace("-","年")}月 ボディ写真`} onClose={()=>setPhotoMonth(null)}>
          <MonthPhotoPanel
            sizeLog={sizeLogs.find(s=>s.month===photoMonth)}
            onSave={(slot,url)=>savePhoto(photoMonth,slot,url)}
          />
        </Modal>
      )}
    </div>
  );
}

function MonthPhotoPanel({sizeLog,onSave}){
  const photos=sizeLog?.photos||{front:null,side:null,back:null};
  const refs={front:useRef(),side:useRef(),back:useRef()};
  const handleFile=(slot,e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const url=URL.createObjectURL(file);
    onSave(slot,url);
  };
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {[["front","正面"],["side","横"],["back","後ろ"]].map(([slot,label])=>(
        <div key={slot}>
          <div style={{fontSize:11,fontWeight:700,color:PASTEL.mid,textAlign:"center",marginBottom:6}}>{label}</div>
          <div onClick={()=>refs[slot].current.click()} style={{aspectRatio:"3/4",borderRadius:12,overflow:"hidden",cursor:"pointer",background:photos[slot]?"transparent":"rgba(255,183,197,0.12)",border:`2px dashed ${photos[slot]?"transparent":PASTEL.pink}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {photos[slot]
              ?<img src={photos[slot]} alt={label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{textAlign:"center",color:PASTEL.mid}}><div style={{fontSize:24}}>📷</div><div style={{fontSize:10}}>タップ</div></div>
            }
          </div>
          <input ref={refs[slot]} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(slot,e)}/>
          {photos[slot]&&<button className="btn-soft" onClick={()=>onSave(slot,null)} style={{width:"100%",marginTop:4,background:PASTEL.light,color:PASTEL.mid,fontSize:10,padding:"4px"}}>削除</button>}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════
// Photo Compare Tab — 月×アングルで写真を並べて比較
// ════════════════════════════════════════════════
function PhotoCompareTab({sizeLogs,setSizeLogs,savePhoto}){
  const [view,setView]=useState("grid");
  const [compareAngle,setCompareAngle]=useState("front");
  const [lightbox,setLightbox]=useState(null);
  const [uploadMonth,setUploadMonth]=useState(null);
  const [uploadSlot,setUploadSlot]=useState(null);
  const fileRef=useRef();

  const allMonths=[...sizeLogs].sort((a,b)=>a.month.localeCompare(b.month));
  const slots=[["front","正面"],["side","横"],["back","後ろ"]];

  const triggerUpload=(month,slot)=>{
    setUploadMonth(month);
    setUploadSlot(slot);
    fileRef.current.click();
  };
  const handleFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file||!uploadMonth||!uploadSlot)return;
    const url=URL.createObjectURL(file);
    savePhoto(uploadMonth,uploadSlot,url);
    e.target.value="";
  };
  const handleDelete=(month,slot)=>savePhoto(month,slot,null);

  const addPhotoOnlyMonth=(month)=>{
    if(sizeLogs.find(s=>s.month===month))return;
    setSizeLogs(prev=>[...prev,{month,bust:0,waist:0,belly:0,thighL:0,thighR:0,photos:{front:null,side:null,back:null}}].sort((a,b)=>a.month.localeCompare(b.month)));
  };

  const [newMonth,setNewMonth]=useState("");
  const handleAddMonth=()=>{
    if(!newMonth)return;
    addPhotoOnlyMonth(newMonth);
    setNewMonth("");
  };

  return(
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>

      {lightbox&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:20}}
          onClick={()=>setLightbox(null)}>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginBottom:10}}>{lightbox.label}　タップで閉じる</div>
          <img src={lightbox.url} alt={lightbox.label} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:16,objectFit:"contain",boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}/>
        </div>
      )}

      <div className="card" style={{padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <button className="tab-btn" onClick={()=>setView("grid")}
            style={{background:view==="grid"?PASTEL.pink:"rgba(255,255,255,0.7)",color:view==="grid"?"#fff":PASTEL.mid,flex:1}}>
            🗂 月別
          </button>
          <button className="tab-btn" onClick={()=>setView("compare")}
            style={{background:view==="compare"?PASTEL.lavender:"rgba(255,255,255,0.7)",color:view==="compare"?"#fff":PASTEL.mid,flex:1}}>
            🔍 並べて比較
          </button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <input type="month" value={newMonth} onChange={e=>setNewMonth(e.target.value)}
            style={{flex:1,fontSize:12,padding:"6px 10px"}}/>
          <button className="btn-soft" onClick={handleAddMonth}
            style={{background:PASTEL.mint,color:PASTEL.dark,padding:"6px 12px",fontSize:12,flexShrink:0}}>
            ＋ 月を追加
          </button>
        </div>
      </div>

      {view==="grid"&&(
        allMonths.length===0
          ?<div className="card" style={{padding:24,textAlign:"center",color:PASTEL.mid,fontSize:13}}>
            まだ記録がありません 📷<br/>
            <span style={{fontSize:11}}>上の「月を追加」から始めましょう</span>
          </div>
          :allMonths.map(s=>{
            const photos=s.photos||{front:null,side:null,back:null};
            const monthLabel=s.month.replace("-","年")+"月";
            return(
              <div key={s.month} className="card" style={{padding:14,marginBottom:12}}>
                <div style={{fontWeight:900,fontSize:14,marginBottom:12,color:PASTEL.dark}}>{monthLabel}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {slots.map(([slot,label])=>(
                    <div key={slot}>
                      <div style={{fontSize:10,fontWeight:700,color:PASTEL.mid,textAlign:"center",marginBottom:5}}>{label}</div>
                      {photos[slot]
                        ?<div style={{position:"relative"}}>
                          <div onClick={()=>setLightbox({url:photos[slot],label:`${monthLabel} ${label}`})}
                            style={{aspectRatio:"3/4",borderRadius:10,overflow:"hidden",cursor:"zoom-in"}}>
                            <img src={photos[slot]} alt={label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          </div>
                          <button onClick={()=>handleDelete(s.month,slot)}
                            style={{position:"absolute",top:4,right:4,border:"none",borderRadius:"50%",width:20,height:20,background:"rgba(61,44,53,0.6)",color:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                            ×
                          </button>
                        </div>
                        :<div onClick={()=>triggerUpload(s.month,slot)}
                          style={{aspectRatio:"3/4",borderRadius:10,background:"rgba(255,183,197,0.10)",border:`1.5px dashed ${PASTEL.pink}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4}}>
                          <span style={{fontSize:20}}>📷</span>
                          <span style={{fontSize:9,color:PASTEL.mid}}>追加</span>
                        </div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            );
          })
      )}

      {view==="compare"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {slots.map(([slot,label])=>(
              <button key={slot} className="tab-btn" onClick={()=>setCompareAngle(slot)}
                style={{flex:1,background:compareAngle===slot?PASTEL.lavender:"rgba(255,255,255,0.7)",color:compareAngle===slot?"#fff":PASTEL.mid}}>
                {label}
              </button>
            ))}
          </div>

          {allMonths.length===0
            ?<div className="card" style={{padding:24,textAlign:"center",color:PASTEL.mid,fontSize:13}}>写真がありません 📷</div>
            :<div>
              <div style={{overflowX:"auto",paddingBottom:8}}>
                <div style={{display:"flex",gap:10,minWidth:"max-content"}}>
                  {allMonths.map(s=>{
                    const photos=s.photos||{front:null,side:null,back:null};
                    const url=photos[compareAngle];
                    const monthLabel=s.month.replace("-","年")+"月";
                    return(
                      <div key={s.month} style={{width:130,flexShrink:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:PASTEL.mid,textAlign:"center",marginBottom:6,
                          background:"rgba(255,255,255,0.7)",borderRadius:8,padding:"3px 0"}}>{monthLabel}</div>
                        {url
                          ?<div onClick={()=>setLightbox({url,label:`${monthLabel} ${slots.find(s=>s[0]===compareAngle)?.[1]}`})}
                            style={{aspectRatio:"3/4",borderRadius:12,overflow:"hidden",cursor:"zoom-in",boxShadow:"0 2px 12px rgba(200,150,180,0.2)"}}>
                            <img src={url} alt={monthLabel} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          </div>
                          :<div onClick={()=>triggerUpload(s.month,compareAngle)}
                            style={{aspectRatio:"3/4",borderRadius:12,background:"rgba(255,183,197,0.10)",border:`1.5px dashed ${PASTEL.pink}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:6}}>
                            <span style={{fontSize:28}}>📷</span>
                            <span style={{fontSize:10,color:PASTEL.mid}}>タップして追加</span>
                          </div>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>

              <CompareTwo months={allMonths} angle={compareAngle} onZoom={setLightbox} onUpload={triggerUpload} slots={slots}/>
            </div>
          }
        </div>
      )}
    </div>
  );
}

function CompareTwo({months,angle,onZoom,onUpload,slots}){
  const [left,setLeft]=useState(months[0]?.month||"");
  const [right,setRight]=useState(months[months.length-1]?.month||"");

  const getUrl=(month)=>{
    const s=months.find(m=>m.month===month);
    return s?.photos?.[angle]||null;
  };
  const label=slots.find(s=>s[0]===angle)?.[1]||"";
  const monthOpts=months.map(m=>m.month);

  if(months.length<2)return null;

  return(
    <div className="card" style={{padding:14,marginTop:12}}>
      <div style={{fontWeight:800,fontSize:13,marginBottom:12,color:PASTEL.dark}}>🔍 2か月比較</div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <select value={left} onChange={e=>setLeft(e.target.value)} style={{flex:1,fontSize:12}}>
          {monthOpts.map(m=><option key={m} value={m}>{m.replace("-","年")}月</option>)}
        </select>
        <span style={{alignSelf:"center",color:PASTEL.mid,fontWeight:700}}>vs</span>
        <select value={right} onChange={e=>setRight(e.target.value)} style={{flex:1,fontSize:12}}>
          {monthOpts.map(m=><option key={m} value={m}>{m.replace("-","年")}月</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[left,right].map((month,i)=>{
          const url=getUrl(month);
          const ml=month.replace("-","年")+"月";
          return(
            <div key={i}>
              <div style={{fontSize:11,fontWeight:800,color:PASTEL.mid,textAlign:"center",marginBottom:6}}>{ml}</div>
              {url
                ?<div onClick={()=>onZoom({url,label:`${ml} ${label}`})}
                  style={{aspectRatio:"3/4",borderRadius:12,overflow:"hidden",cursor:"zoom-in",boxShadow:"0 4px 16px rgba(200,150,180,0.2)"}}>
                  <img src={url} alt={ml} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
                :<div onClick={()=>onUpload(month,angle)}
                  style={{aspectRatio:"3/4",borderRadius:12,background:"rgba(255,183,197,0.10)",border:`1.5px dashed ${PASTEL.pink}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:6}}>
                  <span style={{fontSize:28}}>📷</span>
                  <span style={{fontSize:10,color:PASTEL.mid}}>タップして追加</span>
                </div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBubble({label,value,sub}){
  return(
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:10,color:PASTEL.mid,marginBottom:3}}>{label}</div>
      <div style={{fontSize:18,fontWeight:900}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:parseFloat(sub)<0?PASTEL.mint:PASTEL.coral,fontWeight:700}}>{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════
// Work Page
// ════════════════════════════════════════════════
function WorkPage({jobs,setJobs,jobTypes,setJobTypes,channels,setChannels}){
  const [tab,setTab]=useState("list");
  const [showForm,setShowForm]=useState(false);
  const [editJobId,setEditJobId]=useState(null);
  const [expandedId,setExpandedId]=useState(null);
  const [newTypeName,setNewTypeName]=useState("");
  const [newChannelName,setNewChannelName]=useState("");
  const [filterProgress,setFilterProgress]=useState("すべて");
  const emptyForm={name:"",type:jobTypes[0],channel:channels[0],draftDate:"",deliveryDate:"",progress:"未着手",amount:"",invoiceDate:""};
  const [form,setForm]=useState(emptyForm);

  const openAdd=()=>{setForm(emptyForm);setEditJobId(null);setShowForm(true);};
  const openEdit=(job)=>{setForm({...job,amount:String(job.amount)});setEditJobId(job.id);setShowForm(true);};
  const saveJob=()=>{
    if(!form.name)return;
    const entry={...form,id:editJobId||Date.now(),amount:parseFloat(form.amount)||0};
    if(editJobId)setJobs(jobs.map(j=>j.id===editJobId?entry:j));
    else setJobs([...jobs,entry]);
    setShowForm(false);
  };
  const deleteJob=(id)=>setJobs(jobs.filter(j=>j.id!==id));
  const filtered=filterProgress==="すべて"?jobs:jobs.filter(j=>j.progress===filterProgress);
  const totalAmount=jobs.reduce((s,j)=>s+j.amount,0);
  const invoicedAmount=jobs.filter(j=>j.progress==="請求済").reduce((s,j)=>s+j.amount,0);
  const deliveredCount=jobs.filter(j=>j.progress==="納品済"||j.progress==="請求済").length;

  return(
    <div>
      <div className="card" style={{padding:"14px 16px",marginBottom:12,display:"flex",justifyContent:"space-around"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:PASTEL.mid,marginBottom:2}}>案件数</div><div style={{fontSize:22,fontWeight:900}}>{jobs.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:PASTEL.mid,marginBottom:2}}>総額</div><div style={{fontSize:16,fontWeight:900,color:PASTEL.lavender}}>¥{totalAmount.toLocaleString()}</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:PASTEL.mid,marginBottom:2}}>請求済</div><div style={{fontSize:16,fontWeight:900,color:PASTEL.mint}}>¥{invoicedAmount.toLocaleString()}</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:PASTEL.mid,marginBottom:2}}>納品済</div><div style={{fontSize:22,fontWeight:900,color:PASTEL.peach}}>{deliveredCount}</div></div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[{id:"list",label:"📋 案件"},{id:"settings",label:"⚙️ 設定"}].map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?PASTEL.lavender:"rgba(255,255,255,0.7)",color:tab===t.id?"#fff":PASTEL.mid}}>
            {t.label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button className="btn-soft" onClick={openAdd} style={{background:PASTEL.lavender,color:"#fff",padding:"6px 14px",fontSize:12}}>＋ 追加</button>
      </div>

      {tab==="list"&&(
        <div>
          <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
            {["すべて",...PROGRESS_OPTIONS].map(p=>(
              <button key={p} className="tab-btn" onClick={()=>setFilterProgress(p)}
                style={{background:filterProgress===p?(PROGRESS_COLORS[p]||PASTEL.lavender):"rgba(255,255,255,0.6)",color:filterProgress===p?PASTEL.dark:PASTEL.mid,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap",flexShrink:0}}>
                {p}
              </button>
            ))}
          </div>
          {filtered.length===0&&<div style={{textAlign:"center",color:PASTEL.mid,fontSize:13,padding:"24px 0"}}>案件がありません 💼</div>}
          {filtered.map(job=>(
            <div key={job.id} className="job-row">
              <div onClick={()=>setExpandedId(expandedId===job.id?null:job.id)} style={{padding:"12px 14px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.name}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Tag color={PASTEL.sky}>{job.type}</Tag>
                      <Tag color={PASTEL.peach}>{job.channel}</Tag>
                      <Tag color={PROGRESS_COLORS[job.progress]||PASTEL.light}>{job.progress}</Tag>
                    </div>
                  </div>
                  <div style={{textAlign:"right",marginLeft:8,flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:PASTEL.lavender}}>¥{job.amount.toLocaleString()}</div>
                    <div style={{fontSize:10,color:PASTEL.mid,marginTop:2}}>{expandedId===job.id?"▲":"▼"}</div>
                  </div>
                </div>
              </div>
              {expandedId===job.id&&(
                <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(255,183,197,0.15)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10,marginBottom:12}}>
                    <InfoCell label="初稿日" value={job.draftDate||"未設定"}/>
                    <InfoCell label="納品日" value={job.deliveryDate||"未設定"}/>
                    <InfoCell label="請求日" value={job.invoiceDate||"未設定"}/>
                    <InfoCell label="金額" value={`¥${job.amount.toLocaleString()}`}/>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                    {PROGRESS_OPTIONS.map(p=>(
                      <button key={p} className="tab-btn" onClick={()=>setJobs(jobs.map(j=>j.id===job.id?{...j,progress:p}:j))}
                        style={{fontSize:10,padding:"4px 8px",background:job.progress===p?(PROGRESS_COLORS[p]||PASTEL.lavender):"rgba(255,255,255,0.6)",color:job.progress===p?PASTEL.dark:PASTEL.mid}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn-soft" onClick={()=>openEdit(job)} style={{flex:1,background:PASTEL.sky,color:PASTEL.dark,padding:"6px",fontSize:12}}>✏️ 編集</button>
                    <button className="btn-soft" onClick={()=>deleteJob(job.id)} style={{flex:1,background:"rgba(255,183,197,0.3)",color:PASTEL.mid,padding:"6px",fontSize:12}}>🗑 削除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="settings"&&(
        <div>
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>🏷 種類を管理</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {jobTypes.map(t=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:4,background:PASTEL.sky+"55",borderRadius:20,padding:"4px 10px"}}>
                  <span style={{fontSize:12,fontWeight:700}}>{t}</span>
                  {jobTypes.length>1&&<button onClick={()=>setJobTypes(jobTypes.filter(x=>x!==t))} style={{border:"none",background:"none",cursor:"pointer",fontSize:12,color:PASTEL.mid,padding:0}}>×</button>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={newTypeName} onChange={e=>setNewTypeName(e.target.value)} placeholder="新しい種類..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newTypeName.trim()){setJobTypes([...jobTypes,newTypeName.trim()]);setNewTypeName("");}}}/>
              <button className="btn-soft" onClick={()=>{if(newTypeName.trim()){setJobTypes([...jobTypes,newTypeName.trim()]);setNewTypeName("");}}} style={{background:PASTEL.sky,color:PASTEL.dark,padding:"6px 14px",fontSize:12}}>追加</button>
            </div>
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📺 チャンネルを管理</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {channels.map(c=>(
                <div key={c} style={{display:"flex",alignItems:"center",gap:4,background:PASTEL.peach+"55",borderRadius:20,padding:"4px 10px"}}>
                  <span style={{fontSize:12,fontWeight:700}}>{c}</span>
                  {channels.length>1&&<button onClick={()=>setChannels(channels.filter(x=>x!==c))} style={{border:"none",background:"none",cursor:"pointer",fontSize:12,color:PASTEL.mid,padding:0}}>×</button>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={newChannelName} onChange={e=>setNewChannelName(e.target.value)} placeholder="新しいチャンネル..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newChannelName.trim()){setChannels([...channels,newChannelName.trim()]);setNewChannelName("");}}}/>
              <button className="btn-soft" onClick={()=>{if(newChannelName.trim()){setChannels([...channels,newChannelName.trim()]);setNewChannelName("");}}} style={{background:PASTEL.peach,color:PASTEL.dark,padding:"6px 14px",fontSize:12}}>追加</button>
            </div>
          </div>
        </div>
      )}

      {showForm&&(
        <Modal title={editJobId?"✏️ 案件を編集":"💼 案件を追加"} onClose={()=>setShowForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div>
              <label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>案件名 *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="案件名を入力..." style={{width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>種類</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{width:"100%"}}>{jobTypes.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>チャンネル</label>
                <select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} style={{width:"100%"}}>{channels.map(c=><option key={c}>{c}</option>)}</select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>初稿日</label>
                <input type="date" value={form.draftDate} onChange={e=>setForm({...form,draftDate:e.target.value})} style={{width:"100%",boxSizing:"border-box"}}/></div>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>納品日</label>
                <input type="date" value={form.deliveryDate} onChange={e=>setForm({...form,deliveryDate:e.target.value})} style={{width:"100%",boxSizing:"border-box"}}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>進捗</label>
                <select value={form.progress} onChange={e=>setForm({...form,progress:e.target.value})} style={{width:"100%"}}>{PROGRESS_OPTIONS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>金額 (¥)</label>
                <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div>
            </div>
            <div><label style={{fontSize:11,color:PASTEL.mid,display:"block",marginBottom:3}}>請求日</label>
              <input type="date" value={form.invoiceDate} onChange={e=>setForm({...form,invoiceDate:e.target.value})} style={{width:"100%",boxSizing:"border-box"}}/></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button className="btn-soft" onClick={()=>setShowForm(false)} style={{flex:1,background:PASTEL.light,color:PASTEL.mid}}>キャンセル</button>
            <button className="btn-soft" onClick={saveJob} style={{flex:1,background:PASTEL.lavender,color:"#fff"}}>保存 ✓</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Tag({children,color}){return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:color+"55",color:PASTEL.dark}}>{children}</span>;}
function InfoCell({label,value}){
  return(
    <div style={{background:"rgba(255,250,248,0.8)",borderRadius:10,padding:"7px 10px"}}>
      <div style={{fontSize:10,color:PASTEL.mid,marginBottom:1}}>{label}</div>
      <div style={{fontSize:12,fontWeight:700}}>{value}</div>
    </div>
  );
}
function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(61,44,53,0.35)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={onClose}>
      <div className="card" style={{padding:24,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:900,marginBottom:16}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

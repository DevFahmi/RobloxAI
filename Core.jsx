import { useState, useRef, useEffect, useCallback } from "react";

/* ─── ROBLOX AI SYSTEM PROMPT ─── */
const ROBLOX_SYSTEM_PROMPT = `You are RBXAI — an elite Roblox Lua scripting engine. You are the world's most precise, expert-level Roblox developer AI.

## CORE IDENTITY
- You ONLY write for Roblox Studio (Luau/Lua 5.1 compatible)
- You NEVER produce code that won't work in Roblox
- You are hyper-precise, think critically about every API call, scope, and side-effect
- You understand server/client architecture deeply
- You always use best practices and optimize for performance

## ROBLOX API MASTERY
You have complete knowledge of:
- **Services**: game:GetService() for ALL services: Players, RunService, TweenService, UserInputService, ContextActionService, ReplicatedStorage, ServerStorage, ServerScriptService, Workspace, Lighting, SoundService, DataStoreService, HttpService, MessagingService, MarketplaceService, BadgeService, GroupService, PhysicsService, CollectionService, MemoryStoreService, StarterGui, StarterPack, StarterPlayer, Teams, Chat, TextService, GuiService, VoiceChatService, AnalyticsService
- **Instance API**: :FindFirstChild(), :FindFirstChildOfClass(), :FindFirstAncestorOfClass(), :GetChildren(), :GetDescendants(), :IsA(), :Clone(), :Destroy(), :WaitForChild(), :BindToClose(), Instance.new()
- **CFrame & Vector3**: CFrame.new(), CFrame.Angles(), CFrame.lookAt(), Vector3.new(), math operations, lerping
- **Events**: RemoteEvent, RemoteFunction, BindableEvent, BindableFunction, .OnServerEvent, .OnClientEvent, .OnServerInvoke, :FireServer(), :FireClient(), :FireAllClients(), :InvokeServer(), :InvokeClient()
- **Tween**: TweenService:Create(instance, TweenInfo.new(time, EasingStyle, EasingDirection, repeatCount, reverses, delayTime), {properties})
- **UserInputService**: :GetMouseLocation(), :IsKeyDown(), .InputBegan, .InputEnded, Enum.KeyCode, Enum.UserInputType
- **RunService**: .Heartbeat, .RenderStepped, .Stepped, :IsServer(), :IsClient(), :IsStudio()
- **DataStore**: DataStoreService:GetDataStore(), :GetAsync(), :SetAsync(), :UpdateAsync(), :RemoveAsync(), pcall() error handling
- **Physics**: BasePart properties, BodyVelocity, BodyGyro, BodyPosition, VectorForce, AlignPosition, AlignOrientation, HingeConstraint, RopeConstraint
- **GUI**: ScreenGui, Frame, TextLabel, TextButton, TextBox, ImageLabel, ImageButton, ScrollingFrame, UIListLayout, UIGridLayout, UIPadding, UICorner, UIStroke, UIAspectRatioConstraint, UIScale, ViewportFrame
- **Animation**: AnimationController, Animator, :LoadAnimation(), :Play(), :Stop(), AnimationTrack events
- **Character**: Humanoid, HumanoidRootPart, BodyColors, CharacterMesh, Accessory, Tool, Handle
- **Raycasting**: workspace:Raycast(), RaycastParams.new(), RaycastResult
- **Path Finding**: PathfindingService, :CreatePath(), :ComputeAsync(), :GetWaypoints()
- **Teams**: Teams:GetTeams(), Team properties, Player.Team
- **Attributes**: :GetAttribute(), :SetAttribute(), :GetAttributeChangedSignal()
- **Tags (CollectionService)**: :AddTag(), :RemoveTag(), :HasTag(), :GetTagged(), :GetInstanceAddedSignal()

## SCRIPT TYPES RULES
- **Script (ServerScript)**: Runs on server only. Access ServerStorage, ServerScriptService. NEVER access LocalPlayer here.
- **LocalScript**: Runs on client only. Can access game.Players.LocalPlayer, LocalPlayer.PlayerGui. Place in StarterPlayerScripts, StarterCharacterScripts, or StarterGui.
- **ModuleScript**: Returns a value/table. Used with require(). Can be both server and client side.

## SECURITY RULES (CRITICAL)
- NEVER trust client data for important game logic — always validate on server
- Use RemoteEvents for client→server communication, NEVER give clients authority over game state
- Sanitize all user inputs (TextBox, RemoteEvent args)
- Use pcall() for ALL DataStore, HTTP, and potentially-failing operations
- Never put sensitive logic in LocalScripts

## CODE QUALITY STANDARDS
1. Always add descriptive comments
2. Use proper variable naming (camelCase for variables, PascalCase for classes/modules)
3. Disconnect events when no longer needed to prevent memory leaks
4. Use :WaitForChild() in LocalScripts for assets that may not be loaded
5. Implement proper error handling with pcall/xpcall
6. Optimize loops — avoid expensive operations in Heartbeat/RenderStepped
7. Use task.spawn(), task.delay(), task.wait() instead of deprecated spawn(), delay(), wait()
8. Prefer table.insert/remove over # length for dynamic arrays
9. Use string.format() for complex string concatenation

## OUTPUT FORMAT
When generating scripts:
1. Start with a brief description of what the script does
2. Specify the script type (Script/LocalScript/ModuleScript) and where to place it
3. List any dependencies (RemoteEvents needed, ModuleScripts, etc.)
4. Provide the complete, working script with inline comments
5. After the code, provide "Setup Instructions" if needed
6. Flag any potential issues or limitations

When debugging:
1. Identify the exact line and nature of the error
2. Explain WHY it's an error (not just what)
3. Provide the corrected code
4. Explain what was changed and why

When optimizing:
1. Identify bottlenecks
2. Explain the optimization reasoning
3. Provide optimized code with performance notes

ALWAYS wrap Lua code in triple backticks with lua syntax: \`\`\`lua ... \`\`\`
ALWAYS be 100% accurate. If unsure about something, say so and provide the safest alternative.`;

/* ─── SYNTAX HIGHLIGHTER ─── */
function highlightLua(code) {
  if (!code) return "";
  const keywords = ["local","function","end","if","then","else","elseif","for","do","while","repeat","until","return","break","continue","not","and","or","in","nil","true","false","self"];
  const builtins = ["print","warn","error","pcall","xpcall","ipairs","pairs","next","select","type","tostring","tonumber","rawget","rawset","rawequal","rawlen","require","assert","load","loadstring","setmetatable","getmetatable","table","string","math","os","io","coroutine","task","wait","spawn","delay"];
  const robloxGlobals = ["game","workspace","script","Instance","Vector3","CFrame","Color3","BrickColor","Enum","UDim","UDim2","Rect","NumberRange","NumberSequence","ColorSequence","TweenInfo","Ray","RaycastParams","PathfindingResult","Region3","DateTime","Random","RBXScriptSignal","tick","time","elapsedTime","unpack","pack"];

  let result = code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Strings
  result = result.replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|(\[\[[\s\S]*?\]\])/g,'<span style="color:#98c379">$&</span>');
  // Comments
  result = result.replace(/(--[^\n]*)/g,'<span style="color:#5c6370;font-style:italic">$1</span>');
  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g,'<span style="color:#d19a66">$1</span>');
  // Keywords
  keywords.forEach(k => {
    result = result.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span style="color:#c678dd">$1</span>');
  });
  // Roblox globals
  robloxGlobals.forEach(k => {
    result = result.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span style="color:#e5c07b">$1</span>');
  });
  // Builtins
  builtins.forEach(k => {
    result = result.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span style="color:#56b6c2">$1</span>');
  });
  // Function calls
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,'<span style="color:#61afef">$1</span>');

  return result;
}

/* ─── CODE BLOCK COMPONENT ─── */
function CodeBlock({ code, lang = "lua" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const lines = code.split("\n");
  return (
    <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",border:"1px solid #2a2d3e",marginBottom:"12px"}}>
      <div style={{background:"#1a1d2e",padding:"6px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #2a2d3e"}}>
        <span style={{color:"#e06c75",fontSize:"11px",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"1px"}}>{lang}</span>
        <button onClick={copy} style={{background:copied?"#98c379":"transparent",border:"1px solid",borderColor:copied?"#98c379":"#3d4166",color:copied?"#1a1d2e":"#6b7280",padding:"2px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"11px",fontFamily:"'JetBrains Mono',monospace",transition:"all .2s"}}>
          {copied?"✓ Copied":"Copy"}
        </button>
      </div>
      <div style={{background:"#0d0f1c",overflowX:"auto",padding:"16px 0"}}>
        <table style={{borderSpacing:0,width:"100%"}}>
          <tbody>
            {lines.map((line,i)=>(
              <tr key={i} style={{lineHeight:"1.6"}}>
                <td style={{padding:"0 16px 0 12px",color:"#3d4166",fontSize:"12px",fontFamily:"'JetBrains Mono',monospace",userSelect:"none",textAlign:"right",minWidth:"40px"}}>{i+1}</td>
                <td style={{padding:"0 16px 0 4px",fontSize:"13px",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre"}} dangerouslySetInnerHTML={{__html:highlightLua(line)}}/>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── PARSE MARKDOWN ─── */
function parseMessage(text) {
  const parts = [];
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", content: text.slice(last, m.index) });
    parts.push({ type:"code", lang: m[1]||"lua", content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", content: text.slice(last) });
  return parts;
}

function renderText(text) {
  return text.split("\n").map((line, i) => {
    let el = line;
    el = el.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong style="color:#e5c07b">${t}</strong>`);
    el = el.replace(/\*(.+?)\*/g, (_, t) => `<em style="color:#98c379">${t}</em>`);
    el = el.replace(/`(.+?)`/g, (_, t) => `<code style="background:#1e2130;color:#e06c75;padding:1px 5px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:12px">${t}</code>`);
    el = el.replace(/^## (.+)/, (_, t) => `<div style="font-size:15px;font-weight:700;color:#61afef;margin:10px 0 4px;font-family:'Space Grotesk',sans-serif">${t}</div>`);
    el = el.replace(/^### (.+)/, (_, t) => `<div style="font-size:13px;font-weight:600;color:#98c379;margin:6px 0 2px">${t}</div>`);
    el = el.replace(/^- (.+)/, (_, t) => `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#e06c75">▸</span><span>${t}</span></div>`);
    el = el.replace(/^(\d+)\. (.+)/, (_, n, t) => `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#d19a66;min-width:16px">${n}.</span><span>${t}</span></div>`);
    return <div key={i} dangerouslySetInnerHTML={{ __html: el }} style={{ minHeight: line ? undefined : "6px" }} />;
  });
}

/* ─── MAIN APP ─── */
export default function RobloxAI() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `## 🎮 Selamat datang di **RBXAI** — Roblox Script Intelligence

Saya adalah AI khusus pembuatan script Roblox yang:
- ✅ Menulis Luau/Lua yang **100% bekerja** di Roblox Studio
- ✅ Memahami **Server/Client architecture** secara mendalam
- ✅ Menguasai seluruh **Roblox API** (Services, Instances, Events, dll)
- ✅ Mendeteksi & memperbaiki **error** secara akurat
- ✅ Mengoptimalkan **performance** script
- ✅ Berfikir kritis tentang **keamanan & best practices**

**Apa yang bisa saya buat untuk Anda?**

- \`/generate\` — Buat script baru dari deskripsi
- \`/debug\` — Analisis & perbaiki error pada script
- \`/optimize\` — Optimalkan performa script
- \`/explain\` — Jelaskan cara kerja script
- \`/convert\` — Konversi antara Script/LocalScript

Atau langsung ketik kebutuhan Anda! Contoh:
> *"Buat sistem double jump untuk karakter player"*
> *"Debug script ini: [paste code]"*
> *"Buat admin command /kick dan /ban"*

---
✨ *Dibuat dengan dedikasi oleh* **By.DevFahmi**`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [editorCode, setEditorCode] = useState("-- Paste script Anda di sini untuk di-debug atau di-optimalkan\n\nlocal Players = game:GetService(\"Players\")\n\nPlayers.PlayerAdded:Connect(function(player)\n    print(player.Name .. \" joined the game!\")\nend)");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scriptHistory, setScriptHistory] = useState([]);
  const bottomRef = useRef();
  const inputRef = useRef();
  const historyIdRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const callClaude = async (userMessages, systemOverride) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemOverride || ROBLOX_SYSTEM_PROMPT,
        messages: userMessages
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "Terjadi kesalahan saat menghubungi AI.";
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
      const reply = await callClaude(apiMsgs);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      // Extract code blocks for history
      const codeMatch = reply.match(/```(?:lua)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        const id = ++historyIdRef.current;
        setScriptHistory(prev => [{ id, title: text.slice(0,40), code: codeMatch[1].trim(), time: new Date().toLocaleTimeString() }, ...prev.slice(0,19)]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ **Error:** Gagal menghubungi AI. Pastikan koneksi internet Anda aktif." }]);
    }
    setLoading(false);
  };

  const analyzeCode = async (mode) => {
    if (!editorCode.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    const prompts = {
      debug: `Debug script Roblox Lua berikut. Temukan SEMUA error, bug, dan masalah potensial. Berikan penjelasan detail dan kode yang sudah diperbaiki:\n\n\`\`\`lua\n${editorCode}\n\`\`\``,
      optimize: `Optimalkan performa script Roblox Lua berikut. Analisis bottleneck, memory leaks, dan inefficiencies. Berikan versi yang dioptimalkan:\n\n\`\`\`lua\n${editorCode}\n\`\`\``,
      explain: `Jelaskan secara detail cara kerja script Roblox Lua berikut, termasuk setiap fungsi, event, dan alur logika:\n\n\`\`\`lua\n${editorCode}\n\`\`\``,
      validate: `Validasi script Roblox Lua berikut. Periksa: 1) Apakah tipe script yang tepat (Script/LocalScript)? 2) Apakah semua API yang digunakan valid? 3) Apakah ada security vulnerabilities? 4) Apakah ada deprecated functions? Berikan laporan lengkap:\n\n\`\`\`lua\n${editorCode}\n\`\`\``
    };
    try {
      const result = await callClaude([{ role:"user", content: prompts[mode] }]);
      setAnalysisResult({ mode, content: result });
    } catch(e) {
      setAnalysisResult({ mode, content: "❌ Gagal menganalisis script." });
    }
    setAnalyzing(false);
  };

  const loadFromHistory = (item) => {
    setEditorCode(item.code);
    setActiveTab("editor");
  };

  const insertToChat = (code) => {
    setInput(prev => prev + "\n```lua\n" + code + "\n```");
    setActiveTab("chat");
    inputRef.current?.focus();
  };

  const quickPrompts = [
    "Buat sistem leaderboard dengan DataStore",
    "Buat GUI shop dengan RemoteFunction",
    "Buat NPC pathfinding dengan combat",
    "Buat sistem team & respawn",
    "Buat admin commands system",
    "Buat weapon system dengan cooldown",
    "Buat cutscene dengan TweenService",
    "Buat round system untuk game"
  ];

  return (
    <div style={{
      minHeight:"100vh", background:"#080a12",
      fontFamily:"'Space Grotesk', 'Segoe UI', sans-serif",
      color:"#c9d1d9", display:"flex", flexDirection:"column",
      backgroundImage:`radial-gradient(ellipse at 10% 20%, rgba(97,175,239,0.04) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(224,108,117,0.04) 0%, transparent 50%)`
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0d0f1c; }
        ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3d4166; }
        .msg-user { animation: slideIn .2s ease; }
        .msg-ai { animation: slideIn .2s ease; }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tab-btn:hover { background: #1e2130 !important; }
        .quick-btn:hover { background: #1a1d2e !important; border-color: #61afef !important; color: #61afef !important; }
        .action-btn:hover { opacity:.85 !important; transform:translateY(-1px); }
        .send-btn:hover:not(:disabled) { background: #528bcc !important; }
        .hist-item:hover { background: #1a1d2e !important; }
        textarea:focus { outline: none; border-color: #61afef !important; }
        .editor-textarea { resize: none; width: 100%; background: #0d0f1c; color: #abb2bf; border: 1px solid #2a2d3e; border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; tab-size: 4; }
        .editor-textarea:focus { outline: none; border-color: #61afef; }
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{
        background:"rgba(13,15,28,.95)", borderBottom:"1px solid #1e2130",
        padding:"0 20px", height:"56px", display:"flex", alignItems:"center",
        justifyContent:"space-between", backdropFilter:"blur(12px)",
        position:"sticky", top:0, zIndex:100
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",padding:"4px",fontSize:"18px"}}>☰</button>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#e06c75,#c678dd)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:"800",color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>R</div>
            <div>
              <div style={{fontWeight:"700",fontSize:"15px",letterSpacing:".3px",background:"linear-gradient(90deg,#e06c75,#c678dd,#61afef)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RBXAI</div>
              <div style={{fontSize:"10px",color:"#4a5568",letterSpacing:"1.5px",textTransform:"uppercase",marginTop:"-2px"}}>Roblox Script Engine</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:"4px",background:"#0d0f1c",padding:"4px",borderRadius:"10px",border:"1px solid #1e2130"}}>
          {[["chat","💬 Chat","Chat"],["editor","⚡ Editor","Analyzer"]].map(([id,icon,label])=>(
            <button key={id} className="tab-btn" onClick={()=>setActiveTab(id)} style={{
              padding:"5px 14px",borderRadius:"7px",border:"none",cursor:"pointer",
              fontSize:"12px",fontWeight:"600",transition:"all .2s",
              background:activeTab===id?"#1e2130":"transparent",
              color:activeTab===id?"#61afef":"#6b7280"
            }}>{icon} {label}</button>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{
            fontSize:"11px",fontFamily:"'JetBrains Mono',monospace",fontWeight:"600",
            letterSpacing:".5px",
            background:"linear-gradient(90deg,#c678dd,#61afef)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            borderLeft:"1px solid #2a2d3e",paddingLeft:"14px"
          }}>By.DevFahmi</div>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"7px",height:"7px",background:"#98c379",borderRadius:"50%",boxShadow:"0 0 6px #98c379"}}/>
            <span style={{fontSize:"11px",color:"#6b7280"}}>Online</span>
          </div>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)"}}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside style={{
            width:"220px",minWidth:"220px",background:"#0a0c16",
            borderRight:"1px solid #1e2130",display:"flex",flexDirection:"column",
            overflow:"hidden"
          }}>
            <div style={{padding:"14px 12px 8px",borderBottom:"1px solid #1e2130"}}>
              <div style={{fontSize:"10px",color:"#4a5568",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"8px"}}>Script History</div>
              {scriptHistory.length === 0 ? (
                <div style={{fontSize:"11px",color:"#3d4166",textAlign:"center",padding:"20px 0"}}>Belum ada script</div>
              ) : (
                <div style={{overflowY:"auto",maxHeight:"40vh"}}>
                  {scriptHistory.map(item=>(
                    <div key={item.id} className="hist-item" onClick={()=>loadFromHistory(item)} style={{
                      padding:"8px 10px",borderRadius:"6px",cursor:"pointer",
                      marginBottom:"4px",border:"1px solid transparent",transition:"all .15s"
                    }}>
                      <div style={{fontSize:"11px",color:"#abb2bf",fontWeight:"500",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                      <div style={{fontSize:"10px",color:"#4a5568",marginTop:"2px"}}>{item.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{padding:"12px",flex:1,overflowY:"auto"}}>
              <div style={{fontSize:"10px",color:"#4a5568",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"8px"}}>Quick Scripts</div>
              {quickPrompts.map((p,i)=>(
                <button key={i} className="quick-btn" onClick={()=>{setInput(p);setActiveTab("chat");inputRef.current?.focus();}} style={{
                  width:"100%",textAlign:"left",padding:"7px 9px",
                  background:"transparent",border:"1px solid #1e2130",
                  borderRadius:"6px",color:"#6b7280",fontSize:"11px",
                  cursor:"pointer",marginBottom:"4px",transition:"all .15s"
                }}>▸ {p}</button>
              ))}
            </div>
          </aside>
        )}

        {/* ── MAIN CONTENT ── */}
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <>
              <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"16px"}}>
                {messages.map((msg,i)=>(
                  <div key={i} className={msg.role==="user"?"msg-user":"msg-ai"} style={{display:"flex",gap:"10px",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                    <div style={{
                      width:"30px",height:"30px",borderRadius:"8px",flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:"13px",fontWeight:"700",
                      background:msg.role==="user"?"linear-gradient(135deg,#61afef,#528bcc)":"linear-gradient(135deg,#e06c75,#c678dd)"
                    }}>{msg.role==="user"?"U":"R"}</div>
                    <div style={{
                      maxWidth:"80%",background:msg.role==="user"?"#1a2744":"#0f1120",
                      border:"1px solid",borderColor:msg.role==="user"?"#2a4a7a":"#1e2130",
                      borderRadius:"12px",padding:"12px 16px",fontSize:"13.5px",lineHeight:"1.7"
                    }}>
                      {parseMessage(msg.content).map((part,j)=>(
                        part.type==="code"
                          ? <div key={j}>
                              <CodeBlock code={part.content} lang={part.lang||"lua"}/>
                              <button onClick={()=>setEditorCode(part.content)} style={{
                                fontSize:"11px",background:"transparent",border:"1px solid #2a2d3e",
                                color:"#6b7280",padding:"3px 10px",borderRadius:"4px",cursor:"pointer",
                                marginBottom:"8px",transition:"all .2s"
                              }}>📋 Buka di Editor</button>
                            </div>
                          : <div key={j}>{renderText(part.content)}</div>
                      ))}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{display:"flex",gap:"10px"}}>
                    <div style={{width:"30px",height:"30px",borderRadius:"8px",background:"linear-gradient(135deg,#e06c75,#c678dd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"700"}}>R</div>
                    <div style={{background:"#0f1120",border:"1px solid #1e2130",borderRadius:"12px",padding:"14px 18px",display:"flex",gap:"5px",alignItems:"center"}}>
                      {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#61afef",borderRadius:"50%",animation:`pulse 1.2s ${i*0.2}s infinite`}}/>)}
                      <span style={{fontSize:"12px",color:"#4a5568",marginLeft:"8px"}}>RBXAI sedang menulis script...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              <div style={{padding:"16px 20px",borderTop:"1px solid #1e2130",background:"rgba(10,12,22,.95)"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"flex-end"}}>
                  <div style={{flex:1,position:"relative"}}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                      placeholder="Deskripsikan script yang ingin dibuat, atau tempel kode untuk di-debug... (Enter untuk kirim)"
                      rows={3}
                      style={{
                        width:"100%",background:"#0d0f1c",color:"#c9d1d9",
                        border:"1px solid #2a2d3e",borderRadius:"10px",
                        padding:"12px 16px",fontSize:"13px",fontFamily:"'Space Grotesk',sans-serif",
                        resize:"none",lineHeight:"1.6",transition:"border-color .2s"
                      }}
                    />
                  </div>
                  <button className="send-btn" onClick={sendMessage} disabled={loading||!input.trim()} style={{
                    width:"44px",height:"44px",borderRadius:"10px",border:"none",
                    background:loading||!input.trim()?"#1e2130":"#61afef",
                    color:loading||!input.trim()?"#3d4166":"#0d0f1c",
                    cursor:loading||!input.trim()?"not-allowed":"pointer",
                    fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all .2s",fontWeight:"700"
                  }}>↑</button>
                </div>
                <div style={{fontSize:"10px",color:"#3d4166",marginTop:"6px",textAlign:"center"}}>
                  Shift+Enter untuk baris baru • Enter untuk kirim
                </div>
                <div style={{marginTop:"8px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                  <div style={{height:"1px",width:"60px",background:"linear-gradient(90deg,transparent,#2a2d3e)"}}/>
                  <span style={{
                    fontSize:"11px",fontFamily:"'JetBrains Mono',monospace",fontWeight:"600",
                    background:"linear-gradient(90deg,#c678dd,#61afef,#e06c75)",
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                    letterSpacing:".5px"
                  }}>By.DevFahmi</span>
                  <div style={{height:"1px",width:"60px",background:"linear-gradient(90deg,#2a2d3e,transparent)"}}/>
                </div>
              </div>
            </>
          )}

          {/* ── EDITOR/ANALYZER TAB ── */}
          {activeTab === "editor" && (
            <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                <div>
                  <div style={{fontSize:"12px",color:"#4a5568",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px",fontWeight:"600"}}>📝 Script Editor</div>
                  <textarea
                    className="editor-textarea"
                    value={editorCode}
                    onChange={e=>setEditorCode(e.target.value)}
                    rows={22}
                    spellCheck={false}
                  />
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"10px"}}>
                    {[
                      {id:"debug",icon:"🔍",label:"Debug",color:"#e06c75"},
                      {id:"optimize",icon:"⚡",label:"Optimize",color:"#d19a66"},
                      {id:"validate",icon:"✅",label:"Validate",color:"#98c379"},
                      {id:"explain",icon:"📖",label:"Explain",color:"#61afef"}
                    ].map(btn=>(
                      <button key={btn.id} className="action-btn" onClick={()=>analyzeCode(btn.id)} disabled={analyzing} style={{
                        padding:"9px",borderRadius:"8px",border:"1px solid",
                        borderColor:btn.color+"40",background:btn.color+"10",
                        color:analyzing?"#3d4166":btn.color,
                        cursor:analyzing?"not-allowed":"pointer",fontSize:"12px",
                        fontWeight:"600",transition:"all .2s",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"
                      }}>
                        {analyzing?<span style={{width:"12px",height:"12px",border:"2px solid",borderColor:btn.color+"40 "+btn.color+" "+btn.color+" "+btn.color,borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite"}}/>:btn.icon} {btn.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>insertToChat(editorCode)} style={{
                    width:"100%",marginTop:"8px",padding:"9px",borderRadius:"8px",
                    border:"1px solid #2a2d3e",background:"transparent",color:"#6b7280",
                    cursor:"pointer",fontSize:"12px",fontWeight:"600",transition:"all .2s"
                  }}>💬 Kirim ke Chat AI</button>
                </div>

                <div>
                  <div style={{fontSize:"12px",color:"#4a5568",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px",fontWeight:"600"}}>
                    {analyzing?"⏳ Menganalisis...":"📊 Hasil Analisis"}
                  </div>
                  <div style={{
                    background:"#0a0c16",border:"1px solid #1e2130",borderRadius:"10px",
                    padding:"16px",height:"calc(100% - 30px)",overflowY:"auto",minHeight:"400px"
                  }}>
                    {analyzing && (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"300px",gap:"16px"}}>
                        <div style={{width:"40px",height:"40px",border:"3px solid #1e2130",borderTopColor:"#61afef",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                        <div style={{color:"#4a5568",fontSize:"13px"}}>Menganalisis script...</div>
                      </div>
                    )}
                    {!analyzing && !analysisResult && (
                      <div style={{color:"#3d4166",fontSize:"12px",textAlign:"center",paddingTop:"60px"}}>
                        <div style={{fontSize:"40px",marginBottom:"12px"}}>🤖</div>
                        <div>Pilih tindakan analisis di sebelah kiri</div>
                        <div style={{marginTop:"8px",color:"#2a2d3e"}}>Debug • Optimize • Validate • Explain</div>
                      </div>
                    )}
                    {!analyzing && analysisResult && (
                      <div style={{fontSize:"13px",lineHeight:"1.7"}}>
                        <div style={{
                          display:"inline-flex",alignItems:"center",gap:"6px",
                          padding:"4px 10px",borderRadius:"20px",marginBottom:"12px",fontSize:"11px",fontWeight:"600",
                          background:{"debug":"#e06c7520","optimize":"#d19a6620","validate":"#98c37920","explain":"#61afef20"}[analysisResult.mode],
                          color:{"debug":"#e06c75","optimize":"#d19a66","validate":"#98c379","explain":"#61afef"}[analysisResult.mode],
                          border:"1px solid",borderColor:{"debug":"#e06c7540","optimize":"#d19a6640","validate":"#98c37940","explain":"#61afef40"}[analysisResult.mode]
                        }}>
                          {{"debug":"🔍 DEBUG REPORT","optimize":"⚡ OPTIMIZATION REPORT","validate":"✅ VALIDATION REPORT","explain":"📖 EXPLANATION"}[analysisResult.mode]}
                        </div>
                        {parseMessage(analysisResult.content).map((part,j)=>(
                          part.type==="code"
                            ? <CodeBlock key={j} code={part.content} lang={part.lang||"lua"}/>
                            : <div key={j}>{renderText(part.content)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   三国志Ⅸ風 内政シミュレーション — スマホ専用版
   想定画面幅：390px（iPhone 14相当）
   PC版（rotk9_mvp.jsx）は仕様検証用として別途保持
   ============================================================ */

/* ---------------- 定数 ---------------- */
const PLAYER_FACTION = "liu_bei";
const PERIODS = ["上旬", "中旬", "下旬"];
const GOLD_MONTHS = [1, 4, 7, 10];

const FACTIONS = {
  liu_bei:  { name: "劉備軍",  color: "#ff9a4d", bg: "#3a2412" },
  liu_biao: { name: "劉表軍",  color: "#5fd17a", bg: "#173a1f" },
  cao:      { name: "曹操軍",  color: "#6ab0ff", bg: "#142a44" },
  none:     { name: "空白地",  color: "#888",    bg: "#222"    },
};

/* ---------------- 都市データ ---------------- */
const CITIES_INIT = {
  xinye:     { id: "xinye",     name: "新野",   faction: "liu_bei",  x: 150, y: 90,  playable: true,
    minshin: 600, minshinMax: 1000, shueki: 420, shuekiMax: 1000,
    shuukaku: 180, shuukakuMax: 300, taikyuu: 240, taikyuuMax: 400,
    shiki: 42, shikiMax: 100, heiryoku: 3200, heiyaku: 850,
    officers: ["liubei","guanyu","zhangfei"] },
  fancheng:  { id: "fancheng",  name: "樊城",   faction: "liu_bei",  x: 192, y: 138, playable: true,
    minshin: 540, minshinMax: 1000, shueki: 380, shuekiMax: 1000,
    shuukaku: 150, shuukakuMax: 280, taikyuu: 210, taikyuuMax: 350,
    shiki: 35, shikiMax: 100, heiryoku: 2400, heiyaku: 620,
    officers: ["zhaoyun","jianyong"] },
  xiangyang: { id: "xiangyang", name: "襄陽",   faction: "liu_biao", x: 168, y: 188, playable: false,
    minshin: 700, minshinMax: 1000, shueki: 600, shuekiMax: 1000,
    shuukaku: 220, shuukakuMax: 320, taikyuu: 320, taikyuuMax: 450,
    shiki: 50, shikiMax: 100, heiryoku: 5200, heiyaku: 1100, officers: [] },
  jiangxia:  { id: "jiangxia",  name: "江夏",   faction: "liu_biao", x: 278, y: 202, playable: false,
    minshin: 560, minshinMax: 1000, shueki: 410, shuekiMax: 1000,
    shuukaku: 170, shuukakuMax: 260, taikyuu: 230, taikyuuMax: 360,
    shiki: 40, shikiMax: 100, heiryoku: 2800, heiyaku: 700, officers: [] },
  xuchang:   { id: "xuchang",   name: "許昌",   faction: "cao",      x: 298, y: 62,  playable: false,
    minshin: 780, minshinMax: 1000, shueki: 820, shuekiMax: 1000,
    shuukaku: 300, shuukakuMax: 380, taikyuu: 400, taikyuuMax: 500,
    shiki: 65, shikiMax: 100, heiryoku: 9000, heiyaku: 2000, officers: [] },
  shangyong: { id: "shangyong", name: "上庸",   faction: "none",     x: 82,  y: 156, playable: false,
    minshin: 480, minshinMax: 1000, shueki: 300, shuekiMax: 1000,
    shuukaku: 130, shuukakuMax: 240, taikyuu: 180, taikyuuMax: 300,
    shiki: 30, shikiMax: 100, heiryoku: 1500, heiyaku: 400, officers: [] },
};

/* ---------------- 武将データ（統率・武力・知力・政治の4能力） ---------------- */
const OFFICERS_INIT = {
  liubei:   { id: "liubei",   name: "劉備", touritsu: 72, buryoku: 75, chiryoku: 70, seiji: 75 },
  guanyu:   { id: "guanyu",   name: "関羽", touritsu: 96, buryoku: 97, chiryoku: 75, seiji: 63 },
  zhangfei: { id: "zhangfei", name: "張飛", touritsu: 82, buryoku: 99, chiryoku: 30, seiji: 18 },
  zhaoyun:  { id: "zhaoyun",  name: "趙雲", touritsu: 91, buryoku: 97, chiryoku: 65, seiji: 55 },
  jianyong: { id: "jianyong", name: "簡雍", touritsu: 45, buryoku: 32, chiryoku: 66, seiji: 70 },
};

/* ---------------- 施設コマンド ----------------
   各武将の寄与 = 1 + floor(能力÷8)　— 商業3人データで確認済み
   金コスト = 1人あたり50×人数（訓練のみ0）— 確認済み */
const COMMANDS = [
  { id: "junbu",    name: "巡察", icon: "👁", stat: "minshin",  statMax: "minshinMax",  label: "民心", ability: "seiji",    cost: 50,  confirmed: false },
  { id: "shougyou", name: "商業", icon: "💰", stat: "shueki",   statMax: "shuekiMax",   label: "収益", ability: "seiji",    cost: 50,  confirmed: true  },
  { id: "kaikon",   name: "開墾", icon: "🌾", stat: "shuukaku", statMax: "shuukakuMax", label: "収穫", ability: "seiji",    cost: 50,  confirmed: false },
  { id: "seishuu",  name: "政修", icon: "🏯", stat: "taikyuu",  statMax: "taikyuuMax",  label: "耐久", ability: "seiji",    cost: 50,  confirmed: false },
  { id: "kunren",   name: "訓練", icon: "⚔️", stat: "shiki",    statMax: "shikiMax",    label: "士気", ability: "buryoku",  cost: 0,   confirmed: true  },
  { id: "choubei",  name: "徴兵", icon: "🪖", stat: null,       statMax: null,          label: "兵力", ability: "touritsu", cost: 0,   isConscription: true },
];

const ABILITY_LABEL = { seiji: "政治", buryoku: "武力", touritsu: "統率", chiryoku: "知力" };

/* ---------------- ユーティリティ ---------------- */
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const fmt   = (n) => n.toLocaleString("ja-JP");
const pct   = (v, mx) => clamp((v / mx) * 100, 0, 100);

function calcGain(cmd, officer, city) {
  if (cmd.isConscription) {
    const popCost  = officer.touritsu * 30;
    const goldCost = officer.touritsu * 3;
    return { popCost, goldCost, gain: popCost };
  }
  return { gain: 1 + Math.floor(officer[cmd.ability] / 8) };
}

/* ============================================================
   ルートコンポーネント
   ============================================================ */
export default function App() {
  const [cities,   setCities]   = useState(CITIES_INIT);
  const [officers, setOfficers] = useState(OFFICERS_INIT);
  const [year,     setYear]     = useState(200);
  const [month,    setMonth]    = useState(1);
  const [pIdx,     setPIdx]     = useState(0);
  const [gold,     setGold]     = useState(3000);
  const [food,     setFood]     = useState(5000);

  const [selCityId,  setSelCityId]  = useState("xinye");
  const [selOIds,    setSelOIds]    = useState([]);
  const [actedOIds,  setActedOIds]  = useState([]);
  const [selCmd,     setSelCmd]     = useState(null);  // 確認モーダル用
  const [phase,      setPhase]      = useState("idle");
  const [toast,      setToast]      = useState(null);
  const [result,     setResult]     = useState(null);  // 結果ポップアップ
  const timerRef = useRef(null);

  const city = cities[selCityId];
  const kinShuunyuu = Object.values(cities)
    .filter(c => c.faction === PLAYER_FACTION)
    .reduce((s, c) => s + c.shueki, 0);

  /* 赤字予測 */
  const monthsToGold = (() => {
    const d = GOLD_MONTHS.map(m => ((m - month + 12) % 12)).filter(d => d > 0);
    return d.length ? Math.min(...d) : 12;
  })();
  const monthsToHarvest = (() => { const d = (7 - month + 12) % 12; return d || 12; })();
  const upkeep = Object.values(cities)
    .filter(c => c.faction === PLAYER_FACTION)
    .reduce((s, c) => s + Math.floor(c.heiryoku / 100), 0);
  const goldDeficit = gold - 50 * monthsToGold < 0;
  const foodDeficit = food - upkeep * monthsToHarvest < 0;

  /* トースト */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  /* 都市選択 */
  const selectCity = (id) => {
    if (!cities[id].playable) { showToast(`${cities[id].name}は操作できません`, "warn"); return; }
    setSelCityId(id);
    setSelOIds([]);
    setSelCmd(null);
  };

  /* 武将選択トグル */
  const toggleOfficer = (oid) => {
    if (actedOIds.includes(oid)) return;
    setSelOIds(prev => prev.includes(oid) ? prev.filter(id => id !== oid) : [...prev, oid]);
    setSelCmd(null);
  };

  /* コマンド選択 → 確認モーダル */
  const chooseCmd = (cmd) => {
    if (selOIds.length === 0) { showToast("武将を選択してください", "warn"); return; }
    setSelCmd(cmd);
  };

  /* コマンド確定 → 即時実行 */
  const execCmd = () => {
    if (!selCmd) return;
    const cmd = selCmd;
    const totalCost = cmd.isConscription ? 0 : cmd.cost * selOIds.length;

    if (!cmd.isConscription && gold < totalCost) {
      showToast(`金が不足しています（必要：${fmt(totalCost)}）`, "warn");
      setSelCmd(null);
      return;
    }

    let lines = [];
    setCities(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const c = next[selCityId];
      selOIds.forEach(oid => {
        const o = officers[oid];
        const { gain, popCost, goldCost } = calcGain(cmd, o, c);
        if (cmd.isConscription) {
          const ratio = Math.min(1, c.heiyaku / (o.touritsu * 30), gold / (o.touritsu * 3));
          const actualGain = Math.floor(gain * ratio);
          const actualPop  = Math.floor(popCost * ratio);
          const actualGold = Math.floor((o.touritsu * 3) * ratio);
          c.heiryoku += actualGain;
          c.heiyaku  -= actualPop;
          setGold(g => Math.max(0, g - actualGold));
          lines.push(`${o.name}：兵力+${fmt(actualGain)}（兵役人口-${fmt(actualPop)} 金-${fmt(actualGold)}）`);
        } else {
          const max    = c[cmd.statMax];
          const before = c[cmd.stat];
          const room   = max - before;
          // 上限に近いほど上昇量を抑制（線形補正：仮）
          const suppressed = Math.floor(gain * room / max);
          const amount = Math.max(0, Math.min(gain, suppressed + 1));
          c[cmd.stat] = Math.min(max, before + amount);
          lines.push(`${o.name}：${cmd.label}+${fmt(amount)}`);
        }
      });
      return next;
    });

    if (!cmd.isConscription && totalCost > 0) setGold(g => Math.max(0, g - totalCost));

    const resultLines = lines;
    const note = !cmd.isConscription && totalCost > 0 ? `金 -${fmt(totalCost)}（${selOIds.length}人×${fmt(cmd.cost)}）` : "";
    setResult({ title: `${cmd.name} 完了`, lines: resultLines, note });

    setActedOIds(prev => [...prev, ...selOIds]);
    setSelOIds([]);
    setSelCmd(null);
  };

  /* 進行 */
  const advance = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("progress");

    setTimeout(() => {
      let nextPIdx  = pIdx + 1;
      let nextMonth = month;
      let nextYear  = year;
      if (nextPIdx > 2) { nextPIdx = 0; nextMonth = month < 12 ? month + 1 : 1; if (nextMonth === 1) nextYear = year + 1; }

      if (pIdx === 2) {
        if (GOLD_MONTHS.includes(nextMonth)) {
          const inc = Object.values(cities).filter(c => c.faction === PLAYER_FACTION).reduce((s, c) => s + c.shueki, 0);
          setGold(g => g + inc);
        }
        const harvest = nextMonth === 7
          ? Object.values(cities).filter(c => c.faction === PLAYER_FACTION).reduce((s, c) => s + c.shuukaku, 0)
          : 0;
        const up = Object.values(cities).filter(c => c.faction === PLAYER_FACTION).reduce((s, c) => s + Math.floor(c.heiryoku / 100), 0);
        setFood(f => Math.max(0, f + harvest - up));
      }

      setPIdx(nextPIdx);
      setMonth(nextMonth);
      setYear(nextYear);
      setActedOIds([]);
      setSelOIds([]);
      setSelCmd(null);
      setPhase("idle");
    }, 600);
  }, [phase, pIdx, month, year, cities]);

  /* ============================================================
     描画
     ============================================================ */
  return (
    <div className="m-app">
      <style>{CSS}</style>

      {/* ヘッダー */}
      <header className="m-header">
        <div className="m-header-date">
          <span className="m-year">建安{year - 199}年 {month}月</span>
          <span className="m-period">{PERIODS[pIdx]}</span>
        </div>
        <div className="m-header-res">
          <span className={`m-res ${goldDeficit ? "deficit" : ""}`}>金 {fmt(gold)}{goldDeficit ? "⚠" : ""}</span>
          <span className={`m-res ${foodDeficit ? "deficit" : ""}`}>糧 {fmt(food)}{foodDeficit ? "⚠" : ""}</span>
        </div>
      </header>

      {/* マップ */}
      <div className="m-map-wrap">
        <svg viewBox="0 0 380 260" className="m-map">
          <rect width="380" height="260" fill="#1a1208"/>
          {/* 道路 */}
          {[["xinye","fancheng"],["fancheng","xiangyang"],["xinye","shangyong"],["fancheng","jiangxia"],["xuchang","fancheng"]].map(([a,b],i)=>{
            const ca=CITIES_INIT[a], cb=CITIES_INIT[b];
            return <line key={i} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke="#3a2c18" strokeWidth="1.5" strokeDasharray="4 3"/>;
          })}
          {Object.values(cities).map(c => {
            const f = FACTIONS[c.faction];
            const sel = c.id === selCityId;
            return (
              <g key={c.id} onClick={() => selectCity(c.id)} style={{cursor:"pointer"}}>
                {sel && <circle cx={c.x} cy={c.y} r="20" fill="none" stroke="#f8c840" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="16;22;16" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite"/>
                </circle>}
                <circle cx={c.x} cy={c.y} r={c.playable ? 13 : 9} fill={f.bg} stroke={f.color} strokeWidth={sel ? 2.5 : 1.5}/>
                {c.playable && <circle cx={c.x} cy={c.y} r="5" fill={f.color} opacity="0.8"/>}
                <text x={c.x} y={c.y - (c.playable ? 18 : 14)} textAnchor="middle" fill={f.color} fontSize={c.playable ? "13" : "11"} fontWeight="bold">{c.name}</text>
                {c.playable && (
                  <text x={c.x} y={c.y + 24} textAnchor="middle" fill="#b89060" fontSize="9">{fmt(c.heiryoku)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {/* 凡例 */}
        <div className="m-legend">
          {Object.entries(FACTIONS).filter(([k])=>k!=="none").map(([k,f])=>(
            <span key={k} className="m-legend-item"><i style={{background:f.color}}/>{f.name}</span>
          ))}
        </div>
      </div>

      {/* 都市パネル */}
      <div className="m-city-panel">
        <div className="m-city-header">
          <span className="m-city-name" style={{color: FACTIONS[city.faction].color}}>{city.name}</span>
          <span className="m-city-faction">{FACTIONS[city.faction].name}</span>
          <span className="m-kinshu">金収入 {fmt(kinShuunyuu)}</span>
        </div>

        {/* パラメータバー */}
        <div className="m-stats">
          {[
            { label: "民心", val: city.minshin,  max: city.minshinMax,  color: "#f0d060" },
            { label: "収益", val: city.shueki,   max: city.shuekiMax,   color: "#6fae4a" },
            { label: "収穫", val: city.shuukaku, max: city.shuukakuMax, color: "#d4a23a" },
            { label: "耐久", val: city.taikyuu,  max: city.taikyuuMax,  color: "#6699cc" },
            { label: "士気", val: city.shiki,    max: city.shikiMax,    color: "#c0504a" },
          ].map(s => (
            <div key={s.label} className="m-stat-row">
              <span className="m-stat-label">{s.label}</span>
              <div className="m-stat-track">
                <div className="m-stat-fill" style={{width:`${pct(s.val,s.max)}%`, background:s.color}}/>
              </div>
              <span className="m-stat-val">{fmt(s.val)}<span className="m-stat-max">/{fmt(s.max)}</span></span>
            </div>
          ))}
          <div className="m-substat">
            <span>兵力 <b>{fmt(city.heiryoku)}</b></span>
            <span>兵役人口 <b>{fmt(city.heiyaku)}</b></span>
          </div>
        </div>

        {/* 武将カード */}
        <div className="m-section-label">武将を選ぶ（複数可）</div>
        <div className="m-officers">
          {city.officers.map(oid => {
            const o = officers[oid];
            const sel = selOIds.includes(oid);
            const acted = actedOIds.includes(oid);
            return (
              <div key={oid} className={`m-officer ${sel?"sel":""} ${acted?"acted":""}`} onClick={()=>toggleOfficer(oid)}>
                <div className="m-officer-top">
                  <span className="m-officer-check">{sel?"☑":"☐"}</span>
                  <span className="m-officer-name">{o.name}</span>
                  <span className="m-officer-status">{acted?"行動済":"待機中"}</span>
                </div>
                <div className="m-officer-stats">
                  <span>統<b>{o.touritsu}</b></span>
                  <span>武<b>{o.buryoku}</b></span>
                  <span>知<b>{o.chiryoku}</b></span>
                  <span>政<b>{o.seiji}</b></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* コマンドボタン */}
        {selOIds.length > 0 && (
          <div className="m-commands">
            <div className="m-section-label">コマンドを選ぶ</div>
            <div className="m-cmd-grid">
              {COMMANDS.map(cmd => {
                const totalCost = cmd.isConscription ? 0 : cmd.cost * selOIds.length;
                const disabled  = !cmd.isConscription && gold < totalCost;
                const costLabel = cmd.isConscription ? "兵役人口" : totalCost > 0 ? `金${fmt(totalCost)}` : "無料";
                return (
                  <button key={cmd.id} className={`m-cmd ${disabled?"disabled":""}`} disabled={disabled} onClick={()=>chooseCmd(cmd)}>
                    <span className="m-cmd-icon">{cmd.icon}</span>
                    <span className="m-cmd-name">{cmd.name}</span>
                    <span className="m-cmd-sub">{ABILITY_LABEL[cmd.ability]}{!cmd.confirmed?"※":""} · {costLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* フッター：進行ボタン */}
      <footer className="m-footer">
        <div className="m-footer-info">
          {selCityId && `${city.name}：行動済 ${city.officers.filter(id=>actedOIds.includes(id)).length}/${city.officers.length}名`}
        </div>
        <button className="m-advance" disabled={phase!=="idle"} onClick={advance}>
          {phase==="progress" ? "進行中…" : `${PERIODS[pIdx]} → ${pIdx<2?PERIODS[pIdx+1]:"翌月上旬"} へ`}
        </button>
      </footer>

      {/* トースト */}
      {toast && <div className={`m-toast ${toast.type}`}>{toast.msg}</div>}

      {/* 確認モーダル */}
      {selCmd && (
        <div className="m-overlay" onClick={()=>setSelCmd(null)}>
          <div className="m-modal" onClick={e=>e.stopPropagation()}>
            <div className="m-modal-title">{selCmd.icon} {selCmd.name}</div>
            <div className="m-modal-officers">
              {selOIds.map(oid => {
                const o = officers[oid];
                const { gain, popCost, goldCost } = calcGain(selCmd, o, city);
                return (
                  <div key={oid} className="m-modal-row">
                    <span>{o.name}</span>
                    {selCmd.isConscription
                      ? <span className="m-modal-val">兵-{fmt(popCost)} 金-{fmt(goldCost)}</span>
                      : <span className="m-modal-val">+{fmt(gain)}</span>}
                  </div>
                );
              })}
            </div>
            {!selCmd.isConscription && selCmd.cost > 0 && (
              <div className="m-modal-cost">合計コスト：金 {fmt(selCmd.cost * selOIds.length)}（{selOIds.length}人×{fmt(selCmd.cost)}）</div>
            )}
            {!selCmd.confirmed && <div className="m-modal-note">※ 仮実装（要確認）</div>}
            <div className="m-modal-actions">
              <button className="m-modal-cancel" onClick={()=>setSelCmd(null)}>取消</button>
              <button className="m-modal-ok" onClick={execCmd}>実行</button>
            </div>
          </div>
        </div>
      )}

      {/* 結果ポップアップ */}
      {result && (
        <div className="m-overlay" onClick={()=>setResult(null)}>
          <div className="m-modal" onClick={e=>e.stopPropagation()}>
            <div className="m-modal-title m-result-title">{result.title}</div>
            {result.lines.map((l,i)=><div key={i} className="m-result-line">{l}</div>)}
            {result.note && <div className="m-modal-cost">{result.note}</div>}
            <button className="m-modal-ok" style={{marginTop:12}} onClick={()=>setResult(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CSS（390px幅基準・指でタップしやすい設計）
   ============================================================ */
const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

.m-app {
  font-family: "Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
  background: #0e0a06;
  color: #f0d8a0;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
}

/* ヘッダー */
.m-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(180deg,#2a1c10,#1c130a);
  border-bottom: 1px solid #6b4420;
}
.m-header-date { display: flex; align-items: baseline; gap: 8px; }
.m-year  { font-size: 15px; font-weight: bold; font-family: "Hiragino Mincho ProN",serif; color: #f8c840; }
.m-period {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: #f8c840; color: #1c130a; font-weight: bold;
}
.m-header-res { display: flex; gap: 8px; }
.m-res { font-size: 12px; padding: 3px 8px; border-radius: 4px; border: 1px solid #4a3420; background: #19110a; color: #f8c840; }
.m-res.deficit { color: #ff6a5a; border-color: #b03020; background: #2a1212; font-weight: bold; }

/* マップ */
.m-map-wrap { padding: 8px 10px 4px; }
.m-map { width: 100%; height: auto; border: 1px solid #4a3420; border-radius: 8px; display: block; }
.m-legend { display: flex; gap: 10px; flex-wrap: wrap; padding: 4px 2px; }
.m-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #b89060; }
.m-legend-item i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* 都市パネル */
.m-city-panel { padding: 0 12px; display: flex; flex-direction: column; gap: 12px; }

.m-city-header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; padding-top: 4px; }
.m-city-name   { font-size: 22px; font-weight: bold; font-family: "Hiragino Mincho ProN",serif; }
.m-city-faction { font-size: 12px; color: #b89060; }
.m-kinshu { font-size: 11px; color: #c8e888; margin-left: auto; background: #19110a; border: 1px solid #3a4820; border-radius: 4px; padding: 2px 8px; }

/* パラメータバー */
.m-stats { display: flex; flex-direction: column; gap: 7px; background: #19110a; border: 1px solid #3a2818; border-radius: 8px; padding: 10px 12px; }
.m-stat-row { display: grid; grid-template-columns: 32px 1fr 72px; align-items: center; gap: 8px; }
.m-stat-label { font-size: 12px; color: #d8b878; }
.m-stat-track { height: 8px; background: #2a1c10; border-radius: 4px; overflow: hidden; }
.m-stat-fill  { height: 100%; border-radius: 4px; transition: width .4s; }
.m-stat-val   { font-size: 11px; text-align: right; color: #c8a878; }
.m-stat-max   { color: #6a5040; }
.m-substat    { display: flex; gap: 16px; font-size: 12px; color: #d8b878; padding-top: 4px; border-top: 1px solid #2a1c10; }
.m-substat b  { color: #f8c840; }

/* セクションラベル */
.m-section-label { font-size: 11px; color: #b89060; border-bottom: 1px solid #3a2818; padding-bottom: 4px; }

/* 武将カード */
.m-officers { display: flex; flex-direction: column; gap: 6px; }
.m-officer {
  border: 1px solid #3a2818; border-radius: 8px; padding: 10px 12px;
  background: #19110a; cursor: pointer; transition: border-color .15s, background .15s;
  user-select: none;
}
.m-officer:active { background: #221608; }
.m-officer.sel    { border-color: #f8c840; background: #251a08; }
.m-officer.acted  { opacity: 0.4; cursor: not-allowed; }
.m-officer-top    { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.m-officer-check  { font-size: 16px; color: #c08840; }
.m-officer-name   { font-size: 16px; font-weight: bold; }
.m-officer-status { margin-left: auto; font-size: 11px; color: #6a8a6a; }
.m-officer.acted .m-officer-status { color: #8a6a44; }
.m-officer-stats  { display: flex; gap: 12px; font-size: 12px; color: #b89060; }
.m-officer-stats b { color: #f0d8a0; }

/* コマンドグリッド */
.m-commands { display: flex; flex-direction: column; gap: 8px; }
.m-cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.m-cmd {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 12px 6px; border-radius: 8px; border: 1px solid #5a3818;
  background: #1e1208; color: #f0d8a0; cursor: pointer;
  transition: background .15s, border-color .15s; min-height: 72px;
  user-select: none;
}
.m-cmd:active:not(.disabled) { background: #2e2010; border-color: #c08840; }
.m-cmd.disabled { opacity: 0.4; cursor: not-allowed; }
.m-cmd-icon { font-size: 22px; }
.m-cmd-name { font-size: 14px; font-weight: bold; }
.m-cmd-sub  { font-size: 10px; color: #b89060; }

/* フッター */
.m-footer {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  display: flex; align-items: center; gap: 10px;
  background: #1c130a; border-top: 1px solid #6b4420;
  padding: 10px 14px;
  z-index: 20;
}
.m-footer-info { font-size: 11px; color: #b89060; flex: 1; }
.m-advance {
  padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: bold;
  border: 1px solid #c08840; background: #8a4010; color: #f8c840;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.m-advance:active:not(:disabled) { background: #a85020; }
.m-advance:disabled { opacity: 0.5; cursor: not-allowed; }

/* トースト */
.m-toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: #2a1c10; border: 1px solid #c08840; color: #f8c840;
  padding: 10px 20px; border-radius: 8px; font-size: 13px;
  white-space: nowrap; z-index: 30; pointer-events: none;
  animation: fadeup .25s ease;
}
.m-toast.warn { border-color: #b03020; color: #ff8060; background: #2a1010; }
@keyframes fadeup { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

/* モーダル */
.m-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: flex; align-items: flex-end; z-index: 40;
  padding: 16px;
}
.m-modal {
  background: #1c130a; border: 1px solid #c08840; border-radius: 12px;
  padding: 20px; width: 100%; display: flex; flex-direction: column; gap: 10px;
  max-height: 80vh; overflow-y: auto;
}
.m-modal-title  { font-size: 18px; font-weight: bold; color: #f8c840; font-family: "Hiragino Mincho ProN",serif; }
.m-result-title { color: #7fcf7f; }
.m-modal-officers { display: flex; flex-direction: column; gap: 6px; }
.m-modal-row  { display: flex; justify-content: space-between; font-size: 14px; }
.m-modal-val  { color: #7fcf7f; font-weight: bold; }
.m-modal-cost { font-size: 12px; color: #c08840; background: #19110a; border-radius: 4px; padding: 6px 10px; }
.m-modal-note { font-size: 11px; color: #8a6a44; }
.m-result-line { font-size: 14px; color: #c8e888; border-left: 2px solid #6fae4a; padding-left: 8px; }
.m-modal-actions { display: flex; gap: 8px; margin-top: 4px; }
.m-modal-cancel { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #4a3420; background: #19110a; color: #b89060; font-size: 14px; cursor: pointer; }
.m-modal-ok     { flex: 2; padding: 12px; border-radius: 8px; border: 1px solid #c08840; background: #8a4010; color: #f8c840; font-size: 14px; font-weight: bold; cursor: pointer; }
.m-modal-ok:active { background: #a85020; }
`;

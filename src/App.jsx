import { useState, useEffect, useRef, useCallback } from "react";
const STORAGE_KEYS = { stock: "gl-raw-stock", products: "gl-products" };
const EMPTY_STOCK = { id: "", date: new Date().toISOString().split("T")[0], supplier: "", invoice: "", batch: "", seed: "", seedBatchCombined: "", germinationRate: "", qty: "", qtyUnit: "seeds", passport: "", origin: "", organicLicense: "", chemicalTreatment: "", notes: "" };
const SUPPLIERS = ["Agility Agriculture Ltd","Burpee Europe Ltd","CN Seeds Ltd","E. E King & Co Ltd","Elsoms","Grown Local Scotland Ltd","HortConsult LTD","Moles Seeds Ltd","Premier Seeds Direct Ltd","Pro-Veg Seeds Ltd"];
const PP_SPECIES = ["tomato","solanum lycopersicum","pepper","capsicum","chilli","chili","onion","allium cepa","shallot","leek","allium porrum","pea","pisum sativum","bean","phaseolus","vicia faba","broad bean","french bean","runner bean","climbing bean","white mustard","sinapis alba"];
function needsPP(n){const l=(n||"").toLowerCase();return PP_SPECIES.some(s=>l.includes(s));}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function _mkBatch(){const d=new Date();const dd=String(d.getDate()).padStart(2,"0");const mm=String(d.getMonth()+1).padStart(2,"0");const c="ABCDEFGHJKLMNPQRSTUVWXYZ";return dd+mm+Array.from({length:3},()=>c[Math.floor(Math.random()*c.length)]).join("");}
function genBatch(existing=[]){const used=new Set(existing);let b=_mkBatch();let tries=0;while(used.has(b)&&tries<100){b=_mkBatch();tries++;}return b;}
function resizeImg(b64,mime,maxW=600){return new Promise(r=>{const img=new Image();img.onload=()=>{const s=Math.min(1,maxW/Math.max(img.width,img.height));const cv=document.createElement("canvas");cv.width=img.width*s;cv.height=img.height*s;cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);r(cv.toDataURL("image/jpeg",0.7));};img.src="data:"+mime+";base64,"+b64;});}
const bSty={default:{background:"#e7e5e4",color:"#57534e"},warning:{background:"#fef3c7",color:"#92400e",border:"1px solid #fde68a"},success:{background:"#dcfce7",color:"#166534",border:"1px solid #bbf7d0"},danger:{background:"#fef2f2",color:"#991b1b",border:"1px solid #fecaca"},info:{background:"#e0f2fe",color:"#075985",border:"1px solid #bae6fd"}};
function Badge({children,variant="default"}){return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,...bSty[variant]}}>{children}</span>;}
function Field({label,value,onChange,placeholder,type="text",highlight,disabled,small}){return <div style={{marginBottom:small?6:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</label><input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{width:"100%",padding:small?"7px 8px":"9px 10px",borderRadius:7,border:"1px solid "+(highlight?"#fca5a5":"#ddd"),fontSize:14,fontFamily:"inherit",boxSizing:"border-box",background:disabled?"#f5f5f0":highlight?"#fef2f2":"white",color:disabled?"#999":"#333"}}/></div>;}
function Sel({label,value,options,onChange,raw,small}){return <div style={{marginBottom:small?6:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</label><select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:small?"7px 8px":"9px 10px",borderRadius:7,border:"1px solid #ddd",fontSize:14,fontFamily:"inherit",background:"white",boxSizing:"border-box"}}>{!raw&&<option value="">Select...</option>}{options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;}
function DRow({label,value,warn}){return <div><p style={{margin:0,fontSize:11,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</p><p style={{margin:"2px 0 0",fontSize:14,fontWeight:500,color:warn?"#dc2626":value?"#2d3a2e":"#ccc"}}>{value||(warn?"\u26a0 Missing":"\u2014")}</p></div>;}
function Stat({label,value,color}){return <div style={{textAlign:"center",padding:"8px 4px",background:"#faf9f6",borderRadius:8}}><p style={{margin:0,fontSize:20,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{value}</p><p style={{margin:0,fontSize:10,fontWeight:600,color:"#999",textTransform:"uppercase"}}>{label}</p></div>;}
export default function App(){
  const [stock,setStock]=useState([]);const [products,setProducts]=useState([]);
  const [cur,setCur]=useState({...EMPTY_STOCK,id:genId()});const [view,setView]=useState("scan");
  const [processing,setProcessing]=useState(false);const [status,setStatus]=useState("");
  const [sel,setSel]=useState(null);const [search,setSearch]=useState("");
  const [showExp,setShowExp]=useState(false);const [toast,setToast]=useState(null);
  const [editing,setEditing]=useState(false);
  const [curImg,setCurImg]=useState(null);const [detailImg,setDetailImg]=useState(null);const [viewImg,setViewImg]=useState(false);
  const [pSrc,setPSrc]=useState(null);const [pDate,setPDate]=useState(new Date().toISOString().split("T")[0]);
  const [pCount,setPCount]=useState("");const [pUnit,setPUnit]=useState("seeds");
  const [pQty,setPQty]=useState("");const [pBatch,setPBatch]=useState("");const [pNotes,setPNotes]=useState("");
  const fRef=useRef(null);
  useEffect(()=>{(async()=>{try{const s=await window.storage.get(STORAGE_KEYS.stock);if(s&&s.value)setStock(JSON.parse(s.value));}catch(e){}try{const p=await window.storage.get(STORAGE_KEYS.products);if(p&&p.value)setProducts(JSON.parse(p.value));}catch(e){}})();},[]);
  const sStock=useCallback(async d=>{try{await window.storage.set(STORAGE_KEYS.stock,JSON.stringify(d));}catch(e){}},[]);
  const sProds=useCallback(async d=>{try{await window.storage.set(STORAGE_KEYS.products,JSON.stringify(d));}catch(e){}},[]);
  const flash=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  async function processImg(b64,mime){setProcessing(true);setStatus("Saving photo...");try{const thumb=await resizeImg(b64,mime);setCurImg(thumb);setStatus("Reading seed packet...");const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime,data:b64}},{type:"text",text:'You are reading a seed packet for a UK seed retailer. Extract ALL fields. Return ONLY JSON, no markdown:\n{"supplier":"","invoice":"","batch":"batch/lot number","seed":"full name e.g. Tomato Honey Comb F1","germinationRate":"number or empty","qty":"number or empty","qtyUnit":"seeds or grams","passport":"plant passport number or empty","origin":"country code or empty","organicLicense":"or empty","chemicalTreatment":"or empty","bestBefore":"or empty","netWeight":"or empty"}\nLook for small print, batch codes, plant passport blocks (A/B/C/D format). Empty string if unknown.'}]}]})});const data=await res.json();const p=JSON.parse((data.content&&data.content[0]&&data.content[0].text||"").replace(/```json|```/g,"").trim());setStatus("Data extracted!");setCur(prev=>({...prev,supplier:p.supplier||prev.supplier,invoice:p.invoice||prev.invoice,batch:p.batch||prev.batch,seed:p.seed||prev.seed,germinationRate:p.germinationRate||prev.germinationRate,qty:p.qty||prev.qty,qtyUnit:p.qtyUnit||prev.qtyUnit,passport:p.passport||prev.passport,origin:p.origin||prev.origin,organicLicense:p.organicLicense||prev.organicLicense,chemicalTreatment:p.chemicalTreatment||prev.chemicalTreatment,notes:[p.bestBefore?"Best before: "+p.bestBefore:"",p.netWeight?"Net wt: "+p.netWeight:""].filter(Boolean).join(". ")||prev.notes}));setTimeout(()=>setStatus(""),2000);}catch(e){setStatus("Couldn't read \u2014 fill in manually");setTimeout(()=>setStatus(""),4000);}finally{setProcessing(false);}}
  function handleFile(e){const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>processImg(r.result.split(",")[1],f.type||"image/jpeg");r.readAsDataURL(f);e.target.value="";}
  function saveEntry(){if(!cur.seed){flash("Need a seed name","warning");return;}const entry={...cur,seedBatchCombined:cur.seed+" ["+cur.batch+"]",hasPhoto:!!curImg,savedAt:new Date().toISOString()};let u;if(editing){u=stock.map(e=>e.id===entry.id?entry:e);setEditing(false);}else{u=[entry,...stock];}setStock(u);sStock(u);if(curImg){try{window.storage.set("gl-img-"+entry.id,curImg);}catch(e){}}setCurImg(null);setCur({...EMPTY_STOCK,id:genId()});flash(editing?"Updated":entry.seed+" saved");}
  function delStock(id){const u=stock.filter(e=>e.id!==id);setStock(u);sStock(u);try{window.storage.delete("gl-img-"+id).catch(()=>{});}catch(ex){}setSel(null);setView("stock");flash("Deleted","warning");}
  function startPack(e){setPSrc(e);setPDate(new Date().toISOString().split("T")[0]);setPCount("");setPUnit(e.qtyUnit||"seeds");setPQty("");setPBatch(genBatch(products.map(p=>p.batchCode)));setPNotes("");setView("pack");}
  function consumed(sid){return products.filter(p=>p.sourceStockId===sid).reduce((s,p)=>s+(p.totalSeed||0),0);}
  function savePack(){if(!pSrc||!pCount||!pQty){flash("Fill in count and qty","warning");return;}const seedPer=parseFloat(pCount),qtyProd=parseInt(pQty),total=seedPer*qtyProd,ppReq=needsPP(pSrc.seed);const prod={id:genId(),date:pDate,productName:pSrc.seed+" ["+pSrc.batch+"]",batchCode:pBatch,seedCountWeight:seedPer,unit:pUnit,qtyProduced:qtyProd,passport:ppReq?pBatch:"",totalSeed:total,sourceStockId:pSrc.id,sourceSupplier:pSrc.supplier,sourceBatch:pSrc.batch,sourcePassport:pSrc.passport,sourceOrigin:pSrc.origin,chemicalTreatment:pSrc.chemicalTreatment,organicLicense:pSrc.organicLicense,notes:pNotes,savedAt:new Date().toISOString()};const u=[prod,...products];setProducts(u);sProds(u);flash(qtyProd+"x packed \u2014 "+pBatch);setPSrc(null);setView("products");}
  function delProd(id){const u=products.filter(e=>e.id!==id);setProducts(u);sProds(u);setSel(null);setView("products");flash("Deleted","warning");}
  function expCSV(type){let h,rows,fn;if(type==="stock"){h=["Date","Supplier","Invoice","Batch","Seed","Seed Batch Combined","Germ %","Qty","Unit","Passport","Origin","Organic","Treatment","Notes"];rows=stock.map(e=>[e.date,e.supplier,e.invoice,e.batch,e.seed,e.seedBatchCombined||e.seed+" ["+e.batch+"]",e.germinationRate,e.qty,e.qtyUnit,e.passport,e.origin,e.organicLicense,e.chemicalTreatment,e.notes]);fn="raw-stock";}else{h=["Date","Product Name","Batch Code","Seed Count/Weight","Unit","Qty Produced","Passport","Total Seed","Source Batch","Source Supplier","Source Passport","Origin","Treatment","Organic","Notes"];rows=products.map(e=>[e.date,e.productName,e.batchCode,e.seedCountWeight,e.unit,e.qtyProduced,e.passport,e.totalSeed,e.sourceBatch,e.sourceSupplier,e.sourcePassport,e.sourceOrigin,e.chemicalTreatment,e.organicLicense,e.notes]);fn="products";}const csv=[h,...rows].map(r=>r.map(c=>'"'+((c||"").toString().replace(/"/g,'""'))+'"').join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="grown-local-"+fn+"-"+new Date().toISOString().split("T")[0]+".csv";a.click();setShowExp(false);flash("CSV exported");}
  function expJSON(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({rawStock:stock,products},null,2)],{type:"application/json"}));a.download="grown-local-backup-"+new Date().toISOString().split("T")[0]+".json";a.click();setShowExp(false);flash("Backup exported");}
  function iss(e){const r=[];const pp=needsPP(e.seed);if(pp&&!e.passport)r.push("Missing supplier passport");if(pp&&!e.origin)r.push("Missing origin");if(!e.germinationRate)r.push("No germination rate");if(!e.batch)r.push("No batch");if(!e.supplier)r.push("No supplier");return r;}
  const fStock=stock.filter(e=>{const t=search.toLowerCase();return !t||[e.seed,e.supplier,e.batch,e.passport].some(f=>(f||"").toLowerCase().includes(t));});
  const fProds=products.filter(e=>{const t=search.toLowerCase();return !t||[e.productName,e.batchCode,e.sourceSupplier].some(f=>(f||"").toLowerCase().includes(t));});
  const st={total:stock.length,clean:stock.filter(e=>iss(e).length===0).length,nopp:stock.filter(e=>needsPP(e.seed)&&!e.passport).length,nog:stock.filter(e=>!e.germinationRate).length};
  const aTab=view==="detail"?"stock":(view==="productDetail"||view==="pack")?"products":view;
  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#faf9f6",minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"12px 20px",borderRadius:10,background:toast.type==="warning"?"#f59e0b":toast.type==="error"?"#ef4444":"#10b981",color:"white",fontWeight:600,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",animation:"slideIn 0.3s ease"}}>{toast.msg}</div>}
      <div style={{background:"#2d3a2e",color:"#e8e4dc",padding:"14px 16px",borderBottom:"3px solid #8b9e5e"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h1 style={{margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.02em"}}><span style={{color:"#8b9e5e"}}>{"\u25cf"}</span> Grown Local</h1><p style={{margin:0,fontSize:11,opacity:0.6,fontFamily:"'DM Mono',monospace"}}>Seed Stock Scanner</p></div>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowExp(!showExp)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#e8e4dc",padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500}}>Export {"\u2193"}</button>
            {showExp&&<div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:"white",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",overflow:"hidden",zIndex:50,minWidth:180}}>
              <button onClick={()=>expCSV("stock")} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",background:"white",cursor:"pointer",textAlign:"left",fontSize:13,color:"#333"}}>{"\ud83d\udce6"} Raw Stock CSV</button>
              <button onClick={()=>expCSV("products")} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",background:"white",cursor:"pointer",textAlign:"left",fontSize:13,color:"#333",borderTop:"1px solid #eee"}}>{"\ud83c\udff7"} Products CSV</button>
              <button onClick={expJSON} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",background:"white",cursor:"pointer",textAlign:"left",fontSize:13,color:"#333",borderTop:"1px solid #eee"}}>{"\ud83d\udccb"} Full Backup</button>
            </div>}
          </div>
        </div>
        <div style={{display:"flex",gap:3,marginTop:10}}>
          {[{k:"scan",l:"Scan",i:"\ud83d\udcf7"},{k:"stock",l:"Stock ("+stock.length+")",i:"\ud83d\udce6"},{k:"products",l:"Products ("+products.length+")",i:"\ud83c\udff7"}].map(t=>
            <button key={t.k} onClick={()=>{setView(t.k);setSearch("");if(t.k==="scan"&&!editing){setCur({...EMPTY_STOCK,id:genId()});setCurImg(null);}}} style={{flex:1,padding:"9px 6px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:aTab===t.k?"#8b9e5e":"rgba(255,255,255,0.08)",color:aTab===t.k?"white":"rgba(255,255,255,0.5)",transition:"all 0.2s"}}>{t.i} {t.l}</button>)}
        </div>
      </div>
      <div style={{padding:"14px 14px 100px"}}>
        {view==="scan"&&<div>
          <div onClick={()=>!processing&&fRef.current&&fRef.current.click()} style={{border:"2px dashed #8b9e5e",borderRadius:12,padding:processing?"20px":"28px 16px",textAlign:"center",cursor:processing?"default":"pointer",background:processing?"#f0f4e8":"white",marginBottom:14}}>
            <input ref={fRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
            {processing?<div><div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTopColor:"#8b9e5e",borderRadius:"50%",margin:"0 auto 10px",animation:"spin 0.8s linear infinite"}}/><p style={{margin:0,fontWeight:600,color:"#2d3a2e",fontSize:14}}>{status}</p></div>
            :<div><div style={{fontSize:32,marginBottom:6}}>{"\ud83d\udcf7"}</div><p style={{margin:0,fontWeight:600,color:"#2d3a2e",fontSize:14}}>Tap to scan seed packet</p><p style={{margin:"3px 0 0",color:"#888",fontSize:12}}>Camera or photo library</p></div>}
          </div>
          {status&&!processing&&<div style={{background:status.includes("Couldn")?"#fef2f2":"#f0fdf4",padding:"8px 12px",borderRadius:8,marginBottom:10,fontSize:13,color:status.includes("Couldn")?"#dc2626":"#16a34a",fontWeight:500}}>{status}</div>}
          {curImg&&<div style={{marginBottom:10,position:"relative"}}><img src={curImg} style={{width:"100%",borderRadius:10,maxHeight:200,objectFit:"cover"}} alt="Packet"/><button onClick={()=>setCurImg(null)} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:12,lineHeight:"24px",textAlign:"center"}}>X</button></div>}
          <div style={{background:"white",borderRadius:12,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"#2d3a2e"}}>{editing?"\u270f\ufe0f Edit Entry":"New Stock Entry"}</h3>
              {cur.seed&&needsPP(cur.seed)&&<Badge variant={cur.passport?"success":"danger"}>{cur.passport?"PP \u2713":"\u26a0 PP Required"}</Badge>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label="Date" value={cur.date} type="date" onChange={v=>setCur(p=>({...p,date:v}))}/><Sel label="Supplier" value={cur.supplier} options={SUPPLIERS} onChange={v=>setCur(p=>({...p,supplier:v}))}/></div>
            <Field label="Seed Name & Variety" value={cur.seed} placeholder="e.g. Tomato Honey Comb F1" onChange={v=>setCur(p=>({...p,seed:v}))}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label="Batch Code" value={cur.batch} placeholder="e.g. 57283CINO7S" onChange={v=>setCur(p=>({...p,batch:v}))}/><Field label="Invoice No." value={cur.invoice} placeholder="e.g. 2022-210" onChange={v=>setCur(p=>({...p,invoice:v}))}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><Field label="Quantity" value={cur.qty} placeholder="1000" type="number" onChange={v=>setCur(p=>({...p,qty:v}))}/><Sel label="Unit" value={cur.qtyUnit} options={["seeds","grams","kg","bulbs","sets"]} onChange={v=>setCur(p=>({...p,qtyUnit:v}))} raw/><Field label="Germ %" value={cur.germinationRate} placeholder="85" type="number" onChange={v=>setCur(p=>({...p,germinationRate:v}))}/></div>
            <div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:8,padding:10,margin:"10px 0"}}>
              <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:"#92400e"}}>{"\ud83d\udee1"} Compliance</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Field label="Supplier Passport" value={cur.passport} placeholder="e.g. 112294" onChange={v=>setCur(p=>({...p,passport:v}))} highlight={needsPP(cur.seed)&&!cur.passport} small/>
                <Field label="Country of Origin" value={cur.origin} placeholder="GB, NL, IT" onChange={v=>setCur(p=>({...p,origin:v}))} highlight={needsPP(cur.seed)&&!cur.origin} small/>
                <Field label="Organic Licence" value={cur.organicLicense} placeholder="Optional" onChange={v=>setCur(p=>({...p,organicLicense:v}))} small/>
                <Field label="Chemical Treatment" value={cur.chemicalTreatment} placeholder="e.g. Thiram" onChange={v=>setCur(p=>({...p,chemicalTreatment:v}))} small/>
              </div>
            </div>
            <Field label="Notes" value={cur.notes} placeholder="Any extra info..." onChange={v=>setCur(p=>({...p,notes:v}))}/>
            <button onClick={saveEntry} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,background:"#2d3a2e",color:"white",marginTop:6}}>{editing?"\ud83d\udcbe Update":"\u2713 Save to Raw Stock"}</button>
            {editing&&<button onClick={()=>{setEditing(false);setCur({...EMPTY_STOCK,id:genId()});}} style={{width:"100%",padding:"10px",borderRadius:10,border:"1px solid #ddd",cursor:"pointer",fontSize:13,background:"white",color:"#666",marginTop:6}}>Cancel</button>}
          </div>
        </div>}
        {view==="stock"&&<div>
          {stock.length>0&&<div style={{background:"white",borderRadius:12,padding:14,marginBottom:14}}>
            <h3 style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#2d3a2e"}}>Compliance</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
              <Stat label="Total" value={st.total} color="#6b7280"/>
              <Stat label="Clean" value={st.clean} color="#16a34a"/>
              <Stat label="No PP" value={st.nopp} color={st.nopp>0?"#dc2626":"#16a34a"}/>
              <Stat label="No Germ" value={st.nog} color={st.nog>0?"#f59e0b":"#16a34a"}/>
            </div>
          </div>}
          <input type="text" placeholder="Search stock..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #ddd",fontSize:14,background:"white",boxSizing:"border-box",marginBottom:10}}/>
          {fStock.length===0?<div style={{textAlign:"center",padding:"36px",color:"#999"}}><p>{stock.length===0?"No stock yet":"No matches"}</p></div>
          :<div style={{display:"flex",flexDirection:"column",gap:6}}>
            {fStock.map(e=>{const is2=iss(e);const con=consumed(e.id);return(
              <div key={e.id} onClick={()=>{setSel(e);setDetailImg(null);setView("detail");(async()=>{try{const r=await window.storage.get("gl-img-"+e.id);if(r&&r.value)setDetailImg(r.value);}catch(ex){}})();}} style={{background:"white",borderRadius:10,padding:"10px 12px",cursor:"pointer",borderLeft:"4px solid "+(is2.length===0?"#16a34a":"#f59e0b")}}>
                <p style={{margin:0,fontWeight:600,fontSize:13}}>{e.hasPhoto&&"\ud83d\udcf7 "}{e.seed||"Unnamed"}</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{e.batch} · {e.supplier}</p>
                {con>0&&<p style={{margin:"2px 0 0",fontSize:11,color:"#8b9e5e"}}>Packed: {con}</p>}
              </div>);})}
          </div>}
        </div>}
        {view==="detail"&&sel&&<div>
          <button onClick={()=>setView("stock")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#8b9e5e",fontWeight:600,padding:0,marginBottom:10}}>{"\u2190"} Back</button>
          <div style={{background:"white",borderRadius:12,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <h2 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:"#2d3a2e"}}>{sel.seed}</h2>
            <p style={{margin:"0 0 12px",fontSize:12,color:"#888",fontFamily:"'DM Mono',monospace"}}>Batch: {sel.batch||"\u2014"}</p>
            {detailImg&&<div style={{marginBottom:12,position:"relative"}}><img src={detailImg} onClick={()=>setViewImg(true)} style={{width:"100%",borderRadius:10,maxHeight:220,objectFit:"cover",cursor:"pointer"}} alt="Packet photo"/><p style={{position:"absolute",bottom:8,left:8,margin:0,fontSize:10,background:"rgba(0,0,0,0.5)",color:"white",padding:"2px 6px",borderRadius:4}}>Tap to enlarge</p></div>}
            {viewImg&&detailImg&&<div onClick={()=>setViewImg(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,cursor:"pointer"}}><img src={detailImg} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:8}} alt="Full size"/></div>}
            {iss(sel).length>0&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:10,marginBottom:12}}>
              <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#991b1b"}}>{"\u26a0"} Issues</p>
              {iss(sel).map((i,x)=><p key={x} style={{margin:"2px 0",fontSize:12,color:"#dc2626"}}>{"\u2022"} {i}</p>)}
            </div>}
            {sel.qty&&<div style={{background:"#f0f4e8",border:"1px solid #c6d7a0",borderRadius:8,padding:10,marginBottom:12}}>
              <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#2d3a2e"}}>Stock Reconciliation</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,textAlign:"center"}}>
                <div><p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{sel.qty}</p><p style={{margin:0,fontSize:10,color:"#666"}}>IN</p></div>
                <div><p style={{margin:0,fontSize:16,fontWeight:700,color:"#8b9e5e",fontFamily:"'DM Mono',monospace"}}>{consumed(sel.id)}</p><p style={{margin:0,fontSize:10,color:"#666"}}>PACKED</p></div>
                <div><p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{parseFloat(sel.qty)-consumed(sel.id)}</p><p style={{margin:0,fontSize:10,color:"#666"}}>LEFT</p></div>
              </div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
              <DRow label="Date" value={sel.date}/><DRow label="Supplier" value={sel.supplier}/>
              <DRow label="Invoice" value={sel.invoice}/><DRow label="Batch" value={sel.batch}/>
              <DRow label="Qty" value={sel.qty?sel.qty+" "+sel.qtyUnit:""}/>
              <DRow label="Germ %" value={sel.germinationRate?sel.germinationRate+"%":""} warn={!sel.germinationRate}/>
              <DRow label="Supplier PP" value={sel.passport} warn={needsPP(sel.seed)&&!sel.passport}/>
              <DRow label="Origin" value={sel.origin} warn={needsPP(sel.seed)&&!sel.origin}/>
              <DRow label="Organic" value={sel.organicLicense}/><DRow label="Treatment" value={sel.chemicalTreatment}/>
            </div>
            {sel.notes&&<div style={{marginTop:10,padding:"8px 10px",background:"#f5f5f0",borderRadius:8}}><p style={{margin:0,fontSize:11,fontWeight:600,color:"#666"}}>Notes</p><p style={{margin:"3px 0 0",fontSize:13,color:"#333"}}>{sel.notes}</p></div>}
            {(()=>{const rel=products.filter(p=>p.sourceStockId===sel.id);if(!rel.length)return null;return<div style={{marginTop:12}}><p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#2d3a2e"}}>Products Packed</p>{rel.map(p=><div key={p.id} onClick={()=>{setSel(p);setView("productDetail");}} style={{background:"#f5f5f0",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:"pointer",fontSize:12}}><span style={{fontWeight:600}}>{p.batchCode}</span><span style={{color:"#888"}}> — {p.qtyProduced}x {p.seedCountWeight} {p.unit}</span></div>)}</div>;})()}
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button onClick={()=>startPack(sel)} style={{flex:2,padding:"12px",borderRadius:8,border:"none",background:"#8b9e5e",color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>{"\ud83c\udff7"} Pack Products</button>
              <button onClick={()=>{setCur({...sel});setEditing(true);setCurImg(null);(async()=>{try{const r=await window.storage.get("gl-img-"+sel.id);if(r&&r.value)setCurImg(r.value);}catch(ex){}})();setView("scan");}} style={{flex:1,padding:"12px",borderRadius:8,border:"1px solid #8b9e5e",background:"white",color:"#2d3a2e",cursor:"pointer",fontSize:13,fontWeight:600}}>{"\u270f\ufe0f"}</button>
              <button onClick={()=>{if(confirm("Delete?"))delStock(sel.id);}} style={{flex:1,padding:"12px",borderRadius:8,border:"1px solid #fca5a5",background:"white",color:"#dc2626",cursor:"pointer",fontSize:13,fontWeight:600}}>{"\ud83d\uddd1"}</button>
            </div>
          </div>
        </div>}
        {view==="pack"&&pSrc&&<div>
          <button onClick={()=>{setSel(pSrc);setView("detail");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#8b9e5e",fontWeight:600,padding:0,marginBottom:10}}>{"\u2190"} Back</button>
          <div style={{background:"white",borderRadius:12,padding:14}}>
            <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:700,color:"#2d3a2e"}}>{"\ud83c\udff7"} Pack Products</h3>
            <p style={{margin:"0 0 14px",fontSize:12,color:"#888"}}>From: {pSrc.seed} [{pSrc.batch}]</p>
            <div style={{background:"#f0f4e8",borderRadius:8,padding:10,marginBottom:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,textAlign:"center"}}>
              <div><p style={{margin:0,fontSize:11,color:"#666"}}>Available</p><p style={{margin:0,fontSize:15,fontWeight:700}}>{pSrc.qty?parseFloat(pSrc.qty)-consumed(pSrc.id):"?"}</p></div>
              <div><p style={{margin:0,fontSize:11,color:"#666"}}>Packed</p><p style={{margin:0,fontSize:15,fontWeight:700}}>{consumed(pSrc.id)}</p></div>
              <div><p style={{margin:0,fontSize:11,color:"#666"}}>This Run</p><p style={{margin:0,fontSize:15,fontWeight:700,color:"#8b9e5e"}}>{pCount&&pQty?parseFloat(pCount)*parseInt(pQty):0}</p></div>
            </div>
            <Field label="Pack Date" value={pDate} type="date" onChange={setPDate}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <Field label="Per Packet" value={pCount} placeholder="10" type="number" onChange={setPCount}/>
              <Sel label="Unit" value={pUnit} options={["seeds","grams","kg"]} onChange={setPUnit} raw/>
              <Field label="Qty Produced" value={pQty} placeholder="45" type="number" onChange={setPQty}/>
            </div>
            <div style={{background:"#e0f2fe",border:"1px solid #bae6fd",borderRadius:8,padding:10,margin:"10px 0"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <p style={{margin:"0 0 2px",fontSize:11,fontWeight:600,color:"#075985",textTransform:"uppercase"}}>GL Batch Code</p>
                  <div style={{display:"flex",gap:6}}>
                    <input value={pBatch} onChange={e=>setPBatch(e.target.value)} style={{flex:1,padding:"7px 8px",borderRadius:6,border:"1px solid #bae6fd",fontSize:14,fontFamily:"'DM Mono',monospace",fontWeight:700,background:"white"}}/>
                    <button onClick={()=>setPBatch(genBatch(products.map(p=>p.batchCode)))} style={{padding:"7px 10px",borderRadius:6,border:"1px solid #bae6fd",background:"white",cursor:"pointer",fontSize:11,fontWeight:600,color:"#075985"}}>{"\ud83d\udd04"}</button>
                  </div>
                </div>
                <div>
                  <p style={{margin:"0 0 2px",fontSize:11,fontWeight:600,color:"#075985",textTransform:"uppercase"}}>Plant Passport</p>
                  <p style={{margin:0,padding:"7px 8px",background:needsPP(pSrc.seed)?"#dcfce7":"#f5f5f0",borderRadius:6,fontSize:14,fontWeight:700,color:needsPP(pSrc.seed)?"#166534":"#999"}}>{needsPP(pSrc.seed)?pBatch:"Not required"}</p>
                </div>
              </div>
            </div>
            <div style={{background:"#f5f5f0",borderRadius:8,padding:10,margin:"10px 0",fontSize:12}}>
              <p style={{margin:"0 0 4px",fontWeight:700}}>Traceability</p>
              <p style={{margin:"2px 0",color:"#666"}}>Supplier: <strong>{pSrc.supplier||"-"}</strong></p>
              <p style={{margin:"2px 0",color:"#666"}}>PP: <strong>{pSrc.passport||"-"}</strong></p>
              <p style={{margin:"2px 0",color:"#666"}}>Origin: <strong>{pSrc.origin||"-"}</strong></p>
              <p style={{margin:"2px 0",color:"#666"}}>Batch: <strong>{pSrc.batch||"-"}</strong></p>
            </div>
            <Field label="Notes" value={pNotes} placeholder="Optional" onChange={setPNotes}/>
            <button onClick={savePack} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,background:"#2d3a2e",color:"white"}}>Create Product Run</button>
          </div>
        </div>}
        {view==="products"&&<div>
          <input type="text" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #ddd",fontSize:14,background:"white",boxSizing:"border-box",marginBottom:10}}/>
          {fProds.length===0?<div style={{textAlign:"center",padding:"36px",color:"#999"}}><p>{products.length===0?"No products yet":"No matches"}</p></div>
          :<div style={{display:"flex",flexDirection:"column",gap:6}}>
            {fProds.map(e=><div key={e.id} onClick={()=>{setSel(e);setView("productDetail");}} style={{background:"white",borderRadius:10,padding:"10px 12px",cursor:"pointer",borderLeft:"4px solid "+(e.passport?"#16a34a":"#6b7280")}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontWeight:600,fontSize:13,color:"#2d3a2e"}}>{e.productName}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#888",fontFamily:"'DM Mono',monospace"}}>{e.batchCode} | {e.qtyProduced}x {e.seedCountWeight} {e.unit}</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                  <p style={{margin:0,fontSize:11,color:"#aaa"}}>{e.date}</p>
                  {e.passport?<Badge variant="success">PP</Badge>:<Badge>No PP</Badge>}
                </div>
              </div>
            </div>)}
          </div>}
        </div>}
        {view==="productDetail"&&sel&&<div>
          <button onClick={()=>setView("products")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#8b9e5e",fontWeight:600,padding:0,marginBottom:10}}>Back</button>
          <div style={{background:"white",borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <h2 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:"#2d3a2e"}}>{sel.productName}</h2>
                <p style={{margin:0,fontSize:14,fontFamily:"'DM Mono',monospace",color:"#8b9e5e",fontWeight:700}}>{sel.batchCode}</p>
              </div>
              {sel.passport&&<Badge variant="success">PP: {sel.passport}</Badge>}
            </div>
            <div style={{background:"#f0f4e8",borderRadius:8,padding:12,marginBottom:12,textAlign:"center"}}>
              <p style={{margin:0,fontSize:28,fontWeight:700,color:"#2d3a2e"}}>{sel.qtyProduced}</p>
              <p style={{margin:0,fontSize:12,color:"#666"}}>packets of {sel.seedCountWeight} {sel.unit} ({sel.totalSeed} total)</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
              <DRow label="Date" value={sel.date}/><DRow label="Batch Code" value={sel.batchCode}/>
              <DRow label="Source Supplier" value={sel.sourceSupplier}/>
              <DRow label="Source Batch" value={sel.sourceBatch}/>
              <DRow label="Supplier PP" value={sel.sourcePassport}/>
              <DRow label="Origin" value={sel.sourceOrigin}/>
              <DRow label="Treatment" value={sel.chemicalTreatment}/>
              <DRow label="Organic" value={sel.organicLicense}/>
            </div>
            <button onClick={()=>{if(confirm("Delete?"))delProd(sel.id);}} style={{width:"100%",marginTop:14,padding:"12px",borderRadius:8,border:"1px solid #fca5a5",background:"white",color:"#dc2626",cursor:"pointer",fontSize:13,fontWeight:600}}>Delete Product</button>
          </div>
        </div>}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

const MODEL="@cf/cloudflare/clef-flash";
const CRITERIA=["Very low","Low","Medium","High","Very high"];
const TTL=3600;
const sid=n=>String(n).trim().replace(/[^A-Za-z0-9_.-]/g,"_").slice(0,100);
const clamp=n=>!Number.isFinite(n)?0:Math.min(1,Math.max(0,n));
const r4=n=>Math.round(Number(n)*1e4)/1e4;
const json=(o,s=200)=>new Response(JSON.stringify(o,null,2),{status:s,headers:{"content-type":"application/json;charset=utf-8","access-control-allow-origin":"*"}});
async function sha256Hex(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function stableKey(state,tools,threshold){return JSON.stringify({state:String(state).trim(),tools:[...tools].map(t=>String(t).trim()).sort(),threshold})}
export default{async fetch(req,env){
  const url=new URL(req.url);
  if(req.method==="GET"){
    const example=`curl -sS ${url.origin}/precheck -H 'content-type: application/json' -d '{"state":"User: weather in Berlin?","tools":["get_weather","search_web","send_email"],"threshold":0.6}'`;
    const help={name:"toolprobe-clef-kv-cache",note:"Clef-flash precheck with Workers KV cache",model:MODEL,POST:{path:"/precheck or /",state:"string",tools:"string[]",threshold:"number? default 0.5"},example};
    if(url.searchParams.get("format")==="json") return json(help);
    return new Response(`<!doctype html><meta charset=utf-8><title>toolprobe-clef-kv-cache</title><body style="font:15px system-ui;max-width:720px;margin:2rem auto"><h1>toolprobe-clef-kv-cache</h1><p>Clef-flash precheck + Workers KV cache</p><pre>${example.replace(/&/g,"&amp;")}</pre><p><a href="?format=json">JSON help</a></p></body>`,{headers:{"content-type":"text/html;charset=utf-8"}});
  }
  if(req.method==="OPTIONS") return new Response(null,{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type"}});
  if(req.method!=="POST") return json({error:"Use GET or POST"},405);
  const path=url.pathname.replace(/\/+$/,"")||"/";
  if(path!=="/"&&path!=="/precheck") return json({error:"POST /precheck or POST /"},404);
  let body; try{body=await req.json();}catch{return json({error:"Invalid JSON"},400);}
  const state=body?.state, tools=body?.tools, thr=typeof body?.threshold==="number"?body.threshold:0.5;
  if(typeof state!=="string"||!state.trim()) return json({error:'"state" required'},400);
  if(!Array.isArray(tools)||!tools.length||tools.some(t=>typeof t!=="string"||!t.trim())) return json({error:'"tools" must be non-empty string[]'},400);
  if(tools.length>32) return json({error:"max 32 tools"},400);
  if(!(thr>=0&&thr<=1)) return json({error:'"threshold" 0..1'},400);
  const t0=Date.now();
  const cacheKey=await sha256Hex(stableKey(state,tools,thr));
  const cached=await env.CACHE.get(cacheKey,{type:"json",cacheTtl:30});
  if(cached&&typeof cached==="object") return json({...cached,cache:"HIT",latency_ms_total:Date.now()-t0,latency_ms_model:0,cache_key:cacheKey.slice(0,16)});
  const criteria=Object.fromEntries(tools.map(n=>[sid(n),"Candidate tool: "+n]));
  const idToName=Object.fromEntries(tools.map(n=>[sid(n),n]));
  const tModel=Date.now();
  let ai; try{
    ai=await env.AI.run(MODEL,{model:"clef-flash",state,questions:{
      should_call:{type:"noul",instructions:"Given the assistant state, should an external tool be invoked now? Yes only if warranted and useful."},
      tool:{type:"choice",instructions:"Which candidate tool best matches the current state?",criteria},
      confidence:{type:"score",instructions:"How confident are you in this tool-call precheck (should_call + chosen tool)?",criteria:CRITERIA}
    }});
  }catch(e){return json({error:"Clef-flash failed",detail:String(e?.message||e),cache:"MISS",latency_ms_total:Date.now()-t0,latency_ms_model:Date.now()-tModel,model:MODEL},502);}
  const modelMs=Date.now()-tModel, a=ai?.answers||{};
  const noul=Number(a.should_call?.noul??0);
  const choiceId=a.tool?.choice??null;
  const toolName=choiceId!=null?(idToName[choiceId]||choiceId):null;
  const scoreRaw=Number(a.confidence?.score??0);
  const confidence=r4(clamp(scoreRaw/(CRITERIA.length-1)));
  const should_call=noul>=thr;
  const probs=a.tool?.probabilities; const mapped={}; if(probs) for(const [k,v] of Object.entries(probs)) mapped[idToName[k]||k]=v;
  const payload={note:"decision-model precheck, not tool-calling pass/fail",should_call,tool:should_call?toolName:null,confidence,model:MODEL,threshold:thr,
    details:{should_call_noul:r4(noul),tool_choice:toolName,tool_probabilities:mapped,tool_confidence:r4(Number(a.tool?.confidence??0)),confidence_score:r4(scoreRaw),confidence_legend:a.confidence?.legend}};
  await env.CACHE.put(cacheKey,JSON.stringify(payload),{expirationTtl:TTL});
  return json({...payload,cache:"MISS",latency_ms_total:Date.now()-t0,latency_ms_model:modelMs,cache_key:cacheKey.slice(0,16)});
}};

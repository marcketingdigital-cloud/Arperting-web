// Supabase Edge Function: lead-intake/index.ts
// Requiere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY.
// Se despliega con verify_jwt = false. No se despliega ni se habilita sin las claves.
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://marcketingdigital-cloud.github.io";
const expectedHost = Deno.env.get("TURNSTILE_EXPECTED_HOST") ?? "marcketingdigital-cloud.github.io";
const headers = (origin: string|null) => ({
 "Content-Type":"application/json","Cache-Control":"no-store",
 "Access-Control-Allow-Origin": origin === allowedOrigin ? allowedOrigin : "null",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"content-type, apikey, authorization",
 "Vary":"Origin"
});
const response=(status:number,data:unknown,origin:string|null)=>new Response(JSON.stringify(data),{status,headers:headers(origin)});
const txt=(x:unknown,max:number)=>typeof x==="string"?x.trim().slice(0,max):"";
Deno.serve(async request=>{
 const origin=request.headers.get("origin");
 if(origin!==allowedOrigin)return response(403,{error:"Origen no autorizado"},origin);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(request.method!=="POST")return response(405,{error:"Método no permitido"},origin);
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("TURNSTILE_SECRET_KEY");
 if(!service||!url||!secret)return response(503,{error:"Servicio aún no configurado"},origin);
 if(Number(request.headers.get("content-length")||0)>12000)return response(413,{error:"Solicitud demasiado extensa"},origin);
 let body:Record<string,unknown>;
 try{body=await request.json();if(!body||Array.isArray(body)||typeof body!=="object")throw Error("bad");}catch{return response(400,{error:"Solicitud inválida"},origin)}
 const name=txt(body.name,80),email=txt(body.email,180).toLowerCase(),phone=txt(body.phone,30),country=txt(body.country,65);
 const profile=txt(body.profile,60),goal=txt(body.goal,80),channel=txt(body.channel,80),challenge=txt(body.challenge,1000),rec=txt(body.recommendation,160);
 const utm=txt(body.utm_source,50).replace(/[^a-z0-9_\-]/gi,"");
 const consent=body.consent===true,bot=txt(body.honeypot,100),token=txt(body.turnstileToken,3000);
 if(bot)return response(200,{ok:true},origin);
 if(!consent||name.length<2||(!email&&!phone)||!profile||!goal||!token)return response(400,{error:"Completá los campos y aceptá la privacidad"},origin);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response(400,{error:"Correo inválido"},origin);
 if(phone&&!/^\+?[\d\s()-]{7,25}$/.test(phone))return response(400,{error:"Teléfono inválido"},origin);
 let check;
 try{
  const payload=new URLSearchParams({secret,response:token});
  const validation=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:payload});
  check=await validation.json();
 }catch{return response(503,{error:"No se pudo verificar la protección anti-spam"},origin)}
 if(!check?.success||check.hostname!==expectedHost)return response(403,{error:"No se pudo verificar la solicitud"},origin);
 const record={name,email:email||null,phone:phone||null,country:country||null,profile,goal,channel:channel||null,challenge:challenge||null,recommendation:rec||null,source:"website-diagnostic",utm_source:utm||null,privacy_accepted_at:new Date().toISOString()};
 try{
  const insert=await fetch(url+"/rest/v1/arperting_leads",{method:"POST",headers:{"apikey":service,"Authorization":"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(record)});
  if(!insert.ok){console.error("Lead intake database status:",insert.status);return response(503,{error:"No se pudo registrar la consulta. Podés contactar por WhatsApp."},origin)}
  return response(201,{ok:true},origin);
 }catch{return response(503,{error:"Servicio temporalmente no disponible"},origin)}
});

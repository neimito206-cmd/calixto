/* Cliente mínimo do Supabase (Auth + REST + Storage) feito com fetch. Sem bibliotecas externas. */
(function(){
  var C = window.CALIXTO_CONFIG, SKEY = "calixto.auth.v1", sess = null, refreshing = null, onOut = function(){};
  try { sess = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch(e){ sess = null; }
  function store(s){ sess = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch(e){} }
  function setSession(j){
    var s = { access_token:j.access_token, refresh_token:j.refresh_token, expires_at:Math.floor(Date.now()/1000) + (j.expires_in || 3600), user:j.user };
    store(s); return s;
  }
  function fail(r, j){
    var m = (j && (j.msg || j.message || j.error_description || j.error)) || ("Erro " + r.status);
    var e = new Error(m); e.status = r.status; e.code = j && (j.code || j.error_code); return e;
  }
  async function http(path, o){
    o = o || {};
    var h = { apikey:C.key };
    if (!o.raw) h["Content-Type"] = "application/json";
    if (o.token) h.Authorization = "Bearer " + o.token;      // sem sessão: só a apikey
    if (o.headers) for (var k in o.headers) h[k] = o.headers[k];
    var r;
    try { r = await fetch(C.url + path, { method:o.method || "GET", headers:h, body:o.body }); }
    catch(e){ throw new Error("Failed to fetch"); }
    var t = await r.text(), j = null;
    try { j = t ? JSON.parse(t) : null; } catch(e){ j = t; }
    if (!r.ok) throw fail(r, j);
    return j;
  }
  async function token(){
    if (!sess) return null;
    if (sess.expires_at - 30 > Date.now()/1000) return sess.access_token;
    if (!refreshing) refreshing = (async function(){
      try {
        var j = await http("/auth/v1/token?grant_type=refresh_token", { method:"POST", body:JSON.stringify({ refresh_token:sess.refresh_token }) });
        setSession(j);
      } catch(e){
        if (e.status === 400 || e.status === 401 || e.status === 403){ store(null); onOut(); }
        else throw e;
      } finally { refreshing = null; }
    })();
    await refreshing;
    return sess ? sess.access_token : null;
  }
  async function api(path, o){ o = o || {}; o.token = await token(); return http(path, o); }
  function qs(p){
    var u = new URLSearchParams();
    for (var k in p) if (p[k] !== undefined && p[k] !== null) u.append(k, p[k]);
    var s = u.toString(); return s ? "?" + s : "";
  }
  function filt(f){ var o = {}; for (var k in (f || {})) o[k] = f[k]; return o; }

  window.SB = {
    onSignedOut: function(fn){ onOut = fn; },
    session: function(){ return sess; },
    user: function(){ return sess ? sess.user : null; },
    auth: {
      signUp: async function(email, password, meta){
        var j = await http("/auth/v1/signup", { method:"POST", body:JSON.stringify({ email:email, password:password, data:meta }) });
        if (j && j.access_token){ setSession(j); return { session:true, user:j.user }; }
        return { session:false, existing: !!j && Array.isArray(j.identities) && j.identities.length === 0 };
      },
      signIn: async function(email, password){
        var j = await http("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({ email:email, password:password }) });
        setSession(j); return j.user;
      },
      verify: async function(email, code, type){
        var j = await http("/auth/v1/verify", { method:"POST", body:JSON.stringify({ type:type, email:email, token:code }) });
        setSession(j); return j.user;
      },
      resend: function(email){ return http("/auth/v1/resend", { method:"POST", body:JSON.stringify({ type:"signup", email:email }) }); },
      sendCode: function(email){ return http("/auth/v1/otp", { method:"POST", body:JSON.stringify({ email:email, create_user:false }) }); },
      setPassword: function(pw){ return api("/auth/v1/user", { method:"PUT", body:JSON.stringify({ password:pw }) }); },
      signOut: async function(){
        try { if (sess) await http("/auth/v1/logout", { method:"POST", token:sess.access_token }); } catch(e){}
        store(null);
      }
    },
    select: function(table, o){
      o = o || {};
      var p = filt(o.f); p.select = o.select || "*"; if (o.order) p.order = o.order; if (o.limit) p.limit = o.limit;
      return api("/rest/v1/" + table + qs(p));
    },
    insert: function(table, row){
      return api("/rest/v1/" + table, { method:"POST", body:JSON.stringify(row), headers:{ Prefer:"return=representation" } });
    },
    update: function(table, f, patch){
      return api("/rest/v1/" + table + qs(filt(f)), { method:"PATCH", body:JSON.stringify(patch), headers:{ Prefer:"return=representation" } });
    },
    remove: function(table, f){
      return api("/rest/v1/" + table + qs(filt(f)), { method:"DELETE", headers:{ Prefer:"return=representation" } });
    },
    rpc: function(fn, args){ return api("/rest/v1/rpc/" + fn, { method:"POST", body:JSON.stringify(args || {}) }); },
    upload: async function(path, blob){
      await api("/storage/v1/object/fotos/" + path, { method:"POST", raw:true, body:blob, headers:{ "Content-Type":blob.type || "image/jpeg" } });
      return C.url + "/storage/v1/object/public/fotos/" + path;
    }
  };
})();

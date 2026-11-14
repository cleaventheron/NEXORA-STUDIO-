/* Nexora Studio v2
   Demo mode persists on this browser. For real cloud accounts, configure Supabase
   in the block below and run supabase-schema.sql in your Supabase SQL editor. */
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
const supabaseReady = window.supabase && SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const sb = supabaseReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
const state = {user:null, profile:null, products:[], page:"overview", authMode:"login", business:null, businessOrders:[], businessStock:[]};
const DBKEY = "nexora_studio_v1_demo";
const money = n => new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(n)||0);
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600)}
function cleanSlug(s){return (s||"creator-store").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,35)||"creator-store"}
function initials(s){return (s||"N").trim().charAt(0).toUpperCase()}
function accentHex(key){return ({purple:"#a855f7",blue:"#5285ff",mint:"#36d6b0"})[key]||"#a855f7"}
function readDemo(){try{return JSON.parse(localStorage.getItem(DBKEY)||"{}")}catch{return {}}}
function saveDemo(){const all=readDemo();all[state.user.id]={profile:state.profile,products:state.products};localStorage.setItem(DBKEY,JSON.stringify(all))}
function loadDemo(user){const data=readDemo()[user.id]||{};state.profile=data.profile||{name:user.name||user.email.split("@")[0],slug:cleanSlug(user.name||user.email.split("@")[0]),bio:"Welcome to my creator store. Discover my latest work.",tagline:"Made with purpose.",accent_color:"purple",published:false};state.products=data.products||[]}
async function loadCloud(user){const [p,items]=await Promise.all([sb.from("profiles").select("*").eq("id",user.id).maybeSingle(),sb.from("products").select("*").eq("user_id",user.id).order("created_at",{ascending:false})]);if(p.error)throw p.error;if(items.error)throw items.error;state.profile=p.data||{id:user.id,name:user.email.split("@")[0],slug:cleanSlug(user.email.split("@")[0]+"-"+user.id.slice(0,6)),bio:"",tagline:"",accent_color:"purple",published:false};state.products=items.data||[];if(!p.data){const ins=await sb.from("profiles").insert({id:user.id,name:state.profile.name,slug:state.profile.slug,bio:"",tagline:"",accent_color:"purple",published:false}).select().single();if(ins.error)throw ins.error;state.profile=ins.data}}
async function persistProfile(){if(sb){const {error}=await sb.from("profiles").upsert({id:state.user.id,name:state.profile.name,slug:state.profile.slug,bio:state.profile.bio,tagline:state.profile.tagline,accent_color:state.profile.accent_color||"purple",published:state.profile.published});if(error)throw error}else saveDemo()}
async function persistProduct(product){if(sb){const row={...product,user_id:state.user.id};if(!row.id)delete row.id;delete row.created_at;const {data,error}=await sb.from("products").upsert(row).select().single();if(error)throw error;return data}else{const idx=state.products.findIndex(p=>p.id===product.id);if(idx>=0)state.products[idx]=product;else state.products.unshift(product);saveDemo();return product}}
async function removeProduct(id){if(sb){const {error}=await sb.from("products").delete().eq("id",id).eq("user_id",state.user.id);if(error)throw error}else{state.products=state.products.filter(p=>p.id!==id);saveDemo()}}
function setAuthMode(mode){state.authMode=mode;const create=mode==="signup";$("authTitle").innerHTML=create?'Create your <span>creator account.</span>':'Build your <span>digital space.</span>';$("authDescription").textContent=create?"Start building your store with Nexora Studio.":"Set up your store, share your work and grow your audience.";$("nameLabel").classList.toggle("hidden",!create);$("authName").required=create;$("authSubmit").innerHTML=create?'Create account <span>→</span>':'Sign in <span>→</span>';$("authSwitch").textContent=create?"Already have an account? Sign in":"New to Nexora? Create an account";$("authModeNote").textContent=sb?"Secure account mode: Supabase connected.":"Demo mode is active until Supabase is connected."}
async function enterApp(user){state.user=user;if(sb)await loadCloud(user);else loadDemo(user);$("authView").classList.add("hidden");$("appView").classList.remove("hidden");renderAll()}
async function boot(){if(sb){const {data:{session}}=await sb.auth.getSession();if(session){try{await enterApp({id:session.user.id,email:session.user.email,name:session.user.user_metadata?.name||session.user.email.split("@")[0]})}catch(e){toast("Could not load your cloud store: "+e.message)}}sb.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{if(!session){state.user=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}else if(!state.user){try{await enterApp({id:session.user.id,email:session.user.email,name:session.user.user_metadata?.name||""})}catch(e){toast(e.message)} }},0)})}else setAuthMode("login")}
$("authSwitch").addEventListener("click",()=>setAuthMode(state.authMode==="login"?"signup":"login"));
$("authForm").addEventListener("submit",async e=>{e.preventDefault();const email=$("authEmail").value.trim(),password=$("authPassword").value,name=$("authName").value.trim();try{if(sb){if(state.authMode==="signup"){const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});if(error)throw error;if(!data.session){toast("Account created. Check your email to confirm, then sign in.");setAuthMode("login");return}await enterApp({id:data.user.id,email,name})}else{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await enterApp({id:data.user.id,email,name:data.user.user_metadata?.name||""})}}else{if(state.authMode==="signup"&&!name){toast("Enter your creator name.");return}const user={id:"demo_"+email.toLowerCase(),email,name:name||email.split("@")[0]};if(state.authMode==="signup"){const users=JSON.parse(localStorage.getItem("nexora_demo_users")||"{}");if(users[email]){toast("An account with this email already exists.");return}users[email]={name};localStorage.setItem("nexora_demo_users",JSON.stringify(users))}else{const users=JSON.parse(localStorage.getItem("nexora_demo_users")||"{}");if(!users[email]){toast("No demo account found for this email. Create an account first.");return}}await enterApp(user);toast("Welcome to Nexora Studio demo mode.")}}catch(err){toast(err.message||"Something went wrong.")}});
$("logoutBtn").addEventListener("click",async()=>{if(sb)await sb.auth.signOut();state.user=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden");setAuthMode("login")});
function navigate(page){state.page=page;document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$("page-"+page).classList.remove("hidden");document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));const names={overview:"Overview",products:"Products",business:"OGC workspace",store:"My storefront",analytics:"Analytics",settings:"Store settings"};$("pageCrumb").textContent=names[page].toUpperCase();$("pageHeading").textContent=page==="overview"?"Good to see you.":names[page];if(page==="store")renderStore();if(page==="products")renderProducts();if(page==="settings")fillSettings();if(page==="business")loadBusiness().catch(e=>toast("OGC workspace: "+e.message))}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
function renderAll(){
  const p=state.profile;
  const visible=state.products.filter(x=>x.visible!==false).length;
  const hidden=state.products.length-visible;
  $("sideName").textContent=p.name||"Creator";$("sideEmail").textContent=state.user.email;
  $("sideAvatar").textContent=initials(p.name);$("topAvatar").textContent=initials(p.name);
  $("statProducts").textContent=state.products.length;$("statVisible").textContent=visible;$("statHidden").textContent=hidden;
  $("statStoreStatus").textContent=p.published?"Live":"Draft";$("statStoreHint").textContent=p.published?"Public storefront":"Not public yet";
  $("analyticsProducts").textContent=state.products.length;$("analyticsVisible").textContent=visible;$("analyticsHidden").textContent=hidden;
  $("analyticsPublished").textContent=p.published?"Live":"Draft";$("analyticsStoreHint").textContent=p.published?"Public storefront":"Not public yet";
  $("visibleLabel").textContent=visible;$("hiddenLabel").textContent=hidden;
  $("visibleMeter").style.width=(state.products.length?(visible/state.products.length)*100:0)+"%";
  $("viewStoreTop").href=storeHref();
  $("checkProfile").classList.toggle("done",!!(p.name&&p.bio));$("checkProduct").classList.toggle("done",state.products.length>0);$("checkPublish").classList.toggle("done",!!p.published);
  const done=[!!(p.name&&p.bio),state.products.length>0,!!p.published].filter(Boolean).length;
  $("checkProgress").textContent=done+"/3";$("checkProgressBar").style.width=(done/3*100)+"%";
  renderProducts();renderStore();fillSettings();
}
function storeHref(){return location.href.split("?")[0]+"?store="+encodeURIComponent(state.profile.slug)}
function renderProducts(){
  const grid=$("productGrid");grid.innerHTML="";
  const query=($("productSearch")?.value||"").trim().toLowerCase();
  const filter=$("productFilter")?.value||"all";const sort=$("productSort")?.value||"newest";
  let items=state.products.filter(p=>{
    const matches=(p.name+" "+(p.description||"")+" "+(p.category||"")).toLowerCase().includes(query);
    const visible=p.visible!==false;
    return matches&&(filter==="all"||(filter==="visible"&&visible)||(filter==="hidden"&&!visible));
  });
  if(sort==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="price-low")items.sort((a,b)=>Number(a.price)-Number(b.price));
  if(sort==="price-high")items.sort((a,b)=>Number(b.price)-Number(a.price));
  if(sort==="newest")items.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  items.forEach(p=>{
    const card=document.createElement("article");card.className="product-card";
    const cover=p.image_url?`<img src="${escapeAttr(p.image_url)}" alt="${escapeAttr(p.name)}">`:"◇";
    card.innerHTML=`<div class="product-cover">${cover}</div><div class="product-info"><div class="product-title-row"><h3>${escapeHtml(p.name)}</h3><span class="listing-state ${p.visible!==false?"is-visible":"is-hidden"}">${p.visible!==false?"Visible":"Hidden"}</span></div><p>${escapeHtml(p.description||"")}</p><div class="product-meta"><span class="price">${money(p.price)}</span><span class="tag">${escapeHtml(p.category||"Product")}</span></div><div class="product-actions"><button data-edit="${escapeAttr(p.id)}">Edit</button><button class="delete" data-delete="${escapeAttr(p.id)}">Delete</button></div></div>`;
    grid.appendChild(card);
  });
  $("productResultCount").textContent=items.length+" of "+state.products.length+" products";
  $("emptyProducts").classList.toggle("hidden",state.products.length>0);
  grid.classList.toggle("hidden",items.length===0);
  let noResults=$("noProductResults");
  if(!noResults){noResults=document.createElement("div");noResults.id="noProductResults";noResults.className="empty-state glass";noResults.innerHTML="<div class=empty-icon>⌕</div><h3>No matching products</h3><p>Try another search or change your filters.</p>";grid.after(noResults)}
  noResults.classList.toggle("hidden",state.products.length===0||items.length>0);
  grid.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));
  grid.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this product?")){try{await removeProduct(b.dataset.delete);renderAll();toast("Product deleted.")}catch(e){toast(e.message)}}});
}
function renderStore(){
  const p=state.profile;const accent=accentHex(p.accent_color);
  $("previewSlug").textContent=p.slug;$("publishStatus").textContent=p.published?"● Published":"● Draft";
  $("publishStatus").classList.toggle("live",!!p.published);$("publishBtn").textContent=p.published?"Unpublish store":"Publish store";
  $("storeUrlText").textContent=storeHref();
  const visible=state.products.filter(x=>x.visible!==false);
  $("publicStorePreview").innerHTML=`<div class="public-store-head" style="--store-accent:${accent}"><div class="public-logo">${escapeHtml(initials(p.name))}</div><h2>${escapeHtml(p.name||"Your creator store")}</h2><p>${escapeHtml(p.bio||"Welcome to my creator store.")}</p><span class="tag">${escapeHtml(p.tagline||"Create. Monetize. Grow.")}</span></div><div class="public-products">${visible.length?visible.map(x=>`<div class="public-product"><div class="product-cover">${x.image_url?`<img src="${escapeAttr(x.image_url)}" alt="${escapeAttr(x.name)}">`:"◇"}</div><div><h4>${escapeHtml(x.name)}</h4><p>${escapeHtml(x.description||"")}</p><strong>${money(x.price)}</strong><br><span class="coming-soon">CHECKOUT COMING SOON</span></div></div>`).join(""):`<div class="small-note" style="grid-column:1/-1;text-align:center;padding:20px">Your products will appear here when you add them.</div>`}</div>`;
}
function fillSettings(){const p=state.profile;$("creatorName").value=p.name||"";$("storeSlug").value=p.slug||"";$("creatorBio").value=p.bio||"";$("creatorTagline").value=p.tagline||"";$("creatorAccent").value=p.accent_color||"purple";$("settingsAvatar").textContent=initials(p.name)}
$("settingsForm").addEventListener("submit",async e=>{e.preventDefault();const previous={...state.profile};state.profile={...state.profile,name:$("creatorName").value.trim(),slug:cleanSlug($("storeSlug").value),bio:$("creatorBio").value.trim(),tagline:$("creatorTagline").value.trim(),accent_color:$("creatorAccent").value};try{await persistProfile();renderAll();toast("Store details saved.")}catch(err){state.profile=previous;fillSettings();toast(err.message)}});
$("publishBtn").addEventListener("click",async()=>{state.profile.published=!state.profile.published;try{await persistProfile();renderAll();toast(state.profile.published?"Your store is published.":"Your store is now a draft.")}catch(e){state.profile.published=!state.profile.published;toast(e.message)}});
$("copyStoreBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(storeHref());toast("Store link copied.")}catch{toast("Copy this link: "+storeHref())}});
function openProduct(id){const p=state.products.find(x=>x.id===id);$("productId").value=p?.id||"";$("modalTitle").textContent=p?"Edit product":"Add a product";$("productName").value=p?.name||"";$("productDescription").value=p?.description||"";$("productPrice").value=p?.price??"";$("productCategory").value=p?.category||"Digital download";$("productImage").value=p?.image_url||"";$("productVisible").checked=p?.visible!==false;$("productModal").classList.remove("hidden")}
$("addProductBtn").onclick=()=>openProduct();$("emptyAddBtn").onclick=()=>openProduct();document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",()=>$("productModal").classList.add("hidden")));
$("productForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("productId").value||(sb?"":"prod_"+Date.now());const item={id,name:$("productName").value.trim(),description:$("productDescription").value.trim(),price:Number($("productPrice").value),category:$("productCategory").value,image_url:$("productImage").value.trim()||null,visible:$("productVisible").checked};try{const saved=await persistProduct(item);if(sb){const idx=state.products.findIndex(x=>x.id===saved.id);if(idx>=0)state.products[idx]=saved;else state.products.unshift(saved)}$("productModal").classList.add("hidden");renderAll();toast("Product saved.")}catch(err){toast(err.message)}});
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,"&#96;")}
/* OGC First Drop 001 business workspace */
const BIZKEY="nexora_ogc_business_v1";
function bizRead(){try{return JSON.parse(localStorage.getItem(BIZKEY)||"{}")}catch{return {}}}
function bizSave(){const all=bizRead();all[state.user.id]={business:state.business,orders:state.businessOrders,stock:state.businessStock};localStorage.setItem(BIZKEY,JSON.stringify(all))}
function bizId(){return "ogc_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}
function bizEscape(v){return escapeHtml(v)}
async function loadBusiness(){
  if(!state.user)return;
  if(sb){
    let member=await sb.from("business_members").select("workspace_id,role").eq("user_id",state.user.id).limit(1).maybeSingle();
    if(member.error)throw member.error;
    if(!member.data){
      const made=await sb.from("business_workspaces").insert({name:"One Glove Crew",slug:"ogc",owner_id:state.user.id,subscription_plan:"founder_free"}).select().single();
      if(made.error)throw made.error;
      const joined=await sb.from("business_members").insert({workspace_id:made.data.id,user_id:state.user.id,role:"owner"});
      if(joined.error)throw joined.error;
      state.business=made.data;
    }else{
      const w=await sb.from("business_workspaces").select("*").eq("id",member.data.workspace_id).single();if(w.error)throw w.error;state.business=w.data;
    }
    const [orders,stock]=await Promise.all([sb.from("business_orders").select("*").eq("workspace_id",state.business.id).order("created_at",{ascending:false}),sb.from("business_inventory").select("*").eq("workspace_id",state.business.id).order("created_at",{ascending:false})]);
    if(orders.error)throw orders.error;if(stock.error)throw stock.error;state.businessOrders=orders.data||[];state.businessStock=stock.data||[];
  }else{
    const saved=bizRead()[state.user.id]||{};
    state.business=saved.business||{id:"ogc_demo_"+state.user.id,name:"One Glove Crew",slug:"ogc",subscription_plan:"founder_free"};
    state.businessOrders=saved.orders||[];state.businessStock=saved.stock||[];
    bizSave();
  }
  renderBusiness();
}
function renderBusiness(){
  const orders=state.businessOrders||[],stock=state.businessStock||[];
  $("bizOrders").textContent=orders.length;
  const recorded=orders.filter(o=>o.payment_status==="verified").reduce((sum,o)=>sum+Number(o.total_amount||0),0);
  $("bizSales").textContent=money(recorded);
  $("bizStock").textContent=stock.reduce((sum,x)=>sum+Number(x.quantity||0),0);
  $("bizPending").textContent=orders.filter(o=>o.payment_status!=="verified").length;
  const filter=$("bizOrderFilter").value;
  const list=orders.filter(o=>filter==="all"||(filter==="pending"&&o.payment_status!=="verified")||(filter==="verified"&&o.payment_status==="verified")||(filter==="completed"&&o.order_status==="completed"));
  $("bizOrdersList").innerHTML=list.length?list.map(o=>{
    const verified=o.payment_status==="verified";
    const status=verified?"Payment verified":"Awaiting verification";
    return `<article class="business-order"><div><strong>${bizEscape(o.customer_name)}</strong><small>${bizEscape(o.item_name)} × ${Number(o.quantity||1)}</small><span class="biz-channel">${o.sales_channel==="online"?"Online order":"Local sale"} · ${bizEscape((o.payment_method||"").toUpperCase())}</span></div><div class="order-secondary"><span class="order-total">${money(o.total_amount)}</span><small>${new Date(o.created_at||Date.now()).toLocaleDateString("en-ZA")}</small></div><div class="order-secondary"><span class="biz-pill ${verified?"verified":"pending"}">${status}</span><small>${bizEscape(o.order_status||"new").replaceAll("_"," ")}</small></div><div class="biz-actions"><button data-biz-verify="${bizEscape(o.id)}" ${verified?"disabled":""}>Verify</button><button data-biz-complete="${bizEscape(o.id)}" ${o.order_status==="completed"?"disabled":""}>Complete</button></div></article>`;
  }).join(""):`<div class="small-note" style="padding:22px;text-align:center">No orders match this filter yet.</div>`;
  $("bizInventory").innerHTML=stock.length?stock.map(x=>`<article class="inventory-card"><h4>${bizEscape(x.product_name)}</h4><p>${bizEscape(x.colour)} · Size ${bizEscape(x.size)}</p><div class="inventory-bottom"><strong>${money(x.unit_price)}</strong><span class="stock-count ${Number(x.quantity)<=2?"low":""}">${Number(x.quantity)} in stock</span></div><div class="inventory-actions"><button data-stock-minus="${bizEscape(x.id)}">− 1</button><button data-stock-plus="${bizEscape(x.id)}">＋ 1</button><button data-stock-delete="${bizEscape(x.id)}">Remove</button></div></article>`).join(""):`<div class="empty-state glass" style="grid-column:1/-1;padding:25px"><h3>No inventory added</h3><p>Add your First Drop 001 products and sizes to start tracking stock.</p></div>`;
  $("bizOrdersList").querySelectorAll("[data-biz-verify]").forEach(b=>b.onclick=()=>updateBizOrder(b.dataset.bizVerify,{payment_status:"verified"}));
  $("bizOrdersList").querySelectorAll("[data-biz-complete]").forEach(b=>b.onclick=()=>updateBizOrder(b.dataset.bizComplete,{order_status:"completed"}));
  $("bizInventory").querySelectorAll("[data-stock-minus]").forEach(b=>b.onclick=()=>adjustStock(b.dataset.stockMinus,-1));
  $("bizInventory").querySelectorAll("[data-stock-plus]").forEach(b=>b.onclick=()=>adjustStock(b.dataset.stockPlus,1));
  $("bizInventory").querySelectorAll("[data-stock-delete]").forEach(b=>b.onclick=()=>deleteStock(b.dataset.stockDelete));
}
async function saveBizOrder(row){if(sb){const {error}=await sb.from("business_orders").insert({...row,workspace_id:state.business.id,created_by:state.user.id});if(error)throw error}else{state.businessOrders.unshift({...row,id:bizId(),created_at:new Date().toISOString()});bizSave()}}
async function updateBizOrder(id,patch){try{if(sb){const {error}=await sb.from("business_orders").update(patch).eq("id",id).eq("workspace_id",state.business.id);if(error)throw error}else{const item=state.businessOrders.find(x=>x.id===id);if(item)Object.assign(item,patch);bizSave()}renderBusiness();toast("Order updated.")}catch(e){toast(e.message)}}
async function saveStock(row){if(sb){const {error}=await sb.from("business_inventory").insert({...row,workspace_id:state.business.id,created_by:state.user.id});if(error)throw error}else{state.businessStock.unshift({...row,id:bizId(),created_at:new Date().toISOString()});bizSave()}}
async function adjustStock(id,delta){const item=state.businessStock.find(x=>x.id===id);if(!item)return;const quantity=Math.max(0,Number(item.quantity)+delta);try{if(sb){const {error}=await sb.from("business_inventory").update({quantity}).eq("id",id).eq("workspace_id",state.business.id);if(error)throw error}else{item.quantity=quantity;bizSave()}if(sb)item.quantity=quantity;renderBusiness()}catch(e){toast(e.message)}}
async function deleteStock(id){if(!confirm("Remove this inventory item?"))return;try{if(sb){const {error}=await sb.from("business_inventory").delete().eq("id",id).eq("workspace_id",state.business.id);if(error)throw error}else{state.businessStock=state.businessStock.filter(x=>x.id!==id);bizSave()}renderBusiness();toast("Stock item removed.")}catch(e){toast(e.message)}}
$("newOrderBtn").addEventListener("click",()=>{$("orderForm").reset();$("orderQty").value=1;$("orderPayment").value="pending";$("orderModal").classList.remove("hidden")});
$("newStockBtn").addEventListener("click",()=>{$("stockForm").reset();$("stockQty").value=0;$("stockModal").classList.remove("hidden")});
document.querySelectorAll("[data-close-order]").forEach(b=>b.addEventListener("click",()=>$ ("orderModal").classList.add("hidden")));
document.querySelectorAll("[data-close-stock]").forEach(b=>b.addEventListener("click",()=>$ ("stockModal").classList.add("hidden")));
$("bizOrderFilter").addEventListener("change",renderBusiness);
$("orderForm").addEventListener("submit",async e=>{e.preventDefault();const row={customer_name:$("orderCustomer").value.trim(),item_name:$("orderItem").value.trim(),quantity:Number($("orderQty").value),total_amount:Number($("orderAmount").value),sales_channel:$("orderChannel").value,payment_method:$("orderMethod").value,payment_status:$("orderPayment").value,order_status:"new",notes:$("orderNotes").value.trim()};try{await saveBizOrder(row);$("orderModal").classList.add("hidden");await loadBusiness();toast("Order recorded.")}catch(err){toast(err.message)}});
$("stockForm").addEventListener("submit",async e=>{e.preventDefault();const row={product_name:$("stockName").value.trim(),colour:$("stockColour").value.trim(),size:$("stockSize").value,unit_price:Number($("stockPrice").value),quantity:Number($("stockQty").value)};try{await saveStock(row);$("stockModal").classList.add("hidden");await loadBusiness();toast("Inventory item saved.")}catch(err){toast(err.message)}});

async function showPublicStore(slug){
  let profile=null,products=[];
  if(sb){const {data,error}=await sb.from("profiles").select("*").eq("slug",slug).eq("published",true).maybeSingle();if(error)throw error;if(data){profile=data;const result=await sb.from("products").select("*").eq("user_id",data.id).eq("visible",true).order("created_at",{ascending:false});if(result.error)throw result.error;products=result.data||[]}}
  else{const all=readDemo();for(const v of Object.values(all)){if(v.profile?.slug===slug){profile=v.profile;products=v.products||[];break}}}
  if(!profile||!profile.published){document.body.innerHTML=`<main class="public-error"><div><div class="brand-mark">N<span>.</span></div><h1>${profile?"Store not published yet":"Store not found"}</h1><p>${profile?"The creator has not made this storefront public.":"This store may not exist or may have been moved."}</p><a href="${location.pathname}">Go to Nexora Studio</a></div></main>`;return}
  const list=products.filter(p=>p.visible!==false);const accent=accentHex(profile.accent_color);
  document.title=(profile.name||"Creator Store")+" · Nexora Studio";
  document.body.innerHTML=`<main class="public-site" style="--store-accent:${accent}"><div class="public-site-inner"><header class="public-site-head"><div class="public-logo">${escapeHtml(initials(profile.name))}</div><p class="public-powered">NEXORA STUDIO CREATOR STORE</p><h1>${escapeHtml(profile.name)}</h1><p class="public-bio">${escapeHtml(profile.bio||"Welcome to my creator store.")}</p><span class="public-tagline">${escapeHtml(profile.tagline||"Create. Monetize. Grow.")}</span></header><section class="public-site-products"><div class="public-section-title"><span>THE COLLECTION</span><h2>Explore the store</h2></div>${list.length?`<div class="public-site-grid">${list.map(p=>`<article class="public-site-card"><div class="public-site-cover">${p.image_url?`<img src="${escapeAttr(p.image_url)}" alt="${escapeAttr(p.name)}">`:`<span>◇</span>`}</div><div class="public-site-info"><span class="public-category">${escapeHtml(p.category||"Product")}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"")}</p><div class="public-site-price">${money(p.price)}</div><span class="coming-soon">CHECKOUT COMING SOON</span></div></article>`).join("")}</div>`:`<div class="public-empty">This creator is getting their collection ready. Check back soon.</div>`}</section><footer class="public-site-footer">POWERED BY <strong>NEXORA STUDIO</strong><span>CREATE. MONETIZE. GROW.</span></footer></div></main>`;
}
["productSearch","productFilter","productSort"].forEach(id=>$(id).addEventListener(id==="productSearch"?"input":"change",renderProducts));

const params=new URLSearchParams(location.search);if(params.has("store")){showPublicStore(params.get("store")).catch(e=>{document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;background:#090817;color:white;font-family:Arial;text-align:center;padding:25px"><div><h1>Store unavailable</h1><p>${escapeHtml(e.message||"Please try again later.")}</p></div></main>`})}else{boot();setAuthMode("login")}

function loadComponent(path, selector){
  fetch(path).then(r=>r.text()).then(html=>{
    document.querySelector(selector).innerHTML = html;
  }).catch(()=>{});
}

// helper to format numbers
function fmt(n){ return Number(n||0).toLocaleString(); }

// --- Auth helpers (client-side, LocalStorage) ---
async function hashPassword(password){
  // Use Web Crypto when available (requires https/local), otherwise fall back to a simple hash for demo
  try{
    if(window.crypto && crypto.subtle){
      const enc = new TextEncoder();
      const data = enc.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){ /* fallthrough to fallback */ }
  // Fallback: simple DJB2-based hash (not cryptographically secure — demo only)
  let h = 5381;
  for(let i=0;i<password.length;i++) h = ((h<<5) + h) + password.charCodeAt(i);
  h = h >>> 0;
  return h.toString(16).padStart(8,'0');
}

function getAccounts(){
  return JSON.parse(localStorage.getItem('ft_accounts')||'[]');
}

function saveAccounts(arr){ localStorage.setItem('ft_accounts', JSON.stringify(arr)); }

async function createAccount({name, contact, email, password}){
  const accounts = getAccounts();
  const exists = accounts.find(a=> a.email === email || a.contact === contact);
  if(exists) throw new Error('Account already exists');
  const pwd = await hashPassword(password);
  const acct = {id: 'U-'+Date.now().toString(36), name, contact, email, passwordHash: pwd};
  accounts.push(acct); saveAccounts(accounts);
  setCurrentUser({id:acct.id, name:acct.name, email:acct.email, contact:acct.contact});
  return acct;
}

async function validateLogin(identifier, password){
  const accounts = getAccounts();
  const acct = accounts.find(a=> a.email === identifier || a.contact === identifier);
  if(!acct) return null;
  try{
    const ph = await hashPassword(password);
    if(ph === acct.passwordHash) return acct;
  }catch(e){
    console.error('hash error', e);
  }
  return null;
}

function setCurrentUser(u){ localStorage.setItem('ft_user', JSON.stringify(u)); }

function getCurrentUser(){ return JSON.parse(localStorage.getItem('ft_user')||'null'); }

// Forgot password helpers (simple client-side OTP simulation)
function sendResetCode(identifier){
  const code = String(Math.floor(100000 + Math.random()*900000));
  const expires = Date.now() + (5*60*1000);
  localStorage.setItem('ft_reset_'+identifier, JSON.stringify({code, expires}));
  return code; // in real app we'd email/SMS; here we return it so UI can show it
}

function verifyResetCode(identifier, code){
  const item = JSON.parse(localStorage.getItem('ft_reset_'+identifier) || 'null');
  if(!item) return false;
  if(Date.now() > item.expires) return false;
  return item.code === String(code);
}

async function resetPassword(identifier, newPassword){
  const accounts = getAccounts();
  const acct = accounts.find(a=> a.email === identifier || a.contact === identifier);
  if(!acct) throw new Error('Account not found');
  acct.passwordHash = await hashPassword(newPassword);
  saveAccounts(accounts);
  return acct;
}

// --- Transaction helpers ---
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generateTransaction(overrides){
  const names = ['Ibrahim Rabi','Amina Yusuf','John Doe','Grace Nwankwo','Samuel Kola','Fatima Bello'];
  const banks = ['First Bank Of Nigeria','GTBank','Zenith Bank','Access Bank','Guarantee Trust Bank'];
  const amount = Math.floor((Math.random()*500000)+1000);
  const t = {
    id: 'TRF-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
    recipient: randomFrom(names),
    bank: randomFrom(banks),
    account: String(1000000000 + Math.floor(Math.random()*900000000)),
    amount: amount,
    narration: randomFrom(['Payment','Transfer','Salary','Rent','Airtime','Loan repayment']),
    date: new Date().toLocaleString(),
    status: 'successful',
    type: randomFrom(['debit','credit']),
    terminal: '2XPRC712',
    merchant: '2LUXAA0000000001'
  };
  return Object.assign(t, overrides||{});
}

function addTransaction(tx){
  const arr = JSON.parse(localStorage.getItem('ft_transactions')||'[]');
  arr.push(tx);
  localStorage.setItem('ft_transactions', JSON.stringify(arr));
  localStorage.setItem('ft_last', JSON.stringify(tx));
}

function createRandomTransaction(){
  const t = generateTransaction();
  addTransaction(t);
  return t;
}

// --- Demo data seeding ---
async function ensureDemoSeed(){
  try{
    if(localStorage.getItem('ft_seeded')) return;
    const accounts = getAccounts();
    // create demo account if not present (don't overwrite existing accounts)
    const demoExists = accounts.find(a=> a.email === 'demo@axpress.test' || a.contact === '08000000000');
    if(!demoExists){
      const pwdHash = await hashPassword('demo1234');
      const acct = {id: 'U-demo', name: 'Demo User', contact: '08000000000', email: 'demo@axpress.test', passwordHash: pwdHash};
      accounts.push(acct);
      saveAccounts(accounts);
      // seed a few transactions for demo user
      for(let i=0;i<6;i++){
        const tx = generateTransaction({recipient: acct.name, type: (i%2===0)?'credit':'debit'});
        addTransaction(tx);
      }
      localStorage.setItem('ft_balance', '250000');
      localStorage.setItem('ft_seeded','1');
      console.log('Demo account seeded: demo@axpress.test / demo1234');
    }
  }catch(e){ console.error('seed demo failed', e); }
}

(async()=>{ await ensureDemoSeed(); })();

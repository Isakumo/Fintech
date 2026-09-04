// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
class Toast {
  static show(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer') || this.createContainer();
    const toast = document.createElement('div');
    
    const bgClass = {
      'success': 'bg-green-500',
      'error': 'bg-red-500',
      'warning': 'bg-yellow-500',
      'info': 'bg-blue-500'
    }[type] || 'bg-blue-500';
    
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded text-white shadow-lg ${bgClass} animate-slide-in z-50`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  static success(msg) { this.show(msg, 'success'); }
  static error(msg) { this.show(msg, 'error', 5000); }
  static warning(msg) { this.show(msg, 'warning'); }
  static info(msg) { this.show(msg, 'info'); }
  
  static createContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
    return container;
  }
}

// Add toast styles
if (!document.getElementById('toastStyles')) {
  const style = document.createElement('style');
  style.id = 'toastStyles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .animate-slide-in { animation: slideIn 0.3s ease-out; }
    .animate-fade-out { animation: fadeOut 0.3s ease-out; }
  `;
  document.head.appendChild(style);
}

// ============================================
// VALIDATION UTILITIES
// ============================================
const Validators = {
  // Email validation
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: regex.test(value),
      error: 'Please enter a valid email address'
    };
  },
  
  // Phone validation (Nigerian format)
  phone: (value) => {
    const regex = /^[0-9]{10,11}$/;
    const cleaned = value.replace(/[^\d]/g, '');
    return {
      isValid: regex.test(cleaned),
      error: 'Please enter a valid phone number (10-11 digits)'
    };
  },
  
  // Password validation
  password: (value, minLength = 6) => {
    const isValid = value.length >= minLength;
    return {
      isValid,
      error: `Password must be at least ${minLength} characters`
    };
  },
  
  // Password match
  passwordMatch: (pw1, pw2) => {
    return {
      isValid: pw1 === pw2,
      error: 'Passwords do not match'
    };
  },
  
  // Required field
  required: (value) => {
    return {
      isValid: value && value.trim().length > 0,
      error: 'This field is required'
    };
  },
  
  // Full name validation
  fullName: (value) => {
    const parts = value.trim().split(' ');
    return {
      isValid: parts.length >= 2 && parts.every(p => p.length >= 2),
      error: 'Please enter your full name (first and last name)'
    };
  },
  
  // Account number validation
  accountNumber: (value) => {
    const cleaned = value.replace(/[^\d]/g, '');
    return {
      isValid: cleaned.length >= 10,
      error: 'Please enter a valid account number (minimum 10 digits)'
    };
  },
  
  // Amount validation
  amount: (value) => {
    const num = Number(value);
    return {
      isValid: num > 0,
      error: 'Amount must be greater than 0'
    };
  },
  
  // Minimum amount
  minAmount: (value, min) => {
    const num = Number(value);
    return {
      isValid: num >= min,
      error: `Amount must be at least ₦${min.toLocaleString()}`
    };
  }
};

// ============================================
// FORM ERROR DISPLAY
// ============================================
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  field.classList.add('border-red-500');
  let errorEl = field.nextElementSibling;
  if (!errorEl || !errorEl.classList.contains('field-error')) {
    errorEl = document.createElement('div');
    errorEl.className = 'field-error text-xs text-red-600 mt-1';
    field.parentNode.insertBefore(errorEl, field.nextSibling);
  }
  errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  field.classList.remove('border-red-500');
  const errorEl = field.nextElementSibling;
  if (errorEl && errorEl.classList.contains('field-error')) {
    errorEl.remove();
  }
}

function clearAllErrors() {
  document.querySelectorAll('input, select, textarea').forEach(field => {
    field.classList.remove('border-red-500');
  });
  document.querySelectorAll('.field-error').forEach(el => el.remove());
}

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
  // Validate inputs
  const nameVal = Validators.fullName(name);
  if (!nameVal.isValid) throw new Error(nameVal.error);
  
  const phoneVal = Validators.phone(contact);
  if (!phoneVal.isValid) throw new Error(phoneVal.error);
  
  const emailVal = Validators.email(email);
  if (!emailVal.isValid) throw new Error(emailVal.error);
  
  const pwVal = Validators.password(password);
  if (!pwVal.isValid) throw new Error(pwVal.error);
  
  const accounts = getAccounts();
  const exists = accounts.find(a=> a.email === email || a.contact === contact);
  if(exists) throw new Error('Account with this email or phone already exists');
  
  const pwd = await hashPassword(password);
  const acct = {id: 'U-'+Date.now().toString(36), name, contact, email, passwordHash: pwd};
  accounts.push(acct); saveAccounts(accounts);
  setCurrentUser({id:acct.id, name:acct.name, email:acct.email, contact:acct.contact});
  return acct;
}

async function validateLogin(identifier, password){
  if (!identifier.trim()) throw new Error('Please enter email or phone');
  if (!password) throw new Error('Please enter your password');
  
  const accounts = getAccounts();
  const acct = accounts.find(a=> a.email === identifier || a.contact === identifier);
  if(!acct) throw new Error('Account not found. Please check your email/phone or create an account');
  
  try{
    const ph = await hashPassword(password);
    if(ph === acct.passwordHash) return acct;
  }catch(e){
    console.error('hash error', e);
  }
  throw new Error('Invalid password');
}

function setCurrentUser(u){ localStorage.setItem('ft_user', JSON.stringify(u)); }

function getCurrentUser(){ return JSON.parse(localStorage.getItem('ft_user')||'null'); }

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Forgot password helpers (simple client-side OTP simulation)
function sendResetCode(identifier){
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^[0-9]{10,11}$/.test(identifier.replace(/[^\d]/g, ''));
  
  if (!isEmail && !isPhone) throw new Error('Please enter a valid email or phone number');
  
  const code = String(Math.floor(100000 + Math.random()*900000));
  const expires = Date.now() + (5*60*1000);
  localStorage.setItem('ft_reset_'+identifier, JSON.stringify({code, expires}));
  return code; // in real app we'd email/SMS; here we return it so UI can show it
}

function verifyResetCode(identifier, code){
  const item = JSON.parse(localStorage.getItem('ft_reset_'+identifier) || 'null');
  if(!item) throw new Error('No reset code found. Please request a new one');
  if(Date.now() > item.expires) throw new Error('Reset code has expired. Please request a new one');
  if(item.code !== String(code)) throw new Error('Invalid reset code');
  return true;
}

async function resetPassword(identifier, newPassword){
  const pwVal = Validators.password(newPassword);
  if (!pwVal.isValid) throw new Error(pwVal.error);
  
  const accounts = getAccounts();
  const acct = accounts.find(a=> a.email === identifier || a.contact === identifier);
  if(!acct) throw new Error('Account not found');
  acct.passwordHash = await hashPassword(newPassword);
  saveAccounts(accounts);
  
  // Clear reset code
  localStorage.removeItem('ft_reset_'+identifier);
  
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

// --- Beneficiary validation helpers ---
function validateBeneficiary({name, bank, account}) {
  const errors = {};
  
  const nameVal = Validators.required(name);
  if (!nameVal.isValid) errors.name = nameVal.error;
  
  const bankVal = Validators.required(bank);
  if (!bankVal.isValid) errors.bank = bankVal.error;
  
  const accountVal = Validators.accountNumber(account);
  if (!accountVal.isValid) errors.account = accountVal.error;
  
  return errors;
}

function addBeneficiary({name, bank, account}) {
  const errors = validateBeneficiary({name, bank, account});
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  
  const arr = JSON.parse(localStorage.getItem('ft_beneficiaries')||'[]');
  
  // Check for duplicates
  const exists = arr.find(b => b.account === account);
  if (exists) throw new Error('This account number is already saved');
  
  arr.push({name, bank, account});
  localStorage.setItem('ft_beneficiaries', JSON.stringify(arr));
  return arr;
}

function removeBeneficiary(index) {
  const arr = JSON.parse(localStorage.getItem('ft_beneficiaries')||'[]');
  arr.splice(index, 1);
  localStorage.setItem('ft_beneficiaries', JSON.stringify(arr));
  return arr;
}

// --- Transfer validation helpers ---
function validateTransfer({bank, recipient, account, amount, narration}) {
  const errors = {};
  
  const bankVal = Validators.required(bank);
  if (!bankVal.isValid) errors.bank = bankVal.error;
  
  const recipientVal = Validators.required(recipient);
  if (!recipientVal.isValid) errors.recipient = recipientVal.error;
  
  const accountVal = Validators.accountNumber(account);
  if (!accountVal.isValid) errors.account = accountVal.error;
  
  const amountVal = Validators.amount(amount);
  if (!amountVal.isValid) errors.amount = amountVal.error;
  else {
    const minAmountVal = Validators.minAmount(amount, 100);
    if (!minAmountVal.isValid) errors.amount = minAmountVal.error;
  }
  
  return errors;
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

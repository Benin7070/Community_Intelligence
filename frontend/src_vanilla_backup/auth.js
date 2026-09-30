// ============================================================================
// COMMUNITY INTELLIGENCE AUTHENTICATION MODULE (CHATGPT-STYLE UNIFIED FLOW)
// Email check -> Password OR OTP login for registered users
// Registration flow with password setup and verification OTP for new users
// Multi-layer token management & RBAC state management
// ============================================================================

import { animateAuthExit, animateModalOpen, animateModalClose, animateToastIn, animateToastOut } from './motion.js';

const AUTH_API = 'http://localhost:8000/api/v1/auth';


// DOM Elements - Auth Steps
const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('app');

const loginStep1 = document.getElementById('loginStep1');
const loginStepPassword = document.getElementById('loginStepPassword');
const loginStepOtp = document.getElementById('loginStepOtp');
const loginStepSignup = document.getElementById('loginStepSignup');

// Step 1 Elements
const authEmailForm = document.getElementById('authEmailForm');
const authEmail = document.getElementById('authEmail');
const authRequestBtn = document.getElementById('authRequestBtn');

// Step 2A (Password) Elements
const authPasswordForm = document.getElementById('authPasswordForm');
const authLoginPassword = document.getElementById('authLoginPassword');
const authPasswordLoginBtn = document.getElementById('authPasswordLoginBtn');
const authRequestOtpBtn = document.getElementById('authRequestOtpBtn');
const loginTargetEmailDisplay = document.getElementById('loginTargetEmailDisplay');
const toggleLoginPasswordBtn = document.getElementById('toggleLoginPasswordBtn');

// Step 2B (OTP) Elements
const authOtpForm = document.getElementById('authOtpForm');
const authOtp = document.getElementById('authOtp');
const authVerifyBtn = document.getElementById('authVerifyBtn');
const otpTargetEmailDisplay = document.getElementById('otpTargetEmailDisplay');
const authResendBtn = document.getElementById('authResendBtn');
const resendCountdownText = document.getElementById('resendCountdownText');
const authBackToPasswordBtn = document.getElementById('authBackToPasswordBtn');

// Step 3 (Signup) Elements
const authSignupForm = document.getElementById('authSignupForm');
const signupTargetEmailDisplay = document.getElementById('signupTargetEmailDisplay');
const authSignupPassword = document.getElementById('authSignupPassword');
const authSignupPasswordConfirm = document.getElementById('authSignupPasswordConfirm');
const signupOtpSection = document.getElementById('signupOtpSection');
const authSignupOtp = document.getElementById('authSignupOtp');
const authSignupSendOtpBtn = document.getElementById('authSignupSendOtpBtn');
const authSignupSubmitBtn = document.getElementById('authSignupSubmitBtn');
const authSignupResendBtn = document.getElementById('authSignupResendBtn');
const signupResendCountdownText = document.getElementById('signupResendCountdownText');

// Edit email buttons
const editEmailBtns = document.querySelectorAll('.auth-edit-email-btn');

// Common Alerts & App Header Elements
const authError = document.getElementById('authError');
const authErrorMsg = document.getElementById('authErrorMsg');
const currentUserEmail = document.getElementById('currentUserEmail');
const currentUserRole = document.getElementById('currentUserRole');
const logoutBtn = document.getElementById('logoutBtn');
const navAdmin = document.getElementById('navAdmin');

let countdownInterval = null;
let signupCountdownInterval = null;
let currentPendingEmail = '';
let currentEmailHasPassword = false;

// Helper: Show Error Alert
function showError(message) {
  if (!authError || !authErrorMsg) return;
  authErrorMsg.textContent = message;
  authError.style.display = 'flex';
}

// Helper: Clear Error Alert
function clearError() {
  if (!authError || !authErrorMsg) return;
  authError.style.display = 'none';
  authErrorMsg.textContent = '';
}

// Helper: Hide all steps
function hideAllSteps() {
  if (loginStep1) loginStep1.style.display = 'none';
  if (loginStepPassword) loginStepPassword.style.display = 'none';
  if (loginStepOtp) loginStepOtp.style.display = 'none';
  if (loginStepSignup) loginStepSignup.style.display = 'none';
}

// Helper: Switch to Step 1 (Email Input)
function showStepEmail() {
  clearError();
  if (countdownInterval) clearInterval(countdownInterval);
  if (signupCountdownInterval) clearInterval(signupCountdownInterval);
  hideAllSteps();
  if (loginStep1) loginStep1.style.display = 'flex';
  if (authEmail) authEmail.focus();
}

// Helper: Start Resend Countdown for Login OTP
function startResendCountdown(seconds = 30) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  if (authResendBtn) {
    authResendBtn.disabled = true;
    authResendBtn.classList.add('disabled');
  }

  let remaining = seconds;
  if (resendCountdownText) {
    resendCountdownText.textContent = `Resend code in ${remaining}s`;
  }

  countdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      if (resendCountdownText) resendCountdownText.textContent = "Didn't receive code?";
      if (authResendBtn) {
        authResendBtn.disabled = false;
        authResendBtn.classList.remove('disabled');
        authResendBtn.textContent = 'Resend code';
      }
    } else {
      if (resendCountdownText) {
        resendCountdownText.textContent = `Resend code in ${remaining}s`;
      }
    }
  }, 1000);
}

// Helper: Start Resend Countdown for Signup OTP
function startSignupResendCountdown(seconds = 30) {
  if (signupCountdownInterval) clearInterval(signupCountdownInterval);
  
  if (authSignupResendBtn) {
    authSignupResendBtn.disabled = true;
    authSignupResendBtn.classList.add('disabled');
  }

  let remaining = seconds;
  if (signupResendCountdownText) {
    signupResendCountdownText.textContent = `Resend code in ${remaining}s`;
  }

  signupCountdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(signupCountdownInterval);
      if (signupResendCountdownText) signupResendCountdownText.textContent = "Didn't receive code?";
      if (authSignupResendBtn) {
        authSignupResendBtn.disabled = false;
        authSignupResendBtn.classList.remove('disabled');
        authSignupResendBtn.textContent = 'Resend code';
      }
    } else {
      if (signupResendCountdownText) {
        signupResendCountdownText.textContent = `Resend code in ${remaining}s`;
      }
    }
  }, 1000);
}

// ============================================================================
// STEP 1: Check Email & Route User (Registered vs New)
// ============================================================================
async function handleCheckEmail(e) {
  if (e) e.preventDefault();
  const email = (authEmail.value || '').trim();
  
  if (!email || !email.includes('@')) {
    showError('Please enter a valid email address.');
    authEmail.focus();
    return;
  }

  clearError();
  authRequestBtn.disabled = true;
  authRequestBtn.classList.add('loading');
  const btnOriginalHtml = authRequestBtn.innerHTML;
  authRequestBtn.innerHTML = `<span>Checking account...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Unable to verify account status.');
    }

    const data = await res.json();
    currentPendingEmail = email;
    currentEmailHasPassword = Boolean(data.has_password);

    hideAllSteps();

    if (data.exists) {
      // ----------------------------------------------------------------------
      // USER IS REGISTERED -> Route to Password / OTP Login
      // ----------------------------------------------------------------------
      if (loginTargetEmailDisplay) loginTargetEmailDisplay.textContent = email;
      if (loginStepPassword) loginStepPassword.style.display = 'flex';
      
      if (authLoginPassword) {
        authLoginPassword.value = '';
        authLoginPassword.focus();
      }

      // If user has no password set (e.g. legacy or seed), highlight OTP option
      if (!currentEmailHasPassword) {
        if (authLoginPassword) authLoginPassword.placeholder = 'No password set (Use OTP below)';
      } else {
        if (authLoginPassword) authLoginPassword.placeholder = 'Enter your account password';
      }

    } else {
      // ----------------------------------------------------------------------
      // USER IS NOT REGISTERED -> Route to Signup Flow
      // ----------------------------------------------------------------------
      if (signupTargetEmailDisplay) signupTargetEmailDisplay.textContent = email;
      if (loginStepSignup) loginStepSignup.style.display = 'flex';
      
      if (authSignupPassword) authSignupPassword.value = '';
      if (authSignupPasswordConfirm) authSignupPasswordConfirm.value = '';
      if (authSignupOtp) authSignupOtp.value = '';

      if (signupOtpSection) signupOtpSection.style.display = 'none';
      if (authSignupSendOtpBtn) {
        authSignupSendOtpBtn.style.display = 'flex';
        authSignupSendOtpBtn.disabled = false;
      }
      if (authSignupSubmitBtn) authSignupSubmitBtn.style.display = 'none';

      if (authSignupPassword) authSignupPassword.focus();
    }

  } catch (err) {
    showError(err.message || 'Unable to connect to authentication service.');
  } finally {
    authRequestBtn.disabled = false;
    authRequestBtn.classList.remove('loading');
    authRequestBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// STEP 2A: Password Login
// ============================================================================
async function handlePasswordLogin(e) {
  if (e) e.preventDefault();
  const email = currentPendingEmail || (authEmail.value || '').trim();
  const password = (authLoginPassword.value || '').trim();

  if (!password) {
    showError('Please enter your password.');
    authLoginPassword.focus();
    return;
  }

  clearError();
  authPasswordLoginBtn.disabled = true;
  authPasswordLoginBtn.classList.add('loading');
  const btnOriginalHtml = authPasswordLoginBtn.innerHTML;
  authPasswordLoginBtn.innerHTML = `<span>Signing in...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Incorrect password or authentication failed.');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    showApp(data.user);

  } catch (err) {
    showError(err.message || 'Sign in failed. Please check your credentials.');
  } finally {
    authPasswordLoginBtn.disabled = false;
    authPasswordLoginBtn.classList.remove('loading');
    authPasswordLoginBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// STEP 2B: Switch to OTP Login & Request OTP
// ============================================================================
async function handleRequestLoginOtp(e) {
  if (e) e.preventDefault();
  const email = currentPendingEmail || (authEmail.value || '').trim();

  clearError();
  authRequestOtpBtn.disabled = true;
  const btnOriginalHtml = authRequestOtpBtn.innerHTML;
  authRequestOtpBtn.innerHTML = `<span>Sending code...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to dispatch verification code.');
    }

    hideAllSteps();
    if (otpTargetEmailDisplay) otpTargetEmailDisplay.textContent = email;
    if (loginStepOtp) loginStepOtp.style.display = 'flex';
    if (authOtp) {
      authOtp.value = '';
      authOtp.focus();
    }
    startResendCountdown(30);

  } catch (err) {
    showError(err.message || 'Failed to send verification code.');
  } finally {
    authRequestOtpBtn.disabled = false;
    authRequestOtpBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// STEP 2C: Verify OTP for Login
// ============================================================================
async function handleVerifyOtp(e) {
  if (e) e.preventDefault();
  const email = currentPendingEmail || (authEmail.value || '').trim();
  const otp = (authOtp.value || '').trim();

  if (!otp || otp.length !== 6) {
    showError('Please enter the 6-digit code sent to your email.');
    authOtp.focus();
    return;
  }

  clearError();
  authVerifyBtn.disabled = true;
  authVerifyBtn.classList.add('loading');
  const btnOriginalHtml = authVerifyBtn.innerHTML;
  authVerifyBtn.innerHTML = `<span>Verifying...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Invalid or expired verification code.');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    if (countdownInterval) clearInterval(countdownInterval);
    showApp(data.user);

  } catch (err) {
    showError(err.message || 'Verification failed. Please try again.');
  } finally {
    authVerifyBtn.disabled = false;
    authVerifyBtn.classList.remove('loading');
    authVerifyBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// STEP 3A: Request Signup Verification OTP
// ============================================================================
async function handleSignupSendOtp(e) {
  if (e) e.preventDefault();
  const email = currentPendingEmail || (authEmail.value || '').trim();
  const password = (authSignupPassword.value || '').trim();
  const confirm = (authSignupPasswordConfirm.value || '').trim();

  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    authSignupPassword.focus();
    return;
  }

  if (password !== confirm) {
    showError('Passwords do not match. Please verify.');
    authSignupPasswordConfirm.focus();
    return;
  }

  clearError();
  authSignupSendOtpBtn.disabled = true;
  authSignupSendOtpBtn.classList.add('loading');
  const btnOriginalHtml = authSignupSendOtpBtn.innerHTML;
  authSignupSendOtpBtn.innerHTML = `<span>Sending code...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to dispatch verification code.');
    }

    // Reveal OTP input & Complete button
    if (signupOtpSection) signupOtpSection.style.display = 'block';
    if (authSignupSendOtpBtn) authSignupSendOtpBtn.style.display = 'none';
    if (authSignupSubmitBtn) authSignupSubmitBtn.style.display = 'flex';
    if (authSignupOtp) {
      authSignupOtp.value = '';
      authSignupOtp.focus();
    }
    startSignupResendCountdown(30);

  } catch (err) {
    showError(err.message || 'Failed to send registration verification code.');
  } finally {
    authSignupSendOtpBtn.disabled = false;
    authSignupSendOtpBtn.classList.remove('loading');
    authSignupSendOtpBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// STEP 3B: Complete Registration
// ============================================================================
async function handleSignupSubmit(e) {
  if (e) e.preventDefault();
  const email = currentPendingEmail || (authEmail.value || '').trim();
  const password = (authSignupPassword.value || '').trim();
  const otp = (authSignupOtp.value || '').trim();

  if (!otp || otp.length !== 6) {
    showError('Please enter the 6-digit code sent to your email.');
    authSignupOtp.focus();
    return;
  }

  clearError();
  authSignupSubmitBtn.disabled = true;
  authSignupSubmitBtn.classList.add('loading');
  const btnOriginalHtml = authSignupSubmitBtn.innerHTML;
  authSignupSubmitBtn.innerHTML = `<span>Creating account...</span><span class="loading-spinner"></span>`;

  try {
    const res = await fetch(`${AUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otp })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed. Check code and try again.');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    if (signupCountdownInterval) clearInterval(signupCountdownInterval);
    showApp(data.user);

  } catch (err) {
    showError(err.message || 'Registration failed. Please try again.');
  } finally {
    authSignupSubmitBtn.disabled = false;
    authSignupSubmitBtn.classList.remove('loading');
    authSignupSubmitBtn.innerHTML = btnOriginalHtml;
  }
}

// ============================================================================
// Event Listeners & Input Handlers
// ============================================================================

// 1. Step 1 (Email)
if (authEmailForm) authEmailForm.addEventListener('submit', handleCheckEmail);
if (authRequestBtn) authRequestBtn.addEventListener('click', handleCheckEmail);

// 2. Step 2A (Password)
if (authPasswordForm) authPasswordForm.addEventListener('submit', handlePasswordLogin);
if (authPasswordLoginBtn) authPasswordLoginBtn.addEventListener('click', handlePasswordLogin);
if (authRequestOtpBtn) authRequestOtpBtn.addEventListener('click', handleRequestLoginOtp);

// Password visibility toggle
if (toggleLoginPasswordBtn && authLoginPassword) {
  toggleLoginPasswordBtn.addEventListener('click', () => {
    const isPassword = authLoginPassword.type === 'password';
    authLoginPassword.type = isPassword ? 'text' : 'password';
  });
}

// 3. Step 2B (OTP)
if (authOtpForm) authOtpForm.addEventListener('submit', handleVerifyOtp);
if (authVerifyBtn) authVerifyBtn.addEventListener('click', handleVerifyOtp);

if (authOtp) {
  authOtp.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (e.target.value.length === 6) {
      handleVerifyOtp();
    }
  });
}

if (authResendBtn) {
  authResendBtn.addEventListener('click', async () => {
    if (!currentPendingEmail) return;
    clearError();
    authResendBtn.textContent = 'Sending...';
    try {
      const res = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentPendingEmail })
      });
      if (!res.ok) throw new Error('Resend failed.');
      startResendCountdown(30);
    } catch (err) {
      showError('Failed to resend code. Please wait.');
      authResendBtn.textContent = 'Resend code';
    }
  });
}

if (authBackToPasswordBtn) {
  authBackToPasswordBtn.addEventListener('click', () => {
    clearError();
    if (countdownInterval) clearInterval(countdownInterval);
    hideAllSteps();
    if (loginStepPassword) {
      loginStepPassword.style.display = 'flex';
      if (authLoginPassword) authLoginPassword.focus();
    }
  });
}

// 4. Step 3 (Signup)
if (authSignupSendOtpBtn) authSignupSendOtpBtn.addEventListener('click', handleSignupSendOtp);
if (authSignupForm) authSignupForm.addEventListener('submit', handleSignupSubmit);
if (authSignupSubmitBtn) authSignupSubmitBtn.addEventListener('click', handleSignupSubmit);

if (authSignupOtp) {
  authSignupOtp.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (e.target.value.length === 6) {
      handleSignupSubmit();
    }
  });
}

if (authSignupResendBtn) {
  authSignupResendBtn.addEventListener('click', async () => {
    if (!currentPendingEmail) return;
    clearError();
    authSignupResendBtn.textContent = 'Sending...';
    try {
      const res = await fetch(`${AUTH_API}/register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentPendingEmail })
      });
      if (!res.ok) throw new Error('Resend failed.');
      startSignupResendCountdown(30);
    } catch (err) {
      showError('Failed to resend verification code.');
      authSignupResendBtn.textContent = 'Resend code';
    }
  });
}

// 5. Global Edit Email Action
editEmailBtns.forEach(btn => {
  btn.addEventListener('click', showStepEmail);
});

// 6. Logout Handler
// 6. Logout Handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    if (countdownInterval) clearInterval(countdownInterval);
    if (signupCountdownInterval) clearInterval(signupCountdownInterval);

    appContainer.style.display = 'none';
    authOverlay.style.display = 'flex';
    showStepEmail();
    if (authEmail) authEmail.value = '';

    if (navAdmin) navAdmin.style.display = 'none';
    if (userDropdownMenu) userDropdownMenu.style.display = 'none';
    if (userMenuWrapper) userMenuWrapper.classList.remove('open');

    window.dispatchEvent(new CustomEvent('auth:logout'));
  });
}

// ============================================================================
// TOP-RIGHT USER MENU & DROPDOWN (MATCHING IMAGE 1)
// ============================================================================
const userMenuWrapper = document.getElementById('userMenuWrapper');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const userAvatarCircle = document.getElementById('userAvatarCircle');
const currentUserHandle = document.getElementById('currentUserHandle');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserEmail = document.getElementById('dropdownUserEmail');

// Dropdown Action Buttons
const openAccountSettingsBtn = document.getElementById('openAccountSettingsBtn');

// Account Settings Modal Elements
const accountSettingsModal = document.getElementById('accountSettingsModal');
const closeAccountSettingsBtn = document.getElementById('closeAccountSettingsBtn');
const accountAvatarLarge = document.getElementById('accountAvatarLarge');
const accountDetailName = document.getElementById('accountDetailName');
const accountDetailEmail = document.getElementById('accountDetailEmail');
const accountDetailRole = document.getElementById('accountDetailRole');
const accountPasswordStatusTitle = document.getElementById('accountPasswordStatusTitle');
const accountPasswordStatusDesc = document.getElementById('accountPasswordStatusDesc');
const resetTargetEmailDisplay = document.getElementById('resetTargetEmailDisplay');
const startChangePasswordBtn = document.getElementById('startChangePasswordBtn');

// Password Reset Flow Elements
const accountResetStep1 = document.getElementById('accountResetStep1');
const accountRequestResetOtpBtn = document.getElementById('accountRequestResetOtpBtn');
const accountResetPasswordForm = document.getElementById('accountResetPasswordForm');
const accountResetOtp = document.getElementById('accountResetOtp');
const accountResetNewPassword = document.getElementById('accountResetNewPassword');
const accountResetConfirmPassword = document.getElementById('accountResetConfirmPassword');
const toggleResetNewPasswordBtn = document.getElementById('toggleResetNewPasswordBtn');
const toggleResetConfirmPasswordBtn = document.getElementById('toggleResetConfirmPasswordBtn');
const accountResetCountdownText = document.getElementById('accountResetCountdownText');
const accountResetResendOtpBtn = document.getElementById('accountResetResendOtpBtn');
const accountResetAlert = document.getElementById('accountResetAlert');
const accountResetAlertMsg = document.getElementById('accountResetAlertMsg');
const cancelAccountResetBtn = document.getElementById('cancelAccountResetBtn');
const submitAccountResetBtn = document.getElementById('submitAccountResetBtn');
const resetNoticeText = document.getElementById('resetNoticeText');

let resetOtpCountdownInterval = null;

// Helper: Show Toast in App
function showToast(message, isError = false) {
  const toast = document.getElementById('adminToast');
  const toastMsg = document.getElementById('adminToastMsg');
  if (toast && toastMsg) {
    toastMsg.textContent = message;
    toast.className = isError ? 'admin-toast error' : 'admin-toast';
    toast.style.display = 'flex';
    animateToastIn(toast);
    setTimeout(() => {
      animateToastOut(toast);
    }, 3000);
  }
}

// Toggle Dropdown
function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  if (!userDropdownMenu) return;
  const isHidden = (userDropdownMenu.style.display === 'none' || !userDropdownMenu.style.display);
  userDropdownMenu.style.display = isHidden ? 'block' : 'none';
  if (userMenuWrapper) {
    if (isHidden) userMenuWrapper.classList.add('open');
    else userMenuWrapper.classList.remove('open');
  }
}

// Close Dropdown
function closeUserDropdown() {
  if (userDropdownMenu) userDropdownMenu.style.display = 'none';
  if (userMenuWrapper) userMenuWrapper.classList.remove('open');
}

if (userMenuBtn) {
  userMenuBtn.addEventListener('click', toggleUserDropdown);
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
    closeUserDropdown();
  }
});



// ============================================================================
// DETAILED ACCOUNT SETTINGS MODAL & OTP PASSWORD RESET
// ============================================================================

function openAccountSettings() {
  closeUserDropdown();
  if (accountSettingsModal) {
    resetAccountPasswordFormState();
    refreshUserProfileStatus();
    animateModalOpen(accountSettingsModal);
  }
}

function closeAccountSettings() {
  animateModalClose(accountSettingsModal, () => {
    if (resetOtpCountdownInterval) {
      clearInterval(resetOtpCountdownInterval);
      resetOtpCountdownInterval = null;
    }
    resetAccountPasswordFormState();
  });
}

function resetAccountPasswordFormState() {
  if (accountResetStep1) accountResetStep1.style.display = 'none';
  if (accountResetPasswordForm) accountResetPasswordForm.style.display = 'none';
  if (accountResetAlert) accountResetAlert.style.display = 'none';
  if (accountResetOtp) accountResetOtp.value = '';
  if (accountResetNewPassword) {
    accountResetNewPassword.value = '';
    accountResetNewPassword.type = 'password';
  }
  if (accountResetConfirmPassword) {
    accountResetConfirmPassword.value = '';
    accountResetConfirmPassword.type = 'password';
  }
  if (startChangePasswordBtn) {
    startChangePasswordBtn.textContent = 'Change Password';
  }
}

if (openAccountSettingsBtn) openAccountSettingsBtn.addEventListener('click', openAccountSettings);
if (closeAccountSettingsBtn) closeAccountSettingsBtn.addEventListener('click', closeAccountSettings);
if (cancelAccountResetBtn) cancelAccountResetBtn.addEventListener('click', resetAccountPasswordFormState);

// Close modal when clicking backdrop
if (accountSettingsModal) {
  accountSettingsModal.addEventListener('click', (e) => {
    if (e.target === accountSettingsModal) closeAccountSettings();
  });
}

// Password visibility toggles for account reset
if (toggleResetNewPasswordBtn && accountResetNewPassword) {
  toggleResetNewPasswordBtn.addEventListener('click', () => {
    const isPassword = accountResetNewPassword.type === 'password';
    accountResetNewPassword.type = isPassword ? 'text' : 'password';
  });
}

if (toggleResetConfirmPasswordBtn && accountResetConfirmPassword) {
  toggleResetConfirmPasswordBtn.addEventListener('click', () => {
    const isPassword = accountResetConfirmPassword.type === 'password';
    accountResetConfirmPassword.type = isPassword ? 'text' : 'password';
  });
}

// OTP digit restriction
if (accountResetOtp) {
  accountResetOtp.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
  });
}

// Fetch Fresh User Profile Status for Account Modal
async function refreshUserProfileStatus() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    const res = await fetch(`${AUTH_API}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const u = await res.json();
      if (accountPasswordStatusTitle && accountPasswordStatusDesc) {
        if (u.has_password) {
          accountPasswordStatusTitle.textContent = 'Password Configured';
          accountPasswordStatusDesc.textContent = 'You can sign in with your password or one-time email OTP.';
          if (startChangePasswordBtn) startChangePasswordBtn.textContent = 'Change Password';
        } else {
          accountPasswordStatusTitle.textContent = 'No Password Configured (OTP-Only)';
          accountPasswordStatusDesc.textContent = 'Set a password below to enable instant password sign-in.';
          if (startChangePasswordBtn) startChangePasswordBtn.textContent = 'Set Password';
        }
      }
    }
  } catch (e) {
    // Ignore fetch error on background status check
  }
}

// Helper: Resend countdown for account password reset OTP
function startResetOtpCountdown(seconds = 30) {
  if (resetOtpCountdownInterval) clearInterval(resetOtpCountdownInterval);

  if (accountResetResendOtpBtn) {
    accountResetResendOtpBtn.disabled = true;
    accountResetResendOtpBtn.classList.add('disabled');
    accountResetResendOtpBtn.textContent = `Resend (${seconds}s)`;
  }

  let remaining = seconds;
  if (accountResetCountdownText) {
    accountResetCountdownText.textContent = `Resend code in ${remaining}s`;
  }

  resetOtpCountdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resetOtpCountdownInterval);
      resetOtpCountdownInterval = null;
      if (accountResetCountdownText) accountResetCountdownText.textContent = "Didn't receive code?";
      if (accountResetResendOtpBtn) {
        accountResetResendOtpBtn.disabled = false;
        accountResetResendOtpBtn.classList.remove('disabled');
        accountResetResendOtpBtn.textContent = 'Resend code';
      }
    } else {
      if (accountResetCountdownText) {
        accountResetCountdownText.textContent = `Resend code in ${remaining}s`;
      }
      if (accountResetResendOtpBtn) {
        accountResetResendOtpBtn.textContent = `Resend (${remaining}s)`;
      }
    }
  }, 1000);
}

// 1. Request Password Reset OTP
async function handleRequestPasswordResetOtp() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  // Immediately display the reset form so the user sees instant feedback
  if (accountResetPasswordForm) accountResetPasswordForm.style.display = 'block';
  if (startChangePasswordBtn) startChangePasswordBtn.textContent = 'Hide Form';
  if (accountResetOtp) {
    accountResetOtp.value = '';
    accountResetOtp.focus();
  }

  if (accountResetResendOtpBtn) {
    accountResetResendOtpBtn.disabled = true;
    accountResetResendOtpBtn.textContent = 'Sending...';
  }
  if (accountRequestResetOtpBtn) {
    accountRequestResetOtpBtn.disabled = true;
    accountRequestResetOtpBtn.textContent = 'Sending code...';
  }

  try {
    const res = await fetch(`${AUTH_API}/password-reset/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not dispatch verification code.');
    }

    startResetOtpCountdown(30);
    showToast('Verification code dispatched to your email.');

  } catch (err) {
    showToast(err.message || 'Failed to dispatch verification code', true);
    if (accountResetResendOtpBtn && !resetOtpCountdownInterval) {
      accountResetResendOtpBtn.disabled = false;
      accountResetResendOtpBtn.textContent = 'Resend code';
    }
  } finally {
    if (accountRequestResetOtpBtn) {
      accountRequestResetOtpBtn.disabled = false;
      accountRequestResetOtpBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>
        <span>Request Verification Code (OTP)</span>
      `;
    }
  }
}

// Trigger password change / reset form from status banner
if (startChangePasswordBtn) {
  startChangePasswordBtn.addEventListener('click', () => {
    if (accountResetPasswordForm && accountResetPasswordForm.style.display !== 'none') {
      resetAccountPasswordFormState();
    } else {
      handleRequestPasswordResetOtp();
    }
  });
}

if (accountRequestResetOtpBtn) {
  accountRequestResetOtpBtn.addEventListener('click', handleRequestPasswordResetOtp);
}

if (accountResetResendOtpBtn) {
  accountResetResendOtpBtn.addEventListener('click', async () => {
    handleRequestPasswordResetOtp();
  });
}

// 2. Submit Password Reset (OTP + New Password)
if (accountResetPasswordForm) {
  accountResetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const otp = (accountResetOtp.value || '').trim();
    const new_password = (accountResetNewPassword.value || '').trim();
    const confirm_password = (accountResetConfirmPassword.value || '').trim();

    if (!otp || otp.length !== 6) {
      showResetAlert('Please enter the 6-digit verification code.');
      accountResetOtp.focus();
      return;
    }

    if (new_password.length < 6) {
      showResetAlert('Password must be at least 6 characters long.');
      accountResetNewPassword.focus();
      return;
    }

    if (new_password !== confirm_password) {
      showResetAlert('New passwords do not match. Please verify.');
      accountResetConfirmPassword.focus();
      return;
    }

    if (accountResetAlert) accountResetAlert.style.display = 'none';

    if (submitAccountResetBtn) {
      submitAccountResetBtn.disabled = true;
      submitAccountResetBtn.textContent = 'Updating...';
    }

    try {
      const res = await fetch(`${AUTH_API}/password-reset/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp, new_password })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Password reset failed. Invalid or expired code.');
      }

      showToast('Password updated successfully!');
      resetAccountPasswordFormState();
      refreshUserProfileStatus();

    } catch (err) {
      showResetAlert(err.message || 'Failed to update password.');
    } finally {
      if (submitAccountResetBtn) {
        submitAccountResetBtn.disabled = false;
        submitAccountResetBtn.textContent = 'Verify Code & Update Password';
      }
    }
  });
}

function showResetAlert(msg) {
  if (accountResetAlert && accountResetAlertMsg) {
    accountResetAlertMsg.textContent = msg;
    accountResetAlert.style.display = 'flex';
  }
}

// ============================================================================
// Display Main Application View and Configure Role-based Access
// ============================================================================
export function showApp(user) {
  // Cinematic auth exit → then show app
  animateAuthExit(authOverlay, () => {
    authOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
  });
  appContainer.style.opacity = '0';
  setTimeout(() => {
    const gsap = window.gsap;
    if (gsap) gsap.to(appContainer, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    else appContainer.style.opacity = '1';
  }, 320);

  const email = user.email || 'user@example.com';
  const handle = (email.split('@')[0] || 'User');
  const capitalizedHandle = handle.charAt(0).toUpperCase() + handle.slice(1);
  const initial = handle.charAt(0).toUpperCase();

  // Populate Header & Dropdown User Identity
  if (currentUserEmail) currentUserEmail.textContent = email;
  if (currentUserHandle) currentUserHandle.textContent = capitalizedHandle;
  if (dropdownUserName) dropdownUserName.textContent = capitalizedHandle;
  if (dropdownUserEmail) dropdownUserEmail.textContent = email;
  if (userAvatarCircle) userAvatarCircle.textContent = initial;

  // Populate Detailed Account Modal Identity
  if (accountAvatarLarge) accountAvatarLarge.textContent = initial;
  if (accountDetailName) accountDetailName.textContent = capitalizedHandle;
  if (accountDetailEmail) accountDetailEmail.textContent = email;
  if (resetTargetEmailDisplay) resetTargetEmailDisplay.textContent = email;

  const isAdmin = (user.role === 'admin');

  // Role Badge Styling in Header & Modal
  const roleText = (user.role || 'normal').toUpperCase();
  if (currentUserRole) {
    currentUserRole.textContent = roleText;
    if (isAdmin) {
      currentUserRole.className = 'badge-tag user-role-pill';
      currentUserRole.style.background = '#ffffff';
      currentUserRole.style.color = '#000000';
      currentUserRole.style.border = '1px solid #ffffff';
      currentUserRole.style.fontWeight = '700';
    } else {
      currentUserRole.className = 'badge-tag user-role-pill';
      currentUserRole.style.background = 'rgba(255, 255, 255, 0.08)';
      currentUserRole.style.color = '#d4d4d8';
      currentUserRole.style.border = '1px solid rgba(255, 255, 255, 0.18)';
      currentUserRole.style.fontWeight = '600';
    }
  }

  if (accountDetailRole) {
    accountDetailRole.textContent = isAdmin ? 'ADMINISTRATOR' : 'STANDARD USER';
    accountDetailRole.className = 'badge-tag';
    if (isAdmin) {
      accountDetailRole.style.background = '#ffffff';
      accountDetailRole.style.color = '#000000';
      accountDetailRole.style.border = '1px solid #ffffff';
      accountDetailRole.style.fontWeight = '700';
    } else {
      accountDetailRole.style.background = 'rgba(255, 255, 255, 0.08)';
      accountDetailRole.style.color = '#d4d4d8';
      accountDetailRole.style.border = '1px solid rgba(255, 255, 255, 0.18)';
      accountDetailRole.style.fontWeight = '600';
    }
  }

  // Sidebar Admin Navigation visibility
  if (navAdmin) {
    if (isAdmin) {
      navAdmin.style.display = 'flex';
    } else {
      navAdmin.style.display = 'none';
      const activeBtn = document.querySelector('.nav-btn.active');
      if (activeBtn && activeBtn.getAttribute('data-view') === 'admin') {
        const dashBtn = document.getElementById('navDashboard');
        if (dashBtn) dashBtn.click();
      }
    }
  }

  // Check password status on initial load
  refreshUserProfileStatus();

  // Broadcast user change for admin module initialization
  window.dispatchEvent(new CustomEvent('auth:user_changed', { detail: user }));
}

// Check saved credentials on startup
const savedToken = localStorage.getItem('auth_token');
const savedUser = localStorage.getItem('auth_user');

if (savedToken && savedUser) {
  try {
    const parsedUser = JSON.parse(savedUser);
    showApp(parsedUser);
  } catch (e) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}


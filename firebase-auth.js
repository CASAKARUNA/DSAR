// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE AUTH MODULE — loads Firebase directly from CDN, no import map needed
// Exposes Firebase functions as window globals for app.js to consume.
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    getDocs,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAEIhx4wagBTsNk-szmF1Z7a4fSXciEHgU",
    authDomain: "dsar-karuna-house.firebaseapp.com",
    projectId: "dsar-karuna-house",
    storageBucket: "dsar-karuna-house.firebasestorage.app",
    messagingSenderId: "261273227326",
    appId: "1:261273227326:web:6e4f57e3fb404b5828816f"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const INVITE_CODE = 'KARUNA-2026';

let currentUser = null;
let activeSnapshotUnsubscribers = [];
let suppressFirestoreWrite = false;
let appInitialized = false;

// ── FIRESTORE SYNC LAYER ─────────────────────────────────────────────────
// Intercept localStorage.setItem for dsar_* keys → mirror to Firestore
const _origSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (currentUser && key.startsWith('dsar_') && !suppressFirestoreWrite) {
        const docRef = doc(db, 'shared_data', key);
        setDoc(docRef, { value, updatedAt: Date.now(), updatedBy: currentUser.email }).catch(err => {
            console.warn('[DSAR] Firestore write failed for', key, err);
        });
    }
};

async function loadAllFromFirestore() {
    try {
        const snapshot = await getDocs(collection(db, 'shared_data'));
        suppressFirestoreWrite = true;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.value !== undefined) _origSetItem(docSnap.id, data.value);
        });
        suppressFirestoreWrite = false;
    } catch (err) {
        console.warn('[DSAR] Failed to load from Firestore:', err);
        suppressFirestoreWrite = false;
    }
}

function setupRealtimeSync() {
    activeSnapshotUnsubscribers.forEach(unsub => unsub());
    activeSnapshotUnsubscribers = [];

    const unsub = onSnapshot(collection(db, 'shared_data'), (snapshot) => {
        suppressFirestoreWrite = true;
        let needsRerender = false;
        snapshot.docChanges().forEach(change => {
            if (change.type === 'modified' || change.type === 'added') {
                const data = change.doc.data();
                const existing = localStorage.getItem(change.doc.id);
                if (data.value !== existing) {
                    _origSetItem(change.doc.id, data.value);
                    needsRerender = true;
                }
            }
        });
        suppressFirestoreWrite = false;
        if (needsRerender && appInitialized && window._dsarRerender) {
            window._dsarRerender();
        }
    }, err => console.warn('[DSAR] Realtime sync error:', err));

    activeSnapshotUnsubscribers.push(unsub);
}

// ── AUTH UI WIRING ───────────────────────────────────────────────────────
function setupAuthUI() {
    const authContainer = document.getElementById('auth-container');
    const appContainer  = document.getElementById('app-container');
    const authForm      = document.getElementById('auth-form');
    const submitBtn     = document.getElementById('btn-auth-submit');
    const errorBox      = document.getElementById('auth-error');
    const logoutBtn     = document.getElementById('btn-logout');
    const emailDisplay  = document.getElementById('user-email-display');

    const isRegisterMode = () => window._dsarAuthMode === 'register';

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        errorBox.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = isRegisterMode() ? 'Creating Account…' : 'Signing In…';

        try {
            window._dsarJustLoggedIn = true;
            if (isRegisterMode()) {
                const confirmPw   = document.getElementById('auth-confirm-password').value;
                const inviteCode  = document.getElementById('auth-invite-code').value.trim();
                if (password !== confirmPw)          throw new Error('Passwords do not match.');
                if (password.length < 6)             throw new Error('Password must be at least 6 characters.');
                if (inviteCode !== INVITE_CODE)      throw new Error('Invalid estate invite code. Contact a manager for access.');
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            window._dsarJustLoggedIn = false;
            let msg = err.message;
            if (err.code === 'auth/user-not-found')        msg = 'No account found with this email.';
            if (err.code === 'auth/wrong-password')        msg = 'Incorrect password.';
            if (err.code === 'auth/invalid-credential')    msg = 'Invalid email or password.';
            if (err.code === 'auth/email-already-in-use')  msg = 'This email is already registered. Try signing in.';
            if (err.code === 'auth/weak-password')         msg = 'Password must be at least 6 characters.';
            errorBox.textContent  = msg;
            errorBox.style.display = 'block';
            submitBtn.disabled    = false;
            submitBtn.textContent = isRegisterMode() ? 'Create Account' : 'Sign In';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await firebaseSignOut(auth);
    });

    // Auth state observer
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            emailDisplay.textContent = user.email;

            await loadAllFromFirestore();

            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');

            if (!appInitialized) {
                // Signal app.js it can initialize now
                window.dispatchEvent(new CustomEvent('dsar-auth-ready'));
                appInitialized = true;
            } else {
                if (window._dsarRerender) window._dsarRerender();
            }

            if (window._dsarJustLoggedIn) {
                if (window._dsarPlayIntroVideo) {
                    window._dsarPlayIntroVideo();
                }
                window._dsarJustLoggedIn = false;
            }

            setupRealtimeSync();
        } else {
            currentUser = null;
            appInitialized = false;
            activeSnapshotUnsubscribers.forEach(unsub => unsub());
            activeSnapshotUnsubscribers = [];
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthUI);
} else {
    setupAuthUI();
}

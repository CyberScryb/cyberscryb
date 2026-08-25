document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to load (Modules injected in HTML)
    const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = window.firebaseModules || {};

    // If we're not on Firebase Hosting context (local without init.js), this might fail.
    // Ideally we use a standard config, but let's assume /__/firebase/init.js works or we provided modules.
    // For safety, let's wait a tick.
    await new Promise(r => setTimeout(r, 500));

    // Elements
    const generateBtn = document.getElementById('generate-btn');
    const jobInput = document.getElementById('job-description');
    const profileInput = document.getElementById('freelancer-profile');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Auth Elements
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');
    const authGate = document.getElementById('auth-gate');
    const toolInputs = document.getElementById('tool-inputs');
    const googleLoginBtn = document.getElementById('google-login-btn');

    // Outputs
    const outputProposal = document.getElementById('output-proposal');
    const outputDraft = document.getElementById('output-draft');
    const outputInterview = document.getElementById('output-interview');

    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentUser = null;
    let auth = null;

    try {
        // Initialize Auth if available
        if (window.firebase) {
            auth = getAuth();

            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                updateUI(user);
            });
        } else {
            console.warn("Firebase not found. Running in offline/demo mode?");
        }
    } catch (e) {
        console.error("Auth Init Error:", e);
    }

    function updateUI(user) {
        if (user) {
            // Signed In
            userDisplay.textContent = user.displayName || user.email;
            authBtn.textContent = 'Sign Out';
            authGate.style.display = 'none';
            toolInputs.style.display = 'block';
        } else {
            // Signed Out
            userDisplay.textContent = 'Not signed in';
            authBtn.textContent = 'Sign In';
            authGate.style.display = 'block';
            toolInputs.style.display = 'none';
        }
    }

    // Auth Button Logic
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            if (currentUser) {
                signOut(auth);
            } else {
                login();
            }
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', login);
    }

    function login() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(err => {
            console.error("Login Failed:", err);
            alert("Login failed: " + err.message);
        });
    }

    // Tab Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden'); // Add hidden class for safety
            });

            // Activate clicked
            tab.classList.add('active');
            const targetId = `tab-${tab.dataset.tab}`;
            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');
            targetContent.classList.remove('hidden');
        });
    });

    // Generate Button Logic
    generateBtn.addEventListener('click', async () => {
        const jobText = jobInput.value.trim();
        const profile = profileInput.value.trim() || "Expert Freelancer";

        if (!jobText) {
            alert('Please paste a job description first!');
            return;
        }

        if (!currentUser) {
            alert("Please sign in first.");
            return;
        }

        // Show Loading
        loadingIndicator.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.5';
        generateBtn.innerHTML = '<span class="btn-text">Generating... (Takes ~10s)</span>';

        try {
            // Get ID Token
            const token = await currentUser.getIdToken();

            const response = await fetch('https://us-central1-feisty-wall-456202-s3.cloudfunctions.net/generateGigWork', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Send Token!
                },
                body: JSON.stringify({
                    jobDescription: jobText,
                    freelancerProfile: profile
                })
            });

            if (response.status === 429) {
                throw new Error('Rate Limit Exceeded. Please wait a while.');
            }
            if (!response.ok) {
                throw new Error('API Error: ' + response.statusText);
            }

            const data = await response.json();

            const isPro = (function () {
                if (document.cookie.indexOf('cs_pro=1') > -1) return true;
                if (document.cookie.indexOf('cs_pro_source=stripe') > -1) return true;
                try { return localStorage.getItem('cs_pro') === '1'; } catch (e) { return false; }
            })();

            const usageKey = 'cs_gig_full_usage';
            const today = new Date().toISOString().slice(0, 10);
            let usage = { date: today, count: 0 };
            try {
                usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
                if (usage.date !== today) usage = { date: today, count: 0 };
            } catch (e) { usage = { date: today, count: 0 }; }

            // Free: 1 full kit per day. After that, preview + Pro CTA.
            const allowFull = isPro || usage.count < 1;

            function preview(text) {
                if (!text) return '';
                const words = text.split(/\s+/);
                const n = Math.max(8, Math.floor(words.length * 0.28));
                return words.slice(0, n).join(' ') + '...';
            }

            if (allowFull) {
                outputProposal.innerHTML = formatText(data.proposal);
                outputDraft.innerHTML = formatText(data.draftWork);
                outputInterview.innerHTML = formatText(data.interviewQuestions);
                if (!isPro) {
                    usage.count += 1;
                    try { localStorage.setItem(usageKey, JSON.stringify(usage)); } catch (e) {}
                }
            } else {
                const paywall =
                    '<div style="margin-top:12px;padding:14px;border:1px solid #C2410C;border-radius:10px;background:rgba(194,65,12,0.06);">' +
                    '<strong style="color:#9A3412;">Free full kit used for today</strong>' +
                    '<p style="color:#5C4A3D;margin:8px 0 12px;font-size:14px;">Preview below. Pro unlocks the full proposal, draft, and interview questions with no daily cap.</p>' +
                    '<a href="https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b?utm_source=gig_auto_pilot&utm_medium=paywall&utm_campaign=pro_conversion" target="_blank" rel="noopener" ' +
                    'style="display:inline-block;background:#C2410C;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none;margin-right:8px;">Unlock · $5/mo</a>' +
                    '<a href="/pro/" style="color:#C7522A;font-size:13px;">See plans</a></div>';
                outputProposal.innerHTML = formatText(preview(data.proposal)) + paywall;
                outputDraft.innerHTML = formatText(preview(data.draftWork)) + paywall;
                outputInterview.innerHTML = formatText(preview(data.interviewQuestions)) + paywall;
                if (typeof gtag === 'function') {
                    gtag('event', 'paywall_shown', { tool_id: 'gig-auto-pilot', mode: 'daily_limit' });
                }
            }

            // UX: Switch to first tab result
            document.querySelector('[data-tab="proposal"]').click();

        } catch (error) {
            console.error(error);
            outputProposal.innerHTML = `<span style="color: #ff4444;">Error: ${error.message}</span>`;
            if (error.message.includes('Rate Limit')) {
                alert("You've hit the hourly limit (5 requests/hr). Prevents bot abuse!");
            }
        } finally {
            loadingIndicator.classList.add('hidden');

            // COOLDOWN: Enforce 60s wait
            let cooldown = 60;
            const interval = setInterval(() => {
                generateBtn.innerHTML = `<span class="btn-text">Wait ${cooldown}s</span>`;
                cooldown--;
                if (cooldown < 0) {
                    clearInterval(interval);
                    generateBtn.disabled = false;
                    generateBtn.style.opacity = '1';
                    generateBtn.innerHTML = '<span class="btn-text">Generate Proposal & Draft</span><span class="btn-icon">⚡</span>';
                }
            }, 1000);
        }
    });

    // Copy Buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const content = document.getElementById(targetId).innerText;
            navigator.clipboard.writeText(content).then(() => {
                const originalText = btn.innerText;
                btn.innerText = '✅ Copied!';
                setTimeout(() => btn.innerText = originalText, 2000);
            });
        });
    });

    // Helper: Simple markdown-to-html formatter
    function formatText(text) {
        if (!text) return '';
        // Convert **bold** to <strong>
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }
});

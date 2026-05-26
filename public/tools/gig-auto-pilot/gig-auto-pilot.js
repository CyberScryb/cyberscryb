document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const generateBtn = document.getElementById('generate-btn');
    const jobInput = document.getElementById('job-description');
    const profileInput = document.getElementById('freelancer-profile');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Outputs
    const outputProposal = document.getElementById('output-proposal');
    const outputDraft = document.getElementById('output-draft');
    const outputInterview = document.getElementById('output-interview');

    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab Logic — fix: was throwing ReferenceError because of stray `c.classList.add`
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
            });
            tab.classList.add('active');
            const targetContent = document.getElementById(`tab-${tab.dataset.tab}`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.classList.remove('hidden');
            }
        });
    });

    // Generate Button Logic
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const jobText = jobInput.value.trim();
            const profile = profileInput.value.trim() || "Expert Freelancer";

            if (!jobText) {
                alert('Please paste a job description first!');
                return;
            }

            loadingIndicator.classList.remove('hidden');
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.5';

            try {
                // Use the Firebase Hosting rewrite (/api/gig-work → generateGigWork
                // function on the correct project: gen-lang-client-0384486156).
                // Previously hardcoded to feisty-wall-456202-s3 — wrong project, dead URL.
                const response = await fetch('/api/gig-work', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobDescription: jobText,
                        freelancerProfile: profile
                    })
                });

                if (!response.ok) {
                    let errMsg = `API Error: ${response.statusText}`;
                    try {
                        const errData = await response.json();
                        if (errData.error) errMsg = errData.error;
                    } catch (e) { /* response wasn't JSON */ }
                    throw new Error(errMsg);
                }

                const data = await response.json();

                outputProposal.innerHTML = formatText(data.proposal);
                outputDraft.innerHTML = formatText(data.draftWork);
                outputInterview.innerHTML = formatText(
                    Array.isArray(data.interviewQuestions)
                        ? data.interviewQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
                        : data.interviewQuestions
                );

            } catch (error) {
                console.error(error);
                outputProposal.innerHTML = `<span style="color: #ef4444;">Error: ${error.message}. Please try again.</span>`;
            } finally {
                loadingIndicator.classList.add('hidden');
                generateBtn.disabled = false;
                generateBtn.style.opacity = '1';
            }
        });
    }

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
        let formatted = String(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    // ─── Example loading (prefill + button) ───
    (function setupExample() {
        const ex = window.CSExamples && window.CSExamples['gig-auto-pilot'];
        if (!ex || !generateBtn) return;

        function fill() {
            if (jobInput && !jobInput.value.trim()) jobInput.value = ex.input || '';
            if (ex.fields && ex.fields['freelancer-profile'] && profileInput && !profileInput.value.trim()) {
                profileInput.value = ex.fields['freelancer-profile'];
            }
        }

        // Prefill on load if both fields are empty
        if (jobInput && !jobInput.value.trim() && profileInput && !profileInput.value.trim()) {
            fill();
        }

        if (!document.getElementById('cs-example-btn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'cs-example-btn';
            btn.textContent = '✨ Run example';
            btn.title = 'Load a sample job + profile and generate a proposal — uses your one free try';
            btn.style.cssText = 'margin-left:10px;padding:10px 16px;background:transparent;border:1px solid #c41e1e;color:#c41e1e;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;';
            btn.addEventListener('mouseover', () => { btn.style.background = '#c41e1e'; btn.style.color = '#000'; });
            btn.addEventListener('mouseout', () => { btn.style.background = 'transparent'; btn.style.color = '#c41e1e'; });
            btn.addEventListener('click', () => {
                // Always re-fill on click (overwrites if user cleared it)
                if (jobInput) jobInput.value = ex.input || '';
                if (ex.fields && ex.fields['freelancer-profile'] && profileInput) {
                    profileInput.value = ex.fields['freelancer-profile'];
                }
                generateBtn.click();
            });
            if (generateBtn.parentNode) {
                generateBtn.parentNode.insertBefore(btn, generateBtn.nextSibling);
            }
        }
    })();
});

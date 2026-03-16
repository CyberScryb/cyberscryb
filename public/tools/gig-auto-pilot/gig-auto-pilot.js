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

    // Tab Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            c.classList.add('hidden'); // Add hidden class for safety

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

        // Show Loading
        loadingIndicator.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.5';

        try {
            // Call Firebase Function (Placeholder URL for now)
            // Ideally: https://us-central1-YOUR-PROJECT.cloudfunctions.net/generateGigWork
            const response = await fetch('https://us-central1-feisty-wall-456202-s3.cloudfunctions.net/generateGigWork', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobDescription: jobText,
                    freelancerProfile: profile
                })
            });

            if (!response.ok) {
                throw new Error('API Error: ' + response.statusText);
            }

            const data = await response.json();

            // Populate Outputs
            outputProposal.innerHTML = formatText(data.proposal);
            outputDraft.innerHTML = formatText(data.draftWork);
            outputInterview.innerHTML = formatText(data.interviewQuestions);

        } catch (error) {
            console.error(error);
            outputProposal.innerHTML = `<span style="color: #ff4444;">Error: ${error.message}. Please try again.</span>`;
        } finally {
            loadingIndicator.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
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

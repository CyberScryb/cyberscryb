// Behavioral Log (ABC) Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const logForm = document.getElementById('log-form');
    const timeInput = document.getElementById('log-time');
    const antecedentInput = document.getElementById('log-antecedent');
    const behaviorInput = document.getElementById('log-behavior');
    const consequenceInput = document.getElementById('log-consequence');
    const logBody = document.getElementById('log-body');
    const residentInfoInput = document.getElementById('resident-info');

    // Default sample entries if localstorage is empty
    const DEFAULT_LOGS = [
        { id: '1', time: '14:30', antecedent: 'Staff tried to guide resident to the shower.', behavior: 'Resident became agitated, raised voice, and pushed hands away.', consequence: 'Staff backed off, offered a warm towel and cup of tea, re-approached 20 mins later successfully.' },
        { id: '2', time: '18:15', antecedent: 'Shadowing / sundowning started around dinner time.', behavior: 'Resident kept pacing hall, checking doors, saying "I need to go home to make dinner for my kids."', consequence: 'Validated feelings about her children, guided her to the kitchen to help fold napkins.' }
    ];

    let logs = [];

    // Load from localStorage or defaults
    try {
        const stored = localStorage.getItem('cs_behavioral_logs');
        if (stored) {
            logs = JSON.parse(stored);
        } else {
            logs = DEFAULT_LOGS;
        }
    } catch(e) {
        logs = DEFAULT_LOGS;
    }

    // Save helper
    function saveLogs() {
        try {
            localStorage.setItem('cs_behavioral_logs', JSON.stringify(logs));
        } catch(e) {}
    }

    // Render Table
    function renderLogs() {
        if (!logBody) return;
        logBody.innerHTML = '';

        if (logs.length === 0) {
            logBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #666; padding: 2rem;">
                        No behavior log entries. Add an entry above to start tracking.
                    </td>
                </tr>
            `;
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space: nowrap; color: #C2410C; font-weight: 600;">${escapeHtml(log.time)}</td>
                <td><span style="color: #cbd5e1;">${escapeHtml(log.antecedent)}</span></td>
                <td><span style="color: #ef4444; font-weight: 500;">${escapeHtml(log.behavior)}</span></td>
                <td><span style="color: #C2410C;">${escapeHtml(log.consequence)}</span></td>
                <td style="text-align: center;">
                    <button class="delete-log-btn" data-id="${log.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px; font-size: 0.8rem;" title="Delete Entry">Delete</button>
                </td>
            `;
            logBody.appendChild(tr);
        });

        // Attach listeners to delete buttons
        document.querySelectorAll('.delete-log-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.getAttribute('data-id');
                logs = logs.filter(l => l.id !== logId);
                saveLogs();
                renderLogs();
            });
        });
    }

    // Add Log Entry
    if (logForm) {
        logForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const time = timeInput.value.trim();
            const antecedent = antecedentInput.value.trim();
            const behavior = behaviorInput.value.trim();
            const consequence = consequenceInput.value.trim();

            if (!antecedent || !behavior || !consequence) return;

            // Get current time if not provided
            let timeStr = time;
            if (!timeStr) {
                const now = new Date();
                timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
            }

            const newLog = {
                id: Date.now().toString(),
                time: timeStr,
                antecedent,
                behavior,
                consequence
            };

            logs.push(newLog);
            saveLogs();
            renderLogs();

            // Reset inputs
            timeInput.value = '';
            antecedentInput.value = '';
            behaviorInput.value = '';
            consequenceInput.value = '';
        });
    }

    // Escape HTML Helper
    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial render
    renderLogs();

    // Configure AI Tool
    window.CSAITool.init({
        toolId: 'behavioral-log',
        emptyMessage: 'Please add at least one ABC behavioral log entry to generate the Care Plan.',
        collectInput: () => {
            if (logs.length === 0) return '';
            const logsString = logs.map(log => {
                return `- Time: ${log.time}\n  * Antecedent (Trigger): ${log.antecedent}\n  * Behavior (Action): ${log.behavior}\n  * Consequence (Resolution): ${log.consequence}`;
            }).join('\n\n');

            const residentInfo = residentInfoInput.value.trim();
            return `Resident/Patient Information:\n${residentInfo || 'No background info provided.'}\n\nABC Behavioral Logs:\n${logsString}`;
        },
        collectParams: () => {
            return {
                logCount: logs.length,
                logs: logs.map(log => ({
                    time: log.time,
                    antecedent: log.antecedent,
                    behavior: log.behavior,
                    consequence: log.consequence
                })),
                residentInfo: residentInfoInput.value
            };
        },
        onStats: (text) => {
            // Stats updates if needed
        }
    });
});

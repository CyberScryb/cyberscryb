// Medication Administration Log (MAR) Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const medForm = document.getElementById('med-form');
    const medNameInput = document.getElementById('med-name');
    const medDosageInput = document.getElementById('med-dosage');
    const medRouteInput = document.getElementById('med-route');
    const medFrequencyInput = document.getElementById('med-frequency');
    const medTimeInput = document.getElementById('med-time');
    const marBody = document.getElementById('mar-body');
    const caregiverNotesInput = document.getElementById('caregiver-notes');
    const auditTypeInput = document.getElementById('audit-type');


    // Default sample medications if localstorage is empty
    const DEFAULT_MEDS = [
        { id: '1', name: 'Donepezil', dosage: '5mg', route: 'Oral', frequency: 'Daily', time: '08:00', log: { 'Morning': '08:05', 'Afternoon': '', 'Evening': '', 'Night': '' } },
        { id: '2', name: 'Metoprolol', dosage: '25mg', route: 'Oral', frequency: 'Twice Daily', time: '08:00, 20:00', log: { 'Morning': '08:10', 'Afternoon': '', 'Evening': '', 'Night': '' } },
        { id: '3', name: 'Lisinopril', dosage: '10mg', route: 'Oral', frequency: 'Daily', time: '08:00', log: { 'Morning': '08:10', 'Afternoon': '', 'Evening': '', 'Night': '' } }
    ];

    let meds = [];

    // Load from localStorage or defaults
    try {
        const stored = localStorage.getItem('cs_mar_meds');
        if (stored) {
            meds = JSON.parse(stored);
        } else {
            meds = DEFAULT_MEDS;
        }
    } catch(e) {
        meds = DEFAULT_MEDS;
    }

    // Save helper
    function saveMeds() {
        try {
            localStorage.setItem('cs_mar_meds', JSON.stringify(meds));
        } catch(e) {}
    }

    // Render Table
    function renderMAR() {
        if (!marBody) return;
        marBody.innerHTML = '';

        if (meds.length === 0) {
            marBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666; padding: 2rem;">
                        No medications listed. Add a medication above to start.
                    </td>
                </tr>
            `;
            return;
        }

        meds.forEach(med => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; color: #fff;">${escapeHtml(med.name)}</td>
                <td><span style="color:#7b2cff;">${escapeHtml(med.dosage)}</span></td>
                <td><span style="font-size:0.8rem; color:#878787;">${escapeHtml(med.route)}</span></td>
                <td><span style="font-size:0.8rem; color:#878787;">${escapeHtml(med.frequency)} (${escapeHtml(med.time)})</span></td>
                <td style="white-space: nowrap;">
                    <div style="display: flex; gap: 0.5rem; justify-content: space-around;">
                        ${['Morning', 'Afternoon', 'Evening', 'Night'].map(shift => {
                            const val = med.log[shift] || '';
                            const checked = val !== '';
                            return `
                                <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.7rem; color: #878787; cursor: pointer; user-select: none;">
                                    <input type="checkbox" class="shift-checkbox" data-id="${med.id}" data-shift="${shift}" ${checked ? 'checked' : ''} style="margin: 0; cursor: pointer;">
                                    <span>${shift[0]}</span>
                                    <span class="time-stamp" style="font-size: 0.6rem; color: #7b2cff; height: 10px; display: inline-block;">${val}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="delete-med-btn" data-id="${med.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px; font-size: 0.8rem;" title="Remove Medication">Remove</button>
                </td>
            `;
            marBody.appendChild(tr);
        });

        // Attach listeners to check-boxes
        document.querySelectorAll('.shift-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const medId = e.target.getAttribute('data-id');
                const shift = e.target.getAttribute('data-shift');
                const med = meds.find(m => m.id === medId);
                if (med) {
                    if (e.target.checked) {
                        const now = new Date();
                        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
                        med.log[shift] = timeStr;
                    } else {
                        med.log[shift] = '';
                    }
                    saveMeds();
                    renderMAR();
                }
            });
        });

        // Attach listeners to delete buttons
        document.querySelectorAll('.delete-med-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medId = e.target.getAttribute('data-id');
                meds = meds.filter(m => m.id !== medId);
                saveMeds();
                renderMAR();
            });
        });
    }

    // Add Medication
    if (medForm) {
        medForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = medNameInput.value.trim();
            const dosage = medDosageInput.value.trim();
            const route = medRouteInput.value;
            const frequency = medFrequencyInput.value;
            const time = medTimeInput.value.trim();

            if (!name || !dosage) return;

            const newMed = {
                id: Date.now().toString(),
                name,
                dosage,
                route,
                frequency,
                time: time || '08:00',
                log: { 'Morning': '', 'Afternoon': '', 'Evening': '', 'Night': '' }
            };

            meds.push(newMed);
            saveMeds();
            renderMAR();

            // Reset form inputs except selects
            medNameInput.value = '';
            medDosageInput.value = '';
            medTimeInput.value = '';
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
    renderMAR();

    // Configure AI Tool
    window.CSAITool.init({
        toolId: 'med-administration-log',
        emptyMessage: 'Please list at least one medication in the administration log to perform the audit.',
        collectInput: () => {
            if (meds.length === 0) return '';
            const medsString = meds.map(med => {
                const administrations = Object.entries(med.log)
                    .filter(([_, time]) => time !== '')
                    .map(([shift, time]) => `${shift} at ${time}`)
                    .join(', ') || 'None';
                return `- ${med.name} (${med.dosage}, ${med.route}, ${med.frequency}, scheduled: ${med.time}) | Administered: ${administrations}`;
            }).join('\n');

            const auditTypeVal = auditTypeInput ? auditTypeInput.value : 'safety-audit';
            const auditLabel = auditTypeVal === 'handoff-summary' ? 'Caregiver Handoff Summary' : 'Drug Safety Audit';
            const customNotes = caregiverNotesInput.value.trim();
            
            return `Audit Type: ${auditLabel}\n\nMedication Administration Record:\n${medsString}\n\nCaregiver Notes & Shift Context:\n${customNotes || 'No custom notes provided.'}`;
        },
        collectParams: () => {
            const auditTypeVal = auditTypeInput ? auditTypeInput.value : 'safety-audit';
            return {
                medCount: meds.length,
                auditType: auditTypeVal,
                medications: meds.map(med => ({
                    name: med.name,
                    dosage: med.dosage,
                    route: med.route,
                    frequency: med.frequency,
                    time: med.time,
                    log: med.log
                })),
                caregiverNotes: caregiverNotesInput.value
            };
        },
        onStats: (text) => {
            // Stats updates if needed
        }
    });
});

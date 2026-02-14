import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const roboticInput = document.getElementById('robotic-text');
const styleSamples = document.querySelectorAll('.style-sample');
const apiKeyInput = document.getElementById('api-key');
const humanizeBtn = document.getElementById('humanize-btn');
const outputText = document.getElementById('output-text');
const loadingIndicator = document.getElementById('loading-indicator');
const wordCount = document.getElementById('word-count');

humanizeBtn.addEventListener('click', async () => {
    const aiText = roboticInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Aggregate style samples
    let userStyleString = "";
    styleSamples.forEach((sample, index) => {
        if (sample.value.trim()) {
            userStyleString += `Sample ${index + 1}: ${sample.value.trim()}\n---\n`;
        }
    });

    if (!apiKey) {
        alert("Please enter a Gemini API Key to use this tool.");
        return;
    }

    if (!aiText) {
        alert("Please paste some text to humanize.");
        return;
    }

    if (!userStyleString) {
        alert("Please add at least one style sample (e.g. a tweet or email) so we know how YOU sound.");
        return;
    }

    // UI Loading State
    loadingIndicator.classList.remove('hidden');
    humanizeBtn.disabled = true;
    humanizeBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span> Processing...';
    outputText.innerHTML = ''; // Clear previous output

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are a professional ghostwriter and style mimic.
        
        TASK: Rewrite the "Robotic Text" below to match the "User Style" perfectly.
        
        USER STYLE SAMPLES:
        ${userStyleString}
        
        ROBOTIC TEXT TO REWRITE:
        ${aiText}
        
        STRICT RULES:
        1. ANALYZE the samples first (tone, sentence length, vocabulary, use of slang/emojis, formatting).
        2. REWRITE the robotic text to sound EXACTLY like the user wrote it.
        3. REMOVE all AI-isms (words like: delve, tapestry, moreover, landscape, game-changer, unlock, elevate).
        4. Keep the core meaning/facts, but change the delivery.
        5. If the user uses lowercase or casual grammar, do that.
        6. Do NOT output the analysis, ONLY output the rewritten text.
        `;

        const result = await model.generateContentStream(prompt);

        let fullText = "";

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;

            // Basic markdown parsing for bold/italic if needed, or just plain text
            // For now, simple text replacement
            outputText.innerText = fullText;
            updateStats(fullText);
        }

    } catch (error) {
        console.error("Error:", error);
        outputText.innerHTML = `<span style="color: #ff4444;">Error: ${error.message}</span>`;
    } finally {
        loadingIndicator.classList.add('hidden');
        humanizeBtn.disabled = false;
        humanizeBtn.innerHTML = '<span class="btn-text">Humanize Text</span><span class="btn-icon">✨</span>';
    }
});

function updateStats(text) {
    const words = text.trim().split(/\s+/).length;
    wordCount.textContent = `${words} words`;
}

// Persist API Key in local storage for convenience
apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
});

// Load API Key on load
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
});

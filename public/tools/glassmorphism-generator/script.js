// CSS Glassmorphism Generator Script Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Element References
    const blurSlider = document.getElementById('blurSlider');
    const opacitySlider = document.getElementById('opacitySlider');
    const borderWidthSlider = document.getElementById('borderWidthSlider');
    const borderOpacitySlider = document.getElementById('borderOpacitySlider');
    const radiusSlider = document.getElementById('radiusSlider');
    const shadowOpacitySlider = document.getElementById('shadowOpacitySlider');

    const glassColor = document.getElementById('glassColor');
    const glassColorHex = document.getElementById('glassColorHex');
    const borderColor = document.getElementById('borderColor');
    const borderColorHex = document.getElementById('borderColorHex');

    const blurVal = document.getElementById('blurVal');
    const opacityVal = document.getElementById('opacityVal');
    const borderWidthVal = document.getElementById('borderWidthVal');
    const borderOpacityVal = document.getElementById('borderOpacityVal');
    const radiusVal = document.getElementById('radiusVal');
    const shadowOpacityVal = document.getElementById('shadowOpacityVal');

    const glassCard = document.getElementById('glassCard');
    const canvasBox = document.getElementById('canvasBox');
    const cssOutput = document.getElementById('cssOutput');
    const htmlOutput = document.getElementById('htmlOutput');

    const btnCopyCss = document.getElementById('btnCopyCss');
    const btnCopyHtml = document.getElementById('btnCopyHtml');

    // 2. Helper Functions
    // Convert hex string and opacity to rgba notation
    function hexToRgba(hex, alpha) {
        let cleanHex = hex.replace('#', '');
        
        // Handle shorthand hex values like #fff
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Validate if string is a valid Hex code
    function isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex);
    }

    // 3. Core Engine: Update Card Styles & Code Text
    function updateGlassEffect() {
        // Retrieve slider values
        const blurValue = blurSlider.value;
        const opacityValue = opacitySlider.value;
        const borderWidthValue = borderWidthSlider.value;
        const borderOpacityValue = borderOpacitySlider.value;
        const radiusValue = radiusSlider.value;
        const shadowOpacityValue = shadowOpacitySlider.value;

        // Retrieve colors
        const bgHex = glassColor.value;
        const borderHex = borderColor.value;

        // Compute RGBA components
        const bgRgba = hexToRgba(bgHex, opacityValue);
        const borderRgba = hexToRgba(borderHex, borderOpacityValue);

        // Apply visual properties to preview glass card
        glassCard.style.background = bgRgba;
        glassCard.style.backdropFilter = `blur(${blurValue}px)`;
        glassCard.style.webkitBackdropFilter = `blur(${blurValue}px)`;
        glassCard.style.borderRadius = `${radiusValue}px`;
        glassCard.style.border = `${borderWidthValue}px solid ${borderRgba}`;
        glassCard.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, ${shadowOpacityValue})`;

        // Update indicator values in DOM
        blurVal.textContent = `${blurValue}px`;
        opacityVal.textContent = opacityValue;
        borderWidthVal.textContent = `${borderWidthValue}px`;
        borderOpacityVal.textContent = borderOpacityValue;
        radiusVal.textContent = `${radiusValue}px`;
        shadowOpacityVal.textContent = shadowOpacityValue;

        // Generate clean CSS output block
        const cssCode = `.glass-card {
    background: ${bgRgba};
    backdrop-filter: blur(${blurValue}px);
    -webkit-backdrop-filter: blur(${blurValue}px);
    border-radius: ${radiusValue}px;
    border: ${borderWidthValue}px solid ${borderRgba};
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, ${shadowOpacityValue});
}`;
        cssOutput.textContent = cssCode;

        // Update HTML code block (keeping template consistent)
        const htmlCode = `<div class="glass-card">
    <div class="card-content">
        <h3>Glassmorphic Card</h3>
        <p>Your content goes here.</p>
    </div>
</div>`;
        htmlOutput.textContent = htmlCode;
    }

    // 4. Input Syncing Listeners
    // Colors syncing: Picker to Text
    glassColor.addEventListener('input', () => {
        glassColorHex.value = glassColor.value;
        updateGlassEffect();
    });

    borderColor.addEventListener('input', () => {
        borderColorHex.value = borderColor.value;
        updateGlassEffect();
    });

    // Colors syncing: Text to Picker
    glassColorHex.addEventListener('input', () => {
        let val = glassColorHex.value;
        if (!val.startsWith('#')) {
            val = '#' + val;
        }
        if (isValidHex(val)) {
            glassColor.value = val;
            updateGlassEffect();
        }
    });

    borderColorHex.addEventListener('input', () => {
        let val = borderColorHex.value;
        if (!val.startsWith('#')) {
            val = '#' + val;
        }
        if (isValidHex(val)) {
            borderColor.value = val;
            updateGlassEffect();
        }
    });

    // Attach update function to slider inputs
    [blurSlider, opacitySlider, borderWidthSlider, borderOpacitySlider, radiusSlider, shadowOpacitySlider].forEach(slider => {
        slider.addEventListener('input', updateGlassEffect);
    });

    // 5. Preset Background Selector Logic
    const bgBtns = document.querySelectorAll('.bg-btn');
    bgBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            bgBtns.forEach(b => b.classList.remove('active'));
            // Set active class
            btn.classList.add('active');
            
            // Extract selected class name and reset canvas box class list
            const targetBg = btn.getAttribute('data-bg');
            canvasBox.className = 'canvas-container'; // clear previous
            canvasBox.classList.add(`bg-${targetBg}`);
        });
    });

    // 6. Output Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            if (targetTab === 'css') {
                document.getElementById('tabCss').classList.add('active');
            } else {
                document.getElementById('tabHtml').classList.add('active');
            }
        });
    });

    // 7. Clipboard Copy Actions
    function copyTextToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            buttonElement.style.borderColor = '#10b981';
            buttonElement.style.color = '#10b981';
            
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.borderColor = '';
                buttonElement.style.color = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy to clipboard: ', err);
        });
    }

    btnCopyCss.addEventListener('click', () => {
        copyTextToClipboard(cssOutput.textContent, btnCopyCss);
    });

    btnCopyHtml.addEventListener('click', () => {
        copyTextToClipboard(htmlOutput.textContent, btnCopyHtml);
    });

    // Initialize logic execution on mount
    updateGlassEffect();
});

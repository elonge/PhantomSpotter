chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Phantom Spotter: Message received", request);
    if (request.action === "start_demo") {
        showDebugToast("Phantom Spotter: Starting Focus Demo...");
        startDemoFlow();
    }
    return true; 
});

function showDebugToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${isError ? '#ff4444' : '#333'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 2147483647;
        font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        pointer-events: none;
        transition: opacity 0.5s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- State & Globals ---
let originalElements = new Map(); // Map<Element, { originalHTML: string, isSummarized: boolean }>
let observer = null;
let idleTimer = null;
let rulerElement = null;
let isInterventionActive = false;

// --- Step 1: Protection State (Start with Focus Mode) ---
async function startDemoFlow() {
    console.log("Phantom Spotter: Focus Mode initiated");
    
    // Spotlight Effect: Add class to body
    document.body.classList.add('phantom-focus-active');

    // Peripheral Dimming
    const topDim = document.createElement('div');
    topDim.className = 'phantom-dim-top';
    topDim.id = 'phantom-dim-top';
    document.body.appendChild(topDim);

    const bottomDim = document.createElement('div');
    bottomDim.className = 'phantom-dim-bottom';
    bottomDim.id = 'phantom-dim-bottom';
    document.body.appendChild(bottomDim);

    // Identify target paragraphs (filtering out small ones)
    const paragraphs = Array.from(document.querySelectorAll('p, h2, h3, li')); // Broaden scope slightly
    const targets = paragraphs.filter(p => {
        // Only process visible elements with substantial text
        return p.offsetParent !== null && p.innerText.trim().length > 60;
    });

    console.log(`Phantom Spotter: Found ${targets.length} target paragraphs.`);

    if (targets.length === 0) {
        showDebugToast("No suitable text found.", true);
        return;
    }

    // Apply Blur to all initially
    targets.forEach(p => {
        originalElements.set(p, { 
            originalHTML: p.innerHTML, 
            isSummarized: false 
        });
        p.classList.add('phantom-blurred');
    });

    // Setup Intersection Observer for Focus
    const options = {
        root: null, // viewport
        rootMargin: '-35% 0px -35% 0px', // Active zone is middle 30% of screen
        threshold: 0.1
    };

    observer = new IntersectionObserver(handleIntersection, options);
    targets.forEach(p => observer.observe(p));

    // Start Idle Timer
    resetIdleTimer();
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    document.addEventListener('scroll', resetIdleTimer);
}

function handleIntersection(entries) {
    if (isInterventionActive) return; // Pause logic during intervention

    entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
            // Element entered focus zone
            focusAndSummarize(el);
        } else {
            // Element left focus zone
            blurElement(el);
        }
    });
}

function blurElement(el) {
    el.classList.remove('phantom-focused');
    el.classList.add('phantom-blurred');
}

async function focusAndSummarize(el) {
    el.classList.remove('phantom-blurred');
    el.classList.add('phantom-focused');

    const state = originalElements.get(el);
    if (!state || state.isSummarized) return; // Already summarized or unknown

    // Mark as summarized so we don't fetch again
    state.isSummarized = true;
    originalElements.set(el, state);

    // Show loading state
    const originalText = el.innerText;
    el.innerHTML = `<span style="color: #666;">✨ Simplifying...</span>`;

    try {
        const summaryData = await getSummaryFromBackend(originalText);
        
        // Replace content with summary
        if (summaryData && summaryData.summary) {
            el.innerHTML = `
                <div class="phantom-paragraph-summary">
                    <span class="phantom-ai-icon">✨</span>
                    ${summaryData.summary}
                </div>
            `;
        } else {
            // Fallback if summary fails
            el.innerHTML = state.originalHTML; 
        }

    } catch (e) {
        console.error("Summary failed for paragraph", e);
        el.innerHTML = state.originalHTML; // Revert on error
    }
}

async function getSummaryFromBackend(text) {
    // Quick local check for very short text to save API calls
    if (text.length < 50) return { summary: text };

    try {
        const response = await fetch('http://localhost:3020/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error("Server error");
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}


// --- Step 2: The Intervention (12s mark) ---
function resetIdleTimer() {
    if (isInterventionActive) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(triggerIntervention, 12000); 
}

function triggerIntervention() {
    console.log("Step 2: Intervention Triggered");
    isInterventionActive = true;
    
    // Stop observing while intervention is up
    if (observer) observer.disconnect();

    const overlay = document.createElement('div');
    overlay.className = 'phantom-intervention-overlay';
    overlay.id = 'phantom-intervention-overlay';
    overlay.innerHTML = `
        <div class="phantom-intervention-popup">
            <h2>Your rhythm has changed</h2>
            <p>Let's take a micro-break.</p>
        </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        document.addEventListener('mousemove', onUserReturn, { once: true });
        document.addEventListener('keydown', onUserReturn, { once: true });
        document.addEventListener('click', onUserReturn, { once: true });
    }, 1000);
}

// --- Step 3: Memory Anchor (Return) ---
function onUserReturn() {
    console.log("Step 3: User Returned");

    // Prevent duplicates
    if (document.getElementById('phantom-context-card')) return;
    
    const interventionOverlay = document.getElementById('phantom-intervention-overlay');
    if (interventionOverlay) interventionOverlay.remove();

    const topic = document.title.split('-')[0].split('|')[0].trim() || "this topic";
    const contextCard = document.createElement('div');
    contextCard.className = 'phantom-context-card';
    contextCard.id = 'phantom-context-card';
    contextCard.innerHTML = `
        <span>Welcome back. You were reading about <strong>${topic}</strong>.</span>
        <button class="phantom-context-close" id="phantom-card-close">✕</button>
    `;
    
    // Make the entire card clickable to advance
    contextCard.style.cursor = 'pointer';
    contextCard.addEventListener('click', startAdaptation);
    
    document.body.appendChild(contextCard);
}

// --- Step 4: Adaptation State (Finish) ---
function startAdaptation() {
    console.log("Step 4: Adaptation State");
    
    // Remove Spotlight Effect
    document.body.classList.remove('phantom-focus-active');

    const contextCard = document.getElementById('phantom-context-card');
    if (contextCard) contextCard.remove();

    // 1. Remove Dimming
    const topDim = document.getElementById('phantom-dim-top');
    const bottomDim = document.getElementById('phantom-dim-bottom');
    if (topDim) topDim.remove();
    if (bottomDim) bottomDim.remove();

    // 2. Restore Content & Apply Bionic Reading
    originalElements.forEach((state, el) => {
        // Restore original HTML first
        el.innerHTML = state.originalHTML;
        
        // Remove phantom classes
        el.classList.remove('phantom-blurred');
        el.classList.remove('phantom-focused');
        
        // Apply Bionic Reading
        applyBionicReading(el);
    });

    // 3. Enable Reading Ruler
    enableReadingRuler();
    
    isInterventionActive = false; // logic flow complete
}

// --- Helpers ---

function enableReadingRuler() {
    rulerElement = document.createElement('div');
    rulerElement.className = 'phantom-reading-ruler';
    document.body.appendChild(rulerElement);

    document.addEventListener('mousemove', (e) => {
        rulerElement.style.top = (e.clientY - 16) + 'px';
    });
}

function applyBionicReading(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplace = [];

    while (node = walker.nextNode()) {
        if (node.nodeValue.trim().length > 0) {
            nodesToReplace.push(node);
        }
    }

    nodesToReplace.forEach(textNode => {
        const span = document.createElement('span');
        const words = textNode.nodeValue.split(' ');
        
        span.innerHTML = words.map(word => {
            if (word.length < 2) return word;
            const boldLen = Math.ceil(word.length / 2);
            return `<b style="font-weight: 700;">${word.substring(0, boldLen)}</b>${word.substring(boldLen)}`;
        }).join(' ');

        textNode.parentNode.replaceChild(span, textNode);
    });
}
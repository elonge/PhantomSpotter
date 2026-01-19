document.getElementById('startDemoBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "start_demo" }, (response) => {
                if (chrome.runtime.lastError) {
                    // Inject script if not already there (common issue during dev)
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['extension/content.js']
                    }, () => {
                         chrome.tabs.sendMessage(tabs[0].id, { action: "start_demo" });
                    });
                }
            });
            window.close();
        }
    });
});
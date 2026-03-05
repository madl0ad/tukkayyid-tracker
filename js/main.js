// main.js - Application entry point
document.addEventListener('DOMContentLoaded', () => {
    // Check if electronAPI is available
    if (window.electronAPI) {
        window.forceBuilder = new ForceBuilder();
        console.log('BattleTech Force Builder initialized with modular architecture');
    } else {
        console.error('Electron API not available');
        document.getElementById('statusMessage').textContent = 
            'Error: Electron API not available. Please run in Electron environment.';
    }
});
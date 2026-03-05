// main.js - Application entry point
document.addEventListener('DOMContentLoaded', () => {
    // Check if electronAPI is available
    if (window.electronAPI) {
        // Initialize application state
        window.appState = {
            currentMode: 'selection', // 'selection', 'builder', 'manager'
            currentForce: null,
            forceBuilder: null,
            forceManager: null
        };

        // Initialize mode selection handlers
        initModeSelection();
        console.log('BattleTech Force Manager initialized');
    } else {
        console.error('Electron API not available');
        document.getElementById('statusMessage').textContent = 
            'Error: Electron API not available. Please run in Electron environment.';
    }
});

/**
 * Initialize mode selection screen handlers
 */
function initModeSelection() {
    // Mode selection buttons
    document.getElementById('startBuilderBtn').addEventListener('click', () => {
        startBuilderMode();
    });

    document.getElementById('startManagerBtn').addEventListener('click', () => {
        startManagerMode();
    });

    // Note: Mode switcher buttons have been removed from the UI
    // Users should use the mode selection screen to switch modes

    // Force Manager specific buttons
    document.getElementById('loadForceForManagerBtn').addEventListener('click', () => {
        if (window.appState.forceManager) {
            window.appState.forceManager.loadForce();
        }
    });

    document.getElementById('saveForceFromManagerBtn').addEventListener('click', () => {
        if (window.appState.forceManager) {
            window.appState.forceManager.saveForce();
        }
    });

    document.getElementById('hallOfFameBtn').addEventListener('click', () => {
        if (window.appState.forceManager) {
            window.appState.forceManager.showHallOfFame();
        }
    });

    // Go to Manager button (in builder mode)
    document.getElementById('goToManagerBtn').addEventListener('click', () => {
        goToManagerMode();
    });
}

/**
 * Start builder mode from selection screen
 */
function startBuilderMode() {
    // Hide mode selection, show main app
    document.getElementById('modeSelectionScreen').classList.add('hidden');
    document.getElementById('mainAppScreen').classList.remove('hidden');
    
    // Update subtitle
    document.getElementById('appSubtitle').textContent = 'Build your BattleTech force with random mech assignments';
    
    // Initialize force builder if not already initialized
    if (!window.appState.forceBuilder) {
        window.appState.forceBuilder = new ForceBuilder();
    }
    
    // Show builder UI
    switchToBuilderMode();
    
    // Update app state
    window.appState.currentMode = 'builder';
}

/**
 * Start manager mode from selection screen
 */
function startManagerMode() {
    // Hide mode selection, show main app
    document.getElementById('modeSelectionScreen').classList.add('hidden');
    document.getElementById('mainAppScreen').classList.remove('hidden');
    
    // Update subtitle
    document.getElementById('appSubtitle').textContent = 'Manage your BattleTech forces';
    
    // Initialize force manager if not already initialized
    if (!window.appState.forceManager) {
        window.appState.forceManager = new ForceManager();
    }
    
    // Show manager UI
    switchToManagerMode();
    
    // Update app state
    window.appState.currentMode = 'manager';
}

/**
 * Switch to builder mode (from manager or mode switcher)
 */
function switchToBuilderMode() {
    // Hide manager panel, show builder panels
    document.getElementById('forceManagerPanel').classList.add('hidden');
    document.getElementById('rightPanel').classList.remove('hidden');
    document.getElementById('builderLeftPanel').classList.remove('hidden');
    
    // Update subtitle
    document.getElementById('appSubtitle').textContent = 'Build your BattleTech force with random mech assignments';
    
    // Update app state
    window.appState.currentMode = 'builder';
}

/**
 * Switch to manager mode (from builder or mode switcher)
 */
function switchToManagerMode() {
    // Hide builder panels, show manager panel
    document.getElementById('rightPanel').classList.add('hidden');
    document.getElementById('builderLeftPanel').classList.add('hidden');
    document.getElementById('forceManagerPanel').classList.remove('hidden');
    
    // Update subtitle
    document.getElementById('appSubtitle').textContent = 'Manage your BattleTech forces';
    
    // Update app state
    window.appState.currentMode = 'manager';
}

/**
 * Go to manager mode from builder mode (auto-load current force)
 */
function goToManagerMode() {
    // Check if we have a current force in builder
    if (window.appState.forceBuilder && window.appState.forceBuilder.currentForce) {
        // Switch to manager mode
        switchToManagerMode();
        
        // Initialize force manager if not already initialized
        if (!window.appState.forceManager) {
            window.appState.forceManager = new ForceManager();
        }
        
        // Set the current force in manager
        window.appState.forceManager.currentForce = window.appState.forceBuilder.currentForce;
        
        // Ensure force has pilots array
        if (!window.appState.forceManager.currentForce.pilots) {
            window.appState.forceManager.currentForce.pilots = [];
        }
        
        // Ensure all mechs have pilot references
        window.appState.forceManager.ensurePilotReferencesExist();
        
        // Update UI
        window.appState.forceManager.updateForceInfo();
        window.appState.forceManager.renderUnits();
        window.appState.forceManager.renderMechsTable();
        
        // Enable save button
        document.getElementById('saveForceFromManagerBtn').disabled = false;
        
        // Show success message
        window.appState.forceManager.showStatus('Switched to manager mode with current force', 'success');
    } else {
        // No current force, just switch to manager mode
        switchToManagerMode();
        
        // Initialize force manager if not already initialized
        if (!window.appState.forceManager) {
            window.appState.forceManager = new ForceManager();
        }
        
        // Show message
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = 'Switched to manager mode. Load a force to begin.';
        }
    }
    
    // Update app state
    window.appState.currentMode = 'manager';
}

/**
 * Return to mode selection screen
 */
function returnToModeSelection() {
    // Hide main app, show mode selection
    document.getElementById('mainAppScreen').classList.add('hidden');
    document.getElementById('modeSelectionScreen').classList.remove('hidden');
    
    // Update app state
    window.appState.currentMode = 'selection';
}

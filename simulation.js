// Global variables to store our simulation data
let resourceList = [];        // List of all resources
let processList = [];        // List of all processes
let allocationMatrix = [];   // How many resources each process is using
let maxNeedsMatrix = [];     // Maximum resources each process might need
let systemLog = null;        // For showing messages to user

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    systemLog = document.getElementById('system-log');
    setupEventListeners();
    showMessage('System ready! Add some resources to get started.');
});

// Setup all our button click handlers
function setupEventListeners() {
    document.getElementById('add-resource').addEventListener('click', addNewResource);
    document.getElementById('add-process').addEventListener('click', addNewProcess);
    document.getElementById('request-btn').addEventListener('click', handleResourceRequest);
    document.getElementById('release-btn').addEventListener('click', handleResourceRelease);
    document.getElementById('reset-simulation').addEventListener('click', resetEverything);
}

// Add a new resource to the system
function addNewResource() {
    // Get values from input fields
    const name = document.getElementById('resource-name').value.trim();
    const totalUnits = parseInt(document.getElementById('resource-units').value);
    
    // Check if inputs are valid
    if (!name || isNaN(totalUnits) || totalUnits <= 0) {
        showMessage('Please enter a valid resource name and number of units!');
        return;
    }
    
    // Create new resource object
    const newResource = {
        name: name,
        total: totalUnits,
        available: totalUnits
    };
    
    // Add to our list
    resourceList.push(newResource);
    
    // Clear input fields
    document.getElementById('resource-name').value = '';
    document.getElementById('resource-units').value = '';
    
    // Update display
    showMessage(`Added resource "${name}" with ${totalUnits} units`);
    updateResourceDisplay();
    updateProcessInputs();
}

// Add a new process to the system
function addNewProcess() {
    if (resourceList.length === 0) {
        showMessage('Please add some resources first!');
        return;
    }
    
    const processId = document.getElementById('process-id').value.trim();
    
    // Check if process ID is valid
    if (!processId) {
        showMessage('Please enter a process ID!');
        return;
    }
    
    // Check if process ID already exists
    if (processList.includes(processId)) {
        showMessage('This process ID already exists!');
        return;
    }
    
    // Get maximum resource needs
    const maxNeeds = [];
    for (let i = 0; i < resourceList.length; i++) {
        const maxNeed = parseInt(document.getElementById(`max-${i}`).value) || 0;
        
        // Check if max need is valid
        if (maxNeed > resourceList[i].total) {
            showMessage(`Maximum need cannot be more than total ${resourceList[i].name} units!`);
            return;
        }
        
        maxNeeds.push(maxNeed);
    }
    
    // Add process to our lists
    processList.push(processId);
    maxNeedsMatrix.push(maxNeeds);
    allocationMatrix.push(new Array(resourceList.length).fill(0));
    
    // Clear input
    document.getElementById('process-id').value = '';
    
    // Update display
    showMessage(`Added process ${processId} with maximum needs: ${maxNeeds.join(', ')}`);
    updateProcessDisplay();
    updateAllocationTable();
    checkIfSystemIsSafe();
}

// Check if a process can finish with given resources
function canProcessFinish(processIndex, availableResources) {
    for (let i = 0; i < resourceList.length; i++) {
        // Calculate how many more resources the process needs
        const currentlyHas = allocationMatrix[processIndex][i];
        const maximumNeeds = maxNeedsMatrix[processIndex][i];
        const stillNeeds = maximumNeeds - currentlyHas;
        
        // If we need more than what's available, process can't finish
        if (stillNeeds > availableResources[i]) {
            return false;
        }
    }
    return true;
}

// Check if system is in a safe state
function checkIfSystemIsSafe() {
    // If no processes, system is safe
    if (processList.length === 0) {
        updateSafetyDisplay(true, []);
        return true;
    }
    
    // Copy available resources (we'll simulate with this)
    const availableResources = resourceList.map(r => r.available);
    
    // Keep track of which processes have finished
    const finished = new Array(processList.length).fill(false);
    const safeSequence = [];
    
    // Keep trying to find processes that can finish
    let foundOne;
    do {
        foundOne = false;
        // Try each process
        for (let i = 0; i < processList.length; i++) {
            // Skip if this process already finished
            if (finished[i]) continue;
            
            // Check if this process can finish
            if (canProcessFinish(i, availableResources)) {
                // Process can finish! Add its resources back to available
                for (let j = 0; j < resourceList.length; j++) {
                    availableResources[j] += allocationMatrix[i][j];
                }
                finished[i] = true;
                safeSequence.push(processList[i]);
                foundOne = true;
            }
        }
    } while (foundOne); // Keep going until we can't find any more processes that can finish
    
    // System is safe if all processes could finish
    const isSystemSafe = finished.every(f => f);
    updateSafetyDisplay(isSystemSafe, safeSequence);
    return isSystemSafe;
}

// Handle when a process requests resources
function handleResourceRequest() {
    const processIndex = parseInt(document.getElementById('request-process').value);
    
    // Check if process selection is valid
    if (isNaN(processIndex)) {
        showMessage('Please select a process first!');
        return;
    }
    
    // Get requested resources
    const request = [];
    for (let i = 0; i < resourceList.length; i++) {
        const amount = parseInt(document.getElementById(`request-${i}`).value) || 0;
        
        // Check if request is valid
        if (amount > resourceList[i].available) {
            showMessage(`Not enough ${resourceList[i].name} available!`);
            return;
        }
        
        const wouldHaveTotal = allocationMatrix[processIndex][i] + amount;
        if (wouldHaveTotal > maxNeedsMatrix[processIndex][i]) {
            showMessage(`Request exceeds maximum need for ${resourceList[i].name}!`);
            return;
        }
        
        request.push(amount);
    }
    
    // Try allocating resources temporarily
    const oldAllocation = allocationMatrix.map(row => [...row]);
    const oldAvailable = resourceList.map(r => r.available);
    
    // Allocate resources temporarily
    for (let i = 0; i < resourceList.length; i++) {
        allocationMatrix[processIndex][i] += request[i];
        resourceList[i].available -= request[i];
    }
    
    // Check if this makes system unsafe
    const safetyCheck = checkIfSystemIsSafe();
    if (safetyCheck) {
        showMessage(`Resources granted to process ${processList[processIndex]}`);
        updateResourceDisplay();
        updateProcessDisplay();
        updateAllocationTable();
        updateResourceStats();
    } else {
        // Undo allocation
        allocationMatrix = oldAllocation;
        resourceList.forEach((r, i) => r.available = oldAvailable[i]);
        showMessage('Request denied - would make system unsafe!');
        
        // Re-check safety with original allocation to restore safe sequence
        checkIfSystemIsSafe();
        updateResourceDisplay();
        updateProcessDisplay();
        updateAllocationTable();
        updateResourceStats();
    }
}

// Handle when a process releases resources
function handleResourceRelease() {
    const processIndex = parseInt(document.getElementById('release-process').value);
    
    // Check if process selection is valid
    if (isNaN(processIndex)) {
        showMessage('Please select a process first!');
        return;
    }
    
    // Get resources to release
    for (let i = 0; i < resourceList.length; i++) {
        const amount = parseInt(document.getElementById(`release-${i}`).value) || 0;
        
        // Check if release amount is valid
        if (amount > allocationMatrix[processIndex][i]) {
            showMessage(`Cannot release more than allocated for ${resourceList[i].name}!`);
            return;
        }
        
        // Release resources
        allocationMatrix[processIndex][i] -= amount;
        resourceList[i].available += amount;
    }
    
    showMessage(`Resources released from process ${processList[processIndex]}`);
    updateResourceDisplay();
    updateProcessDisplay();
    updateAllocationTable();
    checkIfSystemIsSafe();
    updateResourceStats();
}

// Reset everything to starting state
function resetEverything() {
    resourceList = [];
    processList = [];
    allocationMatrix = [];
    maxNeedsMatrix = [];
    
    showMessage('System reset to initial state');
    updateResourceDisplay();
    updateProcessDisplay();
    updateAllocationTable();
    updateResourceStats();
    
    // Clear safety display
    document.getElementById('safety-status').innerHTML = '';
    document.getElementById('safe-sequence').innerHTML = '';
}

// Update the resource display table
function updateResourceDisplay() {
    const container = document.getElementById('defined-resources');
    
    if (resourceList.length === 0) {
        container.innerHTML = '<p>No resources defined yet</p>';
        return;
    }
    
    let html = '<table><tr><th>Resource</th><th>Total Units</th><th>Available</th></tr>';
    
    resourceList.forEach(resource => {
        html += `
            <tr>
                <td>${resource.name}</td>
                <td>${resource.total}</td>
                <td>${resource.available}</td>
            </tr>
        `;
    });
    
    html += '</table>';
    container.innerHTML = html;
}

// Update the process input fields
function updateProcessInputs() {
    const container = document.getElementById('max-needs-inputs');
    
    if (resourceList.length === 0) {
        container.innerHTML = '<p>Define resources first</p>';
        return;
    }
    
    let html = '';
    resourceList.forEach((resource, i) => {
        html += `
            <div class="max-need-input">
                <label>${resource.name} Max Need:</label>
                <input type="number" id="max-${i}" min="0" max="${resource.total}" value="0">
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update the process display table
function updateProcessDisplay() {
    const container = document.getElementById('process-list');
    
    if (processList.length === 0) {
        container.innerHTML = '<p>No processes created yet</p>';
        return;
    }
    
    let html = '<table><tr><th>Process ID</th><th>Max Needs</th><th>Current Allocation</th></tr>';
    
    processList.forEach((pid, i) => {
        html += `
            <tr>
                <td>${pid}</td>
                <td>${maxNeedsMatrix[i].join(', ')}</td>
                <td>${allocationMatrix[i].join(', ')}</td>
            </tr>
        `;
    });
    
    html += '</table>';
    container.innerHTML = html;
    
    // Also update process dropdowns
    updateProcessDropdowns();
}

// Update the allocation table
function updateAllocationTable() {
    const container = document.getElementById('allocation-matrix');
    
    if (processList.length === 0 || resourceList.length === 0) {
        container.innerHTML = '<p>Add processes and resources to view allocation</p>';
        return;
    }
    
    let html = '<table><tr><th>Process</th>';
    
    // Add resource names as headers
    resourceList.forEach(r => {
        html += `<th>${r.name}</th>`;
    });
    html += '</tr>';
    
    // Add rows for each process
    processList.forEach((pid, i) => {
        // Current allocation row
        html += `<tr><td>${pid} (Current)</td>`;
        allocationMatrix[i].forEach(amount => {
            html += `<td>${amount}</td>`;
        });
        html += '</tr>';
        
        // Maximum needs row
        html += `<tr><td>${pid} (Max)</td>`;
        maxNeedsMatrix[i].forEach(amount => {
            html += `<td>${amount}</td>`;
        });
        html += '</tr>';
        
        // Still needs row
        html += `<tr><td>${pid} (Needs)</td>`;
        maxNeedsMatrix[i].forEach((max, j) => {
            const needs = max - allocationMatrix[i][j];
            html += `<td>${needs}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    container.innerHTML = html;
}

// Update process selection dropdowns
function updateProcessDropdowns() {
    const requestSelect = document.getElementById('request-process');
    const releaseSelect = document.getElementById('release-process');
    
    let options = '<option value="">Select Process</option>';
    
    processList.forEach((pid, i) => {
        options += `<option value="${i}">${pid}</option>`;
    });
    
    requestSelect.innerHTML = options;
    releaseSelect.innerHTML = options;
    
    // Update resource request/release inputs when process is selected
    requestSelect.onchange = function() {
        updateRequestInputs(parseInt(this.value));
    };
    
    releaseSelect.onchange = function() {
        updateReleaseInputs(parseInt(this.value));
    };
}

// Update resource request input fields
function updateRequestInputs(processIndex) {
    const container = document.getElementById('request-resources');
    
    if (isNaN(processIndex)) {
        container.innerHTML = '<p>Select a process first</p>';
        return;
    }
    
    let html = '';
    resourceList.forEach((resource, i) => {
        const maxRequest = Math.min(
            resource.available,
            maxNeedsMatrix[processIndex][i] - allocationMatrix[processIndex][i]
        );
        
        html += `
            <div class="resource-request">
                <label>${resource.name}:</label>
                <input type="number" id="request-${i}" min="0" max="${maxRequest}" value="0">
                <span>(Available: ${resource.available})</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update resource release input fields
function updateReleaseInputs(processIndex) {
    const container = document.getElementById('release-resources');
    
    if (isNaN(processIndex)) {
        container.innerHTML = '<p>Select a process first</p>';
        return;
    }
    
    let html = '';
    resourceList.forEach((resource, i) => {
        const currentAllocation = allocationMatrix[processIndex][i];
        
        html += `
            <div class="resource-release">
                <label>${resource.name}:</label>
                <input type="number" id="release-${i}" min="0" max="${currentAllocation}" value="0">
                <span>(Currently has: ${currentAllocation})</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update the safety status display
function updateSafetyDisplay(isSafe, sequence) {
    const statusDiv = document.getElementById('safety-status');
    const sequenceDiv = document.getElementById('safe-sequence');
    
    if (isSafe) {
        statusDiv.innerHTML = '<div class="safe">System is in a safe state</div>';
        if (sequence.length > 0) {
            sequenceDiv.innerHTML = `
                <h3>Safe Sequence:</h3>
                <div class="sequence">${sequence.join(' → ')}</div>
            `;
        }
    } else {
        statusDiv.innerHTML = '<div class="unsafe">System is in an unsafe state</div>';
        sequenceDiv.innerHTML = '';
    }
    
    // Force update the allocation table to reflect current state
    updateAllocationTable();
}

// Update resource statistics and charts
function updateResourceStats() {
    const statsDiv = document.getElementById('resource-stats');
    const chartDiv = document.getElementById('utilization-chart');
    
    if (resourceList.length === 0) {
        statsDiv.innerHTML = '<h3>Resource Utilization</h3><p>No resources defined yet</p>';
        chartDiv.innerHTML = '<h3>Resource Utilization Chart</h3><p>No resources to display</p>';
        return;
    }
    
    // Create stats table
    let statsHtml = `
        <h3>Resource Utilization</h3>
        <table>
            <tr>
                <th>Resource</th>
                <th>Total</th>
                <th>Allocated</th>
                <th>Available</th>
                <th>Utilization</th>
            </tr>
    `;
    
    // Create chart
    let chartHtml = '<h3>Resource Utilization Chart</h3><div class="chart">';
    
    resourceList.forEach((resource, i) => {
        // Calculate total allocation for this resource
        let totalAllocated = 0;
        for (let j = 0; j < processList.length; j++) {
            totalAllocated += allocationMatrix[j][i];
        }
        
        // Calculate utilization percentage
        const utilization = (totalAllocated / resource.total * 100).toFixed(2);
        
        // Add to stats table
        statsHtml += `
            <tr>
                <td>${resource.name}</td>
                <td>${resource.total}</td>
                <td>${totalAllocated}</td>
                <td>${resource.available}</td>
                <td>${utilization}%</td>
            </tr>
        `;
        
        // Add to chart
        chartHtml += `
            <div class="chart-bar">
                <div class="bar-label">${resource.name}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${utilization}%"></div>
                </div>
                <div class="bar-value">${utilization}%</div>
            </div>
        `;
    });
    
    statsHtml += '</table>';
    chartHtml += '</div>';
    
    statsDiv.innerHTML = statsHtml;
    chartDiv.innerHTML = chartHtml;
}

// Helper function to show messages in the system log
function showMessage(message) {
    const time = new Date().toLocaleTimeString();
    systemLog.innerHTML += `<div class="log-entry">[${time}] ${message}</div>`;
    systemLog.scrollTop = systemLog.scrollHeight;
}

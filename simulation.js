// simulation.js
class Resource {
    constructor(name, units) {
        this.name = name;
        this.totalUnits = units;
        this.available = units;
    }
}

class Process {
    constructor(pid, maxNeeds) {
        this.pid = pid;
        this.maxNeeds = maxNeeds; // Array matching resource types
        this.allocation = Array(maxNeeds.length).fill(0);
        this.remainingNeeds = [...maxNeeds]; // Clone max needs
    }
    
    // Calculate if process can finish with available resources
    canFinish(available) {
        return this.remainingNeeds.every((need, i) => need <= available[i]);
    }
}

class BankersAlgorithm {
    constructor(processes, resources, allocation, max) {
        this.processes = processes;
        this.resources = resources;
        this.allocation = allocation;
        this.max = max;
        this.available = this.calculateAvailable();
    }
    
    calculateAvailable() {
        // Calculate available resources based on total and allocated
        const available = [...this.resources];
        for (let i = 0; i < this.processes.length; i++) {
            for (let j = 0; j < this.resources.length; j++) {
                available[j] -= this.allocation[i][j];
            }
        }
        return available;
    }
    
    isSafeState() {
        // Initialize working resources to available
        const work = [...this.available];
        // Track which processes can finish
        const finish = Array(this.processes.length).fill(false);
        // Store safe sequence if found
        const safeSequence = [];
        
        // Continue until no more processes can be added to safe sequence
        let progress = true;
        while (progress) {
            progress = false;
            
            // Try to find a process that can finish with current resources
            for (let i = 0; i < this.processes.length; i++) {
                if (!finish[i]) {
                    // Calculate if process i can finish with current work
                    const need = this.max[i].map((m, j) => m - this.allocation[i][j]);
                    const canFinish = need.every((n, j) => n <= work[j]);
                    
                    if (canFinish) {
                        // Process can finish, add its resources back to work
                        for (let j = 0; j < this.resources.length; j++) {
                            work[j] += this.allocation[i][j];
                        }
                        finish[i] = true;
                        safeSequence.push(i);
                        progress = true;
                    }
                }
            }
        }
        
        // Check if all processes can finish
        const isAllSafe = finish.every(f => f);
        return {
            safe: isAllSafe,
            sequence: isAllSafe ? safeSequence : []
        };
    }
    
    requestResources(processIndex, request) {
        // Check if request is valid
        const need = this.max[processIndex].map((m, i) => m - this.allocation[processIndex][i]);
        
        // Ensure request doesn't exceed max needs
        for (let i = 0; i < request.length; i++) {
            if (request[i] > need[i]) {
                return { 
                    granted: false, 
                    reason: "Request exceeds maximum need" 
                };
            }
        }
        
        // Check if resources are available
        for (let i = 0; i < request.length; i++) {
            if (request[i] > this.available[i]) {
                return { 
                    granted: false, 
                    reason: "Resources not available" 
                };
            }
        }
        
        // Try allocation
        const tempAllocation = this.allocation.map(row => [...row]);
        const tempAvailable = [...this.available];
        
        // Allocate resources temporarily
        for (let i = 0; i < request.length; i++) {
            tempAllocation[processIndex][i] += request[i];
            tempAvailable[i] -= request[i];
        }
        
        // Check safety with temporary allocation
        const tempBanker = new BankersAlgorithm(
            this.processes,
            this.resources,
            tempAllocation,
            this.max
        );
        
        const safety = tempBanker.isSafeState();
        
        if (safety.safe) {
            // Update actual allocation if safe
            this.allocation = tempAllocation;
            this.available = tempAvailable;
            return {
                granted: true,
                safeSequence: safety.sequence
            };
        } else {
            return {
                granted: false,
                reason: "Request would lead to unsafe state",
                safetyCheck: safety
            };
        }
    }
    
    releaseResources(processIndex, release) {
        // Validate release request
        for (let i = 0; i < release.length; i++) {
            if (release[i] > this.allocation[processIndex][i]) {
                return {
                    success: false,
                    reason: "Cannot release more resources than allocated"
                };
            }
        }
        
        // Update allocation and available
        for (let i = 0; i < release.length; i++) {
            // Ensure we don't go below zero
            const releaseAmount = Math.min(release[i], this.allocation[processIndex][i]);
            this.allocation[processIndex][i] -= releaseAmount;
            this.available[i] += releaseAmount;
        }
        
        return {
            success: true,
            newAvailable: [...this.available]
        };
    }
}

class ResourceSimulator {
    constructor() {
        this.resources = [];
        this.processes = [];
        this.allocation = [];
        this.max = [];
        this.systemLog = document.getElementById('system-log');
        this.initializeUI();
    }
    
    initializeUI() {
        this.updateResourceInputs();
        this.updateProcessDropdowns();
        this.logMessage('System initialized. Ready to define resources and processes.');
    }
    
    addResource() {
        const nameInput = document.getElementById('resource-name');
        const unitsInput = document.getElementById('resource-units');
        
        const name = nameInput.value.trim();
        const units = parseInt(unitsInput.value);
        
        if (!name || isNaN(units) || units <= 0) {
            this.logMessage('ERROR: Invalid resource definition');
            return;
        }
        
        this.resources.push(new Resource(name, units));
        this.updateDefinedResources();
        this.updateMaxNeedsInputs();
        this.updateRequestInputs();
        this.updateReleaseInputs();
        this.logMessage(`Resource "${name}" with ${units} units added`);
        
        // Clear inputs
        nameInput.value = '';
        unitsInput.value = '';
    }
    
    updateDefinedResources() {
        const container = document.getElementById('defined-resources');
        container.innerHTML = '';
        
        if (this.resources.length === 0) {
            container.innerHTML = '<p>No resources defined yet</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Resource</th>
                <th>Total Units</th>
                <th>Available</th>
            </tr>
        `;
        
        this.resources.forEach(resource => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${resource.name}</td>
                <td>${resource.totalUnits}</td>
                <td>${resource.available}</td>
            `;
            table.appendChild(row);
        });
        
        container.appendChild(table);
    }
    
    updateMaxNeedsInputs() {
        const container = document.getElementById('max-needs-inputs');
        container.innerHTML = '';
        
        if (this.resources.length === 0) {
            container.innerHTML = '<p>Define resources first</p>';
            return;
        }
        
        this.resources.forEach((resource, index) => {
            const input = document.createElement('div');
            input.className = 'max-need-input';
            input.innerHTML = `
                <label>${resource.name} Max Need:</label>
                <input type="number" id="max-${index}" min="0" max="${resource.totalUnits}" value="0">
            `;
            container.appendChild(input);
        });
    }
    
    addProcess() {
        if (this.resources.length === 0) {
            this.logMessage('ERROR: Define resources before adding processes');
            return;
        }
        
        const pidInput = document.getElementById('process-id');
        const pid = pidInput.value.trim();
        
        if (!pid) {
            this.logMessage('ERROR: Process ID required');
            return;
        }
        
        // Check for duplicate PID
        if (this.processes.some(p => p.pid === pid)) {
            this.logMessage('ERROR: Process ID already exists');
            return;
        }
        
        // Get max needs
        const maxNeeds = [];
        for (let i = 0; i < this.resources.length; i++) {
            const maxInput = document.getElementById(`max-${i}`);
            const maxValue = parseInt(maxInput.value);
            
            if (isNaN(maxValue) || maxValue < 0) {
                this.logMessage('ERROR: Invalid max need value');
                return;
            }
            
            if (maxValue > this.resources[i].totalUnits) {
                this.logMessage(`ERROR: Max need exceeds total units for ${this.resources[i].name}`);
                return;
            }
            
            maxNeeds.push(maxValue);
        }
        
        // Create process
        const process = new Process(pid, maxNeeds);
        this.processes.push(process);
        
        // Update allocation matrix
        this.allocation.push(Array(this.resources.length).fill(0));
        this.max.push([...maxNeeds]);
        
        this.updateProcessList();
        this.updateAllocationMatrix();
        this.updateProcessDropdowns();
        this.checkSystemSafety();
        
        this.logMessage(`Process "${pid}" added with max needs: ${maxNeeds.join(', ')}`);
        
        // Clear inputs
        pidInput.value = '';
        this.updateMaxNeedsInputs();
    }
    
    updateProcessList() {
        const container = document.getElementById('process-list');
        container.innerHTML = '';
        
        if (this.processes.length === 0) {
            container.innerHTML = '<p>No processes created yet</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Process ID</th>
                <th>Max Needs</th>
                <th>Current Allocation</th>
            </tr>
        `;
        
        this.processes.forEach((process, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.pid}</td>
                <td>${process.maxNeeds.join(', ')}</td>
                <td>${this.allocation[index].join(', ')}</td>
            `;
            table.appendChild(row);
        });
        
        container.appendChild(table);
    }
    
    updateAllocationMatrix() {
        const container = document.getElementById('allocation-matrix');
        container.innerHTML = '';
        
        if (this.processes.length === 0 || this.resources.length === 0) {
            container.innerHTML = '<p>Add processes and resources to view allocation</p>';
            return;
        }
        
        // Create allocation table
        const table = document.createElement('table');
        
        // Create header row with resource names
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Process</th>';
        this.resources.forEach(resource => {
            headerRow.innerHTML += `<th>${resource.name}</th>`;
        });
        table.appendChild(headerRow);
        
        // Create rows for each process
        this.processes.forEach((process, pIndex) => {
            // Allocation row
            const allocRow = document.createElement('tr');
            allocRow.innerHTML = `<td>${process.pid} (Allocated)</td>`;
            
            this.allocation[pIndex].forEach((allocated, rIndex) => {
                allocRow.innerHTML += `<td>${allocated}</td>`;
            });
            
            // Max needs row
            const maxRow = document.createElement('tr');
            maxRow.innerHTML = `<td>${process.pid} (Max)</td>`;
            
            this.max[pIndex].forEach((max, rIndex) => {
                maxRow.innerHTML += `<td>${max}</td>`;
            });
            
            // Need row
            const needRow = document.createElement('tr');
            needRow.innerHTML = `<td>${process.pid} (Need)</td>`;
            
            this.max[pIndex].forEach((max, rIndex) => {
                const need = max - this.allocation[pIndex][rIndex];
                needRow.innerHTML += `<td>${need}</td>`;
            });
            
            table.appendChild(allocRow);
            table.appendChild(maxRow);
            table.appendChild(needRow);
        });
        
        container.appendChild(table);
    }
    
    updateProcessDropdowns() {
        const requestProcessSelect = document.getElementById('request-process');
        const releaseProcessSelect = document.getElementById('release-process');
        
        if (!requestProcessSelect || !releaseProcessSelect) return;
        
        // Clear current options
        requestProcessSelect.innerHTML = '';
        releaseProcessSelect.innerHTML = '';
        
        // Add empty option
        requestProcessSelect.innerHTML = '<option value="">Select Process</option>';
        releaseProcessSelect.innerHTML = '<option value="">Select Process</option>';
        
        // Add process options
        this.processes.forEach((process, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = process.pid;
            
            requestProcessSelect.appendChild(option.cloneNode(true));
            releaseProcessSelect.appendChild(option);
        });
        
        // Update inputs when process is selected
        requestProcessSelect.addEventListener('change', () => {
            const selectedIndex = requestProcessSelect.value;
            if (selectedIndex === '') return;
            this.updateRequestInputs(parseInt(selectedIndex));
        });
        
        releaseProcessSelect.addEventListener('change', () => {
            const selectedIndex = releaseProcessSelect.value;
            if (selectedIndex === '') return;
            this.updateReleaseInputs(parseInt(selectedIndex));
        });
    }
    
    updateRequestInputs(processIndex) {
        const container = document.getElementById('request-resources');
        container.innerHTML = '';
        
        if (this.resources.length === 0 || this.processes.length === 0) {
            container.innerHTML = '<p>No resources or processes available</p>';
            return;
        }
        
        if (processIndex !== undefined && (processIndex < 0 || processIndex >= this.processes.length)) {
            container.innerHTML = '<p>Select a process</p>';
            return;
        }
        
        this.resources.forEach((resource, index) => {
            const maxRequest = processIndex !== undefined ? 
                this.max[processIndex][index] - this.allocation[processIndex][index] : 
                resource.available;
            
            const div = document.createElement('div');
            div.className = 'resource-request';
            div.innerHTML = `
                <label>${resource.name}:</label>
                <input type="number" id="request-${index}" min="0" max="${Math.min(maxRequest, resource.available)}" value="0">
                <span>Available: ${resource.available}</span>
            `;
            container.appendChild(div);
        });
    }
    
    updateReleaseInputs(processIndex) {
        const container = document.getElementById('release-resources');
        container.innerHTML = '';
        
        if (this.resources.length === 0 || this.processes.length === 0) {
            container.innerHTML = '<p>No resources or processes available</p>';
            return;
        }
        
        if (processIndex !== undefined && (processIndex < 0 || processIndex >= this.processes.length)) {
            container.innerHTML = '<p>Select a process</p>';
            return;
        }
        
        this.resources.forEach((resource, index) => {
            const maxRelease = processIndex !== undefined ? 
                this.allocation[processIndex][index] : 0;
            
            const div = document.createElement('div');
            div.className = 'resource-release';
            div.innerHTML = `
                <label>${resource.name}:</label>
                <input type="number" id="release-${index}" min="0" max="${maxRelease}" value="0">
                <span>Allocated: ${maxRelease}</span>
            `;
            container.appendChild(div);
        });
    }
    
    requestResourcesForProcess() {
        const processSelect = document.getElementById('request-process');
        const processIndex = parseInt(processSelect.value);
        
        if (isNaN(processIndex) || processIndex < 0 || processIndex >= this.processes.length) {
            this.logMessage('ERROR: Invalid process selection');
            return;
        }
        
        // Get request values
        const request = [];
        for (let i = 0; i < this.resources.length; i++) {
            const requestInput = document.getElementById(`request-${i}`);
            const value = parseInt(requestInput.value);
            
            if (isNaN(value) || value < 0) {
                this.logMessage('ERROR: Invalid request value');
                return;
            }
            
            request.push(value);
        }
        
        // Create current state for banker's algorithm
        const resourcesAvailable = this.resources.map(r => r.available);
        const bankerAlgo = new BankersAlgorithm(
            this.processes.map(p => p.pid),
            this.resources.map(r => r.totalUnits),
            this.allocation,
            this.max
        );
        
        // Request resources
        const result = bankerAlgo.requestResources(processIndex, request);
        
        if (result.granted) {
            // Update process allocation and remaining needs
            for (let i = 0; i < request.length; i++) {
                if (request[i] > 0) {
                    this.allocation[processIndex][i] += request[i];
                    this.resources[i].available -= request[i];
                    this.processes[processIndex].allocation[i] += request[i];
                    this.processes[processIndex].remainingNeeds[i] -= request[i];
                }
            }
            
            const processName = this.processes[processIndex].pid;
            this.logMessage(`Resources granted to process ${processName}`);
            
            // Update UI
            this.updateDefinedResources();
            this.updateProcessList();
            this.updateAllocationMatrix();
            this.updateRequestInputs(processIndex);
            this.updateReleaseInputs(processIndex);
            this.checkSystemSafety();
        } else {
            this.logMessage(`ERROR: Request denied - ${result.reason}`);
        }
    }
    
    releaseResourcesFromProcess() {
        const processSelect = document.getElementById('release-process');
        const processIndex = parseInt(processSelect.value);
        
        if (isNaN(processIndex) || processIndex < 0 || processIndex >= this.processes.length) {
            this.logMessage('ERROR: Invalid process selection');
            return;
        }
        
        // Get release values
        const release = [];
        for (let i = 0; i < this.resources.length; i++) {
            const releaseInput = document.getElementById(`release-${i}`);
            const value = parseInt(releaseInput.value);
            
            if (isNaN(value) || value < 0) {
                this.logMessage('ERROR: Invalid release value');
                return;
            }
            
            // Ensure we don't release more than what's allocated
            const currentAllocation = this.allocation[processIndex][i];
            if (value > currentAllocation) {
                this.logMessage(`ERROR: Cannot release more than allocated for ${this.resources[i].name}`);
                return;
            }
            
            release.push(value);
        }
        
        // Create a deep copy of the current state
        const oldAllocation = JSON.parse(JSON.stringify(this.allocation));
        const oldAvailable = this.resources.map(r => r.available);
        
        // Update allocation and available resources directly
        for (let i = 0; i < release.length; i++) {
            if (release[i] > 0) {
                this.allocation[processIndex][i] -= release[i];
                this.resources[i].available += release[i];
                this.processes[processIndex].allocation[i] -= release[i];
                this.processes[processIndex].remainingNeeds[i] += release[i];
            }
        }
        
        // Check if the system is still in a safe state
        const bankerAlgo = new BankersAlgorithm(
            this.processes.map(p => p.pid),
            this.resources.map(r => r.totalUnits),
            this.allocation,
            this.max
        );
        
        const safetyResult = bankerAlgo.isSafeState();
        
        if (safetyResult.safe) {
            const processName = this.processes[processIndex].pid;
            this.logMessage(`Resources released from process ${processName}`);
            
            // Update UI
            this.updateDefinedResources();
            this.updateProcessList();
            this.updateAllocationMatrix();
            this.updateRequestInputs(processIndex);
            this.updateReleaseInputs(processIndex);
            this.checkSystemSafety();
        } else {
            // Revert changes if the system would be unsafe
            this.allocation = oldAllocation;
            for (let i = 0; i < this.resources.length; i++) {
                this.resources[i].available = oldAvailable[i];
                this.processes[processIndex].allocation[i] = oldAllocation[processIndex][i];
                this.processes[processIndex].remainingNeeds[i] = this.max[processIndex][i] - oldAllocation[processIndex][i];
            }
            
            this.logMessage('ERROR: Release would lead to unsafe state');
        }
    }
    
    checkSystemSafety() {
        if (this.processes.length === 0 || this.resources.length === 0) {
            return;
        }
        
        const bankerAlgo = new BankersAlgorithm(
            this.processes.map(p => p.pid),
            this.resources.map(r => r.totalUnits),
            this.allocation,
            this.max
        );
        
        const safetyResult = bankerAlgo.isSafeState();
        const safetyStatus = document.getElementById('safety-status');
        const safeSequenceDiv = document.getElementById('safe-sequence');
        
        if (safetyResult.safe) {
            safetyStatus.innerHTML = '<div class="safe">System is in a safe state</div>';
            
            // Display safe sequence
            const sequenceProcesses = safetyResult.sequence.map(index => this.processes[index].pid);
            safeSequenceDiv.innerHTML = '<h3>Safe Sequence:</h3>';
            safeSequenceDiv.innerHTML += `<div class="sequence">${sequenceProcesses.join(' → ')}</div>`;
        } else {
            safetyStatus.innerHTML = '<div class="unsafe">System is in an unsafe state</div>';
            safeSequenceDiv.innerHTML = '';
        }
        
        this.updateResourceStats();
    }
    
    updateResourceStats() {
        const statsDiv = document.getElementById('resource-stats');
        statsDiv.innerHTML = '<h3>Resource Utilization</h3>';
        
        if (this.resources.length === 0) {
            statsDiv.innerHTML += '<p>No resources defined yet</p>';
            return;
        }
        
        const statsTable = document.createElement('table');
        statsTable.innerHTML = `
            <tr>
                <th>Resource</th>
                <th>Total</th>
                <th>Allocated</th>
                <th>Available</th>
                <th>Utilization</th>
            </tr>
        `;
        
        this.resources.forEach((resource, index) => {
            // Calculate total allocation for this resource across all processes
            let totalAllocated = 0;
            for (let i = 0; i < this.processes.length; i++) {
                totalAllocated += this.allocation[i][index];
            }
            
            const utilization = (totalAllocated / resource.totalUnits * 100).toFixed(2);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${resource.name}</td>
                <td>${resource.totalUnits}</td>
                <td>${totalAllocated}</td>
                <td>${resource.available}</td>
                <td>${utilization}%</td>
            `;
            statsTable.appendChild(row);
        });
        
        statsDiv.appendChild(statsTable);
        
        // Update utilization chart separately
        this.updateUtilizationChart();
    }
    
    updateUtilizationChart() {
        const chartDiv = document.getElementById('utilization-chart');
        chartDiv.innerHTML = '<h3>Resource Utilization Chart</h3>';
        
        if (this.resources.length === 0) {
            chartDiv.innerHTML += '<p>No resources to display</p>';
            return;
        }
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart';
        
        this.resources.forEach((resource, index) => {
            // Calculate total allocation for this resource across all processes
            let totalAllocated = 0;
            for (let i = 0; i < this.processes.length; i++) {
                totalAllocated += this.allocation[i][index];
            }
            
            const percentage = (totalAllocated / resource.totalUnits * 100).toFixed(2);
            
            const barDiv = document.createElement('div');
            barDiv.className = 'chart-bar';
            barDiv.innerHTML = `
                <div class="bar-label">${resource.name}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="bar-value">${percentage}%</div>
            `;
            
            chartContainer.appendChild(barDiv);
        });
        
        chartDiv.appendChild(chartContainer);
    }
    
    logMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `<span class="time">[${timestamp}]</span> ${message}`;
        
        this.systemLog.appendChild(logEntry);
        this.systemLog.scrollTop = this.systemLog.scrollHeight;
    }
    
    updateResourceInputs() {
        // Event listener for add resource button
        const addResourceBtn = document.getElementById('add-resource');
        if (addResourceBtn) {
            addResourceBtn.addEventListener('click', () => this.addResource());
        }
    }
    
    resetSimulation() {
        // Reset all data structures
        this.resources = [];
        this.processes = [];
        this.allocation = [];
        this.max = [];
        
        // Clear UI
        this.updateDefinedResources();
        this.updateMaxNeedsInputs();
        this.updateProcessList();
        this.updateAllocationMatrix();
        this.updateProcessDropdowns();
        this.updateRequestInputs();
        this.updateReleaseInputs();
        
        // Clear visualization
        document.getElementById('safety-status').innerHTML = '';
        document.getElementById('safe-sequence').innerHTML = '';
        document.getElementById('resource-stats').innerHTML = '<h3>Resource Utilization</h3><p>No data to display</p>';
        document.getElementById('utilization-chart').innerHTML = '<h3>Resource Utilization Chart</h3><p>No data to display</p>';
        
        this.logMessage('Simulation reset');
    }
}

// Initialize the simulator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const simulator = new ResourceSimulator();
    
    // Connect event listeners to buttons
    document.getElementById('add-process').addEventListener('click', () => simulator.addProcess());
    document.getElementById('request-btn').addEventListener('click', () => simulator.requestResourcesForProcess());
    document.getElementById('release-btn').addEventListener('click', () => simulator.releaseResourcesFromProcess());
    document.getElementById('reset-simulation').addEventListener('click', () => simulator.resetSimulation());
});

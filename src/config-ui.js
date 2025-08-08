/**
 * Configuration UI for Swerve allowlist/denylist management
 */

const SwerveConfigUI = {
    
    /**
     * Create and show configuration modal
     */
    showConfigModal: function() {
        // Remove existing modal if present
        const existingModal = document.getElementById('swerve-config-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = this.createModal();
        document.body.appendChild(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });

        this.updateUI(modal);
        this.attachEventListeners(modal);
    },

    /**
     * Create modal HTML structure
     */
    createModal: function() {
        const modal = document.createElement('div');
        modal.id = 'swerve-config-modal';
        modal.innerHTML = `
            <div class="swerve-modal-backdrop">
                <div class="swerve-modal-content">
                    <div class="swerve-modal-header">
                        <h3>Swerve Site Configuration</h3>
                        <button class="swerve-close-btn" type="button">&times;</button>
                    </div>
                    
                    <div class="swerve-modal-body">
                        <div class="swerve-mode-section">
                            <label>Mode:</label>
                            <select id="swerve-mode">
                                <option value="disabled">Disabled (Allow all sites)</option>
                                <option value="allowlist">Allowlist (Only allow specified sites)</option>
                                <option value="denylist">Denylist (Block specified sites)</option>
                            </select>
                        </div>

                        <div class="swerve-list-section">
                            <div class="swerve-allowlist-panel">
                                <h4>Allowlist</h4>
                                <div class="swerve-pattern-input">
                                    <input type="text" id="swerve-allowlist-input" placeholder="e.g., example.com, *.google.com">
                                    <button type="button" class="swerve-add-btn" data-type="allowlist">Add</button>
                                </div>
                                <ul id="swerve-allowlist"></ul>
                            </div>

                            <div class="swerve-denylist-panel">
                                <h4>Denylist</h4>
                                <div class="swerve-pattern-input">
                                    <input type="text" id="swerve-denylist-input" placeholder="e.g., facebook.com, /.*\\.ads\\..*/">
                                    <button type="button" class="swerve-add-btn" data-type="denylist">Add</button>
                                </div>
                                <ul id="swerve-denylist"></ul>
                            </div>
                        </div>

                        <div class="swerve-help-section">
                            <h4>Pattern Examples:</h4>
                            <ul>
                                <li><code>example.com</code> - Exact domain</li>
                                <li><code>*.example.com</code> - All subdomains</li>
                                <li><code>example.com/blog/*</code> - Path wildcards</li>
                                <li><code>/.*\\.ads\\..*/</code> - Regex pattern</li>
                            </ul>
                        </div>
                    </div>

                    <div class="swerve-modal-footer">
                        <button type="button" class="swerve-save-btn">Save & Close</button>
                        <button type="button" class="swerve-cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        modal.innerHTML += this.getModalStyles();
        
        // Set initial styles
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '999999';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';

        return modal;
    },

    /**
     * Get CSS styles for the modal
     */
    getModalStyles: function() {
        return `
            <style>
                .swerve-modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .swerve-modal-content {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .swerve-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .swerve-modal-header h3 {
                    margin: 0;
                    color: #333;
                    font-size: 18px;
                }
                
                .swerve-close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .swerve-modal-body {
                    padding: 20px;
                }
                
                .swerve-mode-section {
                    margin-bottom: 20px;
                }
                
                .swerve-mode-section label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                    color: #333;
                }
                
                .swerve-mode-section select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .swerve-list-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .swerve-allowlist-panel, .swerve-denylist-panel {
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    padding: 15px;
                }
                
                .swerve-allowlist-panel h4, .swerve-denylist-panel h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 14px;
                }
                
                .swerve-pattern-input {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 10px;
                }
                
                .swerve-pattern-input input {
                    flex: 1;
                    padding: 6px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    font-size: 12px;
                }
                
                .swerve-add-btn {
                    padding: 6px 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .swerve-add-btn:hover {
                    background: #0056b3;
                }
                
                #swerve-allowlist, #swerve-denylist {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    max-height: 150px;
                    overflow-y: auto;
                }
                
                #swerve-allowlist li, #swerve-denylist li {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 5px;
                    margin-bottom: 2px;
                    background: #f8f9fa;
                    border-radius: 3px;
                    font-size: 12px;
                }
                
                .swerve-remove-btn {
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 2px;
                    padding: 2px 6px;
                    cursor: pointer;
                    font-size: 10px;
                }
                
                .swerve-remove-btn:hover {
                    background: #c82333;
                }
                
                .swerve-help-section {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 4px;
                    border: 1px solid #e0e0e0;
                }
                
                .swerve-help-section h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 14px;
                }
                
                .swerve-help-section ul {
                    margin: 0;
                    padding-left: 20px;
                }
                
                .swerve-help-section li {
                    margin-bottom: 3px;
                    font-size: 12px;
                    color: #666;
                }
                
                .swerve-help-section code {
                    background: #e9ecef;
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-family: monospace;
                    font-size: 11px;
                }
                
                .swerve-modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                .swerve-save-btn, .swerve-cancel-btn {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .swerve-save-btn {
                    background: #28a745;
                    color: white;
                    border-color: #28a745;
                }
                
                .swerve-save-btn:hover {
                    background: #218838;
                }
                
                .swerve-cancel-btn {
                    background: #f8f9fa;
                    color: #333;
                }
                
                .swerve-cancel-btn:hover {
                    background: #e2e6ea;
                }
                
                @media (max-width: 600px) {
                    .swerve-list-section {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    },

    /**
     * Update UI based on current settings
     */
    updateUI: function(modal) {
        const mode = SwerveAllowlist.getMode();
        const allowlist = SwerveAllowlist.getList('allowlist');
        const denylist = SwerveAllowlist.getList('denylist');

        // Set mode dropdown
        modal.querySelector('#swerve-mode').value = mode;

        // Update lists
        this.updateList(modal, 'allowlist', allowlist);
        this.updateList(modal, 'denylist', denylist);
    },

    /**
     * Update a pattern list in the UI
     */
    updateList: function(modal, type, patterns) {
        const listEl = modal.querySelector(`#swerve-${type}`);
        listEl.innerHTML = '';

        patterns.forEach(pattern => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${pattern}</span>
                <button type="button" class="swerve-remove-btn" data-type="${type}" data-pattern="${pattern}">×</button>
            `;
            listEl.appendChild(li);
        });

        if (patterns.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<em style="color: #999;">No patterns defined</em>';
            li.style.justifyContent = 'center';
            listEl.appendChild(li);
        }
    },

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners: function(modal) {
        // Close button
        modal.querySelector('.swerve-close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });

        // Cancel button
        modal.querySelector('.swerve-cancel-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });

        // Save button
        modal.querySelector('.swerve-save-btn').addEventListener('click', () => {
            this.saveAndClose(modal);
        });

        // Add buttons
        modal.querySelectorAll('.swerve-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const input = modal.querySelector(`#swerve-${type}-input`);
                const pattern = input.value.trim();
                
                if (pattern) {
                    SwerveAllowlist.addPattern(type, pattern);
                    input.value = '';
                    this.updateUI(modal);
                }
            });
        });

        // Remove buttons (delegated)
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('swerve-remove-btn')) {
                const type = e.target.dataset.type;
                const pattern = e.target.dataset.pattern;
                SwerveAllowlist.removePattern(type, pattern);
                this.updateUI(modal);
            }
        });

        // Enter key support for inputs
        modal.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const type = input.id.includes('allowlist') ? 'allowlist' : 'denylist';
                    const pattern = input.value.trim();
                    
                    if (pattern) {
                        SwerveAllowlist.addPattern(type, pattern);
                        input.value = '';
                        this.updateUI(modal);
                    }
                }
            });
        });

        // Click outside to close
        modal.querySelector('.swerve-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.classList.contains('swerve-modal-backdrop')) {
                this.closeModal(modal);
            }
        });
    },

    /**
     * Save settings and close modal
     */
    saveAndClose: function(modal) {
        const mode = modal.querySelector('#swerve-mode').value;
        SwerveAllowlist.setMode(mode);
        this.closeModal(modal);
    },

    /**
     * Close modal with animation
     */
    closeModal: function(modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
};
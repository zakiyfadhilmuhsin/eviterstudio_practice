/**
 * EviterStudio File Upload - JavaScript Application
 * Modern ES6+ implementation with comprehensive API integration
 */

class FileUploadApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3018';
        this.currentPage = 1;
        this.currentLimit = 10;
        this.currentSort = 'createdAt|DESC';
        this.currentSearch = '';
        this.currentFilter = '';
        this.selectedFiles = [];
        this.isUploading = false;

        this.init();
    }

    /**
     * Safely get element by ID
     */
    safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Initialize the application
     */
    async init() {
        this.bindEvents();
        this.setupDragAndDrop();
        await this.checkServerStatus();
        await this.loadFiles();
        await this.loadAnalytics();
        this.startPeriodicRefresh();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File inputs
        document.getElementById('singleFileInput').addEventListener('change', (e) => this.handleSingleFileSelect(e));
        document.getElementById('multipleFileInput').addEventListener('change', (e) => this.handleMultipleFileSelect(e));

        // Upload buttons
        document.getElementById('singleUploadBtn').addEventListener('click', () => this.uploadSingleFile());
        document.getElementById('multipleUploadBtn').addEventListener('click', () => this.uploadMultipleFiles());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('sortSelect').addEventListener('change', (e) => this.handleSortChange(e.target.value));
        document.getElementById('typeFilter').addEventListener('change', (e) => this.handleFilterChange(e.target.value));
        document.getElementById('limitSelect').addEventListener('change', (e) => this.handleLimitChange(e.target.value));

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());

        // Modal close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const uploadAreas = document.querySelectorAll('.upload-area');

        uploadAreas.forEach(area => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.add('drag-over'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.remove('drag-over'), false);
            });

            area.addEventListener('drop', (e) => this.handleDrop(e, area), false);
        });
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file drop
     */
    handleDrop(e, area) {
        const files = e.dataTransfer.files;
        const isMultiple = area.id === 'multipleUploadArea';

        if (isMultiple) {
            this.handleMultipleFiles(files);
        } else {
            if (files.length > 1) {
                this.showToast('warning', 'Multiple Files', 'Please drop only one file for single upload.');
                return;
            }
            this.handleSingleFile(files[0]);
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    /**
     * Handle single file selection
     */
    handleSingleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleSingleFile(file);
        }
    }

    /**
     * Handle single file
     */
    handleSingleFile(file) {
        if (!this.validateFile(file)) return;

        this.selectedFiles = [file];
        this.updateSingleUploadUI(file);

        // Safely enable upload button
        const uploadBtn = document.getElementById('singleUploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
    }

    /**
     * Update single upload UI
     */
    updateSingleUploadUI(file) {
        const uploadArea = document.getElementById('singleUploadArea');
        const icon = this.getFileIcon(file.type);
        const size = this.formatFileSize(file.size);

        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="${icon}"></i>
            </div>
            <h3>${file.name}</h3>
            <p>${file.type} • ${size}</p>
            <button class="browse-btn" onclick="document.getElementById('singleFileInput').click()">
                <i class="fas fa-folder-open"></i> Change File
            </button>
        `;
    }

    /**
     * Handle multiple file selection
     */
    handleMultipleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.handleMultipleFiles(files);
    }

    /**
     * Handle multiple files
     */
    handleMultipleFiles(files) {
        if (files.length > 10) {
            this.showToast('warning', 'Too Many Files', 'Maximum 10 files allowed for multiple upload.');
            return;
        }

        const validFiles = [];
        files.forEach(file => {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        });

        this.selectedFiles = validFiles;
        this.updateMultipleUploadUI();

        // Safely enable/disable upload button
        const uploadBtn = document.getElementById('multipleUploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = validFiles.length === 0;
        }
    }

    /**
     * Update multiple upload UI
     */
    updateMultipleUploadUI() {
        const container = document.getElementById('selectedFiles');

        if (this.selectedFiles.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">
                        <i class="${this.getFileIcon(file.type)}"></i>
                    </div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${file.type} • ${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="file-remove" onclick="app.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    /**
     * Remove file from selection
     */
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateMultipleUploadUI();

        // Safely enable/disable upload button
        const uploadBtn = document.getElementById('multipleUploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = this.selectedFiles.length === 0;
        }
    }

    /**
     * Validate file
     */
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > maxSize) {
            this.showToast('error', 'File Too Large', `${file.name} exceeds 10MB limit.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showToast('error', 'Invalid File Type', `${file.name} has unsupported file type.`);
            return false;
        }

        return true;
    }

    /**
     * Upload single file
     */
    async uploadSingleFile() {
        if (this.isUploading || this.selectedFiles.length === 0) return;

        this.isUploading = true;
        const btn = document.getElementById('singleUploadBtn');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.classList.add('uploading');
        btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', this.selectedFiles[0]);

            const response = await fetch(`${this.apiBaseUrl}/upload/single`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast('success', 'Upload Successful', `${result.data.file.filename} uploaded successfully!`);
                this.resetSingleUpload();
                await this.loadFiles();
                await this.loadAnalytics();
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            this.showToast('error', 'Upload Failed', error.message);
        } finally {
            this.isUploading = false;
            btn.innerHTML = originalText;
            btn.classList.remove('uploading');
            btn.disabled = false;
        }
    }

    /**
     * Upload multiple files
     */
    async uploadMultipleFiles() {
        if (this.isUploading || this.selectedFiles.length === 0) return;

        this.isUploading = true;
        const btn = document.getElementById('multipleUploadBtn');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.classList.add('uploading');
        btn.disabled = true;

        try {
            const formData = new FormData();
            this.selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${this.apiBaseUrl}/upload/multiple`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                const successCount = result.data.files.length;
                const totalCount = result.data.totalFiles;

                if (successCount === totalCount) {
                    this.showToast('success', 'Upload Successful', `All ${successCount} files uploaded successfully!`);
                } else {
                    this.showToast('warning', 'Partial Upload', `${successCount} of ${totalCount} files uploaded successfully.`);
                }

                this.resetMultipleUpload();
                await this.loadFiles();
                await this.loadAnalytics();
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            this.showToast('error', 'Upload Failed', error.message);
        } finally {
            this.isUploading = false;
            btn.innerHTML = originalText;
            btn.classList.remove('uploading');
            btn.disabled = false;
        }
    }

    /**
     * Reset single upload
     */
    resetSingleUpload() {
        this.selectedFiles = [];

        // Safely reset file input
        const fileInput = document.getElementById('singleFileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Safely disable upload button
        const uploadBtn = document.getElementById('singleUploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }

        // Safely reset upload area
        const uploadArea = document.getElementById('singleUploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h3>Drop file here or click to browse</h3>
                <p>Supports: Images, PDFs, Documents (Max: 10MB)</p>
                <button class="browse-btn" onclick="document.getElementById('singleFileInput').click()">
                    <i class="fas fa-folder-open"></i> Browse Files
                </button>
            `;
        }
    }

    /**
     * Reset multiple upload
     */
    resetMultipleUpload() {
        this.selectedFiles = [];

        // Safely reset file input
        const fileInput = document.getElementById('multipleFileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Safely disable upload button
        const uploadBtn = document.getElementById('multipleUploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }

        // Safely clear selected files display
        const selectedFilesContainer = document.getElementById('selectedFiles');
        if (selectedFilesContainer) {
            selectedFilesContainer.innerHTML = '';
        }
    }

    /**
     * Load files with pagination
     */
    async loadFiles() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.currentLimit,
                ...(this.currentSort && this.parseSortParam()),
                ...(this.currentSearch && { search: this.currentSearch, searchFields: 'filename' }),
                ...(this.currentFilter && { [`filters[mimetype]`]: this.currentFilter })
            });

            const response = await fetch(`${this.apiBaseUrl}/upload/files?${params}`);
            const result = await response.json();

            if (response.ok) {
                this.renderFiles(result.data.data);
                this.renderPagination(result.data.meta);
            } else {
                throw new Error(result.message || 'Failed to load files');
            }
        } catch (error) {
            this.showToast('error', 'Load Failed', 'Failed to load files: ' + error.message);
            this.renderFiles([]);
        }
    }

    /**
     * Parse sort parameter
     */
    parseSortParam() {
        const [sortBy, sortOrder] = this.currentSort.split('|');
        return { sortBy, sortOrder };
    }

    /**
     * Render files grid
     */
    renderFiles(files) {
        const grid = document.getElementById('filesGrid');

        if (files.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No files found</h3>
                    <p>Upload some files to get started!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = files.map(file => `
            <div class="file-card" onclick="app.showFileDetails('${file.id}')">
                <div class="file-card-header">
                    <div class="file-type-icon ${this.getFileCategory(file.mimetype)}">
                        <i class="${this.getFileIcon(file.mimetype)}"></i>
                    </div>
                    <div class="file-meta">
                        <h3>${file.filename}</h3>
                        <p>${file.mimetype}</p>
                    </div>
                </div>
                <div class="file-card-body">
                    <div class="file-stats">
                        <div class="stat">
                            <span class="stat-label">Size</span>
                            <span class="stat-value">${this.formatFileSize(file.size)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Upload Type</span>
                            <span class="stat-value">${file.uploadType}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Uploaded</span>
                            <span class="stat-value">${this.formatDate(file.uploadedAt)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Bucket</span>
                            <span class="stat-value">${file.bucket}</span>
                        </div>
                    </div>
                </div>
                <div class="file-card-actions">
                    <button class="action-btn primary" onclick="event.stopPropagation(); app.viewFile('${file.url}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); app.downloadFile('${file.url}', '${file.filename}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="action-btn danger" onclick="event.stopPropagation(); app.deleteFile('${file.id}', '${file.filename}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render pagination
     */
    renderPagination(meta) {
        const container = document.getElementById('pagination');
        const { currentPage, totalPages, hasNextPage, hasPreviousPage, totalItems, itemsPerPage } = meta;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button class="page-btn" ${!hasPreviousPage ? 'disabled' : ''} onclick="app.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="app.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-btn disabled">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="app.goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-btn disabled">...</span>`;
            }
            paginationHTML += `<button class="page-btn" onclick="app.goToPage(${totalPages})">${totalPages}</button>`;
        }

        paginationHTML += `
            <button class="page-btn" ${!hasNextPage ? 'disabled' : ''} onclick="app.goToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += `
            <div class="page-info">
                Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}
            </div>
        `;

        container.innerHTML = paginationHTML;
    }

    /**
     * Go to specific page
     */
    async goToPage(page) {
        this.currentPage = page;
        await this.loadFiles();
    }

    /**
     * Handle search
     */
    async handleSearch(query) {
        this.currentSearch = query;
        this.currentPage = 1;
        await this.loadFiles();
    }

    /**
     * Handle sort change
     */
    async handleSortChange(value) {
        this.currentSort = value;
        this.currentPage = 1;
        await this.loadFiles();
    }

    /**
     * Handle filter change
     */
    async handleFilterChange(value) {
        this.currentFilter = value;
        this.currentPage = 1;
        await this.loadFiles();
    }

    /**
     * Handle limit change
     */
    async handleLimitChange(value) {
        this.currentLimit = parseInt(value);
        this.currentPage = 1;
        await this.loadFiles();
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        const btn = document.getElementById('refreshBtn');
        btn.classList.add('spinning');

        try {
            await Promise.all([
                this.loadFiles(),
                this.loadAnalytics()
            ]);
            this.showToast('success', 'Refreshed', 'Data refreshed successfully!');
        } catch (error) {
            this.showToast('error', 'Refresh Failed', error.message);
        } finally {
            btn.classList.remove('spinning');
        }
    }

    /**
     * Load analytics data
     */
    async loadAnalytics() {
        try {
            const [filesResponse, uploadsResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/upload/files?limit=1`),
                fetch(`${this.apiBaseUrl}/upload/uploads?limit=1`)
            ]);

            const filesResult = await filesResponse.json();
            const uploadsResult = await uploadsResponse.json();

            if (filesResponse.ok && uploadsResponse.ok) {
                const totalFiles = filesResult.data.meta.totalItems;
                const totalUploads = uploadsResult.data.meta.totalItems;

                // Calculate total size from current page data
                let totalSize = 0;
                let lastUpload = 'Never';

                if (filesResult.data.data.length > 0) {
                    // Get all files to calculate total size
                    const allFilesResponse = await fetch(`${this.apiBaseUrl}/upload/files?limit=1000`);
                    const allFilesResult = await allFilesResponse.json();

                    if (allFilesResponse.ok) {
                        totalSize = allFilesResult.data.data.reduce((sum, file) => sum + file.size, 0);
                        lastUpload = this.formatDate(allFilesResult.data.data[0].uploadedAt);
                    }
                }

                this.updateAnalytics({
                    totalFiles,
                    totalUploads,
                    totalSize: this.formatFileSize(totalSize),
                    lastUpload
                });
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    /**
     * Update analytics display
     */
    updateAnalytics(data) {
        document.getElementById('totalFiles').textContent = data.totalFiles;
        document.getElementById('totalUploads').textContent = data.totalUploads;
        document.getElementById('totalSize').textContent = data.totalSize;
        document.getElementById('lastUpload').textContent = data.lastUpload;
    }

    /**
     * Show file details in modal
     */
    async showFileDetails(fileId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/upload/file/${fileId}`);
            const result = await response.json();

            if (response.ok) {
                const file = result.data;
                this.openModal('File Details', `
                    <div class="file-details-modal">
                        <div class="file-header">
                            <div class="file-type-icon ${this.getFileCategory(file.mimetype)} large">
                                <i class="${this.getFileIcon(file.mimetype)}"></i>
                            </div>
                            <div class="file-info">
                                <h2>${file.filename}</h2>
                                <p>${file.mimetype}</p>
                            </div>
                        </div>
                        <div class="file-properties">
                            <div class="property">
                                <label>File ID:</label>
                                <span>${file.id}</span>
                            </div>
                            <div class="property">
                                <label>Size:</label>
                                <span>${this.formatFileSize(file.size)}</span>
                            </div>
                            <div class="property">
                                <label>Upload Type:</label>
                                <span>${file.uploadType}</span>
                            </div>
                            <div class="property">
                                <label>Bucket:</label>
                                <span>${file.bucket}</span>
                            </div>
                            <div class="property">
                                <label>Storage Key:</label>
                                <span>${file.key}</span>
                            </div>
                            <div class="property">
                                <label>Uploaded:</label>
                                <span>${this.formatDate(file.uploadedAt)}</span>
                            </div>
                            <div class="property">
                                <label>URL:</label>
                                <span><a href="${file.url}" target="_blank">${file.url}</a></span>
                            </div>
                        </div>
                        <div class="file-actions">
                            <button class="action-btn primary" onclick="app.viewFile('${file.url}')">
                                <i class="fas fa-eye"></i> View File
                            </button>
                            <button class="action-btn" onclick="app.downloadFile('${file.url}', '${file.filename}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="action-btn danger" onclick="app.deleteFile('${file.id}', '${file.filename}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `);
            } else {
                throw new Error(result.message || 'Failed to load file details');
            }
        } catch (error) {
            this.showToast('error', 'Load Failed', error.message);
        }
    }

    /**
     * View file in new tab
     */
    viewFile(url) {
        window.open(url, '_blank');
    }

    /**
     * Download file
     */
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Delete file
     */
    async deleteFile(fileId, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/upload/file/${fileId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast('success', 'File Deleted', `${filename} has been deleted successfully.`);
                await this.loadFiles();
                await this.loadAnalytics();
                this.closeModal();
            } else {
                throw new Error(result.message || 'Failed to delete file');
            }
        } catch (error) {
            this.showToast('error', 'Delete Failed', error.message);
        }
    }

    /**
     * Check server status
     */
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/upload/health`);
            const result = await response.json();

            if (response.ok) {
                this.updateServerStatus(true, 'Connected');
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            this.updateServerStatus(false, 'Disconnected');
        }
    }

    /**
     * Update server status indicator
     */
    updateServerStatus(isOnline, text) {
        const dot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        statusText.textContent = text;
    }

    /**
     * Start periodic refresh
     */
    startPeriodicRefresh() {
        // Refresh analytics every 30 seconds
        setInterval(() => {
            this.loadAnalytics();
        }, 30000);

        // Check server status every 10 seconds
        setInterval(() => {
            this.checkServerStatus();
        }, 10000);
    }

    /**
     * Open modal
     */
    openModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('fileModal').classList.add('active');
    }

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('fileModal').classList.remove('active');
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * Get file icon based on mime type
     */
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fas fa-image';
        if (mimeType === 'application/pdf') return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'fas fa-file-powerpoint';
        if (mimeType.startsWith('text/')) return 'fas fa-file-alt';
        if (mimeType.startsWith('video/')) return 'fas fa-file-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-file-audio';
        return 'fas fa-file';
    }

    /**
     * Get file category for styling
     */
    getFileCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
        if (mimeType.startsWith('text/')) return 'text';
        return 'other';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }

        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }

        // Less than 1 week
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }

        // More than 1 week
        return date.toLocaleDateString();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FileUploadApp();
});

// Additional CSS for modal content
const additionalCSS = `
    .file-details-modal {
        max-width: 100%;
    }

    .file-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-xl);
        padding-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--border-color);
    }

    .file-type-icon.large {
        width: 80px;
        height: 80px;
        font-size: 2rem;
    }

    .file-info h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
        word-break: break-word;
    }

    .file-properties {
        display: grid;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-xl);
    }

    .property {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: var(--spacing-md);
        align-items: center;
    }

    .property label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .property span {
        word-break: break-all;
    }

    .property a {
        color: var(--primary-color);
        text-decoration: none;
    }

    .property a:hover {
        text-decoration: underline;
    }

    .file-actions {
        display: flex;
        gap: var(--spacing-md);
        justify-content: center;
    }

    @media (max-width: 600px) {
        .property {
            grid-template-columns: 1fr;
            gap: var(--spacing-xs);
        }

        .file-header {
            flex-direction: column;
            text-align: center;
        }

        .file-actions {
            flex-direction: column;
        }
    }
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
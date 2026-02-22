// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const removeFileBtn = document.getElementById('removeFileBtn');
const extractBtn = document.getElementById('extractBtn');

const filePreview = document.getElementById('filePreview');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');

const uploadCard = document.getElementById('uploadCard');
const loadingState = document.getElementById('loadingState');
const resultsView = document.getElementById('resultsView');
const newUploadBtn = document.getElementById('newUploadBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');

const toast = document.getElementById('toast');

// State
let selectedFile = null;

// The backend URL. Adjust if deployed.
const API_URL = 'http://localhost:3000/api/upload';

// --- Event Listeners: File Upload Interactions --- //

// 1. Click to browse
browseBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent accidental form submission default behaviors
    fileInput.click();
});
dropZone.addEventListener('click', (e) => {
    // Prevent triggering if clicking exactly on the text button to avoid double triggers
    if (e.target !== browseBtn) fileInput.click();
});

// 2. File Selection via dialog
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// 3. Drag and Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// 4. Remove File
removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger the click on dropzone
    resetState();
});

// 5. Submit File
extractBtn.addEventListener('click', processInvoice);

// 6. Reset UI
newUploadBtn.addEventListener('click', () => {
    resetState();
    uploadCard.classList.remove('hidden');
    resultsView.classList.add('hidden');
});

// 7. Copy JSON to clipboard
copyJsonBtn.addEventListener('click', () => {
    const jsonStr = document.getElementById('jsonOutput').innerText;
    navigator.clipboard.writeText(jsonStr).then(() => {
        showToast('JSON copied to clipboard', 'success');
    }).catch(err => {
        showToast('Failed to copy', 'error');
    });
});


// --- Functions --- //

function handleFileSelect(file) {
    // Validate file type (PDF, JPG, PNG)
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showToast('Only JPG, PNG, and PDF files are allowed.', 'error');
        return;
    }

    // Validate size (e.g. 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File is too large. Max 10MB allowed.', 'error');
        return;
    }

    selectedFile = file;

    // Update UI
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);

    dropZone.classList.add('hidden');
    filePreview.classList.remove('hidden');
    extractBtn.disabled = false;
}

function resetState() {
    selectedFile = null;
    fileInput.value = '';

    dropZone.classList.remove('hidden');
    filePreview.classList.add('hidden');
    extractBtn.disabled = true;
}

async function processInvoice() {
    if (!selectedFile) return;

    // Transition UI to loading state
    uploadCard.classList.add('hidden');
    loadingState.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to process invoice');
        }

        // Processing success.
        populateResults(result.data);

        // Switch UI to results
        loadingState.classList.add('hidden');
        resultsView.classList.remove('hidden');
        showToast('Extraction successful!', 'success');

    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        // Revert UI on failure
        loadingState.classList.add('hidden');
        uploadCard.classList.remove('hidden');
    }
}

function populateResults(data) {
    // Update Summary Cards (handle missing data gracefully)
    document.getElementById('resVendor').textContent = data.vendor_name || 'Not Found';
    document.getElementById('resInvoiceNum').textContent = data.invoice_number || '-';
    document.getElementById('resGstNum').textContent = data.gst_number || '-';
    document.getElementById('resDate').textContent = data.invoice_date || '-';

    // Format currency if possible, else just show the string
    document.getElementById('resTotal').textContent = data.total_amount ? `$${data.total_amount}` : '-';

    // Populate Table
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = ''; // Clear previous

    if (data.line_items && Array.isArray(data.line_items) && data.line_items.length > 0) {
        data.line_items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.item_name || '-'}</td>
                <td class="num-col">${item.quantity || '-'}</td>
                <td class="num-col">${item.rate || '-'}</td>
                <td class="num-col font-medium">${item.amount || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align:center; color: var(--text-muted)">No line items detected</td>`;
        tbody.appendChild(tr);
    }

    // Populate JSON View
    const jsonOutput = document.getElementById('jsonOutput');
    jsonOutput.textContent = JSON.stringify(data, null, 2);
}

// Utility: Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Utility: Show Toast notification
let toastTimeout;
function showToast(message, type = 'default') {
    toast.textContent = message;

    // Reset classes
    toast.className = 'toast show';
    if (type !== 'default') {
        toast.classList.add(type);
    }

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

const GSHEET_JSONP_URL = 'https://docs.google.com/spreadsheets/d/13E8H4qd3JFf7CPTc7hA0MUVwQACGNV-iVF_WV9FW39c/gviz/tq?tqx=out:json;responseHandler:gvizCallback&gid=0';

// Branding Assets (Using external files: seal.jpg, logo.png)

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

let receiptsData = [];

function fetchData() {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    
    // Define the global callback function exactly as named in responseHandler
    window.gvizCallback = function(data) {
        try {
            if (data.status === 'error') {
                throw new Error(data.errors[0].message);
            }
            
            // Extract column labels
            const cols = data.table.cols.map(c => c.label);
            
            // Extract rows and map them into objects
            const rows = data.table.rows.map(r => {
                const rowData = {};
                cols.forEach((colName, i) => {
                    if (!colName) return;
                    const cell = (r.c && r.c[i]) ? r.c[i] : null;
                    // Prefer formatted string (f) over raw value (v) for display purposes
                    rowData[colName] = (cell && cell.v !== null && cell.v !== undefined) 
                        ? (cell.f ? String(cell.f) : String(cell.v)) 
                        : "";
                });
                return rowData;
            });
            
            loader.style.display = 'none';
            // Filter out empty receipt rows
            receiptsData = rows.filter(row => row['Receipt No']);
            renderTable(receiptsData);
            document.getElementById('total-count').innerText = receiptsData.length;
        } catch (err) {
            console.error('Data Parse error:', err);
            loader.innerHTML = `<p style="color: #ef4444;">Data processing error: ${err.message}</p>`;
        }
    };

    // Inject JSONP script tag to bypass all CORS limitations
    const script = document.createElement('script');
    script.src = GSHEET_JSONP_URL + '&_=' + new Date().getTime(); // bypass cache
    script.onerror = function() {
        console.error('Script load error');
        loader.innerHTML = `<p style="color: #ef4444; padding: 0 20px; text-align: center;">Network Error: Failed to fetch Google Sheets data.<br><small>If you see this, please check your internet connection or ad-blocker.</small></p>`;
    };
    document.body.appendChild(script);
}

function renderTable(data) {
    const tbody = document.getElementById('data-rows');
    tbody.innerHTML = '';

    data.forEach((row) => {
        const globalIndex = receiptsData.indexOf(row);
        const { name, ivrs } = parseCustomerName(row['Customer Name']);
        
        const tr = document.createElement('tr');

        // Safe text population to avoid XSS
        const td = (val) => {
            const span = document.createElement('span');
            span.textContent = val;
            return span.outerHTML;
        };

        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" value="${globalIndex}" onclick="updateBulkBtn()"></td>
<<<<<<< Updated upstream
            <td><strong>${td(row['Receipt No'])}</strong></td>
            <td>${td(row['Payment Receiving Date'])}</td>
            <td>${td(name)}</td>
            <td><code>${td(ivrs)}</code></td>
            <td>₹${td(row['Amount'])}</td>
            <td class="text-right action-cell">
                <button class="view-btn" onclick="viewReceipt(${globalIndex})">View</button>
=======
            <td><strong>${row['Receipt No']}</strong></td>
            <td>${row['Payment Receiving Date']}</td>
            <td>${name}</td>
            <td><code>${ivrs}</code></td>
            <td>â‚¹${row['Amount']}</td>
            <td class="text-right">
>>>>>>> Stashed changes
                <button class="download-btn" onclick="generateSinglePDF(${globalIndex})">Download</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function parseCustomerName(fullName) {
    if (!fullName) return { name: 'Unknown', ivrs: '-' };
    const parts = fullName.split(' - ');
    return {
        name: parts[0] || 'Unknown',
        ivrs: parts[1] || '-'
    };
}

function filterData() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = receiptsData.filter(row => {
        return row['Customer Name'].toLowerCase().includes(query) || 
               row['Receipt No'].toLowerCase().includes(query);
    });
    renderTable(filtered);
}

function toggleSelectAll() {
    const master = document.getElementById('select-all');
    const checks = document.querySelectorAll('.row-checkbox');
    checks.forEach(c => c.checked = master.checked);
    updateBulkBtn();
}

function updateBulkBtn() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    const btn = document.getElementById('bulk-btn');
    if (checked.length > 0) {
        btn.style.display = 'block';
        btn.innerText = `Download Selected (${checked.length})`;
    } else {
        btn.style.display = 'none';
    }
}

async function generateSinglePDF(index, btn) {
    try {
        const row = receiptsData[index];
        if (!row) throw new Error("Row data not found");

        // btn is passed explicitly; fall back to event.target for direct button clicks
        if (!btn && event && event.target) btn = event.target;
        const originalText = btn ? btn.innerText : '';
        if (btn) { btn.innerText = 'Creating...'; btn.disabled = true; }

        await prepareTemplate(row);

        const element = document.getElementById('receipt-template');
        const opt = {
            margin: [2, 5, 5, 5],
            filename: `Receipt_${row['Receipt No']}_${row['Customer Name'].split(' ')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true, allowTaint: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();

        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    } catch (err) {
        console.error('PDF Generation Error:', err);
        alert('Error generating PDF: ' + err.message);
    }
}

async function prepareTemplate(row) {
    const { name, ivrs } = parseCustomerName(row['Customer Name']);

    document.getElementById('pdf-receipt-no').innerText = row['Receipt No'] || '-';
    document.getElementById('pdf-date').innerText = row['Payment Receiving Date'] || '-';
    document.getElementById('pdf-cust-name').innerText = name || '-';
    document.getElementById('pdf-mobile').innerText = row['Mobile'] || '-';
    document.getElementById('pdf-address').innerText = row['Address'] || '-';
    document.getElementById('pdf-ivrs').innerText = ivrs || '-';
    document.getElementById('pdf-mode').innerText = row['Mode of Payment'] || '-';
    document.getElementById('pdf-amount').innerText = '₹' + (row['Amount'] || '0');
    document.getElementById('pdf-ack-amount').innerText = '₹' + (row['Amount'] || '0');

    const stampImg = document.getElementById('pdf-stamp');
    if (stampImg) stampImg.src = 'seal.jpg?' + Date.now();

    const logoImg = document.getElementById('pdf-logo');
    if (logoImg) logoImg.src = 'logo.png?' + Date.now();

    // Wait for all images to be ready before PDF capture
    const images = document.querySelectorAll('#receipt-template img');
    const promises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                resolve();
            } else {
                const onLoad = () => {
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                    resolve();
                };
                const onError = () => {
                    console.warn('Image failed to load:', img.src);
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                    resolve();
                };
                img.addEventListener('load', onLoad);
                img.addEventListener('error', onError);
            }
        });
    });
    await Promise.all(promises);
    // Give browser a frame to paint images before html2canvas captures
    await new Promise(r => setTimeout(r, 300));
}

async function handleBulkDownload() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    const btn = document.getElementById('bulk-btn');
    btn.disabled = true;
    btn.innerText = 'Processing...';

    for(let check of checked) {
        const idx = parseInt(check.value);
        await generateSinglePDF(idx, null);
        // Small delay between downloads to prevent browser blocking
        await new Promise(r => setTimeout(r, 1000));
    }

    btn.disabled = false;
    updateBulkBtn();
}

async function viewReceipt(index) {
    const row = receiptsData[index];
    if (!row) return;

    await prepareTemplate(row);

    // Clone the populated template into the modal
    const source = document.getElementById('receipt-template');
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.cssText = 'display:block; margin: 0 auto;';

    const body = document.getElementById('modal-preview-body');
    body.innerHTML = '';
    body.appendChild(clone);

    // Wire the Download button to this specific row
    const dlBtn = document.getElementById('modal-download-btn');
    dlBtn.onclick = () => generateSinglePDF(index, dlBtn);

    document.getElementById('preview-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('preview-modal').style.display = 'none';
}


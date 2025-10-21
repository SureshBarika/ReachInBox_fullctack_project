// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// State
let currentPage = 1;
let totalEmails = 0;
const pageSize = 20;
let currentFilters = {
    query: '',
    accountId: '',
    folder: '',
    category: ''
};

// DOM Elements
const emailList = document.getElementById('emailList');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const accountFilter = document.getElementById('accountFilter');
const folderFilter = document.getElementById('folderFilter');
const categoryFilter = document.getElementById('categoryFilter');
const refreshBtn = document.getElementById('refreshBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const emailModal = document.getElementById('emailModal');
const closeModal = document.querySelector('.close');
const suggestReplyBtn = document.getElementById('suggestReplyBtn');
const suggestedReply = document.getElementById('suggestedReply');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    loadEmails();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    accountFilter.addEventListener('change', handleFilterChange);
    folderFilter.addEventListener('change', handleFilterChange);
    categoryFilter.addEventListener('change', handleFilterChange);
    refreshBtn.addEventListener('click', () => loadEmails());

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadEmails();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(totalEmails / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            loadEmails();
        }
    });

    closeModal.addEventListener('click', () => {
        emailModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === emailModal) {
            emailModal.style.display = 'none';
        }
    });

    suggestReplyBtn.addEventListener('click', handleSuggestReply);
}

// Load Accounts
async function loadAccounts() {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`);
        const data = await response.json();

        if (data.status === 'success') {
            accountFilter.innerHTML = '<option value="">All Accounts</option>';
            data.data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.email;
                accountFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// Load Emails
async function loadEmails() {
    showLoading();

    try {
        const params = new URLSearchParams({
            from: ((currentPage - 1) * pageSize).toString(),
            size: pageSize.toString()
        });

        if (currentFilters.query) params.append('q', currentFilters.query);
        if (currentFilters.accountId) params.append('accountId', currentFilters.accountId);
        if (currentFilters.folder) params.append('folder', currentFilters.folder);
        if (currentFilters.category) params.append('category', currentFilters.category);

        const endpoint = currentFilters.query || currentFilters.accountId || currentFilters.folder || currentFilters.category
            ? 'emails/search'
            : 'emails';

        const response = await fetch(`${API_BASE_URL}/${endpoint}?${params}`);
        const data = await response.json();

        if (data.status === 'success') {
            totalEmails = data.data.total?.value || data.data.total || 0;
            displayEmails(data.data.emails);
            updatePagination();
        }
    } catch (error) {
        console.error('Error loading emails:', error);
        emailList.innerHTML = '<div class="no-emails"><h3>Error loading emails</h3><p>Please try again later</p></div>';
    }
}

// Display Emails
function displayEmails(emails) {
    if (!emails || emails.length === 0) {
        emailList.innerHTML = '<div class="no-emails"><h3>No emails found</h3><p>Try adjusting your filters or search query</p></div>';
        return;
    }

    emailList.innerHTML = emails.map(email => `
        <div class="email-item" onclick="showEmailDetail('${email.id}')">
            <div class="email-header">
                <div class="email-from">${escapeHtml(email.from)}</div>
                <div class="email-date">${formatDate(email.date)}</div>
            </div>
            <div class="email-subject">${escapeHtml(email.subject)}</div>
            <div class="email-preview">${escapeHtml(email.body.substring(0, 150))}...</div>
            <div class="email-footer">
                <span class="category-badge category-${getCategoryClass(email.aiCategory)}">
                    ${email.aiCategory}
                </span>
                <span class="folder-badge">${email.folder}</span>
            </div>
        </div>
    `).join('');
}

// Show Email Detail
async function showEmailDetail(emailId) {
    try {
        const response = await fetch(`${API_BASE_URL}/emails/${emailId}`);
        const data = await response.json();

        if (data.status === 'success') {
            const email = data.data;
            document.getElementById('emailDetail').innerHTML = `
                <div class="email-detail-content">
                    <h2>${escapeHtml(email.subject)}</h2>
                    <div class="detail-row">
                        <span class="detail-label">From:</span>
                        <span class="detail-value">${escapeHtml(email.from)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">To:</span>
                        <span class="detail-value">${escapeHtml(email.to.join(', '))}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(email.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="category-badge category-${getCategoryClass(email.aiCategory)}">
                            ${email.aiCategory}
                        </span>
                    </div>
                    <div class="email-body">
                        <strong>Message:</strong><br><br>
                        ${escapeHtml(email.body).replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;

            suggestReplyBtn.dataset.emailId = emailId;
            suggestedReply.classList.remove('visible');
            emailModal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading email detail:', error);
    }
}

// Handle Suggest Reply
async function handleSuggestReply() {
    const emailId = suggestReplyBtn.dataset.emailId;
    if (!emailId) return;

    suggestReplyBtn.disabled = true;
    suggestReplyBtn.textContent = '⏳ Generating...';

    try {
        const response = await fetch(`${API_BASE_URL}/emails/${emailId}/suggest-reply`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.status === 'success') {
            suggestedReply.innerHTML = `
                <h3>✨ AI-Generated Reply (RAG):</h3>
                <pre>${escapeHtml(data.data.suggestedReply)}</pre>
            `;
            suggestedReply.classList.add('visible');
        } else {
            suggestedReply.innerHTML = `
                <h3>❌ Error:</h3>
                <p>${data.message || 'Failed to generate reply'}</p>
            `;
            suggestedReply.classList.add('visible');
        }
    } catch (error) {
        console.error('Error generating reply:', error);
        suggestedReply.innerHTML = `
            <h3>❌ Error:</h3>
            <p>Failed to generate reply. Please try again.</p>
        `;
        suggestedReply.classList.add('visible');
    } finally {
        suggestReplyBtn.disabled = false;
        suggestReplyBtn.textContent = '✨ Suggest Reply (RAG)';
    }
}

// Handle Search
function handleSearch() {
    currentFilters.query = searchInput.value.trim();
    currentPage = 1;
    loadEmails();
}

// Handle Filter Change
function handleFilterChange() {
    currentFilters.accountId = accountFilter.value;
    currentFilters.folder = folderFilter.value;
    currentFilters.category = categoryFilter.value;
    currentPage = 1;
    loadEmails();
}

// Update Pagination
function updatePagination() {
    const totalPages = Math.ceil(totalEmails / pageSize);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Show Loading
function showLoading() {
    emailList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading emails...</p></div>';
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function getCategoryClass(category) {
    return category.toLowerCase().replace(/\s+/g, '-');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh emails every 30 seconds
setInterval(() => {
    loadEmails();
}, 30000);
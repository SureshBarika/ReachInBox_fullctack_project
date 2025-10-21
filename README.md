# ReachInbox AI Email Onebox

A real-time email synchronization platform with AI-powered categorization and RAG-based reply suggestions.

## 🚀 Features

- **Real-Time Email Sync**: IMAP IDLE-based synchronization (no polling)
- **AI Categorization**: Automatic email classification using Gemini API
- **Advanced Search**: Full-text search with Elasticsearch
- **RAG-Powered Replies**: Context-aware reply suggestions using Vector DB
- **Webhook Integration**: Slack notifications and custom webhooks
- **Multi-Account Support**: Manage multiple email accounts simultaneously

## 📋 Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- Gmail accounts with App Passwords enabled
- Gemini API key

## 🔧 Setup Instructions

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd reachinbox-onebox
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- IMAP credentials (Gmail App Passwords)
- Gemini API key
- Slack webhook URL
- Generic webhook URL (use https://webhook.site)

### 4. Start Docker Services
```bash
npm run docker:up
```

Verify services are running:
```bash
docker ps
curl http://localhost:9200
curl http://localhost:6333
```

### 5. Seed Vector Database
```bash
npm run seed:vector
```

### 6. Build and Start Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🏗️ Architecture
````
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ IMAP Servers│────▶│ IMAP Service │────▶│Elasticsearch│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ AI Categorize│
                    │ (Gemini API) │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Webhooks   │
                    │ (Slack, etc) │
                    └──────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  REST API    │────▶│Elasticsearch│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  RAG Service │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Vector DB   │
                    │  (Qdrant)    │
                    └──────────────┘
📡 API Endpoints
Accounts

GET /api/accounts - List all configured accounts

Emails

GET /api/emails - Get all emails (paginated)
GET /api/emails/search - Search emails with filters
GET /api/emails/:id - Get specific email
POST /api/emails/:id/suggest-reply - Generate AI reply

Query Parameters

q - Search query
accountId - Filter by account
folder - Filter by folder (INBOX, Sent)
category - Filter by AI category
from - Pagination offset
size - Results per page

🎯 AI Categories
Emails are automatically categorized into:

Interested: Shows genuine interest in product/service
Meeting Booked: Confirms or schedules a meeting
Not Interested: Declines or shows no interest
Spam: Promotional or irrelevant content
Out of Office: Automatic OOO replies

🔍 Search Examples
bash# Search by keyword
GET /api/emails/search?q=meeting

# Filter by account and category
GET /api/emails/search?accountId=account-1&category=Interested

# Combined search and filter
GET /api/emails/search?q=demo&folder=INBOX&from=0&size=20
🤖 RAG Implementation
The RAG pipeline:

User selects an email and requests a reply
Email content is converted to embedding (Gemini)
Vector search retrieves relevant product knowledge
Context + original email sent to LLM
AI generates contextually-aware reply

🔐 Security Notes

Use Gmail App Passwords (not regular passwords)
Never commit .env file
Restrict API access in production
Use HTTPS for all webhook endpoints

🧪 Testing
Test Real-Time Sync

Send an email to configured account
Watch console logs for "New mail detected"
Verify email appears in frontend within seconds

Test AI Categorization

Send emails with different intents
Check category badges in UI
Verify accuracy of classifications

Test RAG Replies

Select any email in UI
Click "Suggest Reply"
Verify reply uses product knowledge

📊 Monitoring
View logs:
bashtail -f combined.log
tail -f error.log
Check Elasticsearch:
bashcurl http://localhost:9200/emails/_count
Check Qdrant:
bashcurl http://localhost:6333/collections/product_knowledge
````

## 🐛 Troubleshooting

### IMAP Connection Issues
- Verify App Passwords are correct
- Check firewall settings
- Enable "Less secure app access" if needed

### Elasticsearch Not Starting
- Increase Docker memory allocation
- Check Java heap size in docker-compose.yml

### AI Categorization Errors
- Verify Gemini API key is valid
- Check API quota limits
- Review error.log for details

## 📦 Production Deployment

1. Set `NODE_ENV=production`
2. Use environment-specific `.env` files
3. Configure reverse proxy (Nginx)
4. Enable HTTPS
5. Set up log rotation
6. Configure health checks

## 🤝 Contributing

This is an assignment project. No contributions accepted.

## 📄 License

MIT License - See LICENSE file

## 👤 Author

Your Name - Assignment for ReachInbox

## 🎥 Demo Video

[Link to 5-minute demo video showing all features]
````

---

## ✅ CATEGORY 16: Final Setup Commands

### Step 16.1: Complete Installation Script

Create a file `setup.sh`:
````bash
#!/bin/bash

echo "🚀 Setting up ReachInbox AI Email Onebox..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your credentials!"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Seed vector database
echo "🌱 Seeding vector database..."
npm run seed:vector

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Run 'npm run dev' to start the application"
echo "3. Open http://localhost:3000 in your browser"
````

Make it executable:
````bash
chmod +x setup.sh
````

### Step 16.2: Testing Checklist

Create `TESTING.md`:
````markdown
# Testing Checklist

## ✅ Phase 1: Real-Time Sync
- [ ] Docker services running
- [ ] IMAP connections established for both accounts
- [ ] Initial sync completes successfully
- [ ] IDLE mode activated
- [ ] New email detected within 5 seconds
- [ ] Connection maintained for 30+ minutes

## ✅ Phase 2: Elasticsearch
- [ ] Index created successfully
- [ ] Emails indexed immediately after sync
- [ ] Full-text search returns relevant results
- [ ] Filters work correctly (account, folder, category)
- [ ] Pagination functions properly

## ✅ Phase 3: AI Categorization
- [ ] "Interested" emails identified correctly
- [ ] "Meeting Booked" emails tagged properly
- [ ] "Spam" and "Out of Office" categorized
- [ ] Category updates in Elasticsearch
- [ ] Error handling with exponential backoff

## ✅ Phase 4: Webhooks
- [ ] Slack notification sent for "Interested" emails
- [ ] Generic webhook triggered successfully
- [ ] Payload contains all required fields
- [ ] Webhook.site logs visible

## ✅ Phase 5: Frontend
- [ ] Email list displays correctly
- [ ] Search functionality works
- [ ] Filters apply properly
- [ ] Category badges show correct colors
- [ ] Email detail modal opens
- [ ] Auto-refresh every 30 seconds

## ✅ Phase 6: RAG Implementation
- [ ] Vector DB seeded with product knowledge
- [ ] Embeddings generated successfully
- [ ] Vector search returns relevant context
- [ ] AI reply generated with context
- [ ] Reply is contextually accurate
````

---

## 🎯 CATEGORY 17: Quick Start Guide

### Complete Execution Flow
````bash
# 1. Initial Setup
git clone https://github.com/SureshBarika/ReachInBox_fullctack_project.git
cd reachinbox-onebox
npm install

# 2. Configure Environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start Infrastructure
docker-compose up -d

# 4. Seed Vector Database
npm run seed:vector

# 5. Start Application
npm run dev

# 6. Access Application
# Open browser: http://localhost:3000
````

---

## 📌 Summary

This complete implementation includes:

1. ✅ **Docker infrastructure** (Elasticsearch + Qdrant)
2. ✅ **IMAP IDLE** real-time sync (no polling)
3. ✅ **AI categorization** using Gemini API
4. ✅ **Elasticsearch** full-text search
5. ✅ **RAG pipeline** with vector database
6. ✅ **Webhook integrations** (Slack + generic)
7. ✅ **REST API** with Express
8. ✅ **Frontend UI** with search/filter
9. ✅ **Complete documentation**
10. ✅ **Error handling & logging**
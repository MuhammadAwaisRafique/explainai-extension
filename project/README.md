# AI Web Annotator 🧠

Transform your web browsing experience with AI-powered explanations. Highlight any text on the web and get instant, simplified explanations powered by advanced AI models.

## ✨ Features

- **Universal Web Support**: Works on any website - Wikipedia, research papers, news articles, legal documents
- **AI-Powered Explanations**: Get complex concepts explained in simple, everyday language
- **Chrome Extension**: Seamlessly integrated into your browsing experience
- **User Dashboard**: Track your learning progress and manage explanation history
- **Voice Support**: Listen to explanations with text-to-speech
- **Personal Library**: Save and organize your favorite explanations
- **Cross-Device Sync**: Access your history from anywhere

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Chrome browser
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-web-annotator.git
   cd ai-web-annotator
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   
   # Fill in your API keys and database URLs
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration file in your Supabase SQL editor
   - Update your environment variables with Supabase credentials

5. **Start the development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   npm run server
   ```

6. **Load the Chrome extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` folder

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Dashboard**: User statistics and recent explanations
- **History**: Browse and manage all explanations
- **Settings**: User preferences and account management
- **Authentication**: Secure user registration and login

### Backend (Express.js + Node.js)
- **API Routes**: Handle explanation requests and user data
- **AI Integration**: OpenAI GPT for generating explanations
- **Database**: Supabase for user data and explanation storage
- **Security**: Rate limiting and input validation

### Chrome Extension
- **Content Script**: Inject highlight functionality into web pages
- **Background Script**: Handle API communication
- **Popup**: Quick access to stats and settings

## 📱 Usage

1. **Browse any webpage** - Navigate to Wikipedia, research papers, news articles, or any website
2. **Highlight text** - Select difficult words, sentences, or paragraphs
3. **Click "Explain"** - A floating button appears next to your selection
4. **Get AI explanation** - Receive instant, simplified explanations
5. **Additional actions**:
   - 🔊 Listen to explanations with text-to-speech
   - 📋 Copy explanations to clipboard
   - 💾 Save to your personal library

## 🎯 Use Cases

- **Students**: Understand complex academic content
- **Researchers**: Quickly grasp technical papers
- **Non-native speakers**: Comprehend complex English text
- **Professionals**: Decode legal documents and technical specifications
- **Curious learners**: Explore any topic with confidence

## 🔧 Development

### Project Structure
```
ai-web-annotator/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── App.tsx            # Main application
│   └── main.tsx           # Entry point
├── backend/               # Express.js API
│   ├── server.js          # Main server
│   └── package.json       # Backend dependencies
├── extension/             # Chrome extension
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Content script
│   ├── background.js      # Background script
│   └── popup.html         # Extension popup
├── supabase/             # Database migrations
│   └── migrations/        # SQL migration files
└── README.md             # This file
```

### Key Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, Node.js, Supabase
- **AI**: OpenAI GPT-3.5/4, Natural Language Processing
- **Extension**: Chrome Extension APIs, Content Scripts
- **Database**: PostgreSQL (via Supabase)

### API Endpoints

- `POST /api/explain` - Generate AI explanation for text
- `GET /api/history/:userId` - Get user's explanation history
- `DELETE /api/explanation/:id` - Delete specific explanation
- `GET /api/health` - Health check endpoint

## 🛡️ Security

- **Row Level Security**: Database-level access control
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Secure text processing
- **Authentication**: Secure user management with Supabase Auth

## 📊 Features Roadmap

- [ ] Multi-language support
- [ ] Offline explanations
- [ ] PDF annotation support
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app companion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- Supabase for the backend infrastructure
- The open-source community for inspiration and tools

## 📞 Support

For support, email awaiss.rafique@gmail.com or open an issue on GitHub.

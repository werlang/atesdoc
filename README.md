# SUAP Teacher Scraper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A comprehensive web application for generating teaching certificates from SUAP (Sistema Unificado de Administração Pública) data for IFSUL (Instituto Federal Sul-rio-grandense). This tool automates the process of scraping professor data and generating professional teaching documentation through a modern, intuitive 3-step wizard interface.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [User Interface](#-user-interface)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Authors](#-authors)

## ✨ Features

### Core Functionality
- **3-Step Wizard Interface**: Intuitive step-by-step process for generating certificates
- **Professor Search**: Advanced search by name, CPF, or SIAPE with real-time results
- **Semester Management**: Dynamic semester selection with visual feedback
- **Diary Selection**: Interactive table with modern toggle switches for diary selection
- **Document Generation**: Automated generation of teaching certificates and reports
- **Real-time Processing**: WebSocket-based communication for live updates and queue management

### Modern UI/UX
- **Responsive Design**: Mobile-first approach with Material Design 3 principles
- **Beautiful Animations**: Smooth transitions, skeleton loading, and micro-interactions
- **Progress Tracking**: Visual step indicators and floating progress summaries
- **Toast Notifications**: Real-time feedback for user actions
- **Glassmorphism Effects**: Modern UI with backdrop blur and transparency
- **Dark/Light Themes**: Earth-tone color palette with accessibility considerations

### Technical Features
- **Microservices Architecture**: Separate web, API, and scraper services
- **Queue Management**: Efficient task queuing system for handling multiple requests
- **Containerized Deployment**: Docker support for easy setup and scaling
- **Headless Browser**: Puppeteer-based scraping with Chrome integration
- **WebSocket Communication**: Real-time updates and streaming responses
- **State Management**: Centralized state with reactive UI updates

## 🏗 Architecture

The application follows a microservices architecture with three main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Server    │    │   Scraper       │
│   (Express.js)  │◄──►│   (Node.js)     │◄──►│   (Puppeteer)   │
│   Port: 80      │    │   Port: 8080    │    │   Background    │
│                 │    │   WebSocket     │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Browserless   │
                       │   Chrome        │
                       │   Port: 9222    │
                       └─────────────────┘
```

### Components

- **Web**: Frontend application with Webpack, LESS, and modern JavaScript ES6+ modules
- **API**: RESTful API with WebSocket support for real-time communication and queue management
- **Scraper**: Automated data extraction from SUAP using Puppeteer with error recovery
- **Chrome**: Browserless Chrome instance for headless browsing and PDF generation

## 🎨 User Interface

### 3-Step Wizard Process

#### Step 1: Professor Search
- **Search Input**: Real-time search by name, CPF, or SIAPE
- **Professor Cards**: Beautiful cards with avatars, contact information, and selection
- **Skeleton Loading**: Smooth loading animations while searching
- **Error Handling**: Graceful error states with helpful messaging

#### Step 2: Semester & Diary Selection
- **Semester Grid**: Visual checkbox grid for semester selection
- **Interactive Table**: Modern table with toggle switches for individual diary selection
- **Row Highlighting**: Selected rows with visual enhancements and animations
- **Progress Summary**: Floating action card showing selection count and proceed button

#### Step 3: Document Generation
- **Configuration Options**: Final settings and document customization
- **Progress Tracking**: Real-time generation progress with status updates
- **Download Management**: Easy access to generated documents

### Design System

- **Color Palette**: Earth-tone colors inspired by nature
  - Primary: Forest Green (#5b775a)
  - Secondary: Warm Brown (#906442) 
  - Background: Warm Cream (#faf7f4)
- **Typography**: Roboto font family for modern readability
- **Spacing**: Consistent 8px grid system
- **Animations**: Material Design cubic-bezier easing
- **Components**: Modular design with reusable components

## 🔧 Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for local development)
- Valid SUAP credentials
- Internet connection for accessing SUAP

## 🚀 Installation

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/werlang/atesdoc.git
   cd atesdoc
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=production
   SUAP_USERNAME=your_suap_username
   SUAP_PASSWORD=your_suap_password
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost
   - API: http://localhost:8080

### Local Development Setup

1. **Install dependencies for each service**
   ```bash
   # Web frontend
   cd web && npm install && cd ..
   
   # API server
   cd api && npm install && cd ..
   
   # Scraper
   cd scraper && npm install && cd ..
   ```

2. **Configure scraper**
   ```bash
   cd scraper
   cp config.js.example config.js
   # Edit config.js with your professor IDs and semesters
   ```

3. **Start services individually**
   ```bash
   # Terminal 1: Start Chrome (or use Docker)
   docker run -d -p 9222:3000 browserless/chrome:latest
   
   # Terminal 2: Start API
   cd api && npm run development
   
   # Terminal 3: Start Web
   cd web && npm run development
   ```

## ⚙️ Configuration

### Scraper Configuration

Create `scraper/config.js` based on the example:

```javascript
module.exports = {
    semestres: ['2023.2', '2024.1', '2024.2', '2025.1'],
    professores: [
        748,  // Felipe Thomas
        1335, // Pablo Werlang
        { 
            id: 123, 
            semestres: ['2024.1', '2024.2'] 
        },
        { 
            id: 456, 
            exclude: [
                'TEC.1234 - Component to Exclude [100.00 h/150.00 Classes]'
            ] 
        }
    ]
};
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `SUAP_USERNAME` | SUAP login username | - | Yes |
| `SUAP_PASSWORD` | SUAP login password | - | Yes |

## 🖥 Usage

### Web Interface Workflow

1. **Navigate to http://localhost** in your browser
2. **Step 1 - Search Professor**: 
   - Enter professor name, CPF, or SIAPE in the search field
   - Select the desired professor from the results
3. **Step 2 - Select Semesters & Diaries**:
   - Choose which semesters to include
   - Use toggle switches to select/deselect specific diaries
   - Review selection in the progress summary
4. **Step 3 - Generate Documents**:
   - Configure final options
   - Generate and download teaching certificates

### Key UI Features

- **Real-time Search**: Instant results as you type
- **Progress Indicators**: Visual feedback throughout the process
- **Mobile Responsive**: Optimized for all device sizes
- **Accessibility**: Keyboard navigation and screen reader support
- **Error Recovery**: Graceful handling of network issues and errors

## 📖 API Documentation

### WebSocket Communication

The API uses WebSocket for real-time communication. Connect to `ws://localhost:8080`:

#### Professor Search
```javascript
// Search for professors
ws.send(JSON.stringify({
    event: 'get_professors',
    data: { query: 'Pablo' }
}));

// Server responses
{
    status: 'in queue',
    position: 1
}

{
    status: 'processing', 
    position: 0
}

{
    professors: [
        {
            id: 1335,
            name: "Pablo Werlang", 
            cpf: "***.***.***-**",
            siape: "1234567",
            email: "pablo@example.com",
            picture: "base64_image_data"
        }
    ]
}
```

#### Diary/Book Search
```javascript
// Get diaries for selected semesters
ws.send(JSON.stringify({
    event: 'get_books',
    data: { 
        professorId: 1335,
        semesters: ['2024.1', '2024.2']
    }
}));

// Server response
{
    books: [
        {
            semester: "2024.1",
            class: "TEC.123",
            book: "Algoritmos e Programação",
            link: "https://suap.example.com/diary/123"
        }
    ]
}
```

### RESTful Endpoints

- `GET /api/health` - Health check and service status
- `GET /api/semesters` - Get available academic semesters
- `POST /api/generate` - Generate documents from selected data

## 🛠 Development

### Project Structure

```
├── api/                    # API server
│   ├── helpers/           # Utility classes (Queue, WSServer, Router)
│   ├── model/             # Data models (Professor, Semester, Books)
│   └── app.js             # Main API application
├── scraper/               # Standalone scraper service
│   ├── document/          # Generated documents output
│   ├── template/          # HTML templates for documents
│   └── app.js             # Main scraper application
├── web/                   # Frontend application
│   ├── src/               # Source code
│   │   ├── js/            # JavaScript modules and components
│   │   │   ├── components/ # Reusable UI components
│   │   │   ├── modules/   # Feature-specific modules
│   │   │   └── helpers/   # Utility functions
│   │   └── less/          # LESS stylesheets
│   │       ├── components/ # Component styles
│   │       └── modules/   # Module-specific styles
│   ├── view/              # HTML templates (Mustache)
│   └── app.js             # Express server
└── compose.yaml           # Docker composition
```

### Frontend Architecture

#### State Management
```javascript
// Centralized state with reactive updates
state.update({ 
    step: 2, 
    professor: selectedProfessor,
    books: selectedBooks 
});

// Listen for state changes
state.onUpdate((newState) => {
    if (newState.step === 3) {
        renderDocumentGeneration();
    }
});
```

#### Component Pattern
```javascript
// Reusable components
import Form from '../components/form.js';
import Toast from '../components/toast.js';

// Module pattern
export default function(wsserver, state) {
    // Module initialization
}
```

### Development Commands

```bash
# Start development environment
docker-compose up

# Frontend development with hot reload
cd web && npm run development

# API development with nodemon
cd api && npm run development

# Build for production
docker-compose -f compose.prod.yaml up --build

# View logs
docker-compose logs -f [service-name]
```

### Code Style Guidelines

- **ES6+ Modules**: Use import/export syntax consistently
- **Async/Await**: Proper Promise handling with error boundaries
- **Component Architecture**: Modular, reusable components
- **Responsive Design**: Mobile-first CSS with proper breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Performance**: Efficient DOM manipulation and event handling

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Add appropriate comments for complex logic
- Ensure responsive design works on all devices
- Test WebSocket communication thoroughly
- Update documentation for new features

### Issues

Please use the [GitHub Issues](https://github.com/werlang/atesdoc/issues) page to:
- Report bugs with detailed reproduction steps
- Request new features with use case descriptions
- Ask questions about implementation
- Suggest UI/UX improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Felipe Thomas** - *Initial work* - [@felipethomas82](https://github.com/felipethomas82)
- **Pablo Werlang** - *Development and API* - [@werlang](https://github.com/werlang)

## 🙏 Acknowledgments

- IFSUL for providing the SUAP system access
- The open-source community for the tools and libraries used
- Contributors and users who help improve this project
- Material Design team for design inspiration

## 🔮 Future Enhancements

- **Batch Processing**: Multiple professor processing simultaneously
- **Advanced Filtering**: More granular diary selection options
- **Export Formats**: Additional document formats (Excel, CSV)
- **User Preferences**: Saved settings and preferences
- **Analytics Dashboard**: Usage statistics and reporting
- **Multi-language Support**: Portuguese and English interfaces

---

**⚠️ Disclaimer**: This tool is developed for educational and administrative purposes. Please ensure you have proper authorization to access SUAP data and comply with your institution's policies.
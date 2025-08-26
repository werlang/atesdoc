# SUAP Teacher Scraper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A comprehensive web application for generating teaching certificates from SUAP (Sistema Unificado de Administração Pública) data for IFSUL (Instituto Federal Sul-rio-grandense). This tool automates the process of scraping professor data and generating professional teaching documentation.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
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

- **Web Interface**: Modern, responsive frontend for easy interaction
- **Real-time Processing**: WebSocket-based communication for live updates
- **Queue Management**: Efficient task queuing system for handling multiple requests
- **Professor Search**: Advanced search functionality for finding professors in SUAP
- **Document Generation**: Automated generation of teaching certificates and reports
- **Multi-semester Support**: Process data across multiple academic semesters
- **Docker Support**: Containerized deployment for easy setup and scaling
- **Headless Browser**: Puppeteer-based scraping with Chrome integration

## 🏗 Architecture

The application follows a microservices architecture with three main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Server    │    │   Scraper       │
│   (Express.js)  │◄──►│   (Node.js)     │◄──►│   (Puppeteer)   │
│   Port: 80      │    │   Port: 8080    │    │   Background    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Browserless   │
                       │   Chrome        │
                       └─────────────────┘
```

### Components

- **Web**: Frontend application with Webpack, Less, and modern JavaScript
- **API**: RESTful API with WebSocket support for real-time communication
- **Scraper**: Automated data extraction from SUAP using Puppeteer
- **Chrome**: Browserless Chrome instance for headless browsing

## 🔧 Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for local development)
- Valid SUAP credentials
- Internet connection for accessing SUAP

## 🚀 Installation

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/werlang/SUAP-Teacher-Scraper.git
   cd SUAP-Teacher-Scraper
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

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SUAP_USERNAME` | SUAP login username | `user` |
| `SUAP_PASSWORD` | SUAP login password | `password` |

## 🖥 Usage

### Web Interface

1. Navigate to http://localhost in your browser
2. Use the professor search to find professors by name
3. Select semesters and configure options
4. Generate teaching certificates and reports

### API Endpoints

#### WebSocket Events

- **`get_professors`**: Search for professors
  ```javascript
  {
    query: "Professor Name"
  }
  ```

#### RESTful Endpoints

- `GET /api/health` - Health check
- `GET /api/semesters` - Get available semesters
- `POST /api/generate` - Generate documents

### Standalone Scraper

For batch processing, run the scraper directly:

```bash
cd scraper
node app.js
```

Generated documents will be saved in the `scraper/document/` directory.

## 📖 API Documentation

### WebSocket Communication

The API uses WebSocket for real-time communication. Connect to `ws://localhost:8080` and listen for these events:

```javascript
// Client request
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
            department: "TI"
        }
    ]
}
```

## 🛠 Development

### Project Structure

```
├── api/                    # API server
│   ├── helpers/           # Utility classes
│   ├── model/            # Data models
│   ├── scraper/          # Scraping logic
│   └── app.js            # Main API application
├── scraper/              # Standalone scraper
│   ├── document/         # Generated documents
│   ├── template/         # HTML templates
│   └── app.js            # Main scraper application
├── web/                  # Frontend application
│   ├── src/              # Source code
│   │   ├── js/           # JavaScript modules
│   │   └── less/         # Stylesheets
│   ├── view/             # HTML templates
│   └── app.js            # Express server
└── compose.yaml          # Docker composition
```

### Development Commands

```bash
# Start development environment
docker-compose up

# Run tests
npm test

# Build for production
docker-compose -f compose.prod.yaml up --build

# View logs
docker-compose logs -f
```

### Code Style

- Use ES6+ features and modules
- Follow Airbnb JavaScript style guide
- Use meaningful variable and function names
- Add comments for complex logic

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Issues

Please use the [GitHub Issues](https://github.com/werlang/SUAP-Teacher-Scraper/issues) page to:
- Report bugs
- Request features
- Ask questions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Felipe Thomas** - *Initial work* - [@felipethomas82](https://github.com/felipethomas82)
- **Pablo Werlang** - *Development and API* - [@werlang](https://github.com/werlang)

## 🙏 Acknowledgments

- IFRN for providing the SUAP system
- The open-source community for the tools and libraries used
- Contributors and users who help improve this project

---

**⚠️ Disclaimer**: This tool is developed for educational and administrative purposes. Please ensure you have proper authorization to access SUAP data and comply with your institution's policies.
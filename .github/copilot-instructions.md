# SUAP Teacher Scraper - AI Coding Agent Instructions

## Project Overview

This is a **comprehensive 3-service dockerized application** that automates the generation of teaching certificates for IFSUL (Instituto Federal Sul-rio-grandense) professors by scraping data from SUAP (Sistema Unificado de Administração Pública). The system provides a modern web interface with a **3-step wizard workflow** for professor search, semester/diary selection, and automated document generation.

## Architecture Overview

**Microservices Architecture** with containerized deployment:

- **`/web`** - Express.js frontend (port 80/3000) with vanilla JS, LESS, and Mustache templating
- **`/api`** - Node.js WebSocket server (port 8080) managing scraper requests via queue system  
- **`/scraper`** - Standalone Puppeteer scraper service connecting to browserless/chrome container
- **`/compose.yaml`** - Docker Compose orchestration including external chrome container
- **Chrome Container** - Browserless Chrome instance (port 9222) for headless browsing

## User Interface Workflow

### **3-Step Process**:
1. **Professor Search** - Search by name, CPF, or SIAPE with real-time results
2. **Semester & Diary Selection** - Choose semesters and select/deselect specific diaries
3. **Document Generation** - Generate teaching certificates with selected data

### **UI Components**:
- **Progress Indicator**: Visual step tracker showing current progress
- **Professor Cards**: Beautiful cards with avatars, details, and selection buttons
- **Semester Grid**: Checkbox-based semester selection with visual feedback
- **Diary Table**: Interactive table with toggles, semester badges, and external links
- **Progress Summary**: Floating action card with selection count and proceed button

## Critical Development Workflows

### Production Deployment
```bash
docker-compose up -d        # Start all services
# Web: http://localhost (port 80), API WS: ws://localhost:8080
```

### Development Environment
```bash
# Frontend development with hot reload
cd web && npm run development
# Runs webpack dev server (port 80) + nodemon (port 3000) in parallel

# API development
cd api && npm run development
# Runs nodemon with inspector on 0.0.0.0

# Standalone scraper
cd scraper && node app.js
```

### Environment Configuration
```env
NODE_ENV=development|production  # Controls webpack mode and npm scripts
SUAP_USERNAME=your_username      # SUAP authentication
SUAP_PASSWORD=your_password      # SUAP authentication
```

## Project-Specific Patterns

### WebSocket Communication Architecture
- **Client**: `WSClient` class (`web/src/js/helpers/wsclient.js`) with streaming support
- **Server**: `WSServer` class (`api/helpers/wsserver.js`) with method registration
- **Protocol**: JSON messages with `{id, method, payload}` structure
- **Queue Integration**: Real-time position updates during processing
- **Error Handling**: Structured error responses with proper status codes

**Example Implementation:**
```javascript
// Server-side handler
wsserver.on('get_professors', async (payload, reply) => {
    const qid = queue.add({
        data: payload,
        callback: async (payload) => {
            reply({ status: 'processing', position: 0 });
            const professors = await scraper.findProfessor(payload.query);
            reply({ professors });
        }
    });
    reply({ status: 'in queue', position: queue.getPosition(qid) + 1 });
});

// Client streaming
closeStream = await wsserver.stream('get_books', {
    semesters: state.get().semesters,
    professorId: state.get().professor.id,
}, message => {
    if (message.books) {
        renderBookList(message.books);
        state.update({ books: message.books });
    }
});
```

### Frontend Component Architecture
- **Form Management**: `Form` class with validation, data binding, and rule-based validation
- **Component Pattern**: Modular classes for Button, Input, Select, Toast in `/web/src/js/components/`
- **Module Pattern**: Feature-specific logic in `/web/src/js/modules/` (professor-search, semester-select)
- **State Management**: Centralized state with `state.update()` and `state.onUpdate()` patterns
- **Template Integration**: Mustache rendering with `templateRender` middleware

### Design System (Material Design 3 Influenced)
- **Color Palette**: Earth tones with CSS custom properties
  - Primary: `--color-primary: #5b775a` (forest green)
  - Secondary: `--color-secondary: #906442` (warm brown)
  - Background: `--color-background: #faf7f4` (warm cream)
  - Text: `--color-text: #474c54` (charcoal)
- **Elevation**: Layered shadows with hover transforms (`translateY(-1px)`)
- **Border Radius**: Consistent 8px for elements, 12px for cards, 16px for containers
- **Transitions**: Material Design cubic-bezier (`cubic-bezier(0.4, 0, 0.2, 1)`)
- **Typography**: Roboto font family from Google Fonts
- **Icons**: Font Awesome 6 integration

### Interactive UI Elements
- **Toggle Switches**: Modern iOS-style toggles for diary selection
- **Skeleton Loading**: Beautiful shimmer animations for loading states
- **Row Highlighting**: Selected table rows with left border accent and enhanced styling
- **Floating Action Cards**: Sticky progress summaries with glassmorphism effects
- **Toast Notifications**: Real-time feedback for user actions
- **Responsive Design**: Mobile-first approach with proper breakpoints

### Data Flow Patterns
1. **Professor Search Flow**: User input → WebSocket → Queue → Scraper → Real-time updates → Card results
2. **Multi-step Form Flow**: Progress indicators → Section visibility → Data validation → State updates
3. **Diary Selection Flow**: Semester selection → Book fetching → Interactive table → Progress summary
4. **Document Generation**: Selected diaries → Template processing → PDF/HTML output

## Technical Implementation Details

### Puppeteer Scraping System
- **Chrome Connection**: Browserless container at `http://localhost:9222`
- **Authentication**: Automated SUAP login with credential management
- **Data Extraction**: Multi-semester academic schedule parsing
- **Document Generation**: HTML template processing with course data
- **Error Recovery**: Robust error handling for network and parsing issues

### Queue Management System
- **Implementation**: Custom `Queue` class (`api/helpers/queue.js`)
- **Features**: Position tracking, callback management, concurrent request handling
- **Purpose**: Prevents SUAP server overload and provides user feedback
- **Real-time Updates**: WebSocket integration for live queue position updates

### Build System Architecture
- **Webpack Configuration**: 
  - Development: Hot module replacement, source maps
  - Production: Minification (Terser), CSS optimization
- **LESS Processing**: Nested component structure with responsive breakpoints
  - Mobile: `@size-600` (600px)
  - Desktop: `@size-900` (900px)
- **Asset Management**: Font loading, icon integration, image optimization

### Configuration Management
- **Scraper Config**: `scraper/config.js` with professor IDs and semester lists
- **Flexible Professor Handling**: Support for individual semester overrides and exclusions
- **Environment Variables**: Secure credential management via `.env`

**Configuration Example:**
```javascript
module.exports = {
    semestres: ['2023.2', '2024.1', '2024.2', '2025.1'],
    professores: [
        748,  // Simple ID
        { id: 1335, semestres: ['2024.1', '2024.2'] }, // Custom semesters
        { id: 456, exclude: ['TEC.1234 - Component [100h]'] } // Exclusions
    ]
};
```

## Advanced UI Features

### Professor Search Module (`professor-search.js`)
- **Real-time Search**: Instant results as user types
- **Skeleton Cards**: Beautiful loading animations
- **Professor Cards**: Avatar, details, and selection states
- **Error Handling**: Graceful error states with Toast notifications
- **State Integration**: Seamless state management between steps

### Semester Selection Module (`semester-select.js`)
- **Dynamic Semester Generation**: Automatically generates semester list based on current date
- **Visual Selection**: Grid-based semester checkboxes with hover states
- **Diary Table**: Interactive table with modern toggle switches
- **Progress Summary**: Floating action card with real-time selection count
- **Row Highlighting**: Selected rows with visual enhancements

### Modern Table Design
- **Column Structure**: Checkbox → Semester → Class → Component → Link
- **Toggle Switches**: 40px×20px iOS-style toggles with smooth animations
- **Responsive Columns**: Mobile-optimized column widths and hiding
- **Interactive Elements**: Hover states, focus management, accessibility
- **External Links**: Styled link buttons with icons

### State Management Patterns
```javascript
// State updates
state.update({ 
    step: 2, 
    professor: selectedProfessor,
    books: selectedBooks 
});

// State listeners
state.onUpdate((newState) => {
    if (newState.step === 3) {
        renderDocumentGeneration();
    }
});
```

## Development Best Practices

### File Organization Patterns
- **Component JS**: Export default class with DOM manipulation methods
- **Module JS**: Export default function accepting `(wsserver, state)` parameters
- **LESS Styling**: CSS custom properties, nested selectors, responsive mixins
- **HTML Templates**: Mustache with semantic structure and accessibility

### CSS Architecture
- **Component-based**: Each component has its own LESS file
- **Custom Properties**: Consistent color and spacing variables
- **Responsive Design**: Mobile-first with proper breakpoint usage
- **Animation Keyframes**: Shared animations like `fadeInUp`, `skeleton-loading`
- **Modern Features**: CSS `rgb(from var() r g b / alpha)` syntax for color manipulation

### JavaScript Patterns
- **ES6+ Modules**: Use import/export syntax consistently
- **Async/Await**: Proper Promise handling with error boundaries
- **Event Delegation**: Efficient DOM event handling
- **WebSocket Streams**: Real-time communication with cleanup
- **State Reactivity**: Reactive UI updates based on state changes

### Common Development Gotchas
- **Port Configuration**: Web serves on 80 in production, 3000 in development
- **CSS Organization**: Components in `/components/`, modules in `/modules/`
- **WebSocket Lifecycle**: Proper connection management and reconnection logic
- **Queue Processing**: Handle position updates and timeout scenarios
- **SUAP Authentication**: Session management and credential refresh
- **State Synchronization**: Ensure UI reflects current state accurately

### Debugging and Monitoring
- **Docker Logs**: `docker-compose logs -f [service-name]`
- **Node Inspector**: Available on `0.0.0.0` for container debugging
- **Chrome DevTools**: Remote debugging via browserless container
- **WebSocket Monitoring**: Network tab for real-time message inspection
- **State Debugging**: Console logging of state changes and updates

## Key Integration Points

### External Dependencies
- **SUAP System**: Educational management system requiring valid credentials
- **Browserless Chrome**: Headless browser for automated interaction
- **Docker Infrastructure**: Container orchestration and networking

### Security Considerations
- **Credential Storage**: Environment variables, never commit credentials
- **Session Management**: Proper SUAP authentication lifecycle
- **Network Security**: Internal container communication only
- **Data Privacy**: Handle professor data according to institutional policies

## Deployment and Maintenance

### Production Considerations
- **Resource Management**: Chrome container memory usage monitoring
- **Scaling**: Queue system handles concurrent requests efficiently
- **Backup**: Configuration files and generated documents
- **Updates**: Coordinate service updates to maintain compatibility

### Troubleshooting Common Issues
- **Chrome Connection**: Verify browserless container health
- **SUAP Authentication**: Check credentials and session expiry
- **WebSocket Disconnection**: Implement reconnection logic
- **Queue Backlog**: Monitor and clear stalled requests
- **UI State Issues**: Verify state synchronization between modules
- **Mobile Responsive**: Test table interactions on mobile devices
# atesdoc - AI Coding Agent Instructions

## Project Overview

**Atestado de docência** - This is a **comprehensive 2-service dockerized application** that automates the generation of teaching certificates for IFSUL (Instituto Federal Sul-rio-grandense) professors by scraping data from SUAP (Sistema Unificado de Administração Pública). The system provides a modern web interface with a **3-step wizard workflow** for professor search, semester/diary selection, and automated document generation.

## Architecture Overview

**Microservices Architecture** with containerized deployment:

- **`/web`** - Express.js frontend (port 80/3000) with vanilla JS, LESS, and Mustache templating
- **`/api`** - Node.js WebSocket server (port 8080) with integrated Puppeteer scraping functionality and queue management
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

# API development (includes integrated scraper)
cd api && npm run development
# Runs nodemon with inspector on 0.0.0.0
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
- **Color Palette**: Earth tones with CSS custom properties (ALL COLORS MUST USE VARIABLES)
  - Primary: `--color-primary: #5b775a` (forest green)
  - Secondary: `--color-secondary: #906442` (warm brown)
  - Background: `--color-background: #faf7f4` (warm cream)
  - Text: `--color-text: #474c54` (charcoal)
  - White: `--color-white: #ffffff`
  - Black: `--color-black: #000000`
  - Link: `--color-link: #248cd3` (blue)
  - Success: `--color-success: #28a745` (dark green)
  - Error: `--color-error: #dc3545` (dark red)
  - **🚨 NEVER use hardcoded colors - always reference these variables**
  - **For muted/disabled effects**: Use `rgb(from var(--color-text) r g b / opacity)` syntax
  - **For skeleton loading**: Use `rgb(from var(--color-text) r g b / 0.08)` with background color gradients
  - **For light backgrounds**: Use `color-mix(in srgb, var(--color-name) percentage%, var(--color-white))`
  - **For dark variations**: Use `color-mix(in srgb, var(--color-name) percentage%, var(--color-black))`
  - **Color Usage Guidelines**: Use base colors for text/borders, color-mix with white/black for backgrounds
- **Elevation**: Layered shadows with hover transforms (`translateY(-1px)`)
- **Border Radius**: Consistent 8px for elements, 12px for cards, 16px for containers
- **Transitions**: Material Design cubic-bezier (`cubic-bezier(0.4, 0, 0.2, 1)`)
- **Typography**: Roboto font family from Google Fonts
- **Icons**: Font Awesome 6 integration

### Interactive UI Elements
- **Toggle Switches**: Modern iOS-style toggles for diary selection (40px×20px with smooth animations)
- **Skeleton Loading**: Beautiful shimmer animations for loading states with `@keyframes skeleton-loading`
- **Row Highlighting**: Selected table rows with left border accent and enhanced styling
- **Floating Action Cards**: Sticky progress summaries with glassmorphism effects
- **Toast Notifications**: Real-time feedback for user actions with proper positioning
- **Mobile-First Responsive Design**: 
  - Touch-optimized components (minimum 44px touch targets)
  - Mobile layouts stack vertically, desktop layouts use horizontal space
  - Progressive disclosure of complex features
  - Optimized interaction patterns for small screens

### Advanced CSS Techniques
- **CSS Grid Patterns**:
  ```less
  // Mobile-first grid
  .grid-container {
      display: grid;
      grid-template-columns: 1fr; // Single column on mobile
      gap: 12px;
      
      @media @size-600 {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
      }
  }
  ```
- **Flexible Layouts**: Use `auto-fit`, `minmax()`, and `fr` units for adaptive designs
- **Modern CSS Features**: Leverage `rgb(from var() r g b / alpha)` for dynamic colors
- **Animation Performance**: Use `transform` and `opacity` for GPU acceleration
- **Accessibility**: Proper focus states, ARIA labels, and keyboard navigation

### Data Flow Patterns
1. **Professor Search Flow**: User input → WebSocket → Queue → Scraper → Real-time updates → Card results
2. **Multi-step Form Flow**: Progress indicators → Section visibility → Data validation → State updates
3. **Diary Selection Flow**: Semester selection → Book fetching → Interactive table → Progress summary
4. **Document Generation**: Selected diaries → Template processing → PDF/HTML output

## Technical Implementation Details

### Integrated Puppeteer Scraping System
- **Location**: Integrated into API service at `api/helpers/scraper.js`
- **Chrome Connection**: Browserless container at `http://chrome:3000` (internal container communication)
- **Authentication**: Automated SUAP login with credential management
- **Data Extraction**: Multi-semester academic schedule parsing
- **Document Generation**: HTML template processing with course data and PDF generation
- **Error Recovery**: Robust error handling for network and parsing issues with automatic reconnection

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
- **SUAP Config**: `api/suap-config.js` with SUAP system endpoints and selectors
- **Environment Variables**: Secure credential management via `.env` for SUAP authentication
- **Chrome Port Configuration**: Configurable Chrome container connection via `CHROME_PORT` environment variable

**Configuration Example:**
```javascript
// api/suap-config.js
export default {
    baseUrl: 'https://suap.ifsul.edu.br',
    login: {
        url: 'accounts/login/',
        username: '#id_username',
        password: '#id_password',
        submit: '[type="submit"]',
        ready: '.sidebar'
    }
};
```

## Advanced UI Features

### Mobile-First Development Methodology
- **Philosophy**: Design and develop for mobile devices first, then enhance for larger screens
- **Performance Benefits**: Smaller CSS payload for mobile devices, faster loading
- **User Experience**: Ensures core functionality works on all devices
- **Responsive Rule Organization**: Each component has its responsive rules immediately after base styles
- **Progressive Enhancement**: Add features and complexity as screen size increases

### CSS Mobile-First Implementation Pattern
```less
.component {
    // Mobile-first: Base styles for mobile (320px+)
    padding: 14px;
    font-size: 0.9rem;
    flex-direction: column;
    grid-template-columns: 1fr;
    
    // Enhance for tablets (600px+)
    @media @size-600 {
        padding: 16px;
        font-size: 1rem;
        flex-direction: row;
    }
    
    // Enhance for desktop (900px+)
    @media (min-width: 900px) {
        padding: 20px;
        font-size: 1.1rem;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
}
```

### Mobile-First Component Examples
1. **Report Generation Section**: Starts with mobile padding (20px) → tablet (25px) → desktop (30px)
2. **Progress Stats Grid**: Single column mobile → multi-column desktop
3. **Action Buttons**: Full-width mobile → auto-width desktop
4. **Typography**: Smaller mobile fonts → larger desktop fonts
5. **Spacing**: Tighter mobile spacing → more generous desktop spacing

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
- **LESS Styling**: CSS custom properties, nested selectors, mobile-first responsive design
- **HTML Templates**: Mustache with semantic structure and accessibility
- **Responsive Organization**: Each component's responsive rules are co-located with base styles

### LESS File Structure Best Practices
```less
.component {
    // Mobile-first: Base mobile styles
    property: mobile-value;
    
    // Enhance for larger screens immediately after
    @media @size-600 {
        property: tablet-value;
    }
    
    @media (min-width: 900px) {
        property: desktop-value;
    }
    
    .child-element {
        // Mobile-first: Child mobile styles
        child-property: mobile-value;
        
        // Child responsive rules immediately after
        @media @size-600 {
            child-property: tablet-value;
        }
    }
}
```

### CSS Architecture
- **Component-based**: Each component has its own LESS file
- **Custom Properties**: Consistent color and spacing variables
- **🚨 CRITICAL COLOR RULE**: **NEVER use hardcoded colors** - ALL colors must use CSS custom properties (variables)
  - ✅ CORRECT: `color: var(--color-primary)`, `background: rgb(from var(--color-white) r g b / 0.5)`
  - ✅ CORRECT: `background: color-mix(in srgb, var(--color-success) 10%, var(--color-white))`
  - ❌ FORBIDDEN: `color: #5b775a`, `background: rgba(0, 0, 0, 0.1)`, `border: 1px solid red`
  - ❌ FORBIDDEN: Named colors like `white`, `black`, `red`, `green`, `blue`, etc.
  - ❌ FORBIDDEN: Hardcoded hex colors like `#ffffff`, `#000000`, `#28a745`
  - ❌ FORBIDDEN: Direct rgba/rgb values like `rgba(0, 0, 0, 0.5)`, `rgb(255, 255, 255)`
  - Use `rgb(from var(--color-name) r g b / opacity)` for alpha transparency
  - Use `color-mix(in srgb, var(--color-name) percentage%, var(--color-white/black))` for lighter/darker variations
  - For muted/disabled effects: Use `rgb(from var(--color-text) r g b / 0.6)` instead of separate variables
  - For skeleton loading: Use `rgb(from var(--color-text) r g b / 0.08)` for shimmer effects
  - All color values must be defined in `/web/src/less/common.less` as CSS custom properties
- **Mobile-First Responsive Design**: 
  - Start with mobile styles as base (320px+)
  - Progressive enhancement for larger screens
  - Breakpoint usage: `@size-600` (600px) and `@size-900` (900px)
  - Always use `min-width` media queries for enhancement
- **Responsive Rules Organization**: 
  - Place responsive rules immediately after their base styles
  - Use clear comments like `// Mobile-first: Start with mobile styles` and `// Enhance for larger screens`
  - Avoid grouping all responsive rules at the bottom
- **Animation Keyframes**: Shared animations like `fadeInUp`, `skeleton-loading`
- **Modern Features**: CSS `rgb(from var() r g b / alpha)` syntax for color manipulation

### Mobile-First CSS Patterns
```less
// ✅ CORRECT: Mobile-first approach
.component {
    // Mobile-first: Start with mobile styles
    padding: 14px;
    font-size: 1rem;
    grid-template-columns: 1fr;
    
    // Enhance for larger screens
    @media @size-600 {
        padding: 16px;
        font-size: 1.1rem;
    }
    
    @media (min-width: 900px) {
        padding: 20px;
        font-size: 1.2rem;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
}

// ❌ INCORRECT: Desktop-first approach
.component {
    padding: 20px; // Desktop default
    
    @media (max-width: 600px) {
        padding: 14px; // Mobile override
    }
}
```

### Responsive Design Principles
- **Performance**: Mobile-first reduces CSS payload for mobile devices
- **Progressive Enhancement**: Add complexity for devices that can handle it
- **Touch-First**: Design for touch interactions, enhance for mouse
- **Content Priority**: Most important content and actions visible on mobile
- **Flexible Grids**: Use CSS Grid and Flexbox for adaptive layouts
- **Scalable Typography**: Relative units (rem, em) for responsive text

### JavaScript Patterns
- **ES6+ Modules**: Use import/export syntax consistently
- **Async/Await**: Proper Promise handling with error boundaries
- **Event Delegation**: Efficient DOM event handling
- **WebSocket Streams**: Real-time communication with cleanup
- **State Reactivity**: Reactive UI updates based on state changes

### Common Development Gotchas
- **Port Configuration**: Web serves on 80 in production, 3000 in development
- **CSS Organization**: Components in `/components/`, modules in `/modules/`
- **Mobile-First CSS**: Always start with mobile styles, enhance for larger screens
- **Responsive Rule Placement**: Keep responsive rules immediately after base styles
- **Touch Target Sizes**: Minimum 44px for interactive elements on mobile
- **WebSocket Lifecycle**: Proper connection management and reconnection logic
- **Queue Processing**: Handle position updates and timeout scenarios
- **SUAP Authentication**: Session management and credential refresh
- **State Synchronization**: Ensure UI reflects current state accurately
- **Grid Layout Issues**: Test CSS Grid behavior across different screen sizes
- **Performance**: Optimize CSS for mobile-first loading and rendering

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
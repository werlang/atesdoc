/**
 * Professor Attestation Generator Application
 * Modern OOP JavaScript implementation with Material Design
 */

class ProfessorAttestation {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.professorData = {};
        this.selectedSemesters = new Set();
        this.availableDisciplines = [];
        this.selectedDisciplines = new Set();
        this.exclusions = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.generateDefaultSemesters();
        this.updateStepVisibility();
    }

    bindEvents() {
        // Navigation
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevStep());
        document.getElementById('generate-btn').addEventListener('click', () => this.generateAttestation());

        // Form inputs
        document.getElementById('professor-id').addEventListener('input', (e) => {
            this.professorData.id = e.target.value;
            this.updateReview();
        });
        
        document.getElementById('professor-name').addEventListener('input', (e) => {
            this.professorData.name = e.target.value;
            this.updateReview();
        });
        
        document.getElementById('professor-siape').addEventListener('input', (e) => {
            this.professorData.siape = e.target.value;
            this.updateReview();
        });

        // Semester management
        document.getElementById('add-semester').addEventListener('click', () => this.addCustomSemester());

        // Exclusions
        document.getElementById('add-exclusion').addEventListener('click', () => this.addExclusion());

        // Modals
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal('success-modal'));
        document.getElementById('close-error-modal').addEventListener('click', () => this.closeModal('error-modal'));
        document.getElementById('download-btn').addEventListener('click', () => this.downloadAttestation());
    }

    generateDefaultSemesters() {
        const currentYear = new Date().getFullYear();
        const semesters = [];
        
        // Generate last 4 years of semesters
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            semesters.push(`${year}.1`, `${year}.2`);
        }
        
        this.renderSemesters(semesters);
    }

    renderSemesters(semesters) {
        const grid = document.getElementById('semesters-grid');
        grid.innerHTML = '';
        
        semesters.forEach(semester => {
            const semesterCard = this.createSemesterCard(semester);
            grid.appendChild(semesterCard);
        });
    }

    createSemesterCard(semester) {
        const card = document.createElement('div');
        card.className = 'semester-card';
        card.dataset.semester = semester;
        
        const [year, period] = semester.split('.');
        const periodText = period === '1' ? '1º Semestre' : '2º Semestre';
        
        card.innerHTML = `
            <div class="semester-label">${periodText}</div>
            <div class="semester-year">${year}</div>
            <button class="remove-semester" title="Remover semestre">
                <span class="material-icons">close</span>
            </button>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-semester')) {
                this.toggleSemester(semester, card);
            }
        });
        
        card.querySelector('.remove-semester').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSemester(semester, card);
        });
        
        return card;
    }

    toggleSemester(semester, card) {
        if (this.selectedSemesters.has(semester)) {
            this.selectedSemesters.delete(semester);
            card.classList.remove('selected');
        } else {
            this.selectedSemesters.add(semester);
            card.classList.add('selected');
        }
        this.updateReview();
    }

    removeSemester(semester, card) {
        this.selectedSemesters.delete(semester);
        card.remove();
    }

    addCustomSemester() {
        const year = prompt('Digite o ano (ex: 2024):');
        const period = prompt('Digite o período (1 ou 2):');
        
        if (year && (period === '1' || period === '2')) {
            const semester = `${year}.${period}`;
            const existingCard = document.querySelector(`[data-semester="${semester}"]`);
            
            if (!existingCard) {
                const grid = document.getElementById('semesters-grid');
                const card = this.createSemesterCard(semester);
                grid.appendChild(card);
            }
        }
    }

    addExclusion() {
        const exclusionsList = document.getElementById('exclusions-list');
        const exclusionItem = document.createElement('div');
        exclusionItem.className = 'exclusion-item';
        
        exclusionItem.innerHTML = `
            <input type="text" placeholder="Nome completo da disciplina a excluir">
            <button type="button" title="Remover exclusão">
                <span class="material-icons">close</span>
            </button>
        `;
        
        const input = exclusionItem.querySelector('input');
        const removeBtn = exclusionItem.querySelector('button');
        
        input.addEventListener('input', () => this.updateExclusions());
        removeBtn.addEventListener('click', () => {
            exclusionItem.remove();
            this.updateExclusions();
        });
        
        exclusionsList.appendChild(exclusionItem);
        input.focus();
    }

    updateExclusions() {
        const exclusionInputs = document.querySelectorAll('#exclusions-list input');
        this.exclusions = Array.from(exclusionInputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);
        this.updateReview();
    }

    async nextStep() {
        if (this.currentStep === 1) {
            if (!this.validateStep1()) return;
        } else if (this.currentStep === 2) {
            if (!this.validateStep2()) return;
            await this.loadDisciplines();
        }
        
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepVisibility();
            this.updateProgressIndicator();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepVisibility();
            this.updateProgressIndicator();
        }
    }

    validateStep1() {
        const professorId = document.getElementById('professor-id').value.trim();
        if (!professorId) {
            alert('Por favor, insira o ID do professor.');
            return false;
        }
        this.professorData.id = professorId;
        return true;
    }

    validateStep2() {
        if (this.selectedSemesters.size === 0) {
            alert('Por favor, selecione pelo menos um semestre.');
            return false;
        }
        return true;
    }

    updateStepVisibility() {
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step-${this.currentStep}`).classList.add('active');
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const generateBtn = document.getElementById('generate-btn');
        
        prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        nextBtn.style.display = this.currentStep < this.maxSteps ? 'inline-flex' : 'none';
        generateBtn.style.display = this.currentStep === this.maxSteps ? 'inline-flex' : 'none';
    }

    updateProgressIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
                step.querySelector('.step-number').innerHTML = '<span class="material-icons">check</span>';
            } else {
                step.querySelector('.step-number').textContent = stepNumber;
            }
        });
    }

    async loadDisciplines() {
        // Show disciplines card
        document.getElementById('disciplines-card').style.display = 'block';
        document.getElementById('exclusions-card').style.display = 'block';
        
        // In a real implementation, this would make an API call to fetch disciplines
        // For now, we'll simulate with sample data
        this.availableDisciplines = [
            {
                id: 'TEC.3872',
                name: 'Metodologia de Projetos I - Ensino Médio',
                hours: '60.00 h/80.00 Aulas',
                course: 'Técnico em Fabricação Mecânica'
            },
            {
                id: 'TEC.3873',
                name: 'Química - Ensino Médio',
                hours: '45.00 h/60.00 Aulas',
                course: 'Técnico em Fabricação Mecânica'
            },
            {
                id: 'SUP.2095',
                name: 'Fenômenos de Transporte II - Superior - Graduação',
                hours: '45.00 h/60.00 Aulas',
                course: 'Engenharia de Controle e Automação'
            }
        ];
        
        this.renderDisciplines();
    }

    renderDisciplines() {
        const disciplinesList = document.getElementById('disciplines-list');
        disciplinesList.innerHTML = '';
        
        this.availableDisciplines.forEach(discipline => {
            const disciplineItem = document.createElement('div');
            disciplineItem.className = 'discipline-item';
            
            disciplineItem.innerHTML = `
                <input type="checkbox" class="discipline-checkbox" value="${discipline.id}" checked>
                <div class="discipline-info">
                    <div class="discipline-name">${discipline.id} - ${discipline.name}</div>
                    <div class="discipline-details">
                        Curso: ${discipline.course} | Carga: ${discipline.hours}
                    </div>
                </div>
            `;
            
            const checkbox = disciplineItem.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedDisciplines.add(discipline.id);
                } else {
                    this.selectedDisciplines.delete(discipline.id);
                }
            });
            
            // Initially select all disciplines
            this.selectedDisciplines.add(discipline.id);
            
            disciplinesList.appendChild(disciplineItem);
        });
    }

    updateReview() {
        // Update professor info
        document.getElementById('review-professor-id').textContent = this.professorData.id || '-';
        document.getElementById('review-professor-name').textContent = this.professorData.name || 'Será obtido automaticamente';
        document.getElementById('review-professor-siape').textContent = this.professorData.siape || 'Será obtido automaticamente';
        
        // Update selected semesters
        const reviewSemesters = document.getElementById('review-semesters');
        reviewSemesters.innerHTML = '';
        
        Array.from(this.selectedSemesters).sort().forEach(semester => {
            const semesterTag = document.createElement('span');
            semesterTag.className = 'review-semester';
            semesterTag.textContent = semester.replace('.', '/');
            reviewSemesters.appendChild(semesterTag);
        });
        
        // Update exclusions
        const reviewExclusionsSection = document.getElementById('review-exclusions-section');
        const reviewExclusions = document.getElementById('review-exclusions');
        
        if (this.exclusions.length > 0) {
            reviewExclusionsSection.style.display = 'block';
            reviewExclusions.innerHTML = this.exclusions.map(exclusion => 
                `<div class="review-item">
                    <span class="material-icons" style="color: var(--warning-color); margin-right: 8px;">remove_circle</span>
                    ${exclusion}
                </div>`
            ).join('');
        } else {
            reviewExclusionsSection.style.display = 'none';
        }
    }

    async generateAttestation() {
        this.showLoading('Iniciando processo de geração...');
        
        try {
            // Prepare data for the scraper
            const config = {
                professores: [{
                    id: parseInt(this.professorData.id),
                    semestres: Array.from(this.selectedSemesters).sort(),
                    exclude: this.exclusions
                }]
            };
            
            // Send request to backend
            this.updateLoadingMessage('Conectando ao SUAP...');
            const response = await fetch('/api/generate-attestation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            this.updateLoadingMessage('Processando dados...');
            const result = await response.json();
            
            if (result.success) {
                this.hideLoading();
                this.showSuccessModal(result.filename);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showErrorModal(error.message);
        }
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = document.getElementById('loading-message');
        messageEl.textContent = message;
        overlay.classList.add('active');
    }

    updateLoadingMessage(message) {
        document.getElementById('loading-message').textContent = message;
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    showSuccessModal(filename) {
        this.generatedFilename = filename;
        document.getElementById('success-modal').classList.add('active');
    }

    showErrorModal(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    downloadAttestation() {
        if (this.generatedFilename) {
            window.open(`/api/download/${this.generatedFilename}`, '_blank');
        }
    }
}

// Theme manager for future dark mode support
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }
}

// Utility functions
class Utils {
    static formatSemester(semester) {
        return semester.replace('.', '/');
    }

    static validateSemester(semester) {
        const regex = /^\d{4}\.[12]$/;
        return regex.test(semester);
    }

    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="material-icons">
                ${type === 'success' ? 'check_circle' : 
                  type === 'error' ? 'error' : 
                  type === 'warning' ? 'warning' : 'info'}
            </span>
            <span>${message}</span>
            <button class="notification-close">
                <span class="material-icons">close</span>
            </button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ProfessorAttestation();
    const themeManager = new ThemeManager();
    
    // Make app globally available for debugging
    window.app = app;
    window.themeManager = themeManager;
    window.Utils = Utils;
});

// Service Worker registration for PWA capabilities (future enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

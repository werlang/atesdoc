function updateProgressStep(step) {
    const steps = document.querySelectorAll('.progress-indicator .step');
    steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }

        document.querySelectorAll('section.content').forEach((contentEl, index) => {
            contentEl.classList.toggle('active', index + 1 === step);
        });
    });
}

export { updateProgressStep };
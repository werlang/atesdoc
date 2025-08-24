// Toast class: Creates a toast message
// const myToast = new Toast(message, options);
// options
//   - timeOut: time in ms to fade out the toast. if 0, it will not fade out
//   - position: 'center' will center the toast, else it will be aligned to the right
//   - customClass: custom class to add to the toast
// Example:
// const myToast = new Toast('Hello world!', { timeOut: 5000, position: 'center', customClass: 'my-toast' });

export default class Toast {
    constructor(message, type, duration, position, customClass) {
        this.message = message;
        this.duration = duration || 5000;
        this.position = position || 'center';
        this.customClass = customClass;
        this.type = type || 'info';

        this.show();
    }

    // fade out the toast
    // duration: time in ms to fade out the toast
    fade(duration) {
        if (!duration) {
            duration = this.duration;
        }
        // a little bit before the toast is removed, add the fade class
        setTimeout(() => this.element.classList.add('fade'), duration - 1000);
        // remove toast after duration
        setTimeout(() => {
            this.element.remove();

            // remove container if it's empty (no more toasts inside it)
            if (!document.querySelector('#toast-container .toast') && document.querySelector('#toast-container')) {
                document.querySelector('#toast-container').remove();
            }
        }, duration);
    }

    show(message, type, duration, position, customClass) {
        this.message = message || this.message;
        this.duration = duration || this.duration;
        this.type = type || this.type;
        this.position = position || this.position;
        this.customClass = customClass || this.customClass;

        // create container if it doesn't exist
        let container = document.querySelector('#toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.append(container);
        }

        // place toast in the container with the text
        this.element = document.createElement('div');
        this.element.classList.add('toast');
        this.element.innerHTML = this.message;

        container.classList.add(this.position);

        if (this.type) {
            this.element.classList.add(this.type);
        }
        if (this.customClass) {
            this.element.classList.add(this.customClass);
        }

        container.prepend(this.element);

        if (!this.duration) {
            this.duration = 5000;
        }
        if (this.duration > 0) {
            this.fade();
        }
    }

    static info(message, duration, position, customClass) {
        return new Toast(message, 'info', duration, position, customClass);
    }

    static success(message, duration, position, customClass) {
        return new Toast(message, 'success', duration, position, customClass);
    }

    static warning(message, duration, position, customClass) {
        return new Toast(message, 'warning', duration, position, customClass);
    }

    static error(message, duration, position, customClass) {
        return new Toast(message, 'error', duration, position, customClass);
    }
}
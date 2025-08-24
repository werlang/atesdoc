export default class Queue {
    constructor() {
        this.queue = [];
        this.updateCallbacks = [];
        this.running = false;
    }

    add(item) {
        item.id = crypto.randomUUID();
        this.queue.push(item);
        this.process();
        return item.id;
    }

    async process() {
        if (this.running || this.queue.length === 0) {
            return;
        }
        this.running = true;

        const item = this.queue.shift();
        try {
            await item.callback(item.data);
            this.updateCallbacks.forEach(({ id, callback }) => {
                const position = this.getPosition(id);
                if (position !== null) {
                    callback({ position });
                }
            });
        } catch (error) {
            console.error('Error processing queue item:', error);
        } finally {
            this.running = false;
            this.process();
        }
    }

    getSize() {
        return this.queue.length;
    }

    getPosition(id) {
        const position = this.queue.findIndex(item => item.id === id);
        return position !== -1 ? position + 1 : null;
    }

    onUpdate(id, callback) {
        this.updateCallbacks.push({ id, callback });
    }
}
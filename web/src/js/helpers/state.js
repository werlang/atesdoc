import LocalData from "./local-data.js";

export default class StateManager {

    constructor({ key, defaults }={}) {
        this.expires = '2h';
        this.key = key ?? 'app-state';
        this.defaults = defaults ?? {};
        this.localData = new LocalData({
            id: this.key,
            data: this.defaults
        });
        this.state = null;
        this.callbackList = [];
        this.get();
    }

    get() {
        if (!this.state) {
            this.state = this.localData.get();
        }
        return this.state;
    }

    update(data) {
        if (!this.state) {
            this.get();
        }
        this.state = { ...this.state, ...data };
        this.localData.set({ data: this.state, expires: this.expires });
        this.callbackList.forEach(callback => callback(this.state));
    }

    onUpdate(callback) {
        this.callbackList.push(callback);
    }

    clear() {
        this.update(this.defaults);
    }

    alert() {
        this.update({ ...this.get() });
    }
}
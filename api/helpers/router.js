import WSServer from "./wsserver.js";
import Queue from "./queue.js";

export default class Route {
    
    static queue = new Queue();
    static wss = new WSServer();

    constructor(route, handler) {
        this.route = route;
        this.handler = handler;
        this.register();
    }
    
    register() {
        Route.wss.on(this.route, async (payload, reply) => {
            this.queue({
                reply,
                payload,
                callback: this.handler
            });
        });
        return this;
    }

    queue({ reply, payload, callback }) {
        const qid = Route.queue.add({
            data: payload,
            callback: async (payload) => {
                try {
                    // console.log(payload);
                    reply({ status: 'processing', position: 0 });
                    const result = await callback(payload, reply);
                    reply(result);
                }
                catch (error) {
                    console.error('Error in task:', error);
                    reply({ error: error.message || 'An error occurred' });
                }
            }
        });
        reply({ status: 'in queue', position: Route.queue.getPosition(qid) + 1 });
        Route.queue.onUpdate(qid, data => {
            reply({ status: 'in queue', ...data });
        });
    }
}
"use strict";
/**
 * In-memory store replacing SQLite for Vercel serverless.
 * Data lives for the lifetime of the function instance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = void 0;
class InMemoryStore {
    constructor() {
        this.fonts = new Map();
        this.templates = new Map();
        this.generations = [];
    }
}
let store;
function getStore() {
    if (!store) {
        store = new InMemoryStore();
    }
    return store;
}
exports.getStore = getStore;

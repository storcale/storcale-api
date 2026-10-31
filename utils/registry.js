
// Get Cases from SCC, CW, Keystone, etc registries via keystone api

let axios = require("axios");
let url = "https://api.keystone-swords.com/api/cases"

// TODO cache

const CACHE_TTL_MS = 5 * 60 * 1000;      // how long a fetched list stays fresh
const STALE_RETRY_MS = 30 * 1000;        // after a failed refresh, wait before retrying

const cache = { data: null, expires: 0, inflight: null };

async function fetchAllCases(force = false) {
    if (!force && cache.data && Date.now() < cache.expires) return cache.data;
    if (cache.inflight) return cache.inflight;

    cache.inflight = (async () => {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const list = Object.values(response.data)[0];
            if (!Array.isArray(list) || !list.length) {
                throw new Error("Failed to fetch cases from registry");
            }
            cache.data = list;
            cache.expires = Date.now() + CACHE_TTL_MS;
            return list;
        } catch (err) {
            if (cache.data) {
                console.warn("[registry] refresh failed, serving stale cache:", err.message);
                cache.expires = Date.now() + STALE_RETRY_MS;
                return cache.data;
            }
            throw err; // nothing cached, so the caller has to know
        } finally {
            cache.inflight = null;
        }
    })();

    return cache.inflight;
}

/**
 *
 *
 * @class RegistryCase
 */
class RegistryCase {
    active = true
    /**
     * Creates an instance of RegistryCase.
     * @param {string} registry
     * @param {string} userId
     * @param {boolean} active
     * @memberof RegistryCase
     */
    constructor(registry, userId, active = true) {
        this.registry = registry;
        this.userId = userId;
        this.wantActive = active;
    }
    isActive(status) {
        const s = String(status ?? '').toLowerCase();
        const isActive = s.includes('active') && !s.includes('inactive');
        return this.wantActive ? isActive : !isActive;
    }
    async getCases(force = false) {
    let cases = (await fetchAllCases(force)).slice(); // copy so callers can't mutate the cache

    if (this.registry) {
        cases = cases.filter(c => c.source === this.registry);
    }
    if (this.userId) {
        const uid = String(this.userId);
        cases = cases.filter(c => {
            const ids = Array.isArray(c.user_ids)
                ? c.user_ids.map(String)
                : String(c.user_ids ?? '').split(/[,;\s]+/);
            return ids.includes(uid) && this.isActive(c.status);
        });
    }
    return cases;
}


    async getXplt() {
        const cases = await this.getCases();
        return cases.filter(c => c.category === "XPLT" && this.isActive(c.status));
    }
    async getDGN() {
        const cases = await this.getCases();
        return cases.filter(c => c.category === "DGN" && this.isActive(c.status));
    }
}
RegistryCase.clearCache = () => { cache.data = null; cache.expires = 0; cache.inflight = null; };
module.exports = RegistryCase;
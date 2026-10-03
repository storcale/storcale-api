
// Get Cases from SCC, CW, Keystone, etc registries via keystone api

let axios = require("axios");
let url = "https://api.keystone-swords.com/api/cases"

// TODO cache


class RegistryCase {
    active = true
    registry = false
    constructor(registry, userId, active) {
        this.registry = registry;
        this.userId = userId;
        this.active = (registry === "CW" ? (active ? ":green_circle: active" : ":orange_circle: archived") : (active ? "active" : "inactive"))
    }
    async getCases() {
        const response = await axios.get(url);
        let cases = Object.values(response.data)[0];

        if (!cases.length) {
            throw new Error("Failed to fetch cases from registry");
        }

        if (this.registry) {
            cases = cases.filter(c => c.source === this.registry);
        }
        if (this.userId) {
            const userCase = cases.find(c =>
                c.user_ids?.includes(this.userId) &&
                c.status?.toLowerCase() === this.active
            );

            return userCase || false;
        }

        return cases;
    }


    async getXplt() {
        cases = await this.getCases();
        let xpltCases = cases.filter(c => c.category === "XPLT" && c.status?.toLowerCase() === this.active);
        return xpltCases;
    }
    async getDGN() {
        if (!cases) {
            cases = await this.getCases();
        }
        let dgnCases = cases.filter(c => c.category === "DGN" && c.status?.toLowerCase() === this.active);
        return dgnCases;
    }
}
module.exports = RegistryCase;
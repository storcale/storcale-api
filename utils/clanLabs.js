
const axios = require('axios');

/**
 * @param {"User"|"Group"} type
 * @param {string} id
 * @return {Promise<object|false>} blacklist object, or false if not blacklisted
 * @throws if the request fails for any reason other than "not found"
 */
async function getBlacklist(type, id) {
    const response = await axios.get(
        `https://api.clanlabs.co/v2/blacklists/${type}/${id}`,
        {
            headers: {
                Authorization: "Bearer " + process.env.CL_API_KEY,
                "X-Clan-Id": process.env.CL_CLAN_ID,
            },
            // don't throw on 404/204
            validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        }
    );

    if (response.status === 404 || response.status === 204) return false;

    return response.data?.data ?? false;
}

module.exports = getBlacklist;


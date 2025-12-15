import axios from 'axios';
import https from 'https';

export async function fetchChallengeData(credentials: LCUCredentials): Promise<number[]> {
    console.log('fetching challenge data...');
    try {
        const url = `${credentials.protocol}://${credentials.address}:${credentials.port}/lol-challenges/v1/challenges/local-player`;

        const authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

        const response = await axios.get(url, {
            headers: {
                'Authorization': authHeader,
                'User-Agent': 'RiotClient',
                'Content-Type': 'application/json'
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });

        // Challenge-ID 101301 (All Random All Champions)
        const completedIds = response.data['101301']?.completedIds;

        if (!completedIds) {
            throw new Error('Challenge 101301 or completedIds not found in the response.');
        }

        return completedIds;
    } catch (error: any) {
        throw new Error('Failed to fetch challenge data', error);
    }
}

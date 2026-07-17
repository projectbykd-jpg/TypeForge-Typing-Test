/**
 * GitHub API helpers
 * Handle read/write to GitHub repository
 */

const https = require('https');

/**
 * Make GitHub API request
 */
function githubRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}${path}`,
      method: method,
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Day-Group-Panel',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, message: response.message || 'GitHub API error' });
          } else {
            resolve(response);
          }
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Read users.json from GitHub
 */
async function readUsersFile() {
  try {
    const response = await githubRequest('GET', '/contents/database/users.json');
    const content = Buffer.from(response.content, 'base64').toString('utf8');
    return { users: JSON.parse(content).users || [], sha: response.sha };
  } catch (error) {
    // File doesn't exist yet, return empty
    if (error.status === 404) {
      return { users: [], sha: null };
    }
    throw error;
  }
}

/**
 * Write users.json to GitHub
 */
async function writeUsersFile(users, sha = null) {
  const content = Buffer.from(JSON.stringify({ users }, null, 2)).toString('base64');
  const data = {
    message: `🔐 Update user database - ${new Date().toISOString()}`,
    content: content,
    branch: 'main'
  };

  if (sha) {
    data.sha = sha;
  }

  return githubRequest('PUT', '/contents/database/users.json', data);
}

/**
 * Add new user to users.json
 */
async function addUser(username, hashedPassword, email) {
  const { users, sha } = await readUsersFile();

  // Check if user exists
  if (users.find(u => u.username === username)) {
    throw new Error('Username sudah terdaftar');
  }

  const newUser = {
    username,
    password: hashedPassword,
    email,
    createdAt: new Date().toISOString(),
    websites: '',
    telegram: false,
    linktree: false,
    panelz: false
  };

  users.push(newUser);
  await writeUsersFile(users, sha);
  return { username, email, createdAt: newUser.createdAt };
}

/**
 * Find user by username
 */
async function findUser(username) {
  const { users } = await readUsersFile();
  return users.find(u => u.username === username);
}

module.exports = {
  githubRequest,
  readUsersFile,
  writeUsersFile,
  addUser,
  findUser
};

/**
 * API Client
 * Centralized API calls
 */

const API_URL = 'https://day-group-panel.vercel.app/api';

class APIClient {
  static async login(username, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }

  static async register(username, email, password) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    return response.json();
  }

  static getToken() {
    return localStorage.getItem('auth_token');
  }

  static setToken(token) {
    localStorage.setItem('auth_token', token);
  }

  static logout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'index.html';
  }

  static isAuthenticated() {
    return !!this.getToken();
  }
}

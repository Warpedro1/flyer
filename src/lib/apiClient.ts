import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { redirectIfEmailCodeRequired, redirectIfNotAuthenticated } from './emailCodeRedirect.ts';
import { supabase } from './supabase.ts';

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('Missing VITE_API_BASE_URL. Copy .env.example to .env and set values.');
}

export const apiClient = axios.create({
  baseURL: baseURL.replace(/\/$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Do not call signOut() on 401: the FastAPI JWT check can fail (wrong secret, etc.)
    // while the Supabase session is still valid — that would kick the user back to /login
    // after the first API call. Let the UI show the error from the response instead.
    // A password session without the e-mail code goes to the code screen (sessão mantida).
    redirectIfEmailCodeRequired(error, window.location.pathname, (path) => window.location.assign(path));
    // A request sent without any session (it ended between two requests) goes to /login.
    redirectIfNotAuthenticated(error, window.location.pathname, (path) => window.location.assign(path));
    return Promise.reject(error);
  },
);

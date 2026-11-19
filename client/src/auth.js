import axios from "axios";

// ===================================================================
// Session handling
//   • the logged-in user (incl. the JWT `token`) lives in localStorage["user"]
//   • the password is NEVER stored — it only exists in the login form's state
//   • every axios request automatically carries  Authorization: Bearer <token>
// ===================================================================
const KEY = "user";

// Blank user used by the forms (the typed password lives here only while typing)
export const EMPTY_USER = {
  id: "",
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  code: "",
  imageUrl: "",
  role: "",
};

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (_) {
    return null;
  }
}

export function getToken() {
  return getStoredUser()?.token || null;
}

export function saveSession(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

let installed = false;

export function installAuthInterceptor() {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url || "";
      // Expired / invalid token on a normal request → drop the session, go to login.
      // (Wrong credentials on the login endpoints also answer 401: leave those alone.)
      if (status === 401 && getToken() && !url.includes("/login")) {
        clearSession();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
      return Promise.reject(error);
    }
  );
}

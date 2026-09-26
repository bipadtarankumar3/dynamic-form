import secureLocalStorage from "react-secure-storage";

const TOKEN_KEY = "auth_techcsr_token";

const authUtils = {
  saveToken: (token) => {
    secureLocalStorage.setItem(TOKEN_KEY, token);
  },
  getToken: () => {
    const token = secureLocalStorage.getItem(TOKEN_KEY);
    if (token) {
      return token;
    } else {
      return null;
    }
  },
  removeToken: () => {
    secureLocalStorage.removeItem(TOKEN_KEY);
  },
};

export default authUtils;

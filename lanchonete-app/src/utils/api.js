// utils/api.js
export const getApiUrl = () => {
  // Usa variável de ambiente se existir (produção)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Caso contrário, usa o proxy local
  return "";
};

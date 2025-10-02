// src/utils/format.js
export const formatPrice = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
};

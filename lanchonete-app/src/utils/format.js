export const formatPrice = (value) => {
  const number = typeof value === "string" ? parseFloat(value) : value;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

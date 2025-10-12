// server/utils/format.js
function formatPrice(value) {
  const number = typeof value === "string" ? parseFloat(value) : value;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

module.exports = { formatPrice };

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const ws = XLSX.utils.aoa_to_sheet([
  ["ID", "Producto", "Categoría", "Precio Base", "Unidad"],
  ["1", "Patas de Pollo Deshidratadas 500g", "Carnes y Aves", 15.99, "Bolsa"],
  ["2", "Correa Reflectante para Perro", "Accesorios Mascotas", 25.50, "Pieza"]
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Cotizador");

const dir = './public';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(path.join(dir, 'sample.xlsx'), buf);

console.log("sample.xlsx creado en public/");

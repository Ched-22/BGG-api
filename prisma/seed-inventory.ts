import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/** Mirrors BGG-Admin mock inventory (`bggData.js` → `inventoryProducts`). */
const INVENTORY_PRODUCTS = [
  { sku: 'QUI-501', name: 'Shampoo pH neutro 5L', category: 'Químicos', unit: 'L', currentQuantity: 3, maxCapacity: 40, supplier: 'DetailChem BR' },
  { sku: 'ACE-201', name: 'Microfibra premium (pacote 10un)', category: 'Acessórios', unit: 'pct', currentQuantity: 2, maxCapacity: 30, supplier: 'ProFiber' },
  { sku: 'QUI-880', name: 'Cera cerâmica spray 500ml', category: 'Químicos', unit: 'un', currentQuantity: 7, maxCapacity: 48, supplier: 'CarbonLab' },
  { sku: 'PEL-102', name: 'PPF transparente 1,52m × 15m', category: 'Películas', unit: 'rolo', currentQuantity: 1, maxCapacity: 8, supplier: 'ShieldFilm' },
  { sku: 'QUI-340', name: 'Polidor corte — step 1', category: 'Químicos', unit: 'L', currentQuantity: 4, maxCapacity: 25, supplier: 'DetailChem BR' },
  { sku: 'QUI-612', name: 'Revelador cerâmico 1L', category: 'Químicos', unit: 'L', currentQuantity: 2, maxCapacity: 24, supplier: 'CarbonLab' },
  { sku: 'QUI-210', name: 'Desengraxante alcalino 20L', category: 'Químicos', unit: 'L', currentQuantity: 38, maxCapacity: 40, supplier: 'DetailChem BR' },
  { sku: 'ACE-440', name: 'Lixa orbital P3000 (caixa 50)', category: 'Acessórios', unit: 'cx', currentQuantity: 12, maxCapacity: 20, supplier: 'Abrasivos SP' },
  { sku: 'QUI-720', name: 'Couro hidratante 250ml', category: 'Químicos', unit: 'un', currentQuantity: 22, maxCapacity: 36, supplier: 'LeatherCare' },
  { sku: 'ACE-901', name: 'Kit PPF squeegee + faca', category: 'Acessórios', unit: 'kit', currentQuantity: 14, maxCapacity: 18, supplier: 'ShieldFilm' },
  { sku: 'QUI-991', name: 'Vitrificador Carbon Pro 50ml', category: 'Químicos', unit: 'un', currentQuantity: 6, maxCapacity: 32, supplier: 'CarbonLab' },
  { sku: 'QUI-505', name: 'Ósmose / spot remover 500ml', category: 'Químicos', unit: 'un', currentQuantity: 9, maxCapacity: 24, supplier: 'DetailChem BR' },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const product of INVENTORY_PRODUCTS) {
    const existing = await prisma.inventoryProduct.findUnique({
      where: { sku: product.sku },
    });

    const data = {
      name: product.name,
      category: product.category,
      unit: product.unit,
      currentQuantity: product.currentQuantity,
      maxCapacity: product.maxCapacity,
      supplier: product.supplier,
      active: true,
    };

    if (existing) {
      await prisma.inventoryProduct.update({
        where: { sku: product.sku },
        data,
      });
      updated += 1;
    } else {
      await prisma.inventoryProduct.create({
        data: {
          ...data,
          sku: product.sku,
        },
      });
      created += 1;
    }
  }

  const urgent = INVENTORY_PRODUCTS.filter(
    (p) => p.currentQuantity / p.maxCapacity < 0.2,
  ).length;

  console.log(`Seed inventory: ${created} created, ${updated} updated (${INVENTORY_PRODUCTS.length} total).`);
  console.log(`${urgent} produto(s) abaixo de 20% da capacidade (compra urgente na dashboard).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

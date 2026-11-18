/** Formatos devolvidos pelas rotas /api/v1/admin/categories e /products. */
export interface Category { id: number; name: string; sortOrder: number; active: boolean; products: number; updatedDate: string | null; }
export interface Product {
  id: number; name: string; size: string; categoryId: number; categoryName: string;
  referencePrice: number | null; active: boolean; createdDate: string | null; updatedDate: string | null;
}

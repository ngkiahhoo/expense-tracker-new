import type { Category, Type } from "../types/category";
import type { FutureExpenseLibrary } from "../types/futureExpense";

export const bookkeepingTypeId = (id: number) => `bookkeeping-type:${id}`;
export const bookkeepingCategoryId = (id: number) => `bookkeeping-category:${id}`;

/** Read-only bookkeeping references, with legacy amounts and item IDs preserved. */
export function withBookkeepingHierarchy(library: FutureExpenseLibrary, types: Type[], categories: Category[]): FutureExpenseLibrary {
  const stamp = "1970-01-01T00:00:00.000Z";
  const normalize = (name: string) => name.trim().toLocaleLowerCase();
  const next: FutureExpenseLibrary = {
    ...library,
    types: [...library.types.filter(t => !t.id.startsWith("bookkeeping-type:")), ...types.map((t, index) => ({
      id: bookkeepingTypeId(t.id), name: t.name, description: "From bookkeeping", sort_order: index,
      is_active: true, behavior_tag: "MANDATORY" as const, created_at: stamp, updated_at: stamp,
    }))],
    categories: [...library.categories.filter(c => !c.id.startsWith("bookkeeping-category:")), ...categories.filter(c => types.some(t => t.id === c.type_id)).map((c, index) => ({
      id: bookkeepingCategoryId(c.id), type_id: bookkeepingTypeId(c.type_id), name: c.name,
      description: "From bookkeeping", sort_order: index, is_active: true, created_at: stamp, updated_at: stamp,
    }))],
  };
  next.plans = library.plans.map(plan => {
    const items = plan.items.map(item => {
      const oldCategory = library.categories.find(c => c.id === item.category_id);
      const oldType = library.types.find(t => t.id === item.type_id);
      const linked = item.category_id?.startsWith("bookkeeping-category:");
      const matches = categories.filter(c => types.some(t => t.id === c.type_id) && (
        linked ? bookkeepingCategoryId(c.id) === item.category_id :
        item.source_category_id ? String(c.id) === item.source_category_id :
        oldCategory && oldType && normalize(c.name) === normalize(oldCategory.name) &&
          normalize(types.find(t => t.id === c.type_id)!.name) === normalize(oldType.name)
      ));
      const category = matches.length === 1 ? matches[0] : undefined;
      return { ...item, category_id: category ? bookkeepingCategoryId(category.id) : null,
        type_id: category ? bookkeepingTypeId(category.type_id) : types.some(t => bookkeepingTypeId(t.id) === item.type_id) ? item.type_id : null };
    });
    return { ...plan, items, confirmed: JSON.stringify(items) === JSON.stringify(plan.items) ? plan.confirmed : false };
  });
  // Stale mapping suggestions must not point to removed bookkeeping records.
  next.mappings = library.mappings.filter(m => next.categories.some(c => c.id === m.future_category_id && c.type_id === m.future_type_id));
  return next;
}

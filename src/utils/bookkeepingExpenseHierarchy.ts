import type { Category, Type } from "../types/category";
import type { FutureExpenseLibrary } from "../types/futureExpense";

export const bookkeepingTypeId = (id: number) => `bookkeeping-type:${id}`;
export const bookkeepingCategoryId = (id: number) => `bookkeeping-category:${id}`;

const nameKey = (name: string) => name.trim().toLocaleLowerCase().replace(/s$/, "");

/** The bookkeeping hierarchy is a display layer and must never be written to the plan workspace. */
export function withoutBookkeepingHierarchy(library: FutureExpenseLibrary): FutureExpenseLibrary {
  return {
    ...library,
    types: library.types.filter(type => !type.id.startsWith("bookkeeping-type:")),
    categories: library.categories.filter(category => !category.id.startsWith("bookkeeping-category:")),
  };
}

/** Removes legacy copies once an equivalent bookkeeping type/category exists. */
export function reconcileBookkeepingDuplicates(library: FutureExpenseLibrary, types: Type[], categories: Category[]): FutureExpenseLibrary {
  const bookkeepingTypes = new Map(types.map(type => [nameKey(type.name), type]));
  const typeMap = new Map<string, string>();
  const keptTypeNames = new Map<string, string>();
  for (const type of library.types) {
    const bookkeeping = bookkeepingTypes.get(nameKey(type.name));
    if (bookkeeping) typeMap.set(type.id, bookkeepingTypeId(bookkeeping.id));
    else {
      const key = nameKey(type.name);
      const existing = keptTypeNames.get(key);
      if (existing) typeMap.set(type.id, existing);
      else { keptTypeNames.set(key, type.id); typeMap.set(type.id, type.id); }
    }
  }
  const bookkeepingCategories = new Map(categories.map(category => [
    `${bookkeepingTypeId(category.type_id)}:${nameKey(category.name)}`, category,
  ]));
  const categoryMap = new Map<string, string>();
  const keptCategoryNames = new Map<string, string>();
  for (const category of library.categories) {
    const typeId = typeMap.get(category.type_id) ?? category.type_id;
    const bookkeeping = bookkeepingCategories.get(`${typeId}:${nameKey(category.name)}`);
    if (bookkeeping) categoryMap.set(category.id, bookkeepingCategoryId(bookkeeping.id));
    else {
      const key = `${typeId}:${nameKey(category.name)}`;
      const existing = keptCategoryNames.get(key);
      if (existing) categoryMap.set(category.id, existing);
      else { keptCategoryNames.set(key, category.id); categoryMap.set(category.id, category.id); }
    }
  }
  const next = structuredClone(library);
  next.types = next.types.filter(type => typeMap.get(type.id) === type.id);
  next.categories = next.categories
    .filter(category => categoryMap.get(category.id) === category.id)
    .map(category => ({ ...category, type_id: typeMap.get(category.type_id) ?? category.type_id }));
  next.plans = next.plans.map(plan => ({
    ...plan,
    confirmed: false,
    items: plan.items.map(item => ({
      ...item,
      type_id: item.type_id ? typeMap.get(item.type_id) ?? item.type_id : null,
      category_id: item.category_id ? categoryMap.get(item.category_id) ?? item.category_id : null,
    })),
  }));
  next.mappings = next.mappings.map(mapping => ({
    ...mapping,
    future_type_id: typeMap.get(mapping.future_type_id) ?? mapping.future_type_id,
    future_category_id: categoryMap.get(mapping.future_category_id) ?? mapping.future_category_id,
  })).filter(mapping =>
    mapping.future_type_id.startsWith("bookkeeping-type:") || next.types.some(type => type.id === mapping.future_type_id),
  );
  return next;
}

/** Read-only bookkeeping references, with legacy amounts and item IDs preserved. */
export function withBookkeepingHierarchy(library: FutureExpenseLibrary, types: Type[], categories: Category[]): FutureExpenseLibrary {
  const stamp = "1970-01-01T00:00:00.000Z";
  const normalize = (name: string) => nameKey(name);
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

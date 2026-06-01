export function confirmDelete(message = "确定要删除吗？此操作无法撤销。") {
  if (typeof window === "undefined") return false;
  try {
    return window.confirm(message);
  } catch {
    return false;
  }
}

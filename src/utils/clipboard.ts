import { logServiceError } from "@/utils/logger";

function removeNode(node:HTMLElement) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

export async function copyTextToClipboard(text:string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      logServiceError("clipboard.writeText failed", error);
    }
  }

  try {
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.textContent = text;
    div.style.position = "fixed";
    div.style.left = "0";
    div.style.top = "0";
    div.style.zIndex = "-9999";
    div.style.opacity = "0";
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    div.focus();

    const ok = document.execCommand("copy");
    removeNode(div);

    if (ok) {
      return true;
    }
  } catch (error) {
    logServiceError("contenteditable copy failed", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "0";
    textarea.style.top = "0";
    textarea.style.zIndex = "-9999";
    textarea.style.opacity = "0";
    textarea.style.fontSize = "16px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    const ok = document.execCommand("copy");
    removeNode(textarea);

    if (ok) {
      return true;
    }
  } catch (error) {
    logServiceError("textarea copy failed", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "0";
    textarea.style.top = "0";
    textarea.style.zIndex = "-9999";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const ok = document.execCommand("copy");
    removeNode(textarea);

    if (ok) {
      return true;
    }
  } catch (error) {
    logServiceError("select copy failed", error);
  }

  return false;
}

/****
 * Escapes a string for safe insertion into HTML (against XSS).
 * @param {string} str - The string to escape.
 * @returns {string} The escaped HTML string.
 */
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * A set containing the IDs of elements that are locked.
 * @type {Set<string|number>}
 */
let lockedElems = new Set();

/**
 * ID of the element currently being dragged, or null if none.
 * @type {string|null}
 */
let dragElemId = null;

/**
 * Counter to generate unique element IDs.
 * @type {number}
 */
let uniqueElemIdCounter = 0;

/**
 * Shows a notification message to the user.
 * @param {string} msg - The message to display.
 */
function showNotif(msg) {
    let n = document.getElementById('notif');
    n.textContent = msg;
    n.style.display = 'block';
    n.style.opacity = 0.96;
    setTimeout(() => { n.style.opacity = 0 }, 1400);
    setTimeout(() => { n.style.display = 'none' }, 1700);
}

/**
 * Keyboard shortcut and event handler for undo/redo/copy/paste/delete actions.
 * @param {KeyboardEvent} e - The keydown event.
 */
window.addEventListener('keydown', function (e) {
    let a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
    if (e.ctrlKey && e.key === 'z') { undoAction(); e.preventDefault(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { redoAction(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'c') { doCopy(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'v') { doPaste(); e.preventDefault(); }
    if ((e.key === 'Delete' || e.key === 'Backspace')) {
        deleteSelected();
        e.preventDefault();
    }
});

/**
 * Selects the element with the given ID,
 * updates the selection, renders changes and updates the properties form UI.
 * @param {string|number} id - The ID of the element to select.
 */
function selectElem(id) {
    selectedElemId = id;
    render();
    updatePropsForm();
}

/**
 * Sets the drag behavior for tool palette items.
 */
[...document.querySelectorAll('.tool')].forEach(t => {
    t.ondragstart = function (e) {
        e.dataTransfer.setData('type', t.dataset.type);
    }
});

/**
 * Handles mouse down outside of context menu to hide it.
 * @param {MouseEvent} e - The mouse down event.
 */
document.addEventListener('mousedown', function (e) {
    const ctxMenus = [,
        document.getElementById('ctxMenuLocked'),
        document.getElementById('ctxMenuUnlocked')
    ];
    if (!ctxMenus.some(menu => menu.contains(e.target))) {
        hideCtxMenu();
    }
})

/**
 * Returns true if the element or any of its ancestors are locked.
 * @param {string|number} elemId - The element ID to check.
 * @returns {boolean}
 */
function isElemLockedOrAncestorLocked(elemId) {
    let curr = elemId;
    while (curr) {
        if (lockedElems.has(curr)) return true;
        curr = findParent(layout, curr)?.id;
    }
    return false;
}

/**
 * Gets the topmost ancestor (including itself) of an element that is locked.
 * @param {string|number} elemId - The element ID.
 * @returns {string|number|null} The ID of the topmost locked ancestor, or null if none.
 */
function getTopmostLockedAncestor(elemId) {
    let curr = elemId;
    let lastLocked = null;
    while (curr) {
        if (lockedElems.has(curr)) lastLocked = curr;
        curr = findParent(layout, curr)?.id;
    }
    return lastLocked;
}

// --- Startup

/**
 * Initializes and renders the main layout on startup.
 */
render();

/**
 * Handles click in mockup-area; deselects and updates UI, blocks following anchor links.
 */
document.getElementById("mockup-area").addEventListener("click", function (e) {
    const link = e.target.closest("a");
    if (link) {
        e.preventDefault();
    }
    selectedElemId = null;
    render();
    updatePropsForm();
});

/**
 * Initializes application state: stores the initial UI state in history.
 */
pushHistory();

/**
 * Updates the state of undo and redo buttons in the UI.
 */
updateUndoRedoBtns();

/**
 * Renders the CSS class editor UI.
 */
renderClassEditor();

// ... rest of code ...

/**
 * Displays the context menu for an unlocked element at given position and sets it as selected.
 * @param {number} x - The x coordinate to position the menu.
 * @param {number} y - The y coordinate to position the menu.
 * @param {string} elemId - The id of the element to select.
 */
function showCtxMenuUnlocked(x, y, elemId) {
    let menu = document.getElementById('ctxMenuUnlocked');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    selectedElemId = elemId;
    render();
}

/**
 * Displays the context menu for a locked element at given position and sets it as selected.
 * @param {number} x - The x coordinate to position the menu.
 * @param {number} y - The y coordinate to position the menu.
 * @param {string} elemId - The id of the element to select.
 */
function showCtxMenuLocked(x, y, elemId) {
    let menu = document.getElementById('ctxMenuLocked');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    selectedElemId = elemId;
    render();
}

/**
 * Hides both locked and unlocked context menus.
 */
function hideCtxMenu() {
    document.getElementById('ctxMenuLocked').style.display = 'none';
    document.getElementById('ctxMenuUnlocked').style.display = 'none';
}

/**
 * Locks the currently selected element and hides the context menu.
 * Does nothing if no element is selected.
 */
function lockSelected() {
    if (!selectedElemId) return;
    pushHistory();
    if (!lockedElems.has(selectedElemId)) lockedElems.add(selectedElemId);
    render();
    hideCtxMenu();
}

/**
 * Unlocks the currently selected element and hides the context menu.
 * Does nothing if no element is selected.
 */
function unlockSelected() {
    if (!selectedElemId) return;
    pushHistory();
    if (lockedElems.has(selectedElemId)) lockedElems.delete(selectedElemId);
    render();
    hideCtxMenu();
}

/**
 * Deletes the currently selected element, resets selection if layout root is deleted,
 * updates the UI, and hides the context menu. Does nothing if no element is selected.
 */
function deleteSelected() {
    if (!selectedElemId) return;
    pushHistory();
    removeElem(layout, selectedElemId);
    if (layout.id == selectedElemId) { layout = { id: 'root', type: 'container', children: [], props: {} }; }
    selectedElemId = null;
    render();
    updatePropsForm();
    hideCtxMenu();
}
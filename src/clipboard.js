/**
 * Stores the last copied/cut element in-memory for paste operations.
 * @type {object|null}
 */
let clipboardElem = null;

/**
 * Deep clones a layout element/object, generating new unique IDs for all nodes.
 * @param {object} obj - The element or object to clone.
 * @returns {object} The cloned element with new IDs.
 */
function cloneElem(obj) {
    let newObj = JSON.parse(JSON.stringify(obj));
    function assignNewIds(o) {
        o.id = generateUniqueElemId();
        if (o.children) o.children.forEach(assignNewIds);
    }
    assignNewIds(newObj);
    return newObj;
}

/**
 * Copies the currently selected element to the clipboard variable, if valid.
 */
function doCopy() {
    hideCtxMenu();
    if (!selectedElemId || selectedElemId === 'root') { showNotif('Select something to copy!'); return; }
    let elem = findElem(layout, selectedElemId);
    if (!elem) return;
    clipboardElem = JSON.parse(JSON.stringify(elem));
    showNotif('Copied!');
}

/**
 * Pastes the last copied/cut element as a sibling after the current selection.
 */
function doPaste() {
    hideCtxMenu();
    if (!clipboardElem) { showNotif('Clipboard empty'); return; }
    if (!selectedElemId) { showNotif('Select parent!'); return; }
    let parent = findParent(layout, selectedElemId);
    if (!parent || selectedElemId === 'root') parent = layout;
    let idx = parent.children.findIndex(c => c.id === selectedElemId);
    let newElemObj = cloneElem(clipboardElem);
    pushHistory();
    parent.children.splice(idx + 1, 0, newElemObj);
    selectedElemId = newElemObj.id;
    render();
    updatePropsForm();
    showNotif('Pasted!');
}
let historyStack = [];
let futureStack = [];

/**
 * Saves the current UI state into the undo history stack and trims history if needed.
 */
function pushHistory() {
    historyStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems), { ...classStyles }, selectedClassName]));
    if (historyStack.length > 64) historyStack = historyStack.slice(-64);
    futureStack = [];
    updateUndoRedoBtns();
}

/**
 * Undoes the most recent action, restoring previous layout, selection, locks, and styles.
 */
function undoAction() {
    if (!historyStack.length) return;
    futureStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems), { ...classStyles }, selectedClassName]));
    let prev = historyStack.pop();
    let [lay, sel, locks, classes, selClass] = JSON.parse(prev);
    layout = lay;
    selectedElemId = sel;
    lockedElems = new Set(locks);
    classStyles = classes || {};
    selectedClassName = selClass || null;
    render();
    updatePropsForm();
    updateUndoRedoBtns();
    renderClassEditor();
    showNotif('Undo');
}

/**
 * Redoes the most recently undone action (reverses undoAction).
 */
function redoAction() {
    if (!futureStack.length) return;
    historyStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems), { ...classStyles }, selectedClassName]));
    let next = futureStack.pop();
    let [lay, sel, locks, classes, selClass] = JSON.parse(next);
    layout = lay;
    selectedElemId = sel;
    lockedElems = new Set(locks);
    classStyles = classes || {};
    selectedClassName = selClass || null;
    render();
    updatePropsForm();
    updateUndoRedoBtns();
    renderClassEditor();
    showNotif('Redo');
}

function updateUndoRedoBtns() {
    document.getElementById('undoBtn').disabled = !historyStack.length;
    document.getElementById('redoBtn').disabled = !futureStack.length;
}
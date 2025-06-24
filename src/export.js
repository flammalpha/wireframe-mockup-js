/**
 * Exports the current layout structure as JSON and copies it to the clipboard.
 */
function exportLayout() {
    let json = JSON.stringify(layout, null, 2);
    navigator.clipboard.writeText(json);
    showNotif('Exported (copied to clipboard)');
}

/**
 * Displays the import box UI for the user to paste JSON to import a layout.
 */
function showImportBox() {
    document.getElementById('importBox').style.display = 'inline-block';
    document.getElementById('importApply').style.display = 'inline-block';
}

// Handle applying a pasted import layout
/**
 * Handles the click event for importing a layout from JSON.
 * Updates the UI, layout, and internal state accordingly.
 */
document.getElementById('importApply').onclick = function () {
    let txt = document.getElementById('importBox').value;
    try {
        let obj = JSON.parse(txt);
        pushHistory();
        layout = obj; selectedElemId = null; lockedElems = new Set(); render(); updatePropsForm();
        document.getElementById('importBox').style.display = 'none';
        document.getElementById('importApply').style.display = 'none';
        showNotif('Imported!');
    } catch (e) { showNotif('Invalid JSON!'); }
}

/**
 * Handles Escape key to hide import UI.
 */
document.getElementById('importBox').addEventListener('keydown', function (ev) {
    if (ev.key === "Escape") { this.style.display = 'none'; document.getElementById('importApply').style.display = 'none'; }
})


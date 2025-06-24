let layout = { id: 'root', type: 'container', children: [], props: { style: 'min-height:80vh;' } };
let selectedElemId = null;
let lockedElems = new Set();
let dragElemId = null;

// --- History Stacks ---
let historyStack = [];
let futureStack = [];
function pushHistory() {
    historyStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems)]));
    if (historyStack.length > 64) historyStack = historyStack.slice(-64); // Limit history
    futureStack = [];
    updateUndoRedoBtns();
}
function undoAction() {
    if (!historyStack.length) return;
    futureStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems)]));
    let prev = historyStack.pop();
    let [lay, sel, locks] = JSON.parse(prev);
    layout = lay;
    selectedElemId = sel;
    lockedElems = new Set(locks);
    render();
    updatePropsForm();
    updateUndoRedoBtns();
    showNotif('Undo');
}
function redoAction() {
    if (!futureStack.length) return;
    historyStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems)]));
    let next = futureStack.pop();
    let [lay, sel, locks] = JSON.parse(next);
    layout = lay;
    selectedElemId = sel;
    lockedElems = new Set(locks);
    render();
    updatePropsForm();
    updateUndoRedoBtns();
    showNotif('Redo');
}
function updateUndoRedoBtns() {
    document.getElementById('undoBtn').disabled = !historyStack.length;
    document.getElementById('redoBtn').disabled = !futureStack.length;
}

function showNotif(msg) {
    let n = document.getElementById('notif');
    n.textContent = msg;
    n.style.display = 'block';
    n.style.opacity = 0.96;
    setTimeout(() => { n.style.opacity = 0 }, 1400);
    setTimeout(() => { n.style.display = 'none' }, 1700);
}

// --- Copy/Paste ---
let clipboardElem = null;
window.addEventListener('keydown', function (e) {
    // Only work if not editing a text input
    let a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
    if (e.ctrlKey && e.key === 'z') { undoAction(); e.preventDefault(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { redoAction(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'c') { doCopy(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'v') { doPaste(); e.preventDefault(); }
});
function cloneElem(obj) {
    // deep clone but new unique id!
    let newObj = JSON.parse(JSON.stringify(obj));
    function assignNewIds(o) {
        o.id = 'e' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        if (o.children) o.children.forEach(assignNewIds);
    }
    assignNewIds(newObj);
    return newObj;
}
function doCopy() {
    if (!selectedElemId || selectedElemId === 'root') { showNotif('Select something to copy!'); return; }
    let elem = findElem(layout, selectedElemId);
    if (!elem) return;
    clipboardElem = JSON.parse(JSON.stringify(elem));
    showNotif('Copied!');
}
function doPaste() {
    if (!clipboardElem) { showNotif('Clipboard empty'); return; }
    if (!selectedElemId) { showNotif('Select parent!'); return; }
    let parent = findParent(layout, selectedElemId);
    // If root or not found, paste at root
    if (!parent || selectedElemId === 'root') parent = layout;
    let idx = parent.children.findIndex(c => c.id === selectedElemId);
    // Deep clone with new ids
    let newElemObj = cloneElem(clipboardElem);
    pushHistory();
    parent.children.splice(idx + 1, 0, newElemObj);
    selectedElemId = newElemObj.id;
    render();
    updatePropsForm();
    showNotif('Pasted!');
}

// -- Render wireframe --
function render() {
    let area = document.getElementById('mockup-area');
    area.innerHTML = '';
    renderElem(layout, area);
}
function renderElem(obj, parent) {
    let elem;
    if (obj.type === 'container' || obj.id === 'root') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.style.position = 'relative';
        elem.innerHTML = (obj.id === 'root') ? '<b style="font-size:20px;color:#bbb;">(Root Layout)</b>'
            : '<span style="color:#888;">Container</span>';
        if (obj.props && obj.props.style) elem.setAttribute('style', obj.props.style + ';position:relative;');
    } else if (obj.type === 'text') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Text';
    } else if (obj.type === 'button') {
        elem = document.createElement('button');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Button';
    } else if (obj.type === 'img') {
        elem = document.createElement('img');
        elem.className = 'wire-elem';
        elem.src = obj.props?.src || 'https://via.placeholder.com/80x40';
        elem.style.width = '80px'; elem.style.height = '40px';
    } else if (obj.type === 'link') {
        elem = document.createElement('a');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Link';
        elem.href = obj.props?.href || '#';
        elem.style.textDecoration = 'underline';
        elem.target = '_blank';
    }

    elem.dataset.id = obj.id;
    if (obj.id === selectedElemId) elem.classList.add('selected');
    let locked = isElemLockedOrAncestorLocked(obj.id);
    if (locked) elem.style.opacity = '0.4';

    // Drag logic
    elem.setAttribute('draggable', locked ? 'false' : 'true');
    elem.ondragstart = (e) => {
        dragElemId = obj.id;
        e.stopPropagation();
    };
    elem.ondragover = e => e.preventDefault();
    elem.ondrop = e => handleDrop(e, obj);

    // Selection
    elem.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const topLocked = getTopmostLockedAncestor(obj.id);
        if (topLocked) {
            selectElem(topLocked);
        } else {
            selectElem(obj.id);
        }
    };
    // Context menu on right-click
    elem.oncontextmenu = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const topLocked = getTopmostLockedAncestor(obj.id);
        if (topLocked)
            showCtxMenuLocked(e.pageX, e.pageY, topLocked);
        else
            showCtxMenuUnlocked(e.pageX, e.pageY, obj.id);
    }

    // Recursion for containers
    if ((obj.type === 'container' || obj.id === 'root') && obj.children) {
        for (let child of obj.children) {
            renderElem(child, elem);
        }
        elem.ondragover = e => e.preventDefault();
        elem.ondrop = (e) => handleDrop(e, obj);
    }
    parent.appendChild(elem);
}
function moveElem(childId, newParentId) {
    if (childId === newParentId) return;
    let child = removeElem(layout, childId);
    let parent = findElem(layout, newParentId);
    if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
    }
    render();
}

// Remove an element by id from layout and return it
function removeElem(obj, childId) {
    if (!obj.children) return null;
    let idx = obj.children.findIndex(c => c.id === childId);
    if (idx !== -1) {
        return obj.children.splice(idx, 1)[0];
    }
    for (let c of obj.children) {
        let res = removeElem(c, childId);
        if (res) return res;
    }
    return null;
}
function newElem(type) {
    let id = 'e' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    let base = {
        id, type, props: {},
        children: []
    };
    if (type === 'container') base.props.style = "min-height:50px;min-width:100px;";
    if (type === 'text') base.props.text = "Text";
    if (type === 'button') base.props.text = "Button";
    if (type === 'img') base.props.src = "https://via.placeholder.com/80x40";
    if (type === 'link') { base.props.text = "Link"; base.props.href = "#"; }
    return base;
}

// Returns parent of node with id
function findParent(obj, id, parent = null) {
    if (obj.id === id) return parent;
    if (!obj.children) return null;
    for (let c of obj.children) {
        let res = findParent(c, id, obj);
        if (res) return res;
    }
    return null;
}
function findElem(obj, id) {
    if (obj.id === id) return obj;
    if (!obj.children) return null;
    for (let c of obj.children) {
        let res = findElem(c, id);
        if (res) return res;
    }
    return null;
}
function selectElem(id) {
    selectedElemId = id;
    render();
    updatePropsForm();
}
function handleDrop(e, obj) {
    e.preventDefault();
    e.stopPropagation();
    if (isElemLockedOrAncestorLocked(obj.id)) return;

    let type = e.dataTransfer.getData("type");
    let isToolbox = !!type;
    if (isToolbox) {
        let el = newElem(type);
        pushHistory();
        obj.children.push(el);
        render();
        updatePropsForm();
    }
    // For dragging existing elements
    else if (dragElemId && dragElemId !== obj.id) {
        pushHistory();
        moveElem(dragElemId, obj.id);
        render();
        updatePropsForm();
    }
}
[...document.querySelectorAll('.tool')].forEach(t => {
    t.ondragstart = function (e) {
        e.dataTransfer.setData('type', t.dataset.type);
    }
});

// --- PROPERTIES ---
function getBreadcrumbPath(elementId) {
    let path = [];
    let currentId = elementId;
    while (currentId) {
        let obj = findElem(layout, currentId);
        if (!obj) break;
        let label = (obj.id === 'root') ? 'Root' : (obj.type.charAt(0).toUpperCase() + obj.type.slice(1));
        path.unshift(label);
        currentId = findParent(layout, currentId)?.id;
    }
    return path.join(' > ');
}
function styleStringToObj(styleStr = '') {
    const st = {};
    styleStr.split(';').forEach(rule => {
        let [k, v] = rule.split(':');
        if (k && v) st[k.trim()] = v.trim();
    });
    return st;
}
function styleObjToString(st) {
    return Object.entries(st)
        .filter(([k, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}:${v}`).join(';');
}
function updatePropsForm() {
    // --- Save focus ---
    let active = document.activeElement, fieldInfo = null;
    if (active && active.tagName === 'INPUT') {
        fieldInfo = {
            name: active.name,
            selectionStart: active.selectionStart,
            selectionEnd: active.selectionEnd
        };
    }

    let form = document.getElementById('properties-form');
    let obj = selectedElemId ? findElem(layout, selectedElemId) : null;
    const isLocked = obj && lockedElems.has(selectedElemId);

    // --- Breadcrumb title ---
    let breadcrumb = obj ? 'Properties: ' + getBreadcrumbPath(selectedElemId) : 'Properties';
    let title = '<div id="propTitle" style="font-weight:bold;font-size:16px;margin-bottom:10px;">' +
        breadcrumb +
        '</div>';

    // --- Main fields
    let fields = '';
    if (!selectedElemId || !obj) {
        form.innerHTML = title;
        return;
    }

    // Main editable props per type (text content, href, src etc)
    const disabledAttr = isLocked ? 'disabled' : '';
    if (obj.type === 'text' || obj.type === 'button' || obj.type === 'link') {
        fields += `<label>Text: <input type="text" name="text" value="${obj.props.text || ''} ${disabledAttr}"></label>`;
    }
    if (obj.type === 'img') {
        fields += `<label>Src: <input type="text" name="src" value="${obj.props.src || ''} ${disabledAttr}"></label>`;
    }
    if (obj.type === 'link') {
        fields += `<label>Href: <input type="text" name="href" value="${obj.props.href || ''} ${disabledAttr}"></label>`;
    }

    // Style controls
    let st = styleStringToObj(obj.props.style);
    fields += `<div>
        <label><input type="checkbox" name="bold" ${st['font-weight'] === 'bold' ? 'checked' : ''} ${disabledAttr}>Bold</label>
        <label><input type="checkbox" name="italic" ${st['font-style'] === 'italic' ? 'checked' : ''} ${disabledAttr}>Italic</label>
        <label><input type="checkbox" name="underline" ${st['text-decoration'] === 'underline' ? 'checked' : ''} ${disabledAttr}>Underline</label>
    </div>`;

    fields += `<div style="margin:7px 0;">
        <label>Font size: <input type="number" name="fontSize" value="${st['font-size'] ? parseInt(st['font-size']) : ''}" style="width:50px" ${disabledAttr}> px</label>
        <label style="margin-left:15px;">Text color: <input type="color" name="color" value="${st['color'] ? st['color'] : '#000000'}" ${disabledAttr}></label>
        <label style="margin-left:15px;">BG color: <input type="color" name="bgColor" value="${st['background-color'] ? st['background-color'] : '#ffffff'}" ${disabledAttr}></label>
    </div>
    <div style="margin:7px 0;">
        <label>Width: <input type="number" name="width" value="${st['width'] ? parseInt(st['width']) : ''}" style="width:50px" ${disabledAttr}> px</label>
        <label style="margin-left:13px;">Height: <input type="number" name="height" value="${st['height'] ? parseInt(st['height']) : ''}" style="width:50px" ${disabledAttr}> px</label>
    </div>
    <div style="margin:7px 0;">
        <label>Margin: <input type="number" name="margin" value="${st['margin'] ? parseInt(st['margin']) : ''}" style="width:50px" ${disabledAttr}> px</label>
        <label style="margin-left:15px;">Padding: <input type="number" name="padding" value="${st['padding'] ? parseInt(st['padding']) : ''}" style="width:50px" ${disabledAttr}> px</label>
        <label style="margin-left:15px;">Border: <input type="text" name="border" value="${st['border'] || ''}" style="width:90px" ${disabledAttr}></label>
    </div>
    `;

    // --- Set the full form with title at the top
    form.innerHTML = title + fields;

    // Only enable editing when not locked
    if (!isLocked) {
        // --- Hook up input events as before
        form.oninput = function (e) {
            // ... rest of function unchanged ...
            // Use form.querySelector instead of form.fieldName, as form is a div now
            let get = n => form.querySelector(`[name="${n}"]`);
            let styleObj = styleStringToObj(obj.props.style);

            // Update boolean styles
            styleObj['font-weight'] = get('bold')?.checked ? 'bold' : '';
            styleObj['font-style'] = get('italic')?.checked ? 'italic' : '';
            styleObj['text-decoration'] = get('underline')?.checked ? 'underline' : '';

            // Update value-based styles
            styleObj['font-size'] = get('fontSize')?.value ? (get('fontSize').value + 'px') : '';
            styleObj['color'] = get('color')?.value || '';
            styleObj['background-color'] = get('bgColor')?.value || '';
            styleObj['width'] = get('width')?.value ? (get('width').value + 'px') : '';
            styleObj['height'] = get('height')?.value ? (get('height').value + 'px') : '';
            styleObj['margin'] = get('margin')?.value ? (get('margin').value + 'px') : '';
            styleObj['padding'] = get('padding')?.value ? (get('padding').value + 'px') : '';
            styleObj['border'] = get('border')?.value || '';

            obj.props.style = styleObjToString(styleObj);

            // Still handle text/href/src
            if (get('text')) obj.props.text = get('text').value;
            if (get('href')) obj.props.href = get('href').value;
            if (get('src')) obj.props.src = get('src').value;

            pushHistory();
            render();
            updatePropsForm();
        }
    } else {
        form.oninput = null;
    }

    // --- Restore focus ---
    if (fieldInfo) {
        let toFocus = form.querySelector(`[name="${fieldInfo.name}"]`);
        if (toFocus) {
            toFocus.focus();
            if (toFocus.setSelectionRange && fieldInfo.selectionStart != null) {
                setTimeout(() => {
                    if (toFocus.type === "number") {
                        let len = (toFocus.value || '').length;
                        toFocus.setSelectionRange(len, len);
                    } else if (toFocus.setSelectionRange && fieldInfo.selectionStart != null) {
                        toFocus.setSelectionRange(fieldInfo.selectionStart, fieldInfo.selectionEnd);
                    }
                }, 0);
            }
        }
    }
}

// --- Context Menu ---
function showCtxMenuUnlocked(x, y, elemId) {
    let menu = document.getElementById('ctxMenuUnlocked');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    selectedElemId = elemId;
    render();
}
function showCtxMenuLocked(x, y, elemId) {
    let menu = document.getElementById('ctxMenuLocked');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    selectedElemId = elemId;
    render();
}
function hideCtxMenu() {
    document.getElementById('ctxMenuLocked').style.display = 'none';
    document.getElementById('ctxMenuUnlocked').style.display = 'none';
}
document.body.onclick = () => {
    hideCtxMenu();
}
function isElemLockedOrAncestorLocked(elemId) {
    let curr = elemId;
    while (curr) {
        if (lockedElems.has(curr)) return true;
        curr = findParent(layout, curr)?.id;
    }
    return false;
}
function getTopmostLockedAncestor(elemId) {
    let curr = elemId;
    let lastLocked = null;
    while (curr) {
        if (lockedElems.has(curr)) lastLocked = curr;
        curr = findParent(layout, curr)?.id;
    }
    return lastLocked;
}
function lockSelected() {
    if (!selectedElemId) return;
    pushHistory();
    if (!lockedElems.has(selectedElemId)) lockedElems.add(selectedElemId);
    render();
    hideCtxMenu();
}
function unlockSelected() {
    if (!selectedElemId) return;
    pushHistory();
    if (lockedElems.has(selectedElemId)) lockedElems.delete(selectedElemId);
    render();
    hideCtxMenu();
}
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

// --- Export / Import ---
function exportLayout() {
    let json = JSON.stringify(layout, null, 2);
    navigator.clipboard.writeText(json);
    showNotif('Exported (copied to clipboard)');
}
function showImportBox() {
    document.getElementById('importBox').style.display = 'inline-block';
    document.getElementById('importApply').style.display = 'inline-block';
}
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
document.getElementById('importBox').addEventListener('keydown', function (ev) {
    if (ev.key === "Escape") { this.style.display = 'none'; document.getElementById('importApply').style.display = 'none'; }
})

// --- Startup
render();
document.getElementById("mockup-area").addEventListener("click", function (e) {
    // Check if a link (or inside a link) was clicked
    const link = e.target.closest("a");
    if (link) {
        e.preventDefault();    // Prevent navigation/refresh
        // Optionally, show a tooltip or notification here
    }
    selectedElemId = null;
    render();
    updatePropsForm();
});
pushHistory();
updateUndoRedoBtns();

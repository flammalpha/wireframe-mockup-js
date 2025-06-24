function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayClassName(cname) {
    // Only trim for "user-" classes
    return cname.startsWith('user-') ? cname.slice(5) : cname;
}

let layout = { id: 'root', type: 'container', children: [], props: { style: 'min-height:80vh;' } };
let selectedElemId = null;
let lockedElems = new Set();
let dragElemId = null;
let classStyles = {};
let selectedClassName = null;
let uniqueElemIdCounter = 0;

// --- History Stacks ---
let historyStack = [];
let futureStack = [];
function pushHistory() {
    historyStack.push(JSON.stringify([layout, selectedElemId, Array.from(lockedElems), { ...classStyles }, selectedClassName]));
    if (historyStack.length > 64) historyStack = historyStack.slice(-64);
    futureStack = [];
    updateUndoRedoBtns();
}
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
    let a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
    if (e.ctrlKey && e.key === 'z') { undoAction(); e.preventDefault(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { redoAction(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'c') { doCopy(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'v') { doPaste(); e.preventDefault(); }
});
function cloneElem(obj) {
    let newObj = JSON.parse(JSON.stringify(obj));
    function assignNewIds(o) {
        o.id = generateUniqueElemId();
        if (o.children) o.children.forEach(assignNewIds);
    }
    assignNewIds(newObj);
    return newObj;
}
function doCopy() {
    hideCtxMenu();
    if (!selectedElemId || selectedElemId === 'root') { showNotif('Select something to copy!'); return; }
    let elem = findElem(layout, selectedElemId);
    if (!elem) return;
    clipboardElem = JSON.parse(JSON.stringify(elem));
    showNotif('Copied!');
}
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

// --- Render wireframe (calls renderClassEditor) ---
function render() {
    let area = document.getElementById('mockup-area');
    area.innerHTML = '';
    renderElem(layout, area);
    renderClassEditor();
}
function renderElem(obj, parent) {
    let elem;
    if (obj.type === 'container' || obj.id === 'root') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.style.position = 'relative';
        elem.innerHTML = (obj.id === 'root') ? '<b style="font-size:20px;color:#bbb;">(Root Layout)</b>'
            : '<span style="color:#888;">Container</span>';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj) + ';position:relative;');
    } else if (obj.type === 'text') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Text';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'button') {
        elem = document.createElement('button');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Button';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'img') {
        elem = document.createElement('img');
        elem.className = 'wire-elem';
        elem.src = obj.props?.src || 'https://via.placeholder.com/80x40';
        elem.style.width = '80px'; elem.style.height = '40px';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'link') {
        elem = document.createElement('a');
        elem.className = 'wire-elem';
        elem.innerHTML = `<span>${escapeHTML(obj.props?.text || 'Link')}</span>`;
        elem.href = obj.props?.href || '#';
        elem.style.textDecoration = 'underline';
        elem.target = '_blank';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    }

    elem.dataset.id = obj.id;
    if (obj.id === selectedElemId) elem.classList.add('selected');
    let locked = isElemLockedOrAncestorLocked(obj.id);
    if (locked) elem.style.opacity = '0.4';

    elem.setAttribute('draggable', locked ? 'false' : 'true');
    elem.ondragstart = (e) => {
        dragElemId = obj.id;
        e.stopPropagation();
    };
    elem.ondragover = e => e.preventDefault();
    elem.ondrop = e => handleDrop(e, obj);

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
    elem.oncontextmenu = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const topLocked = getTopmostLockedAncestor(obj.id);
        if (topLocked)
            showCtxMenuLocked(e.pageX, e.pageY, topLocked);
        else
            showCtxMenuUnlocked(e.pageX, e.pageY, obj.id);
    }

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
    let id = generateUniqueElemId();
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

function generateUniqueElemId() {
    uniqueElemIdCounter += 1;
    return 'e' + Date.now() + '-' + uniqueElemIdCounter;
}

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
        let [k, ...v] = rule.split(':');
        if (!k || v.length === 0) return;
        st[k.trim()] = v.join(':').trim();
    });
    return st;
}
function styleObjToString(st) {
    return Object.entries(st)
        .filter(([k, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}:${v}`).join(';');
}
function updatePropsForm() {
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

    let breadcrumb = obj ? 'Properties: ' + getBreadcrumbPath(selectedElemId) : 'Properties';
    let title = '<div id="propTitle">' +
        breadcrumb +
        '</div>';

    let fields = '';
    if (!selectedElemId || !obj) {
        form.innerHTML = title;
        return;
    }

    const disabledAttr = isLocked ? 'disabled' : '';
    if (obj.type === 'text' || obj.type === 'button' || obj.type === 'link') {
        fields += `<label>Text: <input type="text" name="text" value="${escapeHTML(obj.props.text || '')}" ${disabledAttr}></label>`;
    }
    if (obj.type === 'img') {
        fields += `<label>Src: <input type="text" name="src" value="${escapeHTML(obj.props.src || '')}" ${disabledAttr}></label>`;
    }
    if (obj.type === 'link') {
        fields += `<label>Href: <input type="text" name="href" value="${escapeHTML(obj.props.href || '')}" ${disabledAttr}></label>`;
    }
    if (obj.id !== 'root') {
        fields += `<div style="margin:7px 0 7px 0;font-size:13px;">
            <b>Classes:</b>
            <span id="classesCheckboxes"></span>
            </div>`;
    }

    let st = styleStringToObj(obj.props.style);
    fields += renderStyleFields(st, disabledAttr);

    form.innerHTML = title + fields;

    // Render available class checkboxes
    if (obj.id !== 'root') {
        const checkboxes = [];
        const allClasses = Object.keys(classStyles);
        const elementClasses = (obj.props.class || '').split(/\s+/).filter(Boolean);
        for (const cname of allClasses) {
            const checked = elementClasses.includes(cname) ? 'checked' : '';
            checkboxes.push(
                `<label class="cls-checkbox-label">
                  <input type="checkbox" name="clsbox" value="${escapeHTML(cname)}" ${checked} ${isLocked ? 'disabled' : ''}>${escapeHTML(displayClassName(cname))}
                </label>`
            );
        }
        form.querySelector("#classesCheckboxes").innerHTML = checkboxes.join('');
    }
    if (!isLocked) {
        form.oninput = function (e) {
            let get = n => form.querySelector(`[name="${n}"]`);
            let styleObj = styleStringToObj(obj.props.style);

            fetchStyleFromFields(form, styleObj);
            obj.props.style = styleObjToString(styleObj);

            if (get('text')) obj.props.text = get('text').value;
            if (get('href')) obj.props.href = get('href').value;
            if (get('src')) obj.props.src = get('src').value;
            if (get('class')) obj.props.class = get('class').value.trim();

            if (e.target.name === "clsbox") {
                let checked = Array.from(form.querySelectorAll('[name="clsbox"]:checked')).map(x => x.value);
                obj.props.class = checked.join(' ');
                pushHistory();
                render();
                updatePropsForm();
                return;
            }
            pushHistory();
            render();
            updatePropsForm();
        }
    } else {
        form.oninput = null;
    }

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

// --- Merge class-based styles with element styles on render ---
function getMergedStyle(obj) {
    let cs = {};
    if (obj.props && obj.props.class) {
        let cList = obj.props.class.trim().split(/\s+/);
        for (let c of cList) {
            Object.assign(cs, styleStringToObj(classStyles[c] || ''));
        }
    }
    let inline = styleStringToObj(obj.props?.style);
    Object.assign(cs, inline);
    return styleObjToString(cs);
}

// --- New: Class Editor section in right bar (Modern version with selection) ---
function renderClassEditor() {
    const ul = document.getElementById('classList');
    if (!ul) return;
    const classNames = Object.keys(classStyles);
    ul.innerHTML = "";

    const topDiv = document.createElement('div');
    topDiv.innerHTML = `
        <div style="font-weight:bold; font-size:15px; margin-bottom:8px;">Global Classes</div>
        <input type="text" id="globalAddClassInput" style="width:100px;font-size:13px;margin-right:6px;" placeholder="New class">
        <button id="globalAddClassBtn" type="button" style="font-size:13px;">+</button>
        <span id="addClassError" style="color:#c00;font-size:13px;display:none;margin-left:10px;"></span>
        <hr style="margin:10px 0;">
    `;
    ul.appendChild(topDiv);

    classNames.forEach(cname => {
        const li = document.createElement('li');
        li.style.marginBottom = "10px";
        li.innerHTML = `<div class="classNameListItem">
          <button type="button" class="selectClassBtn" data-cls="${escapeHTML(cname)}" style="background:${selectedClassName === cname ? '#def' : '#eee'};margin-right:7px;">${escapeHTML(displayClassName(cname))}</button>
          <button type="button" class="delClassBtn" data-cls="${escapeHTML(cname)}">✖</button>
        </div>`;
        ul.appendChild(li);
    });

    setTimeout(() => {
        document.querySelectorAll(".selectClassBtn").forEach(btn => {
            btn.onclick = () => {
                selectedClassName = btn.dataset.cls;
                renderClassEditor();
                renderClassPropertiesForm();
            };
        });
        const btn = document.getElementById('globalAddClassBtn');
        const input = document.getElementById('globalAddClassInput');
        const error = document.getElementById('addClassError');
        if (btn && input) {
            btn.onclick = function () {
                let cname = (input.value || '').trim();
                if (!cname.match(/^[a-zA-Z_][\w\-]*$/)) {
                    error.textContent = 'Invalid class name!';
                    error.style.display = 'inline';
                    return;
                }
                if (!cname) return;
                let fullName = cname.startsWith('user-') ? cname : 'user-' + cname;
                if (classStyles[fullName]) {
                    error.textContent = 'Class exists!';
                    error.style.display = 'inline';
                    return;
                }
                classStyles[fullName] = '';
                input.value = '';
                error.style.display = 'none';
                pushHistory();
                render();
                renderClassEditor();
            };
            input.oninput = () => { error.style.display = 'none'; };
            input.onkeydown = function (e) {
                if (e.key === "Enter") btn.click();
            }
        }
    }, 10);

    document.getElementById("classList").onclick = function (e) {
        if (e.target.classList.contains("delClassBtn")) {
            const cname = e.target.dataset.cls;
            delete classStyles[cname];
            traverseElems(layout, (eobj) => {
                if (eobj.props && eobj.props.class) {
                    let arr = eobj.props.class.split(/\s+/).filter(x => x && x !== cname);
                    if (arr.length !== eobj.props.class.split(/\s+/).length)
                        eobj.props.class = arr.join(' ');
                }
            });
            if (selectedClassName === cname) selectedClassName = null;
            pushHistory();
            render();
            updatePropsForm();
            renderClassEditor();
            renderClassPropertiesForm();
        }
    };

    renderClassPropertiesForm();
}

function renderClassPropertiesForm() {
    let form = document.getElementById('classPropertiesEditor');
    if (!form) return;

    let html = `<div id="classTitle">Class Properties` + (selectedClassName ? `: <b>.${escapeHTML(displayClassName(selectedClassName))}</b>` : ``) + `</div>`
    if (!selectedClassName || !(selectedClassName in classStyles)) {
        form.innerHTML = html;
        form.oninput = null;
        return;
    }

    let st = styleStringToObj(classStyles[selectedClassName]);
    html += renderStyleFields(st);

    form.innerHTML = html;

    form.oninput = function (e) {
        let styleObj = styleStringToObj(classStyles[selectedClassName]);
        fetchStyleFromFields(form, styleObj);
        classStyles[selectedClassName] = styleObjToString(styleObj);
        pushHistory();
        render();
        renderClassEditor();
    };
}

function renderStyleFields(st, disabledAttr = '', prefix = '') {
    const checkbox = (label, name, val) =>
        `<label style="margin-right:10px;"><input type="checkbox" name="${prefix}${name}" ${val ? 'checked' : ''} ${disabledAttr}> ${label}</label>`;
    const field = (label, name, value, unit = '', width = 50, type = 'number') =>
        `<label style="margin-right:16px;">${label}: <input type="${type}" name="${prefix}${name}" value="${value || ''}" style="width:${width}px" ${disabledAttr}>${unit}</label>`;
    const borderSelectOpts = ["", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"]
        .map(s => `<option value="${s}"${(st['border-style'] === s) ? ' selected' : ''}>${s || 'none'}</option>`).join('');
    const colorOrDefault = (c, def) => c && c.startsWith('#') ? c : def;

    return `
    <div class="style-fields-grid">
      <div class="style-row">
        ${checkbox("Bold", "bold", st['font-weight'] === 'bold')}
        ${checkbox("Italic", "italic", st['font-style'] === 'italic')}
        ${checkbox("Underline", "underline", st['text-decoration'] === 'underline')}
        <label style="margin-left:15px;">Text color: <input type="color" name="${prefix}color" value="${colorOrDefault(st['color'], '#000000')}" ${disabledAttr}></label>
        <label style="margin-left:15px;">BG: <input type="color" name="${prefix}bgColor" value="${colorOrDefault(st['background-color'], '#ffffff')}" ${disabledAttr}></label>
      </div>
      <div>
        ${field("Font size", "fontSize", st['font-size'] ? parseInt(st['font-size']) : '', 'px')}
      </div>
      <div>
        ${field("Width", "width", st['width'] ? parseInt(st['width']) : '', 'px')}
        ${field("Height", "height", st['height'] ? parseInt(st['height']) : '', 'px')}
      </div>
      <div class="style-row">
        ${field("Margin", "margin", st['margin'] ? parseInt(st['margin']) : '', 'px')}
        ${field("Padding", "padding", st['padding'] ? parseInt(st['padding']) : '', 'px')}
      </div>
      <div class="style-row">
        <b>Border:</b>
        ${field("", "borderWidth", st['border-width'] ? parseInt(st['border-width']) : '', 'px', 44)}
        <select name="${prefix}borderStyle" ${disabledAttr} style="margin:0 4px;">${borderSelectOpts}</select>
        <input type="color" name="${prefix}borderColor" value="${colorOrDefault(st['border-color'], '#000000')}" ${disabledAttr}>
      </div>
    </div>
    `;
}

function fetchStyleFromFields(form, styleObj, prefix = '') {
    let get = n => form.querySelector(`[name="${prefix}${n}"]`);
    styleObj['font-weight'] = get('bold')?.checked ? 'bold' : '';
    styleObj['font-style'] = get('italic')?.checked ? 'italic' : '';
    styleObj['text-decoration'] = get('underline')?.checked ? 'underline' : '';
    styleObj['font-size'] = get('fontSize')?.value ? (get('fontSize').value + 'px') : '';
    styleObj['color'] = get('color')?.value || '';
    styleObj['background-color'] = get('bgColor')?.value || '';
    styleObj['width'] = get('width')?.value ? (get('width').value + 'px') : '';
    styleObj['height'] = get('height')?.value ? (get('height').value + 'px') : '';
    styleObj['margin'] = get('margin')?.value ? (get('margin').value + 'px') : '';
    styleObj['padding'] = get('padding')?.value ? (get('padding').value + 'px') : '';
    styleObj['border-width'] = get('borderWidth')?.value ? (get('borderWidth').value + 'px') : '';
    styleObj['border-style'] = get('borderStyle')?.value || '';
    styleObj['border-color'] = get('borderColor')?.value || '';
    return styleObj;
}

function traverseElems(obj, cb) {
    cb(obj);
    if (obj.children) {
        obj.children.forEach(child => traverseElems(child, cb));
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
document.addEventListener('mousedown', function (e) {
    const ctxMenus = [,
        document.getElementById('ctxMenuLocked'),
        document.getElementById('ctxMenuUnlocked')
    ];
    if (!ctxMenus.some(menu => menu.contains(e.target))) {
        hideCtxMenu();
    }
})
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
    const link = e.target.closest("a");
    if (link) {
        e.preventDefault();
    }
    selectedElemId = null;
    render();
    updatePropsForm();
});
pushHistory();
updateUndoRedoBtns();
renderClassEditor();

// --- Dark Theme
let manualTheme = null;

function applySystemTheme() {
    if (manualTheme) {
        document.body.setAttribute('data-theme', manualTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
    }
    updateDarkModeToggleLabel();
}

function updateDarkModeToggleLabel() {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        manualTheme = 'light';
    } else {
        manualTheme = 'dark';
    }
    applySystemTheme();
}
// Initial set
applySystemTheme();
// Respond to changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!manualTheme) applySystemTheme();
});

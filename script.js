let layout = { id: 'root', type: 'container', children: [], props: { style: 'min-height:80vh;' } };
let selectedElemId = null;
let lockedElems = new Set();
let dragElemId = null;

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

// ---- Render wireframe ----
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
    if (lockedElems.has(obj.id)) elem.style.opacity = '0.4';

    // Drag logic
    elem.setAttribute('draggable', lockedElems.has(obj.id) ? 'false' : 'true');
    elem.ondragstart = (e) => {
        dragElemId = obj.id;
        e.stopPropagation();
    };
    elem.ondragover = e => e.preventDefault();
    elem.ondrop = evt => {
        evt.preventDefault();
        if (lockedElems.has(obj.id)) return;
        moveElem(dragElemId, obj.id);
    }

    // Selection
    elem.onclick = function (e) {
        e.stopPropagation();
        selectElem(obj.id);
    };
    // Context menu on right-click
    elem.oncontextmenu = function (e) {
        e.preventDefault(); e.stopPropagation();
        if (lockedElems.has(obj.id)) return;
        showCtxMenu(e.pageX, e.pageY, obj.id);
    }

    // Recursion for containers
    if ((obj.type === 'container' || obj.id === 'root') && obj.children) {
        for (let child of obj.children) {
            renderElem(child, elem);
        }
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
function handleDrop(e) {
    e.preventDefault();
    let type = e.dataTransfer.getData("type");
    if (type) {
        let el = newElem(type);
        layout.children.push(el);
        render();
    }
}
[...document.querySelectorAll('.tool')].forEach(t => {
    t.ondragstart = function (e) {
        e.dataTransfer.setData('type', t.dataset.type);
    }
});

// --- PROPERTIES ---
function updatePropsForm() {
    let form = document.getElementById('properties-form');
    form.innerHTML = '';
    if (!selectedElemId) { document.getElementById('propTitle').innerText = 'Properties'; return; }
    let obj = findElem(layout, selectedElemId);
    if (!obj) return;
    document.getElementById('propTitle').innerText = 'Properties: ' + (obj.type.charAt(0).toUpperCase() + obj.type.slice(1));
    // Main editable props per type
    if (obj.type === 'text' || obj.type === 'button' || obj.type === 'link') {
        form.innerHTML += `<label>Text: <input type="text" name="text" value="${obj.props.text || ''}"></label>`;
    }
    if (obj.type === 'img') {
        form.innerHTML += `<label>Src: <input type="text" name="src" value="${obj.props.src || ''}"></label>`;
    }
    if (obj.type === 'link') {
        form.innerHTML += `<label>Href: <input type="text" name="href" value="${obj.props.href || ''}"></label>`;
    }
    form.innerHTML += `<label>Style: <input type="text" name="style" value="${obj.props.style || ''}" style="width:250px"></label>`;
    // Change event
    form.oninput = function (e) {
        let f = e.target;
        obj.props[f.name] = f.value;
        render();
        updatePropsForm();
    }
}

// --- Context Menu ---
function showCtxMenu(x, y, elemId) {
    let menu = document.getElementById('ctxMenu');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    selectedElemId = elemId;
    render();
}
document.body.onclick = () => { document.getElementById('ctxMenu').style.display = 'none'; }
function lockSelected() {
    if (!selectedElemId) return;
    if (lockedElems.has(selectedElemId)) lockedElems.delete(selectedElemId);
    else lockedElems.add(selectedElemId);
    render();
    document.getElementById('ctxMenu').style.display = 'none';
}
function deleteSelected() {
    if (!selectedElemId) return;
    removeElem(layout, selectedElemId);
    if (layout.id == selectedElemId) { layout = { id: 'root', type: 'container', children: [], props: {} }; }
    selectedElemId = null;
    render();
    document.getElementById('ctxMenu').style.display = 'none';
}

// --- Export / Import ---
function exportLayout() {
    let json = JSON.stringify(layout, null, 2);
    navigator.clipboard.writeText(json);
    alert('Layout JSON copied to clipboard!');
}
function showImportBox() {
    document.getElementById('importBox').style.display = 'block';
    document.getElementById('importApply').style.display = 'block';
}
document.getElementById('importApply').onclick = function () {
    let txt = document.getElementById('importBox').value;
    try {
        let obj = JSON.parse(txt);
        layout = obj; selectedElemId = null; lockedElems = new Set(); render(); updatePropsForm();
        document.getElementById('importBox').style.display = 'none';
        document.getElementById('importApply').style.display = 'none';
    } catch (e) { alert('Invalid JSON!'); }
}

// --- Startup
render();
document.getElementById('mockup-area').onclick = function () { selectedElemId = null; render(); updatePropsForm(); }

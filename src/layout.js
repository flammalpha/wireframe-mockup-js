let layout = { id: 'root', type: 'container', children: [], props: { style: 'min-height:80vh;' } };
let selectedElemId = null;

function generateUniqueElemId() {
    uniqueElemIdCounter += 1;
    return 'e' + Date.now() + '-' + uniqueElemIdCounter;
}

/**
 * Creates a new element object of the specified type, with default properties.
 * @param {string} type - Type of element ('container', 'text', 'button', 'img', or 'link').
 * @returns {object} The new layout element object.
 */
function newElem(type) {
    let id = generateUniqueElemId();
    let base = {
        id, type, props: {},
        children: []
    };
    if (type === 'container') base.props.style = "min-height:50px;min-width:100px;display:block;";
    if (type === 'text') base.props.text = "Text";
    if (type === 'button') base.props.text = "Button";
    if (type === 'img') base.props.src = "https://via.placeholder.com/80x40";
    if (type === 'link') { base.props.text = "Link"; base.props.href = "#"; }
    return base;
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

function traverseElems(obj, cb) {
    cb(obj);
    if (obj.children) {
        obj.children.forEach(child => traverseElems(child, cb));
    }
}